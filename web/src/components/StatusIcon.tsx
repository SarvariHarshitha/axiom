import type { QuestionStatus } from "../DayContext.js";

export function StatusIcon({ status }: { status: QuestionStatus }) {
  if (status === "solved") {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
        <circle cx="12" cy="12" r="10" fill="var(--green-soft)" />
        <path d="m8 12.5 2.5 2.5L16 9" stroke="var(--green)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (status === "attempted") {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
        <circle cx="12" cy="12" r="10" fill="var(--yellow-soft)" />
        <circle cx="12" cy="12" r="3.5" fill="var(--yellow)" />
      </svg>
    );
  }
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
      <circle cx="12" cy="12" r="9.25" stroke="var(--border-strong)" strokeWidth="1.5" />
    </svg>
  );
}

export function difficultyBadgeClass(difficulty: "easy" | "medium" | "hard"): string {
  return `badge badge-${difficulty}`;
}
