import { fetchAINews, type HNStory } from "./hn.js";
import { fetchAndCacheOgImage, pruneOgImageCache } from "./ogimage.js";

export interface NewsCard {
  id: number;
  title: string;
  url: string; // article URL, or the HN thread if the story has no external link
  hnUrl: string;
  source: string; // registrable domain of the article, or "news.ycombinator.com"
  score: number;
  by: string;
  time: number;
  descendants: number;
  hasImage: boolean;
}

const CARD_COUNT = 16;
const REFRESH_INTERVAL_MS = 30 * 60 * 1000; // 30 min - HN scores/rankings drift slowly

let cache: { cards: NewsCard[]; fetchedAt: number } | undefined;
let inFlight: Promise<NewsCard[]> | undefined;

function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "news.ycombinator.com";
  }
}

async function buildCards(): Promise<NewsCard[]> {
  const stories = await fetchAINews(CARD_COUNT);

  await Promise.all(
    stories.map((s) => fetchAndCacheOgImage(s.id, s.url ?? s.hnUrl).catch(() => undefined))
  );
  pruneOgImageCache(new Set(stories.map((s) => s.id)));

  const { getCachedOgImagePath } = await import("./ogimage.js");

  return stories.map((s: HNStory) => ({
    id: s.id,
    title: s.title,
    url: s.url ?? s.hnUrl,
    hnUrl: s.hnUrl,
    source: domainOf(s.url ?? s.hnUrl),
    score: s.score,
    by: s.by,
    time: s.time,
    descendants: s.descendants,
    hasImage: !!getCachedOgImagePath(s.id)
  }));
}

/** Returns cached AI news cards, refreshing in the background at most every 30 min. */
export async function getNewsCards(): Promise<NewsCard[]> {
  const isStale = !cache || Date.now() - cache.fetchedAt > REFRESH_INTERVAL_MS;

  if (isStale && !inFlight) {
    inFlight = buildCards()
      .then((cards) => {
        cache = { cards, fetchedAt: Date.now() };
        return cards;
      })
      .finally(() => {
        inFlight = undefined;
      });
  }

  if (cache) return cache.cards; // serve stale-while-revalidate if we have anything
  return inFlight!;
}
