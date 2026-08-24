export interface TestCase {
  input: unknown[];
  expected: unknown;
}

export interface TestRunResult {
  pass: boolean;
  error?: string;
}

const RUN_TIMEOUT_MS = 5000;
// Pyodide's one-time download+init (~15MB) is a separate concern from
// executing code and routinely takes far longer than a code timeout should -
// especially on a cold browser cache or slow connection. Give it a much
// longer allowance so a slow-but-succeeding load isn't mistaken for a hang.
const LOAD_TIMEOUT_MS = 45000;

/**
 * Thin wrapper around the Pyodide Web Worker. One worker per run keeps
 * failures (e.g. an infinite loop that ignores postMessage) isolated —
 * terminate() always reclaims it. The worker reports "ready" once Pyodide
 * has finished loading, at which point we switch from the generous load
 * timeout to the short execution timeout.
 */
export function runInPyodideWorker(
  code: string,
  functionName: string,
  tests: TestCase[]
): Promise<TestRunResult[]> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL("./PyodideWorker.ts", import.meta.url), {
      type: "module"
    });

    let timer: ReturnType<typeof setTimeout>;

    function fail(message: string) {
      clearTimeout(timer);
      worker.terminate();
      reject(new Error(message));
    }

    timer = setTimeout(
      () => fail("Loading the Python runtime is taking unusually long. Check your connection and try again."),
      LOAD_TIMEOUT_MS
    );

    worker.onmessage = (
      event: MessageEvent<{ type: "ready" } | { type: "result"; results: TestRunResult[] }>
    ) => {
      if (event.data.type === "ready") {
        clearTimeout(timer);
        timer = setTimeout(() => fail("Your code timed out (possible infinite loop)."), RUN_TIMEOUT_MS + 2000);
        return;
      }
      if (event.data.type === "result") {
        clearTimeout(timer);
        worker.terminate();
        resolve(event.data.results);
      }
    };

    worker.onerror = (err) => {
      clearTimeout(timer);
      worker.terminate();
      reject(err);
    };

    worker.postMessage({ type: "run", code, functionName, tests, timeoutMs: RUN_TIMEOUT_MS });
  });
}
