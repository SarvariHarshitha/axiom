import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { api, type TodayResponse } from "./api.js";
import type { RuntimePackage } from "./ide/TestRunner.js";

export type QuestionStatus = "untouched" | "attempted" | "solved";

export interface QuestionState {
  code: string;
  runtimePackage: RuntimePackage;
  visibleResults?: { pass: boolean; actual?: unknown; error?: string }[];
  hiddenPassCount?: number;
  hiddenTotal?: number;
  allPassed?: boolean;
  running: boolean;
  runError?: string;
  /** Elapsed seconds spent on this question, LeetCode-style. Frozen once solved. */
  elapsedSec: number;
  timerStartedAt?: number;
}

interface DayContextValue {
  data?: TodayResponse;
  loading: boolean;
  error?: string;
  states: Record<string, QuestionState>;
  generate: () => Promise<void>;
  updateCode: (questionId: string, code: string) => void;
  setRuntimePackage: (questionId: string, pkg: RuntimePackage) => void;
  clearCode: (questionId: string) => void;
  runQuestion: (questionId: string) => Promise<void>;
  statusFor: (questionId: string) => QuestionStatus;
  allSolved: boolean;
  completeDay: () => Promise<void>;
  dayCompleted: boolean;
  elapsedSecFor: (questionId: string) => number;
  startTimer: (questionId: string) => void;
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
  // Bumped once a second so components reading elapsedSecFor() re-render
  // live without storing a re-render-triggering value per question.
  const [, setTick] = useState(0);
  const statesRef = useRef(states);
  statesRef.current = states;

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const load = useCallback((d: TodayResponse) => {
    setData(d);
    setStates((prev) => {
      const next: Record<string, QuestionState> = {};
      for (const q of d.questions) {
        next[q.id] = prev[q.id] ?? {
          code: starterCode(q),
          runtimePackage: "python",
          running: false,
          elapsedSec: 0
        };
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

  function setRuntimePackage(questionId: string, pkg: RuntimePackage) {
    setStates((prev) => ({ ...prev, [questionId]: { ...prev[questionId]!, runtimePackage: pkg } }));
  }

  function clearCode(questionId: string) {
    if (!data) return;
    const q = data.questions.find((qq) => qq.id === questionId);
    if (!q) return;
    setStates((prev) => ({
      ...prev,
      [questionId]: {
        ...prev[questionId]!,
        code: starterCode(q),
        visibleResults: undefined,
        allPassed: undefined,
        runError: undefined
      }
    }));
  }

  /** Starts (or resumes) the LeetCode-style per-question timer. No-op once solved or already running. */
  function startTimer(questionId: string) {
    setStates((prev) => {
      const s = prev[questionId];
      if (!s || s.timerStartedAt || s.allPassed) return prev;
      return { ...prev, [questionId]: { ...s, timerStartedAt: Date.now() } };
    });
  }

  function pauseTimer(questionId: string) {
    setStates((prev) => {
      const s = prev[questionId];
      if (!s || !s.timerStartedAt) return prev;
      const elapsedSec = s.elapsedSec + Math.round((Date.now() - s.timerStartedAt) / 1000);
      return { ...prev, [questionId]: { ...s, elapsedSec, timerStartedAt: undefined } };
    });
  }

  function elapsedSecFor(questionId: string): number {
    const s = statesRef.current[questionId];
    if (!s) return 0;
    if (!s.timerStartedAt) return s.elapsedSec;
    return s.elapsedSec + Math.round((Date.now() - s.timerStartedAt) / 1000);
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
      const results = await runInPyodideWorker(state.code, fnName, q.visibleTests, state.runtimePackage);
      const allPassed = results.every((r) => r.pass);
      setStates((prev) => ({
        ...prev,
        [questionId]: { ...prev[questionId]!, visibleResults: results, allPassed, running: false }
      }));
      if (allPassed) pauseTimer(questionId);
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
        setRuntimePackage,
        clearCode,
        runQuestion,
        statusFor,
        allSolved,
        completeDay,
        dayCompleted,
        elapsedSecFor,
        startTimer
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
