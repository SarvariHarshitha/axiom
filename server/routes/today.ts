import type { FastifyInstance } from "fastify";
import { getCurrentDay } from "../dayState.js";

export async function todayRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/today", async (_req, reply) => {
    const current = getCurrentDay();
    if (!current) {
      return reply.code(404).send({ error: "No day generated yet. POST /api/generate first." });
    }
    // Never send referenceSolution to the client until "reveal" is requested.
    const { day } = current;
    return {
      date: current.date,
      paper: day.paper,
      summary: day.summary,
      questions: day.questions.map((q) => ({
        id: q.id,
        prompt: q.prompt,
        functionSignature: q.functionSignature,
        docstring: q.docstring,
        visibleTests: q.visibleTests,
        difficulty: q.difficulty,
        concepts: q.concepts
      }))
    };
  });
}
