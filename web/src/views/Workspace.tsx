import { useEffect, useMemo, useState } from "react";
import { useDay } from "../DayContext.js";
import { Editor } from "../ide/Editor.js";
import { StatusIcon, difficultyBadgeClass } from "../components/StatusIcon.js";
import type { RuntimePackage } from "../ide/TestRunner.js";

interface WorkspaceViewProps {
  activeQuestionId?: string;
  onSelectQuestion: (id: string) => void;
}

type DescTab = "description" | "reflection";

interface PackageOption {
  id: RuntimePackage | "pytorch" | "cuda";
  label: string;
  available: boolean;
  disabledReason?: string;
}

const PACKAGE_OPTIONS: PackageOption[] = [
  { id: "python", label: "Python (stdlib)", available: true },
  { id: "numpy", label: "NumPy", available: true },
  {
    id: "pytorch",
    label: "PyTorch",
    available: false,
    disabledReason: "PyTorch has no WebAssembly/Pyodide build, so it can't run in the browser sandbox."
  },
  {
    id: "cuda",
    label: "CUDA",
    available: false,
    disabledReason: "CUDA requires a physical NVIDIA GPU, which a browser sandbox can't expose."
  }
];

function formatElapsed(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function WorkspaceView({ activeQuestionId, onSelectQuestion }: WorkspaceViewProps) {
  const {
    data,
    states,
    updateCode,
    setRuntimePackage,
    clearCode,
    runQuestion,
    statusFor,
    elapsedSecFor,
    startTimer
  } = useDay();
  const [descTab, setDescTab] = useState<DescTab>("description");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [packagePickerOpen, setPackagePickerOpen] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  const question = useMemo(
    () => data?.questions.find((q) => q.id === activeQuestionId),
    [data, activeQuestionId]
  );

  useEffect(() => {
    if (!activeQuestionId && data?.questions.length) {
      onSelectQuestion(data.questions[0]!.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, activeQuestionId]);

  // Starts (or resumes) the per-question timer as soon as its workspace is open.
  useEffect(() => {
    if (activeQuestionId) startTimer(activeQuestionId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeQuestionId]);

  useEffect(() => {
    setConfirmClear(false);
  }, [activeQuestionId]);

  if (!data) {
    return (
      <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "var(--text-2)" }}>Generate today's paper first (see the Today tab).</p>
      </div>
    );
  }

  if (!question) {
    return (
      <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "var(--text-2)" }}>No exercises available.</p>
      </div>
    );
  }

  const state = states[question.id];
  const idx = data.questions.findIndex((q) => q.id === question.id);

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Top bar */}
      <div
        style={{
          height: 48,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "0 16px",
          borderBottom: "1px solid var(--border)",
          position: "relative"
        }}
      >
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => setPickerOpen((v) => !v)}
          style={{ gap: 8 }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
            <path d="M4 6h16M4 12h16M4 18h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          {idx + 1}. {question.prompt.length > 42 ? `${question.prompt.slice(0, 42)}…` : question.prompt}
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
            <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {pickerOpen && (
          <div
            className="card fade-in"
            style={{
              position: "absolute",
              top: 44,
              left: 16,
              width: 340,
              maxHeight: 360,
              overflow: "auto",
              zIndex: 20,
              boxShadow: "var(--shadow-lg)"
            }}
          >
            {data.questions.map((q, i) => (
              <button
                key={q.id}
                onClick={() => {
                  onSelectQuestion(q.id);
                  setPickerOpen(false);
                  setDescTab("description");
                }}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 14px",
                  background: q.id === question.id ? "var(--accent-soft)" : "transparent",
                  border: "none",
                  borderBottom: i < data.questions.length - 1 ? "1px solid var(--border)" : "none",
                  cursor: "pointer",
                  textAlign: "left"
                }}
              >
                <StatusIcon status={statusFor(q.id)} />
                <span style={{ flex: 1, fontSize: 12.5, color: "var(--text-0)" }}>
                  {i + 1}. {q.prompt.length > 50 ? `${q.prompt.slice(0, 50)}…` : q.prompt}
                </span>
                <span className={difficultyBadgeClass(q.difficulty)}>{q.difficulty}</span>
              </button>
            ))}
          </div>
        )}

        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
          <div
            title={statusFor(question.id) === "solved" ? "Timer stopped — solved" : "Time spent on this question"}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "5px 10px",
              borderRadius: "var(--radius-sm)",
              background: "var(--bg-3)",
              border: "1px solid var(--border)",
              fontFamily: "var(--font-mono)",
              fontSize: 12.5,
              color: statusFor(question.id) === "solved" ? "var(--green)" : "var(--text-1)"
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
              <path d="M12 7v5l3.5 2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
            {formatElapsed(elapsedSecFor(question.id))}
          </div>

          <div style={{ display: "flex", gap: 6 }}>
            <button
              className="btn btn-ghost btn-sm"
              disabled={idx <= 0}
              onClick={() => onSelectQuestion(data.questions[idx - 1]!.id)}
            >
              ← Prev
            </button>
            <button
              className="btn btn-ghost btn-sm"
              disabled={idx >= data.questions.length - 1}
              onClick={() => onSelectQuestion(data.questions[idx + 1]!.id)}
            >
              Next →
            </button>
          </div>
        </div>
      </div>

      {/* Split pane */}
      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        {/* Left: description */}
        <div
          style={{
            width: "42%",
            minWidth: 320,
            maxWidth: 560,
            borderRight: "1px solid var(--border)",
            display: "flex",
            flexDirection: "column",
            minHeight: 0
          }}
        >
          <div style={{ display: "flex", gap: 2, padding: "10px 16px 0", borderBottom: "1px solid var(--border)" }}>
            {(["description", "reflection"] as DescTab[]).map((t) => (
              <button
                key={t}
                onClick={() => setDescTab(t)}
                style={{
                  background: "transparent",
                  border: "none",
                  borderBottom: descTab === t ? "2px solid var(--accent)" : "2px solid transparent",
                  color: descTab === t ? "var(--text-0)" : "var(--text-2)",
                  fontSize: 12.5,
                  fontWeight: 600,
                  padding: "8px 12px 10px",
                  cursor: "pointer",
                  textTransform: "capitalize"
                }}
              >
                {t}
              </button>
            ))}
          </div>

          <div style={{ flex: 1, overflow: "auto", padding: "18px 20px" }}>
            {descTab === "description" ? (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <h2 style={{ fontSize: 15.5, margin: 0, fontWeight: 700 }}>
                    {idx + 1}. {question.prompt.split(".")[0]}
                  </h2>
                </div>
                <span className={difficultyBadgeClass(question.difficulty)} style={{ marginBottom: 16, display: "inline-flex" }}>
                  {question.difficulty}
                </span>

                <p style={{ lineHeight: 1.7, color: "var(--text-1)", fontSize: 13.5 }}>{question.prompt}</p>

                <div
                  style={{
                    background: "var(--bg-3)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius-md)",
                    padding: 14,
                    margin: "16px 0",
                    fontFamily: "var(--font-mono)",
                    fontSize: 12.5,
                    color: "var(--text-1)",
                    whiteSpace: "pre-wrap",
                    overflowX: "auto"
                  }}
                >
                  {question.functionSignature}
                  {"\n"}
                  {question.docstring}
                </div>

                <h3 style={{ fontSize: 12, color: "var(--text-2)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 10 }}>
                  Examples
                </h3>
                {question.visibleTests.map((t, i) => (
                  <div
                    key={i}
                    style={{
                      background: "var(--bg-2)",
                      border: "1px solid var(--border)",
                      borderRadius: "var(--radius-md)",
                      padding: 12,
                      marginBottom: 10,
                      fontFamily: "var(--font-mono)",
                      fontSize: 12
                    }}
                  >
                    <div style={{ color: "var(--text-2)", marginBottom: 4 }}>Example {i + 1}</div>
                    <div style={{ color: "var(--text-1)" }}>
                      <span style={{ color: "var(--text-3)" }}>Input: </span>
                      {JSON.stringify(t.input)}
                    </div>
                    <div style={{ color: "var(--text-1)" }}>
                      <span style={{ color: "var(--text-3)" }}>Output: </span>
                      {JSON.stringify(t.expected)}
                    </div>
                  </div>
                ))}

                <h3 style={{ fontSize: 12, color: "var(--text-2)", textTransform: "uppercase", letterSpacing: "0.04em", marginTop: 20, marginBottom: 8 }}>
                  Concepts
                </h3>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {question.concepts.map((c) => (
                    <span
                      key={c}
                      style={{
                        fontSize: 11,
                        padding: "3px 9px",
                        borderRadius: 999,
                        background: "var(--bg-3)",
                        color: "var(--text-2)",
                        border: "1px solid var(--border)"
                      }}
                    >
                      {c}
                    </span>
                  ))}
                </div>
              </>
            ) : (
              <p style={{ color: "var(--text-2)", fontSize: 13 }}>
                Your reflection is captured when you mark the day complete from the Today tab.
              </p>
            )}
          </div>
        </div>

        {/* Right: editor + console */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "8px 14px",
              borderBottom: "1px solid var(--border)",
              flexShrink: 0,
              position: "relative"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 12, color: "var(--text-2)", fontFamily: "var(--font-mono)" }}>
                solution.py
              </span>

              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setPackagePickerOpen((v) => !v)}
                style={{ gap: 6 }}
              >
                {PACKAGE_OPTIONS.find((p) => p.id === state?.runtimePackage)?.label ?? "Python"}
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                  <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>

              {packagePickerOpen && (
                <div
                  className="card fade-in"
                  style={{
                    position: "absolute",
                    top: 40,
                    left: 90,
                    width: 260,
                    zIndex: 20,
                    boxShadow: "var(--shadow-lg)",
                    overflow: "hidden"
                  }}
                  onMouseLeave={() => setPackagePickerOpen(false)}
                >
                  {PACKAGE_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      title={opt.disabledReason}
                      disabled={!opt.available}
                      onClick={() => {
                        if (!opt.available) return;
                        setRuntimePackage(question.id, opt.id as RuntimePackage);
                        setPackagePickerOpen(false);
                      }}
                      style={{
                        width: "100%",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "flex-start",
                        gap: 2,
                        padding: "9px 12px",
                        background:
                          opt.id === state?.runtimePackage ? "var(--accent-soft)" : "transparent",
                        border: "none",
                        borderBottom: "1px solid var(--border)",
                        cursor: opt.available ? "pointer" : "not-allowed",
                        textAlign: "left",
                        opacity: opt.available ? 1 : 0.5
                      }}
                    >
                      <span style={{ fontSize: 12.5, color: "var(--text-0)", fontWeight: 500 }}>
                        {opt.label}
                        {!opt.available && (
                          <span style={{ color: "var(--text-3)", fontWeight: 400 }}> · unavailable</span>
                        )}
                      </span>
                      {opt.disabledReason && (
                        <span style={{ fontSize: 10.5, color: "var(--text-3)", lineHeight: 1.4 }}>
                          {opt.disabledReason}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {confirmClear ? (
                <>
                  <span style={{ fontSize: 11.5, color: "var(--text-2)" }}>Clear your code?</span>
                  <button className="btn btn-ghost btn-sm" onClick={() => setConfirmClear(false)}>
                    Cancel
                  </button>
                  <button
                    className="btn btn-sm"
                    style={{ background: "var(--red)", color: "white" }}
                    onClick={() => {
                      clearCode(question.id);
                      setConfirmClear(false);
                    }}
                  >
                    Clear
                  </button>
                </>
              ) : (
                <button className="btn btn-ghost btn-sm" onClick={() => setConfirmClear(true)} title="Reset to the starter template">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Clear all
                </button>
              )}

              <button
                className="btn btn-primary btn-sm"
                onClick={() => runQuestion(question.id)}
                disabled={state?.running}
              >
                {state?.running ? (
                  <>
                    <span className="spinner" /> Running
                  </>
                ) : (
                  <>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                    Run
                  </>
                )}
              </button>
            </div>
          </div>

          <div style={{ flex: "1 1 55%", minHeight: 0 }}>
            <Editor
              value={state?.code ?? ""}
              onChange={(code) => updateCode(question.id, code)}
            />
          </div>

          {/* Console */}
          <div
            style={{
              flex: "0 0 auto",
              maxHeight: "40%",
              borderTop: "1px solid var(--border)",
              overflow: "auto",
              padding: "12px 16px",
              background: "var(--bg-1)"
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "var(--text-2)",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
                marginBottom: 10
              }}
            >
              Console
            </div>

            {!state?.visibleResults && !state?.runError && (
              <p style={{ color: "var(--text-3)", fontSize: 12.5, margin: 0 }}>
                Run your code to see test results here.
              </p>
            )}

            {state?.runError && (
              <p style={{ color: "var(--red)", fontSize: 12.5, fontFamily: "var(--font-mono)", margin: 0 }}>
                {state.runError}
              </p>
            )}

            {state?.visibleResults && (
              <>
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 12.5,
                    fontWeight: 700,
                    color: state.allPassed ? "var(--green)" : "var(--red)",
                    marginBottom: 10
                  }}
                >
                  {state.allPassed ? "Accepted" : "Wrong Answer"}
                  <span style={{ color: "var(--text-2)", fontWeight: 500 }}>
                    · {state.visibleResults.filter((r) => r.pass).length}/{state.visibleResults.length} visible tests passed
                  </span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {state.visibleResults.map((r, i) => (
                    <TestCaseResult
                      key={i}
                      index={i}
                      pass={r.pass}
                      input={question.visibleTests[i]?.input}
                      expected={question.visibleTests[i]?.expected}
                      actual={r.actual}
                      error={r.error}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function TestCaseResult({
  index,
  pass,
  input,
  expected,
  actual,
  error
}: {
  index: number;
  pass: boolean;
  input?: unknown[];
  expected?: unknown;
  actual?: unknown;
  error?: string;
}) {
  // Failures start expanded (that's the whole point — show where it went
  // wrong); passes start collapsed to keep a long test list scannable.
  const [open, setOpen] = useState(!pass);

  return (
    <div
      style={{
        borderRadius: "var(--radius-sm)",
        background: pass ? "var(--green-soft)" : "var(--red-soft)",
        overflow: "hidden"
      }}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "6px 10px",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          fontFamily: "var(--font-mono)",
          fontSize: 12,
          color: pass ? "var(--green)" : "var(--red)",
          textAlign: "left"
        }}
      >
        {pass ? "✓" : "✗"} Test case {index + 1}
        <svg
          width="11"
          height="11"
          viewBox="0 0 24 24"
          fill="none"
          style={{ marginLeft: "auto", transform: open ? "rotate(180deg)" : "none", transition: "transform 0.12s ease" }}
        >
          <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div
          style={{
            padding: "0 10px 10px",
            fontFamily: "var(--font-mono)",
            fontSize: 11.5,
            display: "flex",
            flexDirection: "column",
            gap: 4
          }}
        >
          {input !== undefined && (
            <div>
              <span style={{ color: "var(--text-2)" }}>Input: </span>
              <span style={{ color: "var(--text-1)" }}>{JSON.stringify(input)}</span>
            </div>
          )}
          <div>
            <span style={{ color: "var(--text-2)" }}>Expected: </span>
            <span style={{ color: "var(--text-1)" }}>{JSON.stringify(expected)}</span>
          </div>
          {error ? (
            <div>
              <span style={{ color: "var(--text-2)" }}>Error: </span>
              <span style={{ color: "var(--red)" }}>{error}</span>
            </div>
          ) : (
            <div>
              <span style={{ color: "var(--text-2)" }}>Output: </span>
              <span style={{ color: pass ? "var(--text-1)" : "var(--red)" }}>{JSON.stringify(actual)}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
