# PaperForge

A local-first daily LLM/AI research-paper mastery app. Every day it picks one
paper (blending a foundational "canon" curriculum with fresh, high-velocity
recent work), generates coding exercises from it, and only marks the day
complete when your code passes every generated test — all in an in-browser
IDE, running fully client-side.

See [`plan.md`](../plan.md) for the full design rationale (provider choice,
PDF-embedding legality, cost analysis, roadmap).

## 1. Prerequisites

- **Node.js 22+** (LTS)
- **Python 3** on `PATH` — used server-side only for the reference-solution
  validation gate (never for your own code, which runs in the browser)
- Optional: **Docker** (only needed for the optional hardened sandbox profile)
- Optional: **Ollama** or **LM Studio** if you want a fully offline LLM provider

## 2. Configure

```bash
cp .env.example .env
```

Open `.env` and fill in `LLM_API_KEY` at minimum. Every key is documented
inline in `.env.example`, including copy-paste presets for:

| Provider | `LLM_PROVIDER` | Notes |
|---|---|---|
| **DeepSeek (default)** | `openai_compatible` | Cheapest reliable paid option, ~$3/year at 1 paper/day. Get a key at platform.deepseek.com. |
| Gemini | `gemini` | Free tier available (`gemini-2.5-flash-lite`). |
| Anthropic | `anthropic` | Requires an **API key**, not a Pro/Max subscription — see [Legal notes](#6-legal-notes). |
| Groq | `openai_compatible` | Fast, free-tier friendly. |
| OpenRouter | `openai_compatible` | `:free`-suffixed models are free but rate-limited. |
| Ollama | `openai_compatible` | Fully local/offline, `$0` marginal cost. |
| LM Studio | `openai_compatible` | Fully local/offline. |

The app ships defaulting to **DeepSeek** — no changes needed beyond adding
your API key to start using it.

## 3. Run

```bash
make dev        # starts the Fastify API (port 8787) + Vite dev server (port 5173)
```

Open http://localhost:5173. On first launch with no paper generated yet,
click "Generate today's paper" — this drives the same pipeline the scheduler
uses (source → rank → summarize → generate questions/tests → validate).

Other commands:

```bash
make generate    # force-generate today's paper headlessly (no browser needed)
make schedule    # install an OS cron (macOS/Linux) job for automatic daily runs
make build       # production build (web + server)
```

On Windows, run `scripts\install-task.ps1` in an elevated PowerShell prompt
instead of `make schedule` — it already sets `-WakeToRun`, so Task Scheduler
wakes a sleeping PC at the scheduled time.

### Running without keeping the laptop awake

Plain `cron` (and a plain launchd job) only fire while the machine happens to
already be awake — they do **not** wake it from sleep. Two ways to get the
paper generated at the actual scheduled time instead of "whenever you next
open the laptop":

- **`make schedule-wake` (macOS only, recommended)** — schedules `pmset` to
  briefly wake the Mac a few minutes before `DAILY_CRON` and installs a
  `launchd` agent (not cron — launchd is what actually gets a chance to run
  around a scheduled wake) that runs the generation. The lid can stay closed;
  keep the Mac **plugged in** for reliable scheduled wake. See
  `scripts/install-wake-schedule-macos.sh` for exactly what it does, and
  `pmset -g sched` / `launchctl list | grep paperforge` to verify afterward.
  Remove with `sudo pmset repeat cancel` and `launchctl unload ~/Library/LaunchAgents/com.paperforge.daily.plist`.
- **Do nothing extra** — `catch-up-on-launch` (below) already covers a
  missed run: the paper simply appears the next time you open the app rather
  than exactly at 00:30. Fine if you don't care about the exact time.

If you want the exact time hit every day with zero dependency on your
laptop's sleep state at all, the most reliable option is running
`server/scheduler/run-daily.ts` on a machine that's never asleep — a
Raspberry Pi, NAS, or small always-on VM, on the same cron schedule.

## 4. How provider switching works

`server/llm/provider.ts` defines one interface (`LLMProvider.chat(...)`).
Three adapters implement it:

- `server/llm/openai-compatible.ts` — anything exposing an OpenAI-style
  `/v1/chat/completions` endpoint (DeepSeek, Groq, Together, OpenRouter,
  Ollama, LM Studio, vLLM). Just change `LLM_BASE_URL` / `LLM_MODEL` /
  `LLM_API_KEY` in `.env` — **no code changes**.
- `server/llm/anthropic.ts` — native Anthropic Messages API.
- `server/llm/gemini.ts` — native Google Gemini `generateContent` API.

`server/llm/index.ts` is the factory: it reads `LLM_PROVIDER` from `.env` and
returns the matching adapter. To add a provider with a non-OpenAI-compatible
shape, implement `LLMProvider` in a new file and register it in the factory's
`switch`.

## 5. Privacy

Only **day summaries** and **concept labels** (for spaced repetition) are
written to `data/paperforge.db` (SQLite). Specifically persisted:

- Paper metadata (id, title, url, license, phase, topics)
- Test pass/fail counts and time spent
- Your own free-text reflection, if you write one

**Never persisted:** generated question text, test cases, reference
solutions, or your submitted code. These live only in server memory
(`server/dayState.ts`) for the current day and are discarded on restart or
day rollover — see `server/session-types.ts` for the in-memory-only types.

To audit this yourself:

```bash
grep -rn "questions\[" server/db/ server/routes/summary.ts   # should find nothing writing question content
```

## 6. Legal notes

- **LLM automation**: use an API key for whichever provider you choose, not a
  chat subscription's browser/OAuth session. Anthropic's Consumer Terms
  §3.7, for example, prohibit automated/non-human access to a Pro/Max
  session — this app always calls provider APIs directly with `LLM_API_KEY`.
- **arXiv**: sourcing uses `export.arxiv.org` (not the human-facing site),
  respects the documented rate limit (≤1 request/3s) and `Crawl-delay: 15`,
  and backs off exponentially on 429/503.
- **PDF caching**: arXiv's default license ("arXiv.org perpetual,
  non-exclusive") does not grant redistribution rights. PaperForge only
  caches a PDF locally when the detected license is redistributable (CC BY,
  CC BY-SA, CC BY-NC-SA, CC0); otherwise it shows a **link-out** button to
  the paper's abstract page instead of caching. This is a personal-use, local
  -only cache — never served to anyone but you.
- **Per-provider ToS**: check the terms of whichever LLM/data provider you
  configure; pricing and rate limits change frequently (see `plan.md`'s
  "Verification notes" section for what was confirmed vs. unverifiable at
  time of writing).

## 7. Troubleshooting

- **Pyodide first load is slow (~15 MB)**: this only happens once per
  browser profile; it's cached afterward. Exercises run fully client-side in
  a Web Worker, so there's no server-side execution risk from your code.
- **Rate limit / 429 errors from arXiv or Semantic Scholar**: the pipeline
  already retries with exponential backoff. If it persists, get a free
  Semantic Scholar API key (`SEMANTIC_SCHOLAR_API_KEY` in `.env`) to move off
  the shared unauthenticated pool.
- **Wrong day / timezone confusion**: PaperForge computes "today" in
  `APP_TIMEZONE` (default `Asia/Kolkata`), independent of your machine's
  local timezone — see `server/date.ts`.
- **Laptop asleep at the scheduled cron time**: `catch-up-on-launch`
  (`server/scheduler/cron.ts`) checks on every server start whether today's
  summary is missing and regenerates immediately if so. To have generation
  run at the actual scheduled time instead of waiting for next launch, see
  "Running without keeping the laptop awake" above (`make schedule-wake` on
  macOS).
- **`python3: command not found`**: install Python 3 and ensure it's on
  `PATH` — needed only for the server-side reference-solution validation
  gate, not for running your own submitted code.

## Repository layout

See `plan.md` → "Repository / file structure" for the full annotated tree.
