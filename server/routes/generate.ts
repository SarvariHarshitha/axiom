import type { FastifyInstance } from "fastify";
import { selectTodaysPaper } from "../papers/pipeline.js";
import { generateDay } from "../generate.js";
import { setCurrentDay } from "../dayState.js";
import { todayInAppTimezone } from "../date.js";

export async function generateRoutes(app: FastifyInstance): Promise<void> {
  app.post("/api/generate", async (_req, reply) => {
    const date = todayInAppTimezone();
    try {
      const paper = await selectTodaysPaper();
      const day = await generateDay(paper);
      setCurrentDay(date, day);
      return {
        date,
        paper: day.paper,
        questionCount: day.questions.length
      };
    } catch (err) {
      app.log.error(err);
      return reply.code(500).send({ error: "Generation failed", detail: String(err) });
    }
  });
}
