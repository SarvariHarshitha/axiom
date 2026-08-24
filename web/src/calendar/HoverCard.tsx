import * as Tooltip from "@radix-ui/react-tooltip";
import type { CalendarEntry } from "../api.js";

interface HoverCardProps {
  entry: CalendarEntry;
  children: React.ReactNode;
}

export function HoverCard({ entry, children }: HoverCardProps) {
  return (
    <Tooltip.Provider delayDuration={150}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>{children}</Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            side="top"
            sideOffset={6}
            style={{
              background: "var(--bg-3)",
              color: "var(--text-0)",
              border: "1px solid var(--border-strong)",
              padding: "12px 14px",
              borderRadius: "var(--radius-md)",
              fontSize: 12.5,
              maxWidth: 260,
              boxShadow: "var(--shadow-lg)",
              zIndex: 50
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: 4 }}>{entry.date}</div>
            <div style={{ marginBottom: 6, color: "var(--text-1)" }}>{entry.paperTitle}</div>
            <div style={{ color: "var(--text-2)", marginBottom: 4 }}>
              {entry.phase} · {entry.topics.join(", ")}
            </div>
            <div style={{ color: "var(--text-1)" }}>
              {entry.testsPassed}/{entry.testsTotal} tests · {Math.round(entry.timeSpentSec / 60)}m
            </div>
            {entry.reflection && (
              <div style={{ marginTop: 6, fontStyle: "italic", color: "var(--text-2)" }}>
                "{entry.reflection}"
              </div>
            )}
            <Tooltip.Arrow style={{ fill: "var(--bg-3)" }} />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}
