import type { GeneratedDay } from "./session-types.js";

/**
 * In-memory only. Discarded on process restart or day rollover — never
 * persisted. Only the derived day_summary row survives (server/db/summaries.ts).
 */
let currentDay: GeneratedDay | undefined;
let currentDayDate: string | undefined;

export function setCurrentDay(date: string, day: GeneratedDay): void {
  currentDayDate = date;
  currentDay = day;
}

export function getCurrentDay(): { date: string; day: GeneratedDay } | undefined {
  if (!currentDay || !currentDayDate) return undefined;
  return { date: currentDayDate, day: currentDay };
}

export function clearCurrentDay(): void {
  currentDay = undefined;
  currentDayDate = undefined;
}
