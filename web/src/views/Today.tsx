import { useDay } from "../DayContext.js";
import { PdfViewer } from "../pdf/PdfViewer.js";
import { StatusIcon, difficultyBadgeClass } from "../components/StatusIcon.js";

interface TodayViewProps {
  onOpenQuestion: (questionId: string) => void;
}

export function TodayView({ onOpenQuestion }: TodayViewProps) {
  const { data, loading, error, generate, statusFor, allSolved, completeDay, dayCompleted } = useDay();

  if (!data) {
    return (
      <div
        style={{
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: 16
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 16,
            background: "var(--accent-soft)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
            <path
              d="M6 2h9l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Z"
              stroke="var(--accent)"
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
            <path d="M15 2v5h5" stroke="var(--accent)" strokeWidth="1.6" strokeLinejoin="round" />
          </svg>
        </div>
        <div style={{ textAlign: "center" }}>
          <h2 style={{ margin: "0 0 4px", fontSize: 17 }}>No paper generated yet</h2>
          <p style={{ margin: 0, color: "var(--text-2)", fontSize: 13.5 }}>
            Run today's pipeline to source a paper and generate exercises.
          </p>
        </div>
        <button className="btn btn-primary" onClick={generate} disabled={loading}>
          {loading && <span className="spinner" />}
          {loading ? "Generating…" : "Generate today's paper"}
        </button>
        {error && (
          <p style={{ color: "var(--red)", fontSize: 12.5, maxWidth: 460, textAlign: "center" }}>{error}</p>
        )}
      </div>
    );
  }

  const solvedCount = data.questions.filter((q) => statusFor(q.id) === "solved").length;

  return (
    <div className="fade-in" style={{ maxWidth: 880, margin: "0 auto", padding: "32px 32px 80px" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: "var(--accent)", letterSpacing: "0.04em" }}>
          {data.date} · {data.paper.phase.replace(/-/g, " ").toUpperCase()}
        </span>
        {dayCompleted && (
          <span style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--green)", fontSize: 12.5, fontWeight: 600 }}>
            <StatusIcon status="solved" /> Day complete
          </span>
        )}
      </div>

      <h1 style={{ fontSize: 24, margin: "6px 0 12px", letterSpacing: "-0.01em" }}>{data.paper.title}</h1>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 20 }}>
        {data.paper.concepts.slice(0, 6).map((c) => (
          <span
            key={c}
            style={{
              fontSize: 11.5,
              padding: "4px 10px",
              borderRadius: 999,
              background: "var(--bg-3)",
              color: "var(--text-2)",
              border: "1px solid var(--border)"
            }}
          >
            {c.length > 40 ? `${c.slice(0, 40)}…` : c}
          </span>
        ))}
      </div>

      <div className="card" style={{ padding: 20, marginBottom: 24 }}>
        <p style={{ margin: 0, lineHeight: 1.65, color: "var(--text-1)", whiteSpace: "pre-line" }}>
          {data.summary}
        </p>
        <div style={{ marginTop: 16 }}>
          {data.paper.isOpenAccess ? (
            <PdfViewer paperId={data.paper.id} />
          ) : (
            <a
              href={data.paper.url}
              target="_blank"
              rel="noreferrer"
              className="btn btn-ghost btn-sm"
              style={{ textDecoration: "none" }}
            >
              Open paper ↗
            </a>
          )}
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <h2 style={{ fontSize: 14, margin: 0, color: "var(--text-1)", fontWeight: 700 }}>
          Exercises
        </h2>
        <span style={{ fontSize: 12.5, color: "var(--text-2)" }}>
          {solvedCount} / {data.questions.length} solved
        </span>
      </div>

      <div className="card" style={{ overflow: "hidden" }}>
        {data.questions.map((q, i) => {
          const status = statusFor(q.id);
          return (
            <button
              key={q.id}
              onClick={() => onOpenQuestion(q.id)}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "14px 18px",
                background: "transparent",
                border: "none",
                borderBottom: i < data.questions.length - 1 ? "1px solid var(--border)" : "none",
                cursor: "pointer",
                textAlign: "left"
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <StatusIcon status={status} />
              <span style={{ fontSize: 12.5, color: "var(--text-3)", width: 18 }}>{i + 1}.</span>
              <span style={{ flex: 1, fontSize: 13.5, color: "var(--text-0)", fontWeight: 500 }}>
                {q.prompt.length > 90 ? `${q.prompt.slice(0, 90)}…` : q.prompt}
              </span>
              <span className={difficultyBadgeClass(q.difficulty)}>{q.difficulty}</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ color: "var(--text-3)" }}>
                <path d="m9 6 6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          );
        })}
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 24 }}>
        <button className="btn btn-success" onClick={completeDay} disabled={!allSolved || dayCompleted}>
          {dayCompleted ? "Completed" : allSolved ? "Mark day complete" : "Solve all exercises to complete"}
        </button>
      </div>
    </div>
  );
}
