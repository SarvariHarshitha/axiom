import { llm } from "./llm/index.js";
import { SUMMARIZE_SYSTEM, summarizeUserPrompt, type PaperSummary } from "./prompts/summarize.js";
import { QUESTIONS_SYSTEM, questionsUserPrompt, type GeneratedQuestion } from "./prompts/questions.js";
import { TESTS_SYSTEM, testsUserPrompt, type GeneratedTests } from "./prompts/tests.js";
import { validateAndBuildQuestion } from "./validate/gate.js";
import type { GeneratedDay, Question } from "./session-types.js";
import type { PaperRef } from "./papers/types.js";

const QUESTIONS_PER_DAY = 3; // fixed per plan.md open-question #6 default

function parseJson<T>(raw: string): T {
  const cleaned = raw.trim().replace(/^```json\s*/i, "").replace(/```$/, "");
  return JSON.parse(cleaned) as T;
}

async function generateSummary(paper: PaperRef): Promise<PaperSummary> {
  const raw = await llm.chat({
    system: SUMMARIZE_SYSTEM,
    user: summarizeUserPrompt({
      title: paper.title,
      abstract: paper.abstract,
      text: paper.abstract // full text extraction is a v2 concern; abstract-only for v1
    }),
    json: true
  });
  return parseJson<PaperSummary>(raw);
}

async function generateQuestions(
  concepts: string[],
  summaryText: string
): Promise<GeneratedQuestion[]> {
  const raw = await llm.chat({
    system: QUESTIONS_SYSTEM,
    user: questionsUserPrompt({ concepts, summary: summaryText, n: QUESTIONS_PER_DAY }),
    json: true
  });
  // Providers using strict "JSON object" modes (e.g. DeepSeek/OpenAI
  // response_format=json_object) cannot return a bare top-level array, so
  // the prompt asks for { "questions": [...] }. Some models return the bare
  // array anyway — accept either shape.
  const parsed = parseJson<GeneratedQuestion[] | { questions: GeneratedQuestion[] }>(raw);
  return Array.isArray(parsed) ? parsed : parsed.questions;
}

async function generateTestsFor(question: GeneratedQuestion): Promise<GeneratedTests> {
  const raw = await llm.chat({
    system: TESTS_SYSTEM,
    user: testsUserPrompt(
      `${question.prompt}\nFunction signature: ${question.function_signature}\nDocstring: ${question.docstring}`
    ),
    json: true
  });
  return parseJson<GeneratedTests>(raw);
}

async function buildValidatedQuestion(
  candidate: GeneratedQuestion
): Promise<Question | undefined> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const tests = await generateTestsFor(candidate).catch(() => undefined);
    if (!tests) continue;
    const built = await validateAndBuildQuestion(candidate, tests);
    if (built) return built;
  }
  return undefined; // both attempts failed the gate; drop this question
}

/** Full generation pipeline for one paper: summary -> questions -> tests -> validation gate. */
export async function generateDay(paper: PaperRef): Promise<GeneratedDay> {
  const summary = await generateSummary(paper);
  const summaryText = `${summary.tldr}\n${summary.intuition}`;

  const candidates = await generateQuestions(summary.concepts, summaryText);

  const built = await Promise.all(candidates.map(buildValidatedQuestion));
  const questions = built.filter((q): q is Question => q !== undefined);

  return {
    paper: { ...paper, concepts: summary.concepts },
    summary: summaryText,
    questions
  };
}
