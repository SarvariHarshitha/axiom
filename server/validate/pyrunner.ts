import { spawn } from "node:child_process";
import type { TestCase, TestInput } from "../prompts/tests.js";

export interface RunResult {
  pass: boolean;
  error?: string;
}

export interface ComputeResult {
  ok: boolean;
  value?: unknown;
}

const TIMEOUT_MS = 5000;

/**
 * Server-side Python execution used only for the reference-solution
 * validation gate (never for untrusted user code — that path is the browser
 * Pyodide worker / optional Docker sandbox, see plan.md "Browser IDE").
 * Requires `python3` on PATH.
 */
export async function runPythonAgainstTests(
  code: string,
  functionName: string,
  tests: TestCase[]
): Promise<RunResult[]> {
  const harness = buildHarness(code, functionName, tests);

  return new Promise((resolve) => {
    const child = spawn("python3", ["-c", harness], { timeout: TIMEOUT_MS });
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (d) => (stdout += d));
    child.stderr.on("data", (d) => (stderr += d));

    const timer = setTimeout(() => child.kill("SIGKILL"), TIMEOUT_MS);

    child.on("close", () => {
      clearTimeout(timer);
      if (stderr.trim()) {
        resolve(tests.map(() => ({ pass: false, error: stderr.trim().slice(0, 500) })));
        return;
      }
      try {
        const results = JSON.parse(stdout) as boolean[];
        resolve(results.map((pass) => ({ pass })));
      } catch {
        resolve(tests.map(() => ({ pass: false, error: "Failed to parse test runner output" })));
      }
    });

    child.on("error", (err) => {
      clearTimeout(timer);
      resolve(tests.map(() => ({ pass: false, error: String(err) })));
    });
  });
}

/**
 * Runs `code`'s function on each test input and returns the actual output
 * (or ok:false if it raised). Used to DERIVE expected values from the LLM's
 * own reference solution, rather than trusting hand-computed "expected"
 * fields — floating-point arithmetic done by hand in a JSON test fixture is
 * a much less reliable source of truth than just executing the code.
 */
export async function computeReferenceOutputs(
  code: string,
  functionName: string,
  inputs: TestInput[]
): Promise<ComputeResult[]> {
  const harness = buildComputeHarness(code, functionName, inputs);

  return new Promise((resolve) => {
    const child = spawn("python3", ["-c", harness], { timeout: TIMEOUT_MS });
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (d) => (stdout += d));
    child.stderr.on("data", (d) => (stderr += d));

    const timer = setTimeout(() => child.kill("SIGKILL"), TIMEOUT_MS);

    child.on("close", () => {
      clearTimeout(timer);
      if (stderr.trim()) {
        resolve(inputs.map(() => ({ ok: false })));
        return;
      }
      try {
        const results = JSON.parse(stdout) as { ok: boolean; value?: unknown }[];
        resolve(results);
      } catch {
        resolve(inputs.map(() => ({ ok: false })));
      }
    });

    child.on("error", () => {
      clearTimeout(timer);
      resolve(inputs.map(() => ({ ok: false })));
    });
  });
}

function buildComputeHarness(code: string, functionName: string, inputs: TestInput[]): string {
  const inputsJson = JSON.stringify(inputs);
  return `
import json

${code}

inputs = json.loads('''${inputsJson.replace(/'''/g, "'\\'\\'\\'")}''')
results = []
for t in inputs:
    try:
        actual = ${functionName}(*t["input"])
        results.append({"ok": True, "value": actual})
    except Exception:
        results.append({"ok": False})
print(json.dumps(results))
`;
}

function buildHarness(code: string, functionName: string, tests: TestCase[]): string {
  const testsJson = JSON.stringify(tests);
  return `
import json, sys, math

def _approx_eq(a, b, rel_tol=1e-3, abs_tol=1e-4):
    if isinstance(a, bool) or isinstance(b, bool):
        return a == b
    if isinstance(a, (int, float)) and isinstance(b, (int, float)):
        return math.isclose(a, b, rel_tol=rel_tol, abs_tol=abs_tol)
    if isinstance(a, (list, tuple)) and isinstance(b, (list, tuple)):
        return len(a) == len(b) and all(_approx_eq(x, y, rel_tol, abs_tol) for x, y in zip(a, b))
    if isinstance(a, dict) and isinstance(b, dict):
        return a.keys() == b.keys() and all(_approx_eq(a[k], b[k], rel_tol, abs_tol) for k in a)
    return a == b

${code}

tests = json.loads('''${testsJson.replace(/'''/g, "'\\'\\'\\'")}''')
results = []
for t in tests:
    try:
        actual = ${functionName}(*t["input"])
        results.append(_approx_eq(actual, t["expected"]))
    except Exception:
        results.append(False)
print(json.dumps(results))
`;
}
