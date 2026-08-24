import type { PaperRef } from "./types.js";

export interface RankWeights {
  canon: number;
  citationVelocity: number;
  recency: number;
  phaseFit: number;
  seenPenalty: number;
}

export const DEFAULT_WEIGHTS: RankWeights = {
  canon: 3,
  citationVelocity: 1,
  recency: 0.5,
  phaseFit: 2,
  seenPenalty: -100 // effectively disqualifies already-seen papers
};

export interface ScoredPaper {
  paper: PaperRef;
  score: number;
}

function monthsSince(dateStr: string | undefined): number {
  if (!dateStr) return 999;
  const published = new Date(dateStr).getTime();
  const now = Date.now();
  const months = (now - published) / (1000 * 60 * 60 * 24 * 30);
  return Math.max(months, 0.5); // avoid div-by-near-zero
}

export function citationVelocity(paper: PaperRef): number {
  const influential = paper.influentialCitationCount ?? 0;
  return influential / monthsSince(paper.publishedDate);
}

export function scorePaper(
  paper: PaperRef,
  opts: {
    isCanon: boolean;
    currentPhaseKey: string;
    alreadySeen: boolean;
    weights?: RankWeights;
  }
): number {
  const w = opts.weights ?? DEFAULT_WEIGHTS;

  const canonScore = opts.isCanon ? 1 : 0;
  const velocity = citationVelocity(paper);
  const recency = 1 / monthsSince(paper.publishedDate);
  const phaseFit = paper.phase === opts.currentPhaseKey ? 1 : 0;
  const seenPenalty = opts.alreadySeen ? 1 : 0;

  return (
    w.canon * canonScore +
    w.citationVelocity * velocity +
    w.recency * recency +
    w.phaseFit * phaseFit +
    w.seenPenalty * seenPenalty
  );
}

/** Rank a candidate pool and return the best-scoring paper, or undefined if empty. */
export function rankPapers(
  candidates: PaperRef[],
  opts: {
    canonIds: Set<string>;
    currentPhaseKey: string;
    seenIds: Set<string>;
    weights?: RankWeights;
  }
): ScoredPaper[] {
  return candidates
    .map((paper) => ({
      paper,
      score: scorePaper(paper, {
        isCanon: opts.canonIds.has(paper.id),
        currentPhaseKey: opts.currentPhaseKey,
        alreadySeen: opts.seenIds.has(paper.id),
        weights: opts.weights
      })
    }))
    .sort((a, b) => b.score - a.score);
}
