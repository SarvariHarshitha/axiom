import { db } from "./index.js";

export interface DaySummary {
  date: string;
  paper_id: string;
  paper_title: string;
  paper_url: string;
  pdf_url: string | null;
  is_open_access: 0 | 1;
  license: string | null;
  phase: string;
  topics: string; // JSON array
  questions_total: number;
  questions_passed: number;
  tests_total: number;
  tests_passed: number;
  completed: 0 | 1;
  partial: 0 | 1;
  time_spent_sec: number;
  reflection: string | null;
  created_at: string;
}

const upsertStmt = db.prepare(`
  INSERT INTO day_summary (
    date, paper_id, paper_title, paper_url, pdf_url, is_open_access, license,
    phase, topics, questions_total, questions_passed, tests_total, tests_passed,
    completed, partial, time_spent_sec, reflection, created_at
  ) VALUES (
    @date, @paper_id, @paper_title, @paper_url, @pdf_url, @is_open_access, @license,
    @phase, @topics, @questions_total, @questions_passed, @tests_total, @tests_passed,
    @completed, @partial, @time_spent_sec, @reflection, @created_at
  )
  ON CONFLICT(date) DO UPDATE SET
    paper_id = excluded.paper_id,
    paper_title = excluded.paper_title,
    paper_url = excluded.paper_url,
    pdf_url = excluded.pdf_url,
    is_open_access = excluded.is_open_access,
    license = excluded.license,
    phase = excluded.phase,
    topics = excluded.topics,
    questions_total = excluded.questions_total,
    questions_passed = excluded.questions_passed,
    tests_total = excluded.tests_total,
    tests_passed = excluded.tests_passed,
    completed = excluded.completed,
    partial = excluded.partial,
    time_spent_sec = excluded.time_spent_sec,
    reflection = excluded.reflection
`);

export function upsertDaySummary(summary: DaySummary): void {
  upsertStmt.run(summary);
}

export function getDaySummary(date: string): DaySummary | undefined {
  return db.prepare("SELECT * FROM day_summary WHERE date = ?").get(date) as
    | DaySummary
    | undefined;
}

export function getCalendarSummaries(from: string, to: string): DaySummary[] {
  return db
    .prepare("SELECT * FROM day_summary WHERE date BETWEEN ? AND ? ORDER BY date ASC")
    .all(from, to) as DaySummary[];
}

export function isPaperSeen(paperId: string): boolean {
  const row = db.prepare("SELECT 1 FROM seen_paper WHERE paper_id = ?").get(paperId);
  return !!row;
}

export function markPaperSeen(paperId: string, date: string): void {
  db.prepare(
    "INSERT OR IGNORE INTO seen_paper (paper_id, date) VALUES (?, ?)"
  ).run(paperId, date);
}

export function getLastSummaryDate(): string | undefined {
  const row = db
    .prepare("SELECT date FROM day_summary ORDER BY date DESC LIMIT 1")
    .get() as { date: string } | undefined;
  return row?.date;
}
