import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { getCurrentDay } from "../dayState.js";
import { runPythonAgainstTests } from "../validate/pyrunner.js";

const bodySchema = z.object({
  questionId: z.string(),
  code: z.string(),
  functionName: z.string()
});

export async function validateRoutes(app: FastifyInstance): Promise<void> {
  // Fallback / server-side gate check — primary execution is client-side Pyodide.
  app.post("/api/validate-run", async (req, reply) => {
    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "Invalid body", detail: parsed.error.flatten() });
    }
    const { questionId, code, functionName } = parsed.data;

    const current = getCurrentDay();
    if (!current) return reply.code(404).send({ error: "No day generated yet" });

    const question = current.day.questions.find((q) => q.id === questionId);
    if (!question) return reply.code(404).send({ error: "Unknown question id" });

    const allTests = [...question.visibleTests, ...question.hiddenTests];
    const results = await runPythonAgainstTests(code, functionName, allTests);

    const visibleResults = results.slice(0, question.visibleTests.length);
    const hiddenResults = results.slice(question.visibleTests.length);

    return {
      visible: visibleResults,
      hiddenPassCount: hiddenResults.filter((r) => r.pass).length,
      hiddenTotal: hiddenResults.length,
      allPassed: results.every((r) => r.pass)
    };
  });
}
