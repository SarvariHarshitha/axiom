import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { env } from "../env.js";

mkdirSync(env.PDF_CACHE_DIR, { recursive: true });

function cachePathFor(paperId: string): string {
  const safe = paperId.replace(/[^a-zA-Z0-9_.-]/g, "_");
  return join(env.PDF_CACHE_DIR, `${safe}.pdf`);
}

/** Downloads and caches a PDF locally. Personal-cache use only (see plan.md Q2). */
export async function cachePdf(paperId: string, pdfUrl: string): Promise<string> {
  const path = cachePathFor(paperId);
  if (existsSync(path)) return path;

  const res = await fetch(pdfUrl, {
    headers: { "User-Agent": "Axiom/0.1 (local-first study app)" }
  });
  if (!res.ok) throw new Error(`Failed to download PDF: ${res.status}`);

  const buf = Buffer.from(await res.arrayBuffer());
  writeFileSync(path, buf);
  return path;
}

export function getCachedPdfPath(paperId: string): string | undefined {
  const path = cachePathFor(paperId);
  return existsSync(path) ? path : undefined;
}
