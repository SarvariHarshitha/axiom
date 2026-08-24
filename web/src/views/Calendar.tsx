import { useEffect, useState } from "react";
import { api, type CalendarEntry } from "../api.js";
import { Heatmap } from "../calendar/Heatmap.js";

export function CalendarView() {
  const [entries, setEntries] = useState<CalendarEntry[]>([]);
  const [selected, setSelected] = useState<string>();

  useEffect(() => {
    api.calendar().then(setEntries);
  }, []);

  const selectedEntry = entries.find((e) => e.date === selected);
  const completedCount = entries.filter((e) => e.level === 2).length;
  const totalMinutes = Math.round(entries.reduce((sum, e) => sum + e.timeSpentSec, 0) / 60);

  return (
    <div className="fade-in" style={{ maxWidth: 880, margin: "0 auto", padding: "32px 32px 80px" }}>
      <h1 style={{ fontSize: 22, margin: "0 0 4px", letterSpacing: "-0.01em" }}>Progress calendar</h1>
      <p style={{ color: "var(--text-2)", margin: "0 0 24px", fontSize: 13.5 }}>
        Every day you complete leaves a mark here.
      </p>

      <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
        <StatCard label="Days completed" value={String(completedCount)} />
        <StatCard label="Total time studied" value={`${totalMinutes}m`} />
        <StatCard label="Days tracked" value={String(entries.length)} />
      </div>

      <div className="card" style={{ padding: 24, marginBottom: 20, overflowX: "auto" }}>
        <Heatmap entries={entries} onSelectDate={setSelected} />
      </div>

      {selectedEntry && (
        <div className="card fade-in" style={{ padding: 20 }}>
          <div style={{ fontSize: 12, color: "var(--accent)", fontWeight: 700, marginBottom: 6 }}>
            {selectedEntry.date}
          </div>
          <h3 style={{ margin: "0 0 10px", fontSize: 16 }}>{selectedEntry.paperTitle}</h3>
          <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
            <Chip>{selectedEntry.phase}</Chip>
            {selectedEntry.topics.slice(0, 4).map((t) => (
              <Chip key={t}>{t}</Chip>
            ))}
          </div>
          <p style={{ color: "var(--text-1)", fontSize: 13, margin: 0 }}>
            {selectedEntry.testsPassed}/{selectedEntry.testsTotal} tests passed ·{" "}
            {Math.round(selectedEntry.timeSpentSec / 60)} min spent
          </p>
          {selectedEntry.reflection && (
            <p style={{ fontStyle: "italic", color: "var(--text-2)", marginTop: 10, marginBottom: 0 }}>
              "{selectedEntry.reflection}"
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="card" style={{ flex: 1, padding: "16px 18px" }}>
      <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em" }}>{value}</div>
      <div style={{ fontSize: 12, color: "var(--text-2)", marginTop: 2 }}>{label}</div>
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        fontSize: 11.5,
        padding: "4px 10px",
        borderRadius: 999,
        background: "var(--bg-3)",
        color: "var(--text-2)",
        border: "1px solid var(--border)"
      }}
    >
      {children}
    </span>
  );
}
