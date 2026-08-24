/**
 * Headless entry point for OS cron / Windows Task Scheduler.
 * Also invoked by `make generate` to force today's paper immediately.
 */
import "../db/index.js";
import { todayInAppTimezone } from "../date.js";
import { selectTodaysPaper } from "../papers/pipeline.js";
import { generateDay } from "../generate.js";
import { upsertDaySummary } from "../db/summaries.js";

async function main(): Promise<void> {
  const date = todayInAppTimezone();
  console.log(`[run-daily] Generating paper for ${date}...`);

  const paper = await selectTodaysPaper();
  const day = await generateDay(paper);

  // Seed a zero-progress summary row so the server's catch-up check sees
  // "today" as covered even if the browser session is never opened.
  upsertDaySummary({
    date,
    paper_id: day.paper.id,
    paper_title: day.paper.title,
    paper_url: day.paper.url,
    pdf_url: day.paper.pdfUrl ?? null,
    is_open_access: day.paper.isOpenAccess ? 1 : 0,
    license: day.paper.license ?? null,
    phase: day.paper.phase,
    topics: JSON.stringify(day.paper.concepts),
    questions_total: day.questions.length,
    questions_passed: 0,
    tests_total: day.questions.reduce(
      (sum, q) => sum + q.visibleTests.length + q.hiddenTests.length,
      0
    ),
    tests_passed: 0,
    completed: 0,
    partial: 0,
    time_spent_sec: 0,
    reflection: null,
    created_at: new Date().toISOString()
  });

  console.log(`[run-daily] Done: "${day.paper.title}" (${day.questions.length} questions)`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("[run-daily] Failed:", err);
    process.exit(1);
  });
