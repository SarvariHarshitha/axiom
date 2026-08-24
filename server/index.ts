import Fastify from "fastify";
import cors from "@fastify/cors";
import { env } from "./env.js";
import "./db/index.js"; // ensures schema is applied on boot
import { todayRoutes } from "./routes/today.js";
import { generateRoutes } from "./routes/generate.js";
import { validateRoutes } from "./routes/validate.js";
import { summaryRoutes } from "./routes/summary.js";
import { calendarRoutes } from "./routes/calendar.js";
import { pdfRoutes } from "./routes/pdf.js";
import { startScheduler, catchUpOnLaunch } from "./scheduler/cron.js";

const app = Fastify({ logger: true });

await app.register(cors, { origin: true });

app.get("/api/health", async () => ({ ok: true }));

await app.register(todayRoutes);
await app.register(generateRoutes);
await app.register(validateRoutes);
await app.register(summaryRoutes);
await app.register(calendarRoutes);
await app.register(pdfRoutes);

startScheduler();

app.listen({ port: env.PORT, host: env.HOST }, (err) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
  // Runs after the server is already accepting connections — the pipeline
  // call out to arXiv/HF/S2/OpenAlex/the LLM can take a while and must not
  // block /api/health or the rest of the API from coming up.
  catchUpOnLaunch().catch((catchUpErr) => app.log.error(catchUpErr));
});
