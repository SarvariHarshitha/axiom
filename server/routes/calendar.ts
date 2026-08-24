import type { FastifyInstance } from "fastify";
import { getCalendarSummaries } from "../db/summaries.js";

export async function calendarRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/calendar", async (req) => {
    const { from, to } = req.query as { from?: string; to?: string };
    const fromDate = from ?? "0000-01-01";
    const toDate = to ?? "9999-12-31";
    const summaries = getCalendarSummaries(fromDate, toDate);
    return summaries.map((s) => ({
      date: s.date,
      count: s.completed ? 2 : s.partial ? 1 : 0,
      level: s.completed ? 2 : s.partial ? 1 : 0,
      paperTitle: s.paper_title,
      phase: s.phase,
      topics: JSON.parse(s.topics) as string[],
      testsPassed: s.tests_passed,
      testsTotal: s.tests_total,
      timeSpentSec: s.time_spent_sec,
      reflection: s.reflection
    }));
  });
}
