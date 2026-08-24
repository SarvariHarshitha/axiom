import { useState } from "react";
import { DayProvider } from "./DayContext.js";
import { TodayView } from "./views/Today.js";
import { WorkspaceView } from "./views/Workspace.js";
import { CalendarView } from "./views/Calendar.js";
import { SettingsView } from "./views/Settings.js";

type Tab = "today" | "workspace" | "calendar" | "settings";

const NAV: { key: Tab; label: string; icon: JSX.Element }[] = [
  {
    key: "today",
    label: "Today",
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
        <path
          d="M8 2v3M16 2v3M3.5 9h17M5 4.5h14A1.5 1.5 0 0 1 20.5 6v14a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 20V6A1.5 1.5 0 0 1 5 4.5Z"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
    )
  },
  {
    key: "workspace",
    label: "Workspace",
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
        <path
          d="m8 9-4 4 4 4M16 9l4 4-4 4M13.5 5.5 10.5 20"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    )
  },
  {
    key: "calendar",
    label: "Calendar",
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
        <path
          d="M8 2v3M16 2v3M3.5 9h17M5 4.5h14A1.5 1.5 0 0 1 20.5 6v14a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 20V6A1.5 1.5 0 0 1 5 4.5Z"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        <path d="M7.5 13.5h2.5M7.5 17h2.5M11.5 13.5h5M11.5 17h5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    )
  },
  {
    key: "settings",
    label: "Settings",
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6" />
        <path
          d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    )
  }
];

export function App() {
  const [tab, setTab] = useState<Tab>("today");
  const [activeQuestionId, setActiveQuestionId] = useState<string>();

  function openInWorkspace(questionId: string) {
    setActiveQuestionId(questionId);
    setTab("workspace");
  }

  return (
    <DayProvider>
      <div style={{ display: "flex", height: "100vh", background: "var(--bg-0)" }}>
        <aside
          style={{
            width: 220,
            flexShrink: 0,
            borderRight: "1px solid var(--border)",
            display: "flex",
            flexDirection: "column",
            padding: "18px 12px"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px 22px" }}>
            <div
              style={{
                width: 26,
                height: 26,
                borderRadius: 7,
                background: "linear-gradient(135deg, var(--accent), #8b5cf6)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 13,
                fontWeight: 800,
                color: "white",
                flexShrink: 0
              }}
            >
              P
            </div>
            <span style={{ fontWeight: 700, fontSize: 15, letterSpacing: "-0.01em" }}>PaperForge</span>
          </div>

          <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {NAV.map((item) => {
              const active = tab === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => setTab(item.key)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "9px 10px",
                    borderRadius: "var(--radius-sm)",
                    border: "none",
                    background: active ? "var(--accent-soft)" : "transparent",
                    color: active ? "var(--accent)" : "var(--text-1)",
                    fontSize: 13.5,
                    fontWeight: active ? 600 : 500,
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "background 0.12s ease, color 0.12s ease"
                  }}
                  onMouseEnter={(e) => {
                    if (!active) e.currentTarget.style.background = "var(--bg-hover)";
                  }}
                  onMouseLeave={(e) => {
                    if (!active) e.currentTarget.style.background = "transparent";
                  }}
                >
                  {item.icon}
                  {item.label}
                </button>
              );
            })}
          </nav>

          <div style={{ marginTop: "auto", padding: "10px 8px", fontSize: 11, color: "var(--text-3)" }}>
            Local-first · DeepSeek default
          </div>
        </aside>

        <main style={{ flex: 1, minWidth: 0, overflow: "auto" }}>
          {tab === "today" && <TodayView onOpenQuestion={openInWorkspace} />}
          {tab === "workspace" && (
            <WorkspaceView activeQuestionId={activeQuestionId} onSelectQuestion={setActiveQuestionId} />
          )}
          {tab === "calendar" && <CalendarView />}
          {tab === "settings" && <SettingsView />}
        </main>
      </div>
    </DayProvider>
  );
}
