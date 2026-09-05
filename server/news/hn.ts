// Sources "booming AI news" from the Hacker News Firebase API - free, no
// key, no auth. HN's front page skews heavily toward AI right now, so
// filtering top/new stories by AI keywords gives a reasonable proxy for
// "AI news" without adding a paid news API or new vendor ToS to vet.
const HN_API = "https://hacker-news.firebaseio.com/v0";
const USER_AGENT = "Axiom/0.1 (local-first study app)";

// Short/ambiguous tokens ("ai", "gpt", "agi", "llm") need WORD-BOUNDARY
// matching - a plain substring match on "ai" fires on "aircraft",
// "Fairphone", "domain", etc. Longer, distinctive phrases are safe as
// substrings since they essentially never occur inside unrelated words.
const WORD_BOUNDARY_KEYWORDS = ["ai", "gpt", "agi", "llm", "asi", "rl"];
const SUBSTRING_KEYWORDS = [
  "artificial intelligence",
  "large language model",
  "chatgpt",
  "openai",
  "anthropic",
  "claude",
  "gemini",
  "deepmind",
  "deepseek",
  "mistral",
  "llama",
  "transformer",
  "neural network",
  "machine learning",
  "generative ai",
  "diffusion model",
  "agentic",
  "ai agent",
  "copilot",
  "hugging face",
  "stable diffusion",
  "midjourney",
  "nvidia",
  "qwen",
  "grok",
  "gemma",
  "claude code",
  "cursor ai"
];

const wordBoundaryPattern = new RegExp(
  `\\b(${WORD_BOUNDARY_KEYWORDS.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})\\b`,
  "i"
);

function mentionsAI(title: string): boolean {
  const lower = title.toLowerCase();
  if (wordBoundaryPattern.test(title)) return true;
  return SUBSTRING_KEYWORDS.some((kw) => lower.includes(kw));
}

export interface HNStory {
  id: number;
  title: string;
  url?: string; // absent for Ask/Show HN text posts
  hnUrl: string; // link to the HN discussion thread itself
  score: number;
  by: string;
  time: number; // unix seconds
  descendants: number; // comment count
}

async function fetchStoryIds(listName: "topstories" | "newstories"): Promise<number[]> {
  const res = await fetch(`${HN_API}/${listName}.json`, {
    headers: { "User-Agent": USER_AGENT }
  });
  if (!res.ok) throw new Error(`HN ${listName} API ${res.status}`);
  return (await res.json()) as number[];
}

async function fetchItem(id: number): Promise<any | undefined> {
  const res = await fetch(`${HN_API}/item/${id}.json`, {
    headers: { "User-Agent": USER_AGENT }
  });
  if (!res.ok) return undefined;
  return res.json();
}

/**
 * Fetches AI-related stories from HN's top+new feeds, ranked by score.
 * Scans a bounded window of candidate IDs rather than the whole feed to
 * keep this fast (HN has no server-side keyword search).
 */
export async function fetchAINews(limit = 16): Promise<HNStory[]> {
  const [topIds, newIds] = await Promise.all([
    fetchStoryIds("topstories"),
    fetchStoryIds("newstories")
  ]);

  const candidateIds = [...new Set([...topIds.slice(0, 120), ...newIds.slice(0, 80)])];

  const items = await Promise.all(candidateIds.map((id) => fetchItem(id)));

  const stories: HNStory[] = items
    .filter((item): item is any => !!item && item.type === "story" && typeof item.title === "string")
    .filter((item) => mentionsAI(item.title))
    .map((item) => ({
      id: item.id,
      title: item.title,
      url: item.url,
      hnUrl: `https://news.ycombinator.com/item?id=${item.id}`,
      score: item.score ?? 0,
      by: item.by ?? "unknown",
      time: item.time ?? 0,
      descendants: item.descendants ?? 0
    }));

  stories.sort((a, b) => b.score - a.score);
  return stories.slice(0, limit);
}
