import { mkdirSync, writeFileSync, existsSync, readdirSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { env } from "../env.js";

mkdirSync(env.NEWS_IMAGE_CACHE_DIR, { recursive: true });

const USER_AGENT =
  "Mozilla/5.0 (compatible; Axiom/0.1; local-first study app)";
const FETCH_TIMEOUT_MS = 6000;
const MAX_HTML_BYTES = 2_000_000; // stop reading a page after ~2MB; og:image is always in <head>
const MAX_IMAGE_BYTES = 4_000_000;

function cacheBasePath(storyId: number): string {
  return join(env.NEWS_IMAGE_CACHE_DIR, `${storyId}`);
}

function existingCachedFile(storyId: number): string | undefined {
  const base = cacheBasePath(storyId);
  for (const ext of ["jpg", "jpeg", "png", "webp", "gif", "none"]) {
    const path = `${base}.${ext}`;
    if (existsSync(path)) return path;
  }
  return undefined;
}

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      signal: controller.signal,
      redirect: "follow"
    });
  } finally {
    clearTimeout(timer);
  }
}

function extractOgImage(html: string, pageUrl: string): string | undefined {
  const patterns = [
    /<meta[^>]+property=["']og:image(?::secure_url)?["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image(?::secure_url)?["']/i,
    /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) {
      try {
        return new URL(match[1], pageUrl).toString();
      } catch {
        continue;
      }
    }
  }
  return undefined;
}

function extFromContentType(contentType: string | null): string {
  if (!contentType) return "jpg";
  if (contentType.includes("png")) return "png";
  if (contentType.includes("webp")) return "webp";
  if (contentType.includes("gif")) return "gif";
  return "jpg";
}

/**
 * Best-effort: fetches a story's article page, extracts its og:image (or
 * twitter:image), downloads and caches that image locally, and returns the
 * local cache path. Writes a ".none" marker file on any failure so repeat
 * requests for a story with no image don't re-fetch every time. Never
 * throws - callers fall back to a generated placeholder on undefined.
 */
export async function fetchAndCacheOgImage(
  storyId: number,
  articleUrl: string
): Promise<string | undefined> {
  const cached = existingCachedFile(storyId);
  if (cached) return cached.endsWith(".none") ? undefined : cached;

  const markNone = () => {
    writeFileSync(`${cacheBasePath(storyId)}.none`, "");
    return undefined;
  };

  try {
    const pageRes = await fetchWithTimeout(articleUrl, FETCH_TIMEOUT_MS);
    if (!pageRes.ok || !pageRes.body) return markNone();

    const contentType = pageRes.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html")) return markNone();

    // Read only up to MAX_HTML_BYTES - og:image is always in <head>.
    const reader = pageRes.body.getReader();
    let html = "";
    let bytesRead = 0;
    const decoder = new TextDecoder();
    while (bytesRead < MAX_HTML_BYTES) {
      const { done, value } = await reader.read();
      if (done) break;
      bytesRead += value.byteLength;
      html += decoder.decode(value, { stream: true });
      if (/<\/head>/i.test(html)) break;
    }
    reader.cancel().catch(() => undefined);

    const imageUrl = extractOgImage(html, pageRes.url || articleUrl);
    if (!imageUrl) return markNone();

    const imgRes = await fetchWithTimeout(imageUrl, FETCH_TIMEOUT_MS);
    if (!imgRes.ok) return markNone();

    const buf = Buffer.from(await imgRes.arrayBuffer());
    if (buf.byteLength === 0 || buf.byteLength > MAX_IMAGE_BYTES) return markNone();

    const ext = extFromContentType(imgRes.headers.get("content-type"));
    const path = `${cacheBasePath(storyId)}.${ext}`;
    writeFileSync(path, buf);
    return path;
  } catch {
    return markNone();
  }
}

export function getCachedOgImagePath(storyId: number): string | undefined {
  const cached = existingCachedFile(storyId);
  return cached && !cached.endsWith(".none") ? cached : undefined;
}

/** Removes cache entries for story ids no longer in the current news list. */
export function pruneOgImageCache(activeStoryIds: Set<number>): void {
  for (const file of readdirSync(env.NEWS_IMAGE_CACHE_DIR)) {
    const id = Number(file.split(".")[0]);
    if (!Number.isNaN(id) && !activeStoryIds.has(id)) {
      try {
        unlinkSync(join(env.NEWS_IMAGE_CACHE_DIR, file));
      } catch {
        // best-effort cleanup
      }
    }
  }
}
