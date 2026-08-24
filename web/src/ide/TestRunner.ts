export interface TestCase {
  input: unknown[];
  expected: unknown;
}

export interface TestRunResult {
  pass: boolean;
  error?: string;
}

const RUN_TIMEOUT_MS = 5000;

/**
 * Thin wrapper around the Pyodide Web Worker. One worker per run keeps
 * failures (e.g. an infinite loop that ignores postMessage) isolated —
 * terminate() always reclaims it.
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

    const timer = setTimeout(() => {
      worker.terminate();
      reject(new Error("Worker timed out"));
    }, RUN_TIMEOUT_MS + 2000);

    worker.onmessage = (event: MessageEvent<{ type: string; results: TestRunResult[] }>) => {
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
