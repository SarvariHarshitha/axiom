export interface TodayResponse {
  date: string;
  paper: {
    id: string;
    title: string;
    url: string;
    pdfUrl?: string;
    isOpenAccess: boolean;
    license?: string;
    phase: string;
    concepts: string[];
  };
  summary: string;
  questions: {
    id: string;
    prompt: string;
    functionSignature: string;
    docstring: string;
    visibleTests: { input: unknown[]; expected: unknown }[];
    difficulty: "easy" | "medium" | "hard";
    concepts: string[];
  }[];
}

export interface NewsCard {
  id: number;
  title: string;
  url: string;
  hnUrl: string;
  source: string;
  score: number;
  by: string;
  time: number;
  descendants: number;
  hasImage: boolean;
}

export interface CalendarEntry {
  date: string;
  count: number;
  level: number;
  paperTitle: string;
  phase: string;
  topics: string[];
  testsPassed: number;
  testsTotal: number;
  timeSpentSec: number;
  reflection: string | null;
}

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`);
  return res.json() as Promise<T>;
}

export const api = {
  today: () => fetch("/api/today").then((r) => json<TodayResponse>(r)),

  generate: () => fetch("/api/generate", { method: "POST" }).then((r) => json<{ date: string }>(r)),

  validateRun: (body: { questionId: string; code: string; functionName: string }) =>
    fetch("/api/validate-run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    }).then((r) =>
      json<{ visible: { pass: boolean }[]; hiddenPassCount: number; hiddenTotal: number; allPassed: boolean }>(r)
    ),

  submitSummary: (body: {
    questionsPassed: number;
    testsTotal: number;
    testsPassed: number;
    completed: boolean;
    partial: boolean;
    timeSpentSec: number;
    reflection?: string;
  }) =>
    fetch("/api/summary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    }).then((r) => json<{ ok: true }>(r)),

  calendar: (from?: string, to?: string) => {
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    const qs = params.toString();
    return fetch(`/api/calendar${qs ? `?${qs}` : ""}`).then((r) => json<CalendarEntry[]>(r));
  },

  news: () => fetch("/api/news").then((r) => json<NewsCard[]>(r))
};
