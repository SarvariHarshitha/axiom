# plan.md — "PaperForge": A Local-First Daily LLM/AI Research-Paper Mastery App

*Research checked August 24, 2026. All pricing, rate limits, and policy claims are dated; verify before relying on them, since these change frequently. Where a fact could not be verified it is flagged explicitly.*

---

## Decisions (answers to your three questions)

### Q1. Claude Pro scheduled tasks vs. DeepSeek API — which powers the daily generation?

**Decision: Neither Claude Pro scheduling nor a Claude subscription. Use a provider-agnostic API layer, default to the DeepSeek V4-Flash API (or Google Gemini Flash‑Lite free tier), triggered by a LOCAL scheduler (cron / Task Scheduler / APScheduler) with a catch-up-on-launch fallback.**

Reasoning and evidence:

- **A Claude *subscription* may not legally power an automated app.** Anthropic's Consumer Terms §3.7 prohibit accessing the service "through automated or non-human means, whether through a bot, script, or otherwise," *except* via an Anthropic API Key or where explicitly permitted (verbatim from anthropic.com/legal/consumer-terms, capture observed 2026). Unattended daily generation is exactly the prohibited pattern; enforcement has been active in 2026 (accounts disabled for automated OAuth use).
- **The June 15, 2026 billing split killed the economic case anyway.** Programmatic usage (Agent SDK, `claude -p`, third-party apps) no longer draws from the flat subscription pool; it draws from a separate monthly "Agent SDK credit" ($20 for Pro, $100/$200 for Max) billed at full API list prices and does not roll over (reported by The Decoder, InfoWorld, Better Stack, June 2026). So a Pro subscription gives you $20 of API-rate credit for automation — no cheaper than buying API credit directly, and less flexible. Note the Agent SDK also now *requires* API-key auth (Feb 19, 2026 legal update); OAuth tokens from Free/Pro/Max cannot be used with it.
- **Claude Code scheduled tasks / Routines exist but don't fit.** As of 2026 Claude Code has three scheduling tiers: CLI `/loop` (session-scoped), Desktop Scheduled Tasks (local, require the app open), and cloud "Routines" (launched April 14, 2026, run even when your laptop is closed). But cloud Routines are capped at **5 runs/day on Pro** (15 Max, 25 Team/Enterprise), minimum cadence is **hourly** (cloud), they are **agentic/non-deterministic**, and they are **Claude-only** — they can't be pointed at an arbitrary model, contradicting requirement #3.
- **Cost math** (one paper/day, ~25k input + ~5k output tokens/day, 365 days ≈ 9.1M input + 1.8M output/yr):
  - **DeepSeek V4-Flash** (off-peak $0.22/M in, $0.66/M out): **≈ $3.2/year**. Your 00:30 IST run = 19:00 UTC, which falls in DeepSeek's off-peak window, so you get the lower rate automatically. Confirmed by Morph's Aug 21, 2026 pricing (morphllm.com/deepseek-api, cross-checked vs DeepSeek's official docs): "deepseek-v4-flash runs $0.22/1M input off-peak ($0.44 peak) and $0.66/1M output off-peak ($1.32 peak)"; peak hours are 01:00–04:00 and 06:00–10:00 UTC, effective the Aug 16, 2026 repricing (16:00 UTC). *(Caveat: one source claims peak applies Mon–Fri only; DeepSeek's official text does not state this — treat weekday-only as unverified. Also note the "off-peak" rates are a net increase over the retired flat $0.14/$0.28.)*
  - **Google Gemini 2.5 Flash-Lite** ($0.10/M input, $0.40/M output, per Google's Gemini Developer API pricing as reported by Morph, morphllm.com/gemini-api-pricing — "gemini-2.5-flash-lite is the cheapest at $0.10/1M input and $0.40/1M output"; 1,048,576-token context): **≈ $1.6/year**, and one call/day fits inside AI Studio's free tier → effectively **$0**. *(Flash-Lite 2.5 is slated for retirement Oct 16, 2026; successor Gemini 3.1 Flash-Lite is $0.25/$1.50.)*
  - **Claude Haiku 4.5** ($1/$5): **≈ $18/year**. **Claude Sonnet 5** ($3/$15 standard; introductory $2/$10 through Aug 31, 2026): **≈ $55/year**.
  - **OpenRouter free models** (`:free`): **$0** but rate-limited (20 req/min; 50–1,000 req/day). **Local Ollama/LM Studio**: **$0** marginal, fully offline.
  - **Claude Pro subscription**: **$240/year**, and can't legally/economically be used for this automation.
- **Verdict:** a plain API call from local cron is deterministic, unattended, offline-capable (with local models), carries no ToS risk, and costs cents. It wins decisively over any subscription-scheduling approach.

### Q2. Embed the PDF vs. link out?

**Decision: Hybrid — detect open access, download the PDF to a local cache, and serve it from your own localhost origin through Mozilla PDF.js. Fall back to a link-out button when the paper isn't open access or can't be cached.**

Reasoning and evidence:

- **Do NOT hotlink arxiv.org into an `<iframe>`.** Whether arxiv.org sends `X-Frame-Options`/`frame-ancestors` on `/pdf/` and `/html/` **could not be definitively verified** (no documented source found; run `curl -sI https://arxiv.org/pdf/1706.03762 | grep -iE 'x-frame|content-security'` to confirm on your machine), so cross-origin framing must be treated as unreliable. The common failure mode is real and documented ("Refused to display … in a frame because it set 'X-Frame-Options' to 'sameorigin'").
- **arXiv's API Terms of Use explicitly ask you to "direct users to arXiv.org to retrieve e-print content" and *not* to "store and serve arXiv e-prints … from your servers, unless you have the permission of the copyright holder or are permitted to do so by the license."** Per arXiv's official license page (arxiv.org/help/license), authors may select CC BY 4.0, CC BY-SA 4.0, CC BY-NC-SA 4.0, or CC0, but the **default remains the "arXiv.org perpetual, non-exclusive license," which does not grant redistribution rights** — and "the overwhelming majority of e-prints" use it.
- **Serving a locally-cached PDF via PDF.js is the robust path** and fully sidesteps remote `X-Frame-Options`/`frame-ancestors`, because those headers only govern framing the *remote* page, not a file you host yourself on localhost (confirmed: MDN X-Frame-Options; Nutrient.io 2026 embedding guide — "The most reliable options are proxying the PDF through your own server or downloading and rehosting the file yourself"). PDF.js renders raw bytes on its own canvas, so no remote framing is involved.
- **Reconcile with arXiv terms via a "personal-cache" policy:** this is a single-user, local-only app (no public serving), so caching for personal reading is defensible. The plan defaults to a **short-lived local cache**, records each paper's license, and for **non-redistributable licenses** defaults to **link-out** (embedding a cached copy for your own eyes is a user-controlled toggle with a visible license banner).
- **UX:** self-hosted PDF.js is reliable in 2026 desktop browsers and gives consistent rendering, page deep-links, and text selection; third-party PDF iframes are the fragile case (mobile, CSP, X-Frame-Options).

### Q3. Local-first, README-driven, generalized LLM options.

**Decision: Ship a self-contained local app (one `docker compose up` OR one `make dev`), with a provider-agnostic LLM layer keyed on an OpenAI-compatible `/v1/chat/completions` interface plus native Anthropic/Gemini adapters, all configured through `.env`. A thorough README lets any user self-serve.** Details below.

---

## Goals

1. Every day, surface **one** paper to study — blending a foundational "canon" with fresh, high-velocity recent work, in a prerequisite-respecting curriculum order.
2. Auto-generate **coding questions + test cases** from that paper; provide an **in-browser IDE** that runs code against the tests and only marks the day complete when all tests pass (with humane escape hatches).
3. **Never persist question/test/code content** — only a per-day *summary* record.
4. A **calendar with hover cards** summarizing each completed day; embed the PDF when open-access, else link out.
5. **Local-first**, provider-agnostic, and fully documented for self-service.

## Non-Goals

- No cloud account, no multi-user server, no auth, no telemetry.
- Not a general paper manager / reference library (Zotero exists).
- No storing of generated questions, tests, or user code beyond the session.
- No dependency on any single LLM vendor or on a chat-subscription for automation.
- Not a mobile app in v1 (desktop-first).

---

## Tech stack (with justification)

| Layer | Choice | Why |
|---|---|---|
| Runtime | **Node.js 22 LTS** + **TypeScript 5.6** | One language across server + web; easy local install |
| Server | **Fastify 5** | Fast, small, first-class TS, simple route plugins |
| Frontend | **React 18 + Vite 6** | Mature; works with all calendar/editor libs |
| Editor | **CodeMirror 6** (default) or **Monaco** (optional) | CM6 is lighter and embeds cleanly; Monaco optional for VS Code feel |
| Code exec (default) | **Pyodide 0.26+** (CPython 3.12 → WASM, in a Web Worker) | Runs Python fully client-side; zero server risk; offline |
| Code exec (optional) | **Local Docker sandbox** (`python:3.12-slim`, `--network none`, mem/CPU/pids limits, read-only FS, timeout) | For libraries Pyodide can't load, or non-Python |
| DB | **SQLite** via **better-sqlite3** | Single-file, local, zero-config; summaries only |
| LLM layer | **Hand-rolled provider interface** + optional **LiteLLM** proxy | OpenAI-compatible common denominator; native Anthropic/Gemini |
| PDF | **pdf.js (pdfjs-dist)** | Self-hosted rendering, sidesteps X-Frame-Options |
| Calendar | **react-activity-calendar** (heatmap) / **@uiw/react-heat-map** or **react-calendar-heatmap** (month grid); **Radix Tooltip / Floating UI** for hover cards | Mature, MIT, tooltip hooks built in |
| Scheduler | **node-cron** in-process + OS cron/Task Scheduler wrapper + catch-up-on-launch | Works when laptop sleeps at 00:30 IST |
| Spaced repetition | **ts-fsrs** (FSRS-6) | Actively maintained; better than SM-2 (fsrs.js is deprecated in favor of ts-fsrs) |

---

## Repository / file structure

```
paperforge/
├── README.md                     # self-serve setup (see Setup section)
├── .env.example                  # all config keys documented
├── docker-compose.yml            # optional: app + optional sandbox
├── Makefile                      # make dev / make schedule / make generate
├── package.json
├── data/
│   ├── paperforge.db             # SQLite: SUMMARIES ONLY
│   ├── pdf-cache/                # cached open-access PDFs (gitignored)
│   └── canon.json                # curated foundational paper list + curriculum spine
├── server/
│   ├── index.ts                  # Fastify bootstrap
│   ├── routes/
│   │   ├── today.ts              # GET /api/today
│   │   ├── generate.ts           # POST /api/generate  (daily pipeline)
│   │   ├── validate.ts           # POST /api/validate-run (test runner gate)
│   │   ├── summary.ts            # POST/GET /api/summary  (persist summary only)
│   │   ├── calendar.ts           # GET /api/calendar
│   │   └── pdf.ts                # GET /api/pdf/:id  (serve cached PDF)
│   ├── llm/
│   │   ├── provider.ts           # LLMProvider interface
│   │   ├── openai-compatible.ts  # DeepSeek/Groq/Together/OpenRouter/Ollama/LMStudio/vLLM
│   │   ├── anthropic.ts          # native adapter
│   │   ├── gemini.ts             # native adapter
│   │   └── index.ts              # factory from .env
│   ├── papers/
│   │   ├── sources.ts            # arXiv API, HF Daily Papers, Semantic Scholar, OpenAlex
│   │   ├── rank.ts               # canon + citation-velocity blend
│   │   ├── curriculum.ts         # phase ordering / prerequisite gating
│   │   ├── openaccess.ts         # Unpaywall/OpenAlex/S2 OA detection
│   │   └── pdfcache.ts           # download + license record
│   ├── prompts/                  # prompt templates (summary/questions/tests/validate)
│   ├── scheduler/
│   │   ├── cron.ts               # node-cron + catch-up-on-launch
│   │   └── run-daily.ts          # headless entry for OS cron
│   └── db/
│       ├── schema.sql
│       └── summaries.ts
├── web/
│   ├── src/
│   │   ├── App.tsx
│   │   ├── views/{Today,Calendar,Settings}.tsx
│   │   ├── ide/{Editor,TestRunner,PyodideWorker}.ts(x)
│   │   ├── pdf/PdfViewer.tsx
│   │   └── calendar/{Heatmap,HoverCard}.tsx
│   └── index.html
└── scripts/
    └── install-cron.sh / install-task.ps1
```

---

## Data model

### Persisted (SQLite) — SUMMARY ONLY. Questions/tests/code are NEVER written here.

```sql
-- schema.sql
CREATE TABLE IF NOT EXISTS day_summary (
  date              TEXT PRIMARY KEY,          -- 'YYYY-MM-DD' (IST)
  paper_id          TEXT NOT NULL,             -- e.g. 'arXiv:1706.03762'
  paper_title       TEXT NOT NULL,
  paper_url         TEXT NOT NULL,             -- abstract page (link-out target)
  pdf_url           TEXT,                      -- open-access pdf if any
  is_open_access    INTEGER NOT NULL DEFAULT 0,
  license           TEXT,                      -- 'CC-BY', 'arXiv-perpetual', etc.
  phase             TEXT NOT NULL,             -- curriculum phase key
  topics            TEXT NOT NULL,             -- JSON array of concept tags
  questions_total   INTEGER NOT NULL DEFAULT 0,
  questions_passed  INTEGER NOT NULL DEFAULT 0,
  tests_total       INTEGER NOT NULL DEFAULT 0,
  tests_passed      INTEGER NOT NULL DEFAULT 0,
  completed         INTEGER NOT NULL DEFAULT 0,-- 1 if all tests passed
  partial           INTEGER NOT NULL DEFAULT 0,-- 1 if reference solution revealed
  time_spent_sec    INTEGER NOT NULL DEFAULT 0,
  reflection        TEXT,                      -- user's own note
  created_at        TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS concept_review (   -- spaced repetition, concept-level ONLY
  concept           TEXT PRIMARY KEY,          -- e.g. 'kv-cache'
  first_seen        TEXT NOT NULL,
  stability         REAL, difficulty REAL,     -- FSRS state
  due               TEXT,                       -- next resurface date
  reps              INTEGER NOT NULL DEFAULT 0
);
-- NOTE: concept_review stores only concept LABELS + FSRS scheduling numbers,
-- never question text or answers.
```

### In-memory / session only (never persisted)

```ts
interface GeneratedDay {           // lives in server memory + browser session
  paper: PaperRef;
  summary: string;                 // shown, not stored verbatim
  questions: Question[];
}
interface Question {
  id: string;                      // ephemeral uuid
  prompt: string;
  functionSignature: string;
  docstring: string;
  visibleTests: TestCase[];
  hiddenTests: TestCase[];
  referenceSolution: string;       // used only for validation gate; never sent to UI until "reveal"
}
interface TestCase { input: unknown[]; expected: unknown; }
```
On process restart or day rollover, `GeneratedDay` is discarded. Only `day_summary` (and concept labels) survive.

---

## LLM provider abstraction

```ts
// provider.ts
export interface LLMProvider {
  name: string;
  chat(opts: {
    system: string;
    user: string;
    json?: boolean;         // request strict JSON
    maxTokens?: number;
    temperature?: number;
  }): Promise<string>;      // returns raw text (JSON string when json=true)
}
```

**Config keys (`.env`):**
```
LLM_PROVIDER=openai_compatible   # openai_compatible | anthropic | gemini
LLM_BASE_URL=https://api.deepseek.com/v1
LLM_MODEL=deepseek-v4-flash
LLM_API_KEY=sk-...
LLM_TEMPERATURE=0.2
# presets:
#  DeepSeek:   BASE_URL=https://api.deepseek.com/v1        MODEL=deepseek-v4-flash
#  Gemini:     PROVIDER=gemini                             MODEL=gemini-2.5-flash-lite
#  Groq:       BASE_URL=https://api.groq.com/openai/v1     MODEL=llama-3.3-70b
#  OpenRouter: BASE_URL=https://openrouter.ai/api/v1       MODEL=...:free
#  Ollama:     BASE_URL=http://localhost:11434/v1          MODEL=qwen2.5-coder:14b   KEY=ollama
#  LM Studio:  BASE_URL=http://localhost:1234/v1           MODEL=...
```

**How to add a provider:** if it's OpenAI-compatible, just set `LLM_BASE_URL`/`LLM_MODEL`/`LLM_API_KEY` — no code (DeepSeek, Groq, Together, OpenRouter, Ollama, LM Studio, vLLM all expose `/v1/chat/completions`). If it needs a native shape, add a file implementing `LLMProvider` and register it in `llm/index.ts`. **LiteLLM** is offered as an optional drop-in proxy (`litellm --config`, port 4000) so even Anthropic/Gemini/Bedrock can be reached through one OpenAI-compatible port. Recommendation: **hand-roll the three adapters** (small surface, no extra runtime dependency) and treat LiteLLM as an optional convenience for users who want to route many providers.

---

## Paper pipeline

1. **Sourcing (free APIs):**
   - **arXiv API** via `export.arxiv.org/api/query` for categories cs.CL, cs.LG, cs.AI, cs.NE. Respect arXiv's guidance: ≤1 request/3s, honor `Crawl-delay: 15` in robots.txt, use `export.arxiv.org` for programmatic access (not the human site), set a descriptive User-Agent, exponential backoff on 429/503.
   - **Hugging Face Daily Papers API** (`https://huggingface.co/api/daily_papers?date=YYYY-MM-DD`, no auth, paginated) for the trending/recent feed; `GET /api/papers/{arxivId}` for metadata + AI summary + linked code/datasets.
   - **Semantic Scholar Graph API** for `citationCount`, `influentialCitationCount`, and the Recommendations endpoint. Rate limits, per Allen AI's official s2-folks release notes: unauthenticated is a **shared pool of 5,000 requests / 5 minutes** ("Note: this is shared pool among all unauthenticated users"); an authenticated key grants **1 req/s** on `/paper/batch`, `/paper/search`, `/recommendations` and **10 req/s** on other calls. Exponential backoff is now **required**.
   - **OpenAlex** (no key, CC0 metadata) as a resilient fallback and secondary citation source.
   - **Papers with Code is DEAD** — Meta sunset it **July 24–25, 2025** (users saw "Bad Gateway 502" errors; the domain redirected to Hugging Face Trending Papers, retiring 9,327 leaderboards, 79,817 paper-to-code linkages and 5,628 datasets, per CodeSOTA's record). Use HF Daily Papers + the `pwc-archive` HF snapshot for legacy code links instead.
2. **Open-access detection & PDF caching:** resolve DOI → **Unpaywall/OpenAlex** `open_access` object (Unpaywall now runs on the OpenAlex codebase since the May 20, 2025 rewrite; requires a contact email per request, no key). Cross-check Semantic Scholar `isOpenAccess`/`openAccessPdf`. If OA, download to `data/pdf-cache/` and record `license`; else set link-out.
3. **Ranking — canon + recency blend:** maintain `canon.json` (static foundational list). Daily score:
   `score = w1·canon_priority + w2·citation_velocity + w3·recency + w4·phase_fit − w5·seen_penalty`
   where `citation_velocity = influentialCitationCount / months_since_pub`. Early days weight the canon; as phases complete, weight shifts toward recent high-velocity papers *within the current phase*.
4. **Curriculum spine (prerequisite-respecting phases, 3–6 canonical papers each):**
   1. Tokenization & embeddings (BPE, word2vec, GloVe)
   2. Attention & Transformers (Attention Is All You Need, GPT-1/2, BERT)
   3. Positional encodings (RoPE, ALiBi)
   4. Normalization & optimizers (LayerNorm, RMSNorm, Adam/AdamW)
   5. Scaling laws & pretraining data (Kaplan et al., Chinchilla, The Pile)
   6. Fine-tuning / PEFT (LoRA, QLoRA, adapters, prefix-tuning)
   7. Alignment (InstructGPT/RLHF, DPO, Constitutional AI)
   8. Inference optimization (FlashAttention, KV-cache, quantization, speculative decoding)
   9. Retrieval / RAG (RAG, REALM, RETRO)
   10. Agents & tool use (ReAct, Toolformer)
   11. Evaluation (HELM, MMLU, LM-eval-harness)
   12. Multimodal (CLIP, Flamingo, LLaVA)
   13. Architectures beyond Transformers (MoE, Mamba/SSMs)
   A phase "unlocks" the next after N completed days in it.
5. **Dedupe:** never repeat a `paper_id` present in `day_summary`; near-dup detection via title/arXiv-id normalization.

---

## Prompt templates (all request strict JSON; server validates before use)

### 1) Summarization
```
SYSTEM: You are an expert ML educator. Summarize for a software engineer mastering LLMs.
USER: Paper title: {title}\nAbstract: {abstract}\nFull text (may be truncated): {text}
Return JSON:
{ "tldr": string, "key_contributions": string[], "prerequisites": string[],
  "concepts": string[], "intuition": string, "where_it_fits": string }
```

### 2) Question generation
```
SYSTEM: Generate coding exercises that make the reader implement the paper's core mechanism.
USER: Concepts: {concepts}\nSummary: {summary}\nProduce {n} questions (mix quiz + implement-the-paper).
Return JSON array of:
{ "id": string, "prompt": string, "function_signature": string, "docstring": string,
  "difficulty": "easy"|"medium"|"hard", "concepts": string[] }
```

### 3) Test-case generation
```
SYSTEM: For each question produce deterministic, pure-function test cases. No randomness, no I/O, no network.
USER: {question}\nProduce >=3 visible and >=3 hidden tests.
Return JSON:
{ "reference_solution": string,  // complete correct implementation
  "visible_tests": [{ "input": any[], "expected": any }],
  "hidden_tests":  [{ "input": any[], "expected": any }] }
```

### 4) Reference-solution validation (the critical gate)
This is **not** a prompt — it's a **server-side execution check**. Before any question is shown, run the LLM's `reference_solution` against **all** its generated tests (in the same Pyodide/sandbox). **Discard any test the reference solution fails.** If fewer than the minimum tests survive, regenerate once; else drop the question. This prevents hallucinated/unsolvable tests from blocking the "all tests must pass" gate — the single most important correctness safeguard in the app.

---

## Browser IDE & test runner

- **Editor:** CodeMirror 6 with Python mode; user writes the function per the given signature.
- **Runtime:** Pyodide (CPython 3.12 → WASM) in a Web Worker (keeps UI responsive; `input()` unsupported — enforce pure functions). First load downloads ~15 MB then browser-caches it. Optional local Docker sandbox for heavier libraries.
- **Runner:** for each question, execute user code, then run visible then hidden tests. Show pass/fail per test (hidden tests show pass/fail only, not their inputs).
- **Validation gate:** the day is "complete" only when **every test of every question passes**.
- **Safety/timeouts:** wrap each run in a wall-clock timeout (e.g., 5 s) to kill infinite loops; cap output size; Pyodide isolation means no host access. For Docker mode: `--network none`, `--read-only`, `--memory=256m`, `--cpus=0.5`, `--pids-limit`, non-root user, `--stop-timeout` (per 2026 sandboxing guidance; for maximal isolation of AI-generated code, gVisor/Firecracker microVMs are the stronger-but-heavier options).
- **Humane escapes:** escalating hints (concept → signature nudge → pseudocode); a **"Reveal reference solution"** button that marks the day `partial=1` (done-but-assisted); per-run infinite-loop timeout.

---

## Calendar / hover-card UI

- **Grid:** GitHub-contributions-style heatmap via `react-activity-calendar` (year view) plus a month grid; intensity = completed(2)/partial(1)/none(0). Data shape is `{ date, count, level }`.
- **Hover card (Radix Tooltip / Floating UI):** shows date, paper title, phase, topics, tests_passed/total, time spent, and a reflection snippet, plus a link/PDF button.
- **Detail on click:** opens the summary with the embedded PDF (open-access, via self-hosted PDF.js) or a prominent **"Open paper ↗"** link-out button otherwise.

---

## API routes (local server)

| Method | Route | Purpose |
|---|---|---|
| GET | `/api/today` | Return today's `GeneratedDay` (in-memory) |
| POST | `/api/generate` | Run the daily pipeline (sourcing→rank→LLM→validate) |
| POST | `/api/validate-run` | Execute code+tests server-side fallback / gate check |
| POST | `/api/summary` | Persist the day summary (summary fields only) |
| GET | `/api/summary/:date` | Fetch a day summary |
| GET | `/api/calendar?from=&to=` | All summaries for the heatmap |
| GET | `/api/pdf/:id` | Stream the cached open-access PDF |
| GET | `/api/health` | Liveness |

---

## Scheduling (local, sleep-safe)

- **Primary:** OS cron / Windows Task Scheduler runs `server/scheduler/run-daily.ts` headless. For 00:30 IST use cron `30 0 * * *` **with the process TZ set to Asia/Kolkata** (or convert: 19:00 UTC).
- **In-process:** node-cron as a backup when the app is open.
- **Catch-up-on-launch (key):** on every app start, if `day_summary` has no row for "today" (IST), run generation immediately. This handles the common case where the laptop is asleep at 00:30 IST. Also generate if the last run date < today.
- **Timezone:** compute "today" in IST (Asia/Kolkata) explicitly, independent of machine TZ.

---

## Additional ideas (evaluated v1 vs later)

| Idea | Verdict |
|---|---|
| **Spaced repetition (FSRS) at concept level** (resurface concepts, not stored questions) | **v1** — high value, honors no-question-storage rule |
| **Streak / heatmap view** | **v1** — free from calendar |
| **Implement-the-paper vs quiz mode** | **v1** — core to "mastery" |
| **Reference-solution validation gate** | **v1** — mandatory for correctness |
| **Catch-up-on-launch** | **v1** — essential for laptop reality |
| **Offline pre-fetched paper queue** | **v1-lite** — cache next ~7 papers |
| **Export summaries to Markdown/Obsidian/Notion** | **v1-lite** — trivial, high utility |
| **Difficulty adaptation** (based on pass rate/time) | **v2** |
| **"Explain this section" chat side panel** | **v2** |
| **Concept graph of coverage** | **v2** |
| **Weekly synthesis review** (auto quiz across the week's concepts) | **v2** |
| **Time-boxing / Pomodoro** | **v2** |

---

## Phased roadmap with acceptance criteria

**Milestone 0 — Skeleton (½ week).** Repo, `.env.example`, Fastify + Vite boot, SQLite schema. *AC:* `make dev` serves an empty app; `/api/health` returns ok; DB file created.

**Milestone 1 — LLM layer (½ week).** Provider interface + OpenAI-compatible + Anthropic + Gemini adapters. *AC:* switching `LLM_PROVIDER` in `.env` routes a test prompt to DeepSeek, Gemini, and Ollama with no code change.

**Milestone 2 — Paper pipeline (1 week).** arXiv + HF Daily + S2 + OpenAlex sourcing; canon.json; ranking; dedupe; OA detection + PDF cache. *AC:* `/api/generate` picks one non-repeated paper respecting the current phase, caches its PDF if OA, records license.

**Milestone 3 — Generation + validation (1 week).** Summary/question/test prompts; reference-solution validation gate. *AC:* every shown question has ≥3 visible + ≥3 hidden tests that the reference solution passes; unsolvable tests are auto-discarded.

**Milestone 4 — Browser IDE (1 week).** CodeMirror + Pyodide worker + test runner + timeouts + hints + reveal. *AC:* day marks complete only when all tests pass; reveal marks partial; infinite loop is killed within timeout.

**Milestone 5 — Calendar + PDF (½ week).** Heatmap, hover cards, PDF.js viewer, link-out fallback. *AC:* hovering a date shows the summary card; open-access PDF renders inline; non-OA shows link-out.

**Milestone 6 — Scheduling + privacy audit (½ week).** cron/Task Scheduler install scripts; catch-up-on-launch; grep the codebase to prove no question text hits disk. *AC:* laptop asleep at 00:30 IST still yields today's paper on next launch; DB contains only summary fields.

**Milestone 7 — README + polish (½ week).** Full self-serve README, Obsidian export, offline queue. *AC:* a fresh user can go from clone → running → first paper using only README.md.

---

## Setup / README requirements

The README must let any user self-serve and cover:
1. Prereqs (Node 22, optional Docker, optional Ollama/LM Studio).
2. `cp .env.example .env` and a table explaining **every** key, with copy-paste presets for DeepSeek, Gemini (incl. free tier), Groq, OpenRouter (incl. `:free`), Ollama, LM Studio.
3. `make dev` to run; `make generate` to force today's paper; `make schedule` to install cron/Task Scheduler.
4. How provider switching works and how to add a provider.
5. Privacy statement: what is and isn't stored (summaries + concept labels yes; questions/tests/code no).
6. Legal notes: arXiv API terms (link out; cache only per license), the Anthropic subscription-automation caveat (§3.7 — use an API key, not a Pro/Max subscription, for automation), and per-provider ToS.
7. Troubleshooting (Pyodide first-load ~15 MB, rate-limit backoff, timezone/IST handling).

---

## Risks & mitigations

| Risk | Mitigation |
|---|---|
| LLM emits invalid JSON | Strict JSON mode + schema validate + one retry + fail-soft to quiz-only |
| Hallucinated/unsolvable tests block the gate | **Reference-solution validation gate** discards failing tests |
| arXiv rate limits / 429 / 503 | Use export.arxiv.org, ≤1 req/3s, honor Crawl-delay 15, backoff, cache |
| PDF can't be embedded (headers/license) | Self-host via PDF.js; else link-out; record license |
| Laptop off at 00:30 IST | Catch-up-on-launch |
| Provider price/API drift (frequent in 2026) | Provider-agnostic layer; pin models in `.env`; dated pricing in README |
| Untrusted code execution | Pyodide WASM isolation by default; hardened Docker (or gVisor/Firecracker) option |
| Accidental question persistence | Privacy audit milestone + code-review rule + in-memory-only types |
| Semantic Scholar tightening unauthenticated pool | Request a personal key; backoff; OpenAlex fallback |

---

## Open questions for you to decide

1. **Primary language for exercises** — Python only (Pyodide) in v1, or also JS/TS (via WebContainers)?
2. **Default provider** — DeepSeek V4-Flash (cheapest paid, ~$3/yr), Gemini Flash-Lite (free tier, effectively $0), or local Ollama (fully offline)?
3. **PDF caching posture for non-redistributable licenses** — always link-out, or allow a local cached view for personal use with a visible license banner?
4. **Papers per day** — strictly one, or allow a "second optional paper" on streak days?
5. **Docker sandbox** — ship it in v1, or defer to v2 (Pyodide-only first)?
6. **Exercise count/day** — fixed (e.g., 3) or adaptive to available time?

---

### Verification notes / unresolved facts
- **arXiv iframe headers:** could NOT be verified from documentation. The plan does not rely on hotlinking; it self-hosts via PDF.js, which is immune to the remote header regardless. Run `curl -sI` to confirm if you ever want to hotlink.
- **DeepSeek weekday-only peak window:** one source claims peak is Mon–Fri only; DeepSeek's official text does not confirm this. Off-peak numbers ($0.22/$0.66) are confirmed; treat the weekday nuance as unverified.
- **All pricing is dated Aug 2026** and changes often (e.g., Gemini 2.5 Flash-Lite retires Oct 16, 2026; Claude Sonnet 5 introductory pricing runs through Aug 31, 2026). Re-check before committing a budget.