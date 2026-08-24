import type { FastifyInstance } from "fastify";
import { createReadStream } from "node:fs";
import { getCachedPdfPath } from "../papers/pdfcache.js";

export async function pdfRoutes(app: FastifyInstance): Promise<void> {
  // Serves the locally-cached PDF from our own origin — sidesteps remote
  // X-Frame-Options entirely, since PDF.js renders raw bytes we host ourselves.
  app.get("/api/pdf/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const path = getCachedPdfPath(id);
    if (!path) return reply.code(404).send({ error: "No cached PDF for that paper id" });
    reply.header("Content-Type", "application/pdf");
    return reply.send(createReadStream(path));
  });
}
