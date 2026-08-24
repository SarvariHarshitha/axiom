import cron from "node-cron";
import { env } from "../env.js";
import { todayInAppTimezone } from "../date.js";
import { getLastSummaryDate } from "../db/summaries.js";
import { getCurrentDay, setCurrentDay } from "../dayState.js";
import { selectTodaysPaper } from "../papers/pipeline.js";
import { generateDay } from "../generate.js";

async function runDailyGeneration(): Promise<void> {
  const date = todayInAppTimezone();
  const paper = await selectTodaysPaper();
  const day = await generateDay(paper);
  setCurrentDay(date, day);
}

/** In-process backup scheduler — fires when the app happens to be open at DAILY_CRON. */
export function startScheduler(): void {
  cron.schedule(
    env.DAILY_CRON,
    () => {
      runDailyGeneration().catch((err) => console.error("Scheduled generation failed:", err));
    },
    { timezone: env.APP_TIMEZONE }
  );
}

/**
 * Catch-up-on-launch: the primary mechanism, since the laptop is commonly
 * asleep at the scheduled time. On every app start, if there's no summary
 * for "today" (IST) yet and no in-memory day generated, run generation now.
 */
export async function catchUpOnLaunch(): Promise<void> {
  const today = todayInAppTimezone();
  const lastSummaryDate = getLastSummaryDate();
  const current = getCurrentDay();

  const needsCatchUp = current?.date !== today && lastSummaryDate !== today;
  if (!needsCatchUp) return;

  try {
    await runDailyGeneration();
  } catch (err) {
    console.error("Catch-up-on-launch generation failed:", err);
  }
}
