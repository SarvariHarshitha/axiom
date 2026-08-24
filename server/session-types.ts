import type { PaperRef } from "./papers/types.js";
import type { TestCase } from "./prompts/tests.js";

/**
 * In-memory / session-only types. NEVER persisted to SQLite — only the
 * derived day_summary (server/db/summaries.ts) survives a restart or day
 * rollover. See plan.md "In-memory / session only (never persisted)".
 */
export interface Question {
  id: string; // ephemeral uuid
  prompt: string;
  functionSignature: string;
  docstring: string;
  visibleTests: TestCase[];
  hiddenTests: TestCase[];
  referenceSolution: string; // used only for validation gate; never sent to UI until "reveal"
  difficulty: "easy" | "medium" | "hard";
  concepts: string[];
}

export interface GeneratedDay {
  paper: PaperRef;
  summary: string; // shown, not stored verbatim
  questions: Question[];
}
