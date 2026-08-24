import { fetchArxivById, fetchArxivRecent, fetchHFDailyPapers } from "./sources.js";
import { detectOpenAccess, isRedistributable } from "./openaccess.js";
import { cachePdf } from "./pdfcache.js";
import { getCurrentPhase, loadCanon } from "./curriculum.js";
import { rankPapers } from "./rank.js";
import { isPaperSeen, markPaperSeen } from "../db/summaries.js";
import type { PaperRef } from "./types.js";

const ARXIV_CATEGORIES = ["cs.CL", "cs.LG", "cs.AI", "cs.NE"];

function arxivIdOf(paperId: string): string {
  return paperId.replace(/^arXiv:/, "");
}

/** Runs the full daily paper-selection pipeline: source -> rank -> OA-detect -> cache. */
export async function selectTodaysPaper(): Promise<PaperRef> {
  const phase = getCurrentPhase();
  const canon = loadCanon();
  const canonIds = new Set(canon.phases.flatMap((p) => p.papers.map((paper) => paper.id)));

  const candidates: PaperRef[] = [];

  // 1. Canon papers for the current phase, not yet seen.
  for (const canonPaper of phase.papers) {
    if (isPaperSeen(canonPaper.id)) continue;
    const arxivId = arxivIdOf(canonPaper.id);
    const entry = await fetchArxivById(arxivId).catch(() => undefined);
    if (!entry) continue;
    candidates.push({
      id: entry.id,
      title: entry.title,
      abstract: entry.abstract,
      url: entry.url,
      pdfUrl: entry.pdfUrl,
      isOpenAccess: false,
      publishedDate: entry.publishedDate,
      concepts: [],
      phase: phase.key
    });
  }

  // 2. Fresh high-velocity candidates from arXiv + HF Daily Papers, within phase concepts.
  const [recentArxiv, hfDaily] = await Promise.allSettled([
    fetchArxivRecent(ARXIV_CATEGORIES, 25),
    fetchHFDailyPapers()
  ]);

  if (recentArxiv.status === "fulfilled") {
    for (const entry of recentArxiv.value) {
      if (isPaperSeen(entry.id)) continue;
      candidates.push({
        id: entry.id,
        title: entry.title,
        abstract: entry.abstract,
        url: entry.url,
        pdfUrl: entry.pdfUrl,
        isOpenAccess: false,
        publishedDate: entry.publishedDate,
        concepts: [],
        phase: phase.key
      });
    }
  }

  if (hfDaily.status === "fulfilled") {
    for (const hf of hfDaily.value) {
      const paperId = `arXiv:${hf.id}`;
      if (isPaperSeen(paperId) || candidates.some((c) => c.id === paperId)) continue;
      candidates.push({
        id: paperId,
        title: hf.title,
        abstract: hf.summary,
        url: `https://arxiv.org/abs/${hf.id}`,
        pdfUrl: `https://arxiv.org/pdf/${hf.id}`,
        isOpenAccess: false,
        publishedDate: hf.publishedAt,
        concepts: [],
        phase: phase.key
      });
    }
  }

  if (candidates.length === 0) {
    throw new Error("No paper candidates found from any source");
  }

  const seenIds = new Set<string>(); // already filtered above; kept for rank.ts API
  const ranked = rankPapers(candidates, {
    canonIds,
    currentPhaseKey: phase.key,
    seenIds
  });

  const winner = ranked[0]!.paper;

  // Open-access detection + PDF cache
  const arxivId = arxivIdOf(winner.id);
  const oa = await detectOpenAccess(arxivId).catch(
    () => ({ isOpenAccess: false }) as Awaited<ReturnType<typeof detectOpenAccess>>
  );
  winner.isOpenAccess = oa.isOpenAccess;
  winner.license = oa.license;

  if (oa.isOpenAccess && (oa.pdfUrl || winner.pdfUrl)) {
    const redistributable = isRedistributable(oa.license);
    if (redistributable) {
      try {
        await cachePdf(winner.id, oa.pdfUrl ?? winner.pdfUrl!);
      } catch {
        // fall back silently to link-out if caching fails
        winner.isOpenAccess = false;
      }
    } else {
      // Non-redistributable license: default to link-out per plan.md Q2.
      winner.isOpenAccess = false;
    }
  }

  markPaperSeen(winner.id, new Date().toISOString().slice(0, 10));

  return winner;
}
