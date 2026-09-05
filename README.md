# Axiom

A local-first daily LLM/AI mastery app. Every day it:

- Picks **one paper** (blending a foundational "canon" curriculum with fresh,
  high-velocity recent work) and generates coding exercises from it — solved
  in a LeetCode-style, in-browser **Workspace** (split-pane description +
  editor + console), running fully client-side, only marking the day
  complete once your code passes every generated test.
- Surfaces **16 trending AI news stories** on the **Home** tab, sourced live
  from Hacker News with article images and hover-to-expand detail.
- Tracks your streak on a GitHub-style **Calendar** heatmap.

See [`plan.md`](../plan.md) for the full original design rationale (provider
choice, PDF-embedding legality, cost analysis, roadmap).

## 1. Prerequisites

- **Node.js 22+** (LTS)
- **Python 3** on `PATH` — used server-side only for the reference-solution
  validation gate (never for your own code, which runs in the browser)
- Optional: **Docker** (only needed for the optional hardened sandbox profile)
- Optional: **Ollama** or **LM Studio** if you want a fully offline LLM provider

## 2. Get the code

```bash
git clone https://github.com/SarvariHarshitha/axiom.git
cd axiom
```

## 3. Configure

```bash
cp .env.example .env
```

Open `.env` and fill in `LLM_API_KEY` at minimum. Every key is documented
inline in `.env.example`, including copy-paste presets for:

| Provider | `LLM_PROVIDER` | Notes |
|---|---|---|
| **DeepSeek (default)** | `openai_compatible` | Cheapest reliable paid option, ~$3/year at 1 paper/day. Get a key at platform.deepseek.com. |
| Gemini | `gemini` | Free tier available (`gemini-2.5-flash-lite`). |
| Anthropic | `anthropic` | Requires an **API key**, not a Pro/Max subscription — see [Legal notes](#7-legal-notes). |
| Groq | `openai_compatible` | Fast, free-tier friendly. |
| OpenRouter | `openai_compatible` | `:free`-suffixed models are free but rate-limited. |
| Ollama | `openai_compatible` | Fully local/offline, `$0` marginal cost. |
| LM Studio | `openai_compatible` | Fully local/offline. |

Axiom ships defaulting to **DeepSeek** — no changes needed beyond adding your
API key to start using it.

## 4. Install & run

```bash
make dev        # npm install, then starts the Fastify API (port 8787) + Vite dev server (port 5173)
```

(Equivalent to running `npm install` once, then `npm run dev`.)

Open **http://localhost:5173** in your browser. You'll land on:

1. **Home** — 16 AI news cards load automatically (no setup needed, no API
   key required for this tab). Hover a card to see points/comments/author
   and jump to the article or its Hacker News discussion.
2. **Today** — click **"Generate today's paper"**. This runs the full
   pipeline (source → rank → summarize → generate questions/tests →
   validate) using your configured LLM provider, and takes anywhere from a
   few seconds to ~1 minute depending on the provider. Once generated,
   you'll see the paper summary and a list of coding exercises.
3. **Workspace** — click any exercise from Today (or the Workspace tab
   directly) to open the split-pane IDE: problem description on the left,
   CodeMirror editor + console on the right. Pick **Python (stdlib)** or
   **NumPy** from the runtime dropdown, write your solution, hit **Run** to
   grade it against the visible tests (execution happens entirely in your
   browser via Pyodide/WebAssembly — nothing is sent to any server). A timer
   tracks how long each exercise takes you; **Clear all** resets to the
   starter template if you want to restart.
4. Once every exercise passes, go back to **Today** and click **"Mark day
   complete"** — this is what shows up on the **Calendar** heatmap.

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
  `pmset -g sched` / `launchctl list | grep axiom` to verify afterward.
  Remove with `sudo pmset repeat cancel` and `launchctl unload ~/Library/LaunchAgents/com.axiom.daily.plist`.
- **Do nothing extra** — `catch-up-on-launch` (below) already covers a
  missed run: the paper simply appears the next time you open the app rather
  than exactly at 00:30. Fine if you don't care about the exact time.

If you want the exact time hit every day with zero dependency on your
laptop's sleep state at all, the most reliable option is running
`server/scheduler/run-daily.ts` on a machine that's never asleep — a
Raspberry Pi, NAS, or small always-on VM, on the same cron schedule.

## 5. How provider switching works

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

## 6. Privacy

Only **day summaries** and **concept labels** (for spaced repetition) are
written to `data/axiom.db` (SQLite). Specifically persisted:

- Paper metadata (id, title, url, license, phase, topics)
- Test pass/fail counts and time spent
- Your own free-text reflection, if you write one

**Never persisted:** generated question text, test cases, reference
solutions, or your submitted code. These live only in server memory
(`server/dayState.ts`) for the current day and are discarded on restart or
day rollover — see `server/session-types.ts` for the in-memory-only types.

The **Home** news feed makes no account-linked requests — it fetches public
Hacker News data and caches article preview images locally in
`data/news-image-cache/` purely to avoid re-scraping on every refresh.

To audit the no-question-storage claim yourself:

```bash
grep -rn "questions\[" server/db/ server/routes/summary.ts   # should find nothing writing question content
```

## 7. Legal notes

- **LLM automation**: use an API key for whichever provider you choose, not a
  chat subscription's browser/OAuth session. Anthropic's Consumer Terms
  §3.7, for example, prohibit automated/non-human access to a Pro/Max
  session — this app always calls provider APIs directly with `LLM_API_KEY`.
- **arXiv**: sourcing uses `export.arxiv.org` (not the human-facing site),
  respects the documented rate limit (≤1 request/3s) and `Crawl-delay: 15`,
  and backs off exponentially on 429/503.
- **PDF caching**: arXiv's default license ("arXiv.org perpetual,
  non-exclusive") does not grant redistribution rights. Axiom only caches a
  PDF locally when the detected license is redistributable (CC BY, CC
  BY-SA, CC BY-NC-SA, CC0); otherwise it shows a **link-out** button to the
  paper's abstract page instead of caching. This is a personal-use,
  local-only cache — never served to anyone but you.
- **Hacker News + article images**: the Home feed uses HN's public,
  unauthenticated Firebase API (no key, no ToS gate) and fetches each
  story's own `og:image`/`twitter:image` — the same preview image the site
  already serves to link previews on Slack, Twitter, etc. — caching it
  locally for your own viewing only.
- **Per-provider ToS**: check the terms of whichever LLM/data provider you
  configure; pricing and rate limits change frequently (see `plan.md`'s
  "Verification notes" section for what was confirmed vs. unverifiable at
  time of writing).

## 8. Troubleshooting

- **Pyodide first load is slow (~15 MB, more if you select NumPy)**: this
  only happens once per browser profile; it's cached afterward. Exercises
  run fully client-side in a Web Worker, so there's no server-side execution
  risk from your code.
- **News cards show a gradient instead of a photo**: not every article has
  an `og:image`/`twitter:image` meta tag, or the source blocks scraping —
  the app falls back to a generated gradient rather than a broken image.
- **Rate limit / 429 errors from arXiv or Semantic Scholar**: the pipeline
  already retries with exponential backoff. If it persists, get a free
  Semantic Scholar API key (`SEMANTIC_SCHOLAR_API_KEY` in `.env`) to move off
  the shared unauthenticated pool.
- **Wrong day / timezone confusion**: Axiom computes "today" in
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

See `plan.md` → "Repository / file structure" for the original annotated
tree (the `server/news/` module and `web/src/views/Home.tsx` were added
after that plan was written, for the Home news feed).
