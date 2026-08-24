import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { getDaySummary, upsertDaySummary } from "../db/summaries.js";
import { getCurrentDay } from "../dayState.js";

const bodySchema = z.object({
  questionsPassed: z.number().int().min(0),
  testsTotal: z.number().int().min(0),
  testsPassed: z.number().int().min(0),
  completed: z.boolean(),
  partial: z.boolean(),
  timeSpentSec: z.number().int().min(0),
  reflection: z.string().optional()
});

export async function summaryRoutes(app: FastifyInstance): Promise<void> {
  app.post("/api/summary", async (req, reply) => {
    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "Invalid body", detail: parsed.error.flatten() });
    }

    const current = getCurrentDay();
    if (!current) return reply.code(404).send({ error: "No day generated yet" });

    const { date, day } = current;
    const b = parsed.data;

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
      questions_passed: b.questionsPassed,
      tests_total: b.testsTotal,
      tests_passed: b.testsPassed,
      completed: b.completed ? 1 : 0,
      partial: b.partial ? 1 : 0,
      time_spent_sec: b.timeSpentSec,
      reflection: b.reflection ?? null,
      created_at: new Date().toISOString()
    });

    return { ok: true };
  });

  app.get("/api/summary/:date", async (req, reply) => {
    const { date } = req.params as { date: string };
    const summary = getDaySummary(date);
    if (!summary) return reply.code(404).send({ error: "No summary for that date" });
    return summary;
  });
}
