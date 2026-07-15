# Heirline — Shared Inheritance Planning Prototype

Heirline is the team's shared web application for helping families prepare for
inheritance conversations. The repository keeps each teammate's contribution
explicit while providing one integration point for the final demo.

## Team workstreams

- **Jasmine — shared website:** landing page, product framing, and role selector
  in `vantage-ai-frontend.html`.
- **Vedang — parent dashboard:** the React application in `src/`, including the
  parent-facing product flows and the frontend API adapter.
- **Aayush — heir dashboard backend:** the Python inheritance assistant,
  financial planner, asset manager, and document tracker.

## Vedang's Parent Dashboard

The parent experience is a demo-ready React application with six connected
features:

1. **Inheritance Readiness Assessment** — scores plan completeness and explains
   the next gaps.
2. **Wealth Transfer Simulator** — compares equal, trust, and staggered
   hypothetical structures.
3. **Professional Coordination Hub** — tracks documents, review dates, advisors,
   and milestones.
4. **Legacy Planner** — organizes family values, goals, instructions, and a
   living roadmap.
5. **Family Overview** — shows consent-based heir engagement and assigns learning
   goals.
6. **Jurisdiction Map** — groups assets by location and flags questions for
   professional review.

Run and verify the web application:

```bash
npm install
npm run dev
npm run validate
npm run build
```

The parent dashboard's ownership, privacy boundary, proposed API routes, and
integration contract are documented in
[`docs/PARENT_DASHBOARD_SCOPE.md`](docs/PARENT_DASHBOARD_SCOPE.md).

## Aayush's Heir Dashboard Backend

Gemini-powered tools for inheritors: an auto-routed Q&A assistant over your own
PDFs, a filing-document checklist, an asset log with live valuations, and a
financial planner.

### Setup

```bash
git clone <repo> && cd <repo>
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

cp GemAPI.env.example GemAPI.env     # then paste your key in
python cli.py doctor                 # verifies key, paths, deps
```

`doctor` prints the exact env file it loaded, so a naming mismatch is visible
in one command instead of being guessed at.

#### How the key is loaded

**The filename is discovered, not hardcoded.** A single hardcoded name is a
silent-failure trap: `load_dotenv()` on a path that doesn't exist is a no-op, so
a file named `GeminiAPI.env` when the code wants `GemAPI.env` yields "no API key
found" while the key sits in plain sight. Resolution order:

1. `$FA_ENV_FILE` if set — explicit wins, deployments pin this
2. `GemAPI.env`, `GeminiAPI.env`, `gemini.env`, `.env` in the project dir
3. any other `*.env` in the project dir (excluding `*.example`)

Within the file, `load_dotenv(path, override=False)` — the `override=False` is
deliberate: **a real environment variable always wins**, so containers and CI
inject the key with no file present. Key names `My_API_Key`, `GEMINI_API_KEY`,
and `GOOGLE_API_KEY` are all accepted. The key is never logged, never returned,
and never interpolated into an error message — `key_fingerprint()` returns only
the last 4 characters for display.

### Layers

```
config.py          absolute paths, env overrides, logging setup
gem_client.py      lazy, thread-safe Gemini client. Never raises at import.
models.py          dataclasses: holdings, assets, debts, profile
storage.py         atomic JSON portfolio store
market_data.py     quotes: yfinance -> Gemini grounded fallback, TTL cached
PromptValidation   InputRoute(prompt) -> Route enum
RAGresponse.py     RAGEngine: ingest() / retrieve() / answer() / stream_answer()
DocTrack.py        DocTrack(state, scope) / stream_doctrack(...)
AssetManager.py    CRUD + snapshot()
PlanAhead.py       compute_metrics() + stream_plan()
assistant.py       Assistant: the one facade a UI calls
--------------------------------------------------------------------
cli.py             DISPOSABLE. The only file that prints or prompts.
main.py            back-compat shim -> cli.main()
test_smoke.py      offline tests: no key, no network, no spend
```

**The rule:** nothing above the line prints, prompts, or exits. Services return
data or yield chunks; the caller decides how to display it. `cli.py` is the
reference caller. Your UI is the next one, and it imports nothing from `cli.py`.

### CLI

```bash
python cli.py                          # interactive chat (old main.py behaviour)
python main.py                         # identical — shim kept for compatibility
python cli.py doctor                   # check key, paths, deps before debugging
python cli.py ingest --force           # index PDFs, per-file status
python cli.py docs                     # what's in the corpus
python cli.py ask "what is a 401k?"
python cli.py ask "how much do I owe?" --route rag
python cli.py ask "..." --json         # machine-readable, pipe to jq
python cli.py doctrack NY --scope inheritor
python cli.py assets                   # Asset Manager (interactive)
python cli.py assets --json            # portfolio snapshot as JSON
python cli.py plan                     # PlanAhead (interactive)
python cli.py plan --metrics-only      # deterministic numbers, zero tokens
python test_smoke.py                   # offline tests
```

### Wiring a UI

Flask + SSE streaming:

```python
from flask import Flask, request, Response, jsonify
from assistant import Assistant
from RAGresponse import engine
import gem_client

app = Flask(__name__)
a = Assistant()

@app.get("/health")
def health():
    return jsonify(key=gem_client.api_key_present(), ready=engine.is_ready())

@app.post("/ask")
def ask():
    result = a.ask(request.json["prompt"])
    return jsonify(result.to_dict())          # already JSON-ready

@app.get("/stream")
def stream():
    q = request.args["q"]
    return Response(a.stream_ask(q), mimetype="text/event-stream")

@app.post("/ingest")
def ingest():
    return jsonify(engine.ingest(force=True).to_dict())
```

Streamlit:

```python
import streamlit as st
from assistant import Assistant

a = Assistant()
q = st.chat_input("Ask about your inheritance")
if q:
    route = a.route(q)
    st.caption(route.label)
    for c in a.citations_for(q):
        st.badge(c.label)
    st.write_stream(a.stream_ask(q, force_route=route))
```

### Notes for the frontend

- `Assistant.ask()` **never raises** for expected failures — check
  `result.error` and render it. `MissingAPIKey` is catchable if you'd rather
  show a setup screen; `gem_client.api_key_present()` checks without a call.
- `engine.is_ready()` tells you whether to grey out the documents tab, without
  loading the embedding model.
- Call `a.route()` and `a.citations_for()` first to paint the routing badge and
  source chips while the answer is still streaming.
- Every result object has `.to_dict()` and is JSON-serializable.
- Paths are env-overridable: `FA_DATA_DIR`, `FA_STORE_DIR`, `FA_ENV_FILE`,
  `FA_TOP_K`, `FA_LOG_LEVEL`, `FA_MAIN_MODEL`, `FA_FAST_MODEL`.
- First `retrieve()` in a process loads the embedding model (a few seconds).
  Call `engine.ingest()` at app startup to move that cost off the first request.

### Known limits

- The vector store is single-tenant. `PortfolioStore` already keys by `user_id`,
  but the Chroma collection does not — before multi-user, add a `user_id`
  metadata filter to `retrieve()` or use a collection per user.
- Ingestion is synchronous. A large PDF will block a request thread; move it to
  a task queue when you have real users.
- Scanned PDFs yield no text. `report.needs_ocr` names them; run `ocrmypdf` first.

### Security

Never commit: `GemAPI.env`, `data/` (your statements), `store/portfolio.json`
(salary, debts), `chroma_store/` (Chroma persists the original chunk text, so it
leaks the documents, not just vectors). All are gitignored, and
`.github/workflows/ci.yml` fails the build if any get tracked.

**The `.gitignore` trap:** a bare `.env` rule matches only a file named exactly
`.env`. It does **not** match `GemAPI.env`, `GeminiAPI.env`, or `keys.env.local`.
The rules here are `*.env`, `.env.*`, and `*.env.*`, with `!*.env.example`
negations last. Don't "simplify" them back.

**`.gitignore` does nothing for files git already tracks.** If a key file was
ever committed, adding a rule changes nothing:

```bash
git rm --cached GemAPI.env && git commit -m "Stop tracking key file"
```

...and rotate the key anyway — it's still in history.

If a key is ever pushed, rotate it at https://aistudio.google.com/apikey first —
deleting the file doesn't remove it from git history, and on a shared repo you
must assume it was read.
