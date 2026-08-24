import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api, type TodayResponse } from "./api.js";

export type QuestionStatus = "untouched" | "attempted" | "solved";

export interface QuestionState {
  code: string;
  visibleResults?: { pass: boolean }[];
  hiddenPassCount?: number;
  hiddenTotal?: number;
  allPassed?: boolean;
  running: boolean;
  runError?: string;
}

interface DayContextValue {
  data?: TodayResponse;
  loading: boolean;
  error?: string;
  states: Record<string, QuestionState>;
  generate: () => Promise<void>;
  updateCode: (questionId: string, code: string) => void;
  runQuestion: (questionId: string) => Promise<void>;
  statusFor: (questionId: string) => QuestionStatus;
  allSolved: boolean;
  completeDay: () => Promise<void>;
  dayCompleted: boolean;
}

const DayContext = createContext<DayContextValue | undefined>(undefined);

function starterCode(q: TodayResponse["questions"][number]): string {
  return `${q.functionSignature}\n    """${q.docstring}"""\n    # TODO: implement\n    pass\n`;
}

function functionNameFromSignature(signature: string): string {
  return signature.match(/def\s+(\w+)/)?.[1] ?? "solution";
}

export function DayProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<TodayResponse>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [states, setStates] = useState<Record<string, QuestionState>>({});
  const [startedAt] = useState(() => Date.now());
  const [dayCompleted, setDayCompleted] = useState(false);

  const load = useCallback((d: TodayResponse) => {
    setData(d);
    setStates((prev) => {
      const next: Record<string, QuestionState> = {};
      for (const q of d.questions) {
        next[q.id] = prev[q.id] ?? { code: starterCode(q), running: false };
      }
      return next;
    });
  }, []);

  useEffect(() => {
    api.today().then(load).catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function generate() {
    setLoading(true);
    setError(undefined);
    try {
      await api.generate();
      const d = await api.today();
      load(d);
      setDayCompleted(false);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }

  function updateCode(questionId: string, code: string) {
    setStates((prev) => ({ ...prev, [questionId]: { ...prev[questionId]!, code } }));
  }

  async function runQuestion(questionId: string) {
    if (!data) return;
    const q = data.questions.find((qq) => qq.id === questionId);
    if (!q) return;

    setStates((prev) => ({
      ...prev,
      [questionId]: { ...prev[questionId]!, running: true, runError: undefined }
    }));

    const { runInPyodideWorker } = await import("./ide/TestRunner.js");
    const fnName = functionNameFromSignature(q.functionSignature);
    const state = states[questionId]!;

    try {
      const results = await runInPyodideWorker(state.code, fnName, q.visibleTests);
      const allPassed = results.every((r) => r.pass);
      setStates((prev) => ({
        ...prev,
        [questionId]: { ...prev[questionId]!, visibleResults: results, allPassed, running: false }
      }));
    } catch (err) {
      setStates((prev) => ({
        ...prev,
        [questionId]: { ...prev[questionId]!, running: false, runError: String(err) }
      }));
    }
  }

  function statusFor(questionId: string): QuestionStatus {
    const s = states[questionId];
    if (!s) return "untouched";
    if (s.allPassed) return "solved";
    if (s.visibleResults) return "attempted";
    return "untouched";
  }

  const allSolved =
    !!data && data.questions.length > 0 && data.questions.every((q) => states[q.id]?.allPassed);

  async function completeDay() {
    if (!data) return;
    const timeSpentSec = Math.round((Date.now() - startedAt) / 1000);
    const testsTotal = data.questions.reduce((sum, q) => sum + q.visibleTests.length, 0);
    const testsPassed = data.questions.reduce(
      (sum, q) => sum + (states[q.id]?.visibleResults?.filter((r) => r.pass).length ?? 0),
      0
    );
    await api.submitSummary({
      questionsPassed: data.questions.filter((q) => states[q.id]?.allPassed).length,
      testsTotal,
      testsPassed,
      completed: allSolved,
      partial: false,
      timeSpentSec
    });
    setDayCompleted(true);
  }

  return (
    <DayContext.Provider
      value={{
        data,
        loading,
        error,
        states,
        generate,
        updateCode,
        runQuestion,
        statusFor,
        allSolved,
        completeDay,
        dayCompleted
      }}
    >
      {children}
    </DayContext.Provider>
  );
}

export function useDay(): DayContextValue {
  const ctx = useContext(DayContext);
  if (!ctx) throw new Error("useDay must be used within DayProvider");
  return ctx;
}
