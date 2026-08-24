import { readFileSync } from "node:fs";
import { env } from "../env.js";
import { db } from "../db/index.js";

export interface CanonPaper {
  id: string;
  title: string;
}

export interface CanonPhase {
  key: string;
  title: string;
  unlockAfter: number;
  papers: CanonPaper[];
}

interface CanonFile {
  phases: CanonPhase[];
}

let cached: CanonFile | undefined;

export function loadCanon(): CanonFile {
  if (!cached) {
    cached = JSON.parse(readFileSync(env.CANON_PATH, "utf-8")) as CanonFile;
  }
  return cached;
}

function countCompletedInPhase(phaseKey: string): number {
  const row = db
    .prepare(
      "SELECT COUNT(*) as n FROM day_summary WHERE phase = ? AND completed = 1"
    )
    .get(phaseKey) as { n: number };
  return row.n;
}

/** Returns the current unlocked phase — the earliest phase not yet fully passed. */
export function getCurrentPhase(): CanonPhase {
  const { phases } = loadCanon();
  for (const phase of phases) {
    const completed = countCompletedInPhase(phase.key);
    if (completed < phase.unlockAfter) {
      return phase;
    }
  }
  return phases[phases.length - 1]!;
}

export function getPhaseByKey(key: string): CanonPhase | undefined {
  return loadCanon().phases.find((p) => p.key === key);
}
