import type { FastifyInstance } from "fastify";
import { createReadStream } from "node:fs";
import { extname } from "node:path";
import { getNewsCards } from "../news/pipeline.js";
import { getCachedOgImagePath } from "../news/ogimage.js";

const CONTENT_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif"
};

export async function newsRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/news", async (_req, reply) => {
    try {
      const cards = await getNewsCards();
      return cards;
    } catch (err) {
      app.log.error(err);
      return reply.code(502).send({ error: "Failed to fetch AI news", detail: String(err) });
    }
  });

  // Serves cached OG images from our own origin (same rationale as
  // /api/pdf/:id) rather than hotlinking third-party article images.
  app.get("/api/news/:id/image", async (req, reply) => {
    const { id } = req.params as { id: string };
    const storyId = Number(id);
    const path = Number.isFinite(storyId) ? getCachedOgImagePath(storyId) : undefined;
    if (!path) return reply.code(404).send({ error: "No cached image for that story" });

    const contentType = CONTENT_TYPES[extname(path)] ?? "application/octet-stream";
    reply.header("Content-Type", contentType);
    reply.header("Cache-Control", "public, max-age=3600");
    return reply.send(createReadStream(path));
  });
}
