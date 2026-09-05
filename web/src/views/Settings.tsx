export function SettingsView() {
  return (
    <div className="fade-in" style={{ maxWidth: 700, margin: "0 auto", padding: "32px 32px 80px" }}>
      <h1 style={{ fontSize: 22, margin: "0 0 4px", letterSpacing: "-0.01em" }}>Settings</h1>
      <p style={{ color: "var(--text-2)", margin: "0 0 28px", fontSize: 13.5 }}>
        Axiom is configured entirely through <code>.env</code> in the project root — there is no
        in-app settings UI by design, keeping the app local-first with no credentials in the browser.
      </p>

      <SettingsSection
        title="LLM provider"
        icon={
          <path
            d="M12 2 3 7v10l9 5 9-5V7l-9-5Z M12 2v20 M3 7l9 5 9-5"
            stroke="currentColor"
            strokeWidth="1.4"
            fill="none"
            strokeLinejoin="round"
          />
        }
      >
        <p>
          Default provider: <strong>DeepSeek</strong>, via the OpenAI-compatible adapter.
        </p>
        <div className="card" style={{ padding: 14, fontFamily: "var(--font-mono)", fontSize: 12.5, color: "var(--text-1)" }}>
          LLM_PROVIDER=openai_compatible
          <br />
          LLM_BASE_URL=https://api.deepseek.com/v1
          <br />
          LLM_MODEL=deepseek-chat
        </div>
        <p style={{ marginTop: 12 }}>
          To switch providers, edit <code>.env</code> and restart the server — see{" "}
          <code>.env.example</code> for presets (Gemini, Anthropic, Groq, OpenRouter, Ollama, LM Studio).
        </p>
      </SettingsSection>

      <SettingsSection
        title="Privacy"
        icon={
          <path
            d="M12 2 4 5v6c0 5 3.5 8.5 8 10 4.5-1.5 8-5 8-10V5l-8-3Z"
            stroke="currentColor"
            strokeWidth="1.4"
            fill="none"
            strokeLinejoin="round"
          />
        }
      >
        <p>
          Only per-day summaries and concept labels are persisted to SQLite. Generated questions,
          tests, reference solutions, and your code are held in server memory for the current day
          only and are never written to disk.
        </p>
      </SettingsSection>

      <SettingsSection
        title="Scheduling"
        icon={
          <>
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.4" fill="none" />
            <path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </>
        }
      >
        <p>
          A new paper generates automatically each day at the time set by <code>DAILY_CRON</code>{" "}
          (default 00:30 <code>APP_TIMEZONE</code>), with catch-up-on-launch covering missed runs
          when your machine was asleep.
        </p>
      </SettingsSection>
    </div>
  );
}

function SettingsSection({
  title,
  icon,
  children
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="card" style={{ padding: 20, marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            background: "var(--accent-soft)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--accent)",
            flexShrink: 0
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24">
            {icon}
          </svg>
        </div>
        <h2 style={{ fontSize: 14.5, margin: 0, fontWeight: 700 }}>{title}</h2>
      </div>
      <div style={{ color: "var(--text-1)", fontSize: 13, lineHeight: 1.65 }}>{children}</div>
    </div>
  );
}
