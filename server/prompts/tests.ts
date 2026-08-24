export const TESTS_SYSTEM =
  "For each question produce a correct reference solution and deterministic, pure-function test " +
  "inputs. No randomness, no I/O, no network. The reference solution must use ONLY Python's standard " +
  "library (no numpy, no torch, no third-party packages) since it runs in a plain CPython/Pyodide " +
  "sandbox with no extra packages installed. Do NOT compute expected outputs by hand — the caller " +
  "will run your reference solution to derive them. All test inputs must be plain JSON-serializable " +
  "values only (numbers, strings, booleans, null, lists, and plain objects/dicts) — represent " +
  "vectors/matrices as nested lists of numbers, never as tensor/array constructor expressions or " +
  "code strings.";

export function testsUserPrompt(questionPrompt: string): string {
  return `${questionPrompt}\nProduce >=5 visible and >=5 hidden test INPUTS covering typical cases and edge cases.
Return JSON:
{ "reference_solution": string,  // complete correct implementation, stdlib only
  "visible_tests": [{ "input": any[] }],
  "hidden_tests":  [{ "input": any[] }] }`;
}

export interface TestInput {
  input: unknown[];
}

export interface TestCase {
  input: unknown[];
  expected: unknown;
}

export interface GeneratedTests {
  reference_solution: string;
  visible_tests: TestInput[];
  hidden_tests: TestInput[];
}
