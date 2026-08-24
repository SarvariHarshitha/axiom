import { randomUUID } from "node:crypto";
import type { GeneratedQuestion } from "../prompts/questions.js";
import type { GeneratedTests, TestCase, TestInput } from "../prompts/tests.js";
import type { Question } from "../session-types.js";
import { computeReferenceOutputs } from "./pyrunner.js";

const MIN_SURVIVING_TESTS = 3;

function functionNameFromSignature(signature: string): string {
  const match = signature.match(/def\s+(\w+)/);
  return match?.[1] ?? "solution";
}

/**
 * The critical correctness gate: runs the LLM's reference_solution on all of
 * its own generated test INPUTS and uses the actual return value as the
 * expected output — rather than trusting an "expected" field the LLM
 * hand-computed, which is a much less reliable source of truth (LLMs are
 * error-prone at manual arithmetic, especially floating point). A test input
 * only gets discarded when the reference solution itself raises on it,
 * which means the input was genuinely unsound (wrong arity, malformed
 * shape, etc.) rather than merely "the model did the math wrong."
 * If fewer than MIN_SURVIVING_TESTS survive on either set, the whole
 * question is dropped — the caller retries once, then drops it.
 */
export async function validateAndBuildQuestion(
  question: GeneratedQuestion,
  tests: GeneratedTests
): Promise<Question | undefined> {
  const fnName = functionNameFromSignature(question.function_signature);
  const allInputs: TestInput[] = [...tests.visible_tests, ...tests.hidden_tests];

  const outputs = await computeReferenceOutputs(tests.reference_solution, fnName, allInputs);

  const survivingVisible: TestCase[] = [];
  const survivingHidden: TestCase[] = [];

  outputs.forEach((result, i) => {
    if (!result.ok) return;
    const testCase: TestCase = { input: allInputs[i]!.input, expected: result.value };
    if (i < tests.visible_tests.length) {
      survivingVisible.push(testCase);
    } else {
      survivingHidden.push(testCase);
    }
  });

  if (
    survivingVisible.length < MIN_SURVIVING_TESTS ||
    survivingHidden.length < MIN_SURVIVING_TESTS
  ) {
    return undefined; // caller should regenerate once, then drop the question
  }

  return {
    id: randomUUID(),
    prompt: question.prompt,
    functionSignature: question.function_signature,
    docstring: question.docstring,
    visibleTests: survivingVisible,
    hiddenTests: survivingHidden,
    referenceSolution: tests.reference_solution,
    difficulty: question.difficulty,
    concepts: question.concepts
  };
}
