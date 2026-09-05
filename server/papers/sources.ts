import { env } from "../env.js";

const ARXIV_API = "https://export.arxiv.org/api/query";
const HF_DAILY_PAPERS_API = "https://huggingface.co/api/daily_papers";
const SEMANTIC_SCHOLAR_API = "https://api.semanticscholar.org/graph/v1";
const OPENALEX_API = "https://api.openalex.org/works";

const USER_AGENT = "Axiom/0.1 (local-first study app; contact via .env UNPAYWALL_EMAIL)";

// arXiv guidance: <=1 req/3s, honor Crawl-delay 15, use export.arxiv.org, backoff on 429/503.
let lastArxivCall = 0;
async function throttleArxiv(): Promise<void> {
  const elapsed = Date.now() - lastArxivCall;
  const minGap = 3000;
  if (elapsed < minGap) {
    await new Promise((r) => setTimeout(r, minGap - elapsed));
  }
  lastArxivCall = Date.now();
}

async function fetchWithBackoff(
  url: string,
  init: RequestInit = {},
  retries = 3
): Promise<Response> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const res = await fetch(url, {
      ...init,
      headers: { "User-Agent": USER_AGENT, ...init.headers }
    });
    if (res.status !== 429 && res.status !== 503) return res;
    const backoffMs = 1000 * 2 ** attempt;
    await new Promise((r) => setTimeout(r, backoffMs));
  }
  return fetch(url, { ...init, headers: { "User-Agent": USER_AGENT, ...init.headers } });
}

export interface ArxivEntry {
  id: string; // 'arXiv:1706.03762'
  title: string;
  abstract: string;
  url: string;
  pdfUrl: string;
  publishedDate: string;
}

/** Query arXiv for recent papers in the given categories. */
export async function fetchArxivRecent(
  categories: string[],
  maxResults = 25
): Promise<ArxivEntry[]> {
  await throttleArxiv();
  const search = categories.map((c) => `cat:${c}`).join("+OR+");
  const url = `${ARXIV_API}?search_query=${encodeURIComponent(search)}&sortBy=submittedDate&sortOrder=descending&max_results=${maxResults}`;
  const res = await fetchWithBackoff(url);
  if (!res.ok) throw new Error(`arXiv API ${res.status}`);
  const xml = await res.text();
  return parseArxivFeed(xml);
}

/** Fetch a single arXiv paper's metadata by id (e.g. '1706.03762'). */
export async function fetchArxivById(arxivId: string): Promise<ArxivEntry | undefined> {
  await throttleArxiv();
  const url = `${ARXIV_API}?id_list=${encodeURIComponent(arxivId)}`;
  const res = await fetchWithBackoff(url);
  if (!res.ok) throw new Error(`arXiv API ${res.status}`);
  const xml = await res.text();
  return parseArxivFeed(xml)[0];
}

function parseArxivFeed(xml: string): ArxivEntry[] {
  const entries: ArxivEntry[] = [];
  const entryBlocks = xml.split("<entry>").slice(1);
  for (const block of entryBlocks) {
    const idMatch = block.match(/<id>(.*?)<\/id>/);
    const titleMatch = block.match(/<title>([\s\S]*?)<\/title>/);
    const summaryMatch = block.match(/<summary>([\s\S]*?)<\/summary>/);
    const publishedMatch = block.match(/<published>(.*?)<\/published>/);
    if (!idMatch || !titleMatch || !summaryMatch) continue;

    const absUrl = idMatch[1]!.trim();
    const arxivId = absUrl.split("/abs/")[1] ?? absUrl;

    entries.push({
      id: `arXiv:${arxivId}`,
      title: titleMatch[1]!.replace(/\s+/g, " ").trim(),
      abstract: summaryMatch[1]!.replace(/\s+/g, " ").trim(),
      url: absUrl,
      pdfUrl: `https://arxiv.org/pdf/${arxivId}`,
      publishedDate: publishedMatch?.[1]?.trim() ?? ""
    });
  }
  return entries;
}

export interface HFDailyPaper {
  id: string; // arXiv id
  title: string;
  summary: string;
  publishedAt: string;
  upvotes: number;
}

/** Hugging Face Daily Papers feed — no auth required. */
export async function fetchHFDailyPapers(date?: string): Promise<HFDailyPaper[]> {
  const url = date ? `${HF_DAILY_PAPERS_API}?date=${date}` : HF_DAILY_PAPERS_API;
  const res = await fetchWithBackoff(url);
  if (!res.ok) throw new Error(`HF Daily Papers API ${res.status}`);
  const data = (await res.json()) as any[];
  return data.map((d) => ({
    id: d.paper?.id ?? d.id,
    title: d.paper?.title ?? d.title ?? "",
    summary: d.paper?.summary ?? "",
    publishedAt: d.publishedAt ?? "",
    upvotes: d.paper?.upvotes ?? 0
  }));
}

export interface S2Metadata {
  citationCount: number;
  influentialCitationCount: number;
  isOpenAccess: boolean;
  openAccessPdf?: { url: string; license?: string };
}

/** Semantic Scholar Graph API. Requires exponential backoff (rate-limited). */
export async function fetchSemanticScholarByArxivId(
  arxivId: string
): Promise<S2Metadata | undefined> {
  const fields = "citationCount,influentialCitationCount,isOpenAccess,openAccessPdf";
  const url = `${SEMANTIC_SCHOLAR_API}/paper/arXiv:${arxivId}?fields=${fields}`;
  const headers: Record<string, string> = {};
  if (env.SEMANTIC_SCHOLAR_API_KEY) headers["x-api-key"] = env.SEMANTIC_SCHOLAR_API_KEY;

  const res = await fetchWithBackoff(url, { headers });
  if (res.status === 404) return undefined;
  if (!res.ok) throw new Error(`Semantic Scholar API ${res.status}`);
  const data = (await res.json()) as any;
  return {
    citationCount: data.citationCount ?? 0,
    influentialCitationCount: data.influentialCitationCount ?? 0,
    isOpenAccess: data.isOpenAccess ?? false,
    openAccessPdf: data.openAccessPdf
      ? { url: data.openAccessPdf.url, license: data.openAccessPdf.license }
      : undefined
  };
}

export interface OpenAlexMetadata {
  isOpenAccess: boolean;
  oaUrl?: string;
  license?: string;
  citedByCount: number;
}

/** OpenAlex — no key, CC0 metadata. Resilient fallback + secondary citation source. */
export async function fetchOpenAlexByArxivId(
  arxivId: string
): Promise<OpenAlexMetadata | undefined> {
  const url = `${OPENALEX_API}/https://arxiv.org/abs/${arxivId}?mailto=${encodeURIComponent(env.UNPAYWALL_EMAIL)}`;
  const res = await fetchWithBackoff(url);
  if (res.status === 404) return undefined;
  if (!res.ok) throw new Error(`OpenAlex API ${res.status}`);
  const data = (await res.json()) as any;
  return {
    isOpenAccess: data.open_access?.is_oa ?? false,
    oaUrl: data.open_access?.oa_url,
    license: data.primary_location?.license,
    citedByCount: data.cited_by_count ?? 0
  };
}
