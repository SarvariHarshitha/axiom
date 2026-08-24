-- SUMMARY ONLY. Questions/tests/code are NEVER written here.
CREATE TABLE IF NOT EXISTS day_summary (
  date              TEXT PRIMARY KEY,          -- 'YYYY-MM-DD' (IST)
  paper_id          TEXT NOT NULL,             -- e.g. 'arXiv:1706.03762'
  paper_title       TEXT NOT NULL,
  paper_url         TEXT NOT NULL,             -- abstract page (link-out target)
  pdf_url           TEXT,                      -- open-access pdf if any
  is_open_access    INTEGER NOT NULL DEFAULT 0,
  license           TEXT,                      -- 'CC-BY', 'arXiv-perpetual', etc.
  phase             TEXT NOT NULL,             -- curriculum phase key
  topics            TEXT NOT NULL,             -- JSON array of concept tags
  questions_total   INTEGER NOT NULL DEFAULT 0,
  questions_passed  INTEGER NOT NULL DEFAULT 0,
  tests_total       INTEGER NOT NULL DEFAULT 0,
  tests_passed      INTEGER NOT NULL DEFAULT 0,
  completed         INTEGER NOT NULL DEFAULT 0,-- 1 if all tests passed
  partial           INTEGER NOT NULL DEFAULT 0,-- 1 if reference solution revealed
  time_spent_sec    INTEGER NOT NULL DEFAULT 0,
  reflection        TEXT,                      -- user's own note
  created_at        TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS concept_review (   -- spaced repetition, concept-level ONLY
  concept           TEXT PRIMARY KEY,          -- e.g. 'kv-cache'
  first_seen        TEXT NOT NULL,
  stability         REAL,
  difficulty        REAL,                      -- FSRS state
  due               TEXT,                      -- next resurface date
  reps              INTEGER NOT NULL DEFAULT 0
);
-- NOTE: concept_review stores only concept LABELS + FSRS scheduling numbers,
-- never question text or answers.

CREATE TABLE IF NOT EXISTS seen_paper (       -- dedupe ledger
  paper_id          TEXT PRIMARY KEY,
  date              TEXT NOT NULL
);
