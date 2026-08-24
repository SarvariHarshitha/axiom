export const QUESTIONS_SYSTEM =
  "Generate coding exercises that make the reader implement the paper's core mechanism. " +
  "Exercises must be implementable as a pure Python function using ONLY the standard library " +
  "(no numpy, torch, or other third-party packages — the grader is plain CPython/Pyodide with " +
  "no extra packages installed). Operate on plain Python lists/floats/ints instead of tensors " +
  "(e.g. implement attention over nested lists, not torch.Tensor). Function signatures must not " +
  "reference numpy/torch types.";

export function questionsUserPrompt(opts: {
  concepts: string[];
  summary: string;
  n: number;
}): string {
  return `Concepts: ${opts.concepts.join(", ")}\nSummary: ${opts.summary}\nProduce ${opts.n} questions (mix quiz + implement-the-paper).
Return a JSON object of the form:
{ "questions": [
  { "id": string, "prompt": string, "function_signature": string, "docstring": string,
    "difficulty": "easy"|"medium"|"hard", "concepts": string[] }
] }`;
}

export interface GeneratedQuestion {
  id: string;
  prompt: string;
  function_signature: string;
  docstring: string;
  difficulty: "easy" | "medium" | "hard";
  concepts: string[];
}
