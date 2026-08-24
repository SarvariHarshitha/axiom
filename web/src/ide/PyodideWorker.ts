/// <reference lib="webworker" />
// Runs untrusted user code fully client-side via Pyodide (CPython->WASM) in a
// Web Worker, keeping the UI thread responsive and isolating execution from
// the host (no filesystem/network access). First load downloads ~15MB, then
// browser-caches. `input()` is unsupported by design: exercises are pure functions.

declare function importScripts(...urls: string[]): void;
declare const loadPyodide: (opts: { indexURL: string }) => Promise<PyodideInterface>;

interface PyodideInterface {
  runPythonAsync(code: string): Promise<unknown>;
  globals: { get(name: string): unknown };
}

interface TestCase {
  input: unknown[];
  expected: unknown;
}

interface RunRequest {
  type: "run";
  code: string;
  functionName: string;
  tests: TestCase[];
  timeoutMs: number;
}

interface RunResult {
  pass: boolean;
  error?: string;
}

let pyodidePromise: Promise<PyodideInterface> | undefined;

function getPyodide(): Promise<PyodideInterface> {
  if (!pyodidePromise) {
    importScripts("https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide.js");
    pyodidePromise = loadPyodide({
      indexURL: "https://cdn.jsdelivr.net/pyodide/v0.26.4/full/"
    });
  }
  return pyodidePromise;
}

self.onmessage = async (event: MessageEvent<RunRequest>) => {
  const { code, functionName, tests, timeoutMs } = event.data;
  const pyodide = await getPyodide();

  const results: RunResult[] = [];

  const timeout = new Promise<void>((_, reject) =>
    setTimeout(() => reject(new Error("Timed out")), timeoutMs)
  );

  try {
    await Promise.race([pyodide.runPythonAsync(code), timeout]);

    for (const test of tests) {
      try {
        const argsJson = JSON.stringify(test.input);
        const check = `
import json
_args = json.loads('''${argsJson.replace(/'''/g, "'\\'\\'\\'")}''')
_result = ${functionName}(*_args)
json.dumps(_result)
`;
        const actualJson = (await Promise.race([
          pyodide.runPythonAsync(check),
          timeout
        ])) as string;
        const actual = JSON.parse(actualJson);
        results.push({ pass: JSON.stringify(actual) === JSON.stringify(test.expected) });
      } catch (err) {
        results.push({ pass: false, error: String(err) });
      }
    }
  } catch (err) {
    for (const _ of tests) results.push({ pass: false, error: String(err) });
  }

  (self as unknown as Worker).postMessage({ type: "result", results });
};
