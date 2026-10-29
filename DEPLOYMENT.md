# DEPLOYMENT.md — free cloud deployment plan

Stack (all free tiers, no credit card): **Render** (backend) + **Supabase** (Postgres and Storage) + **Vercel** (frontend) + **Cloudflare Workers AI** (cloud embeddings).
Free-tier limits and the no-card claims below are partly from memory: check each pricing page before relying on them.

```
Phone/browser ─► Vercel (React PWA)
                   │  VITE_API_URL
                   ▼
               Render (FastAPI, no torch)
                ├─► Supabase Postgres (pooler connection string)
                ├─► Supabase Storage (private bucket, signed URLs)
                ├─► Cloudflare Workers AI (@cf/baai/bge-m3, 1024-dim)
                └─► Groq / OpenRouter (LLM, STT, vision)
```

## Why this shape
- Render free has 512 MB RAM: torch plus the embedding model will not fit, so embeddings move to the cloud.
- Render's disk is wiped on restart: the database moves to Supabase Postgres and uploads to Supabase Storage.
- Vercel serves the static frontend; the browser calls Render directly through `VITE_API_URL`.

## Decisions made
- **Cloudflare Workers AI (bge-m3) for embeddings, everywhere** (laptop and Render), so all vectors come from one model. `AGENTS.md` allows it.
  - Hugging Face was dropped: its Inference API gives free accounts **no credits** (HTTP 402 with a real token; pricing page: "Free Users: None").
  - Free plan: 10,000 neurons a day; bge-m3 costs about 1,075 neurons per million tokens, so a demo uses a tiny fraction.
- Supabase for database and files. Cloudflare R2 rejected (needs a card).
- Vercel for the frontend.
- Tests stay on SQLite with mocked HTTP; they never call Cloudflare even when `.env` has a token.

## Rules for every phase
Real implementation (no stubs or mocks in app code), real check run and its output reported, `pytest -q` and `npm test` green, `ruff check` and `npm run lint` clean, stub scan clean, small human-style commits. Files outside PRD §8 are called out with a reason.

## Phases

| # | Phase | Status |
|---|---|---|
| 1 | Memory basics | Done |
| 2 | Cloud embeddings (Cloudflare bge-m3) | Done, verified with a real token |
| 3 | Backfill of missing vectors | Done, verified on Postgres |
| 4 | Postgres support in code | Done |
| 5 | Real-Postgres check | Done (local Postgres 17 in Docker) |
| 6 | Supabase setup and seed | Not started (needs your Supabase account) |
| 7 | Supabase Storage for uploads | Not started |
| 8 | Deploy config (Render, Vercel) | Not started |
| 9 | Rehearsal | Not started |

### Phase 1: Memory basics (done)
- `requirements-base.txt` (everything except `sentence-transformers`, plus `psycopg2-binary`); `requirements.txt` includes it and adds `sentence-transformers`.
- `requirements.txt` also pins `huggingface-hub<1.0`, and `embeddings.py` sets `USE_TF=0`: together these fixed the local model silently failing to load on the laptop.

### Phase 2: Cloud embeddings (done)
- **Settings:** `EMBEDDING_PROVIDER` = `cloudflare|local|off`, `CF_ACCOUNT_ID`, `CF_API_TOKEN` (token with the "Workers AI" permission).
- **Client (`services/embeddings.py`):** batches of 32, 8 s timeout, at most 2 retries and only on 429/5xx/timeouts, shape must be exactly `(n, 1024)`, vectors normalized, 60 s cool-down after a failure so an outage does not slow every search.
- **Model safety:** `embeddings.dim()` gives the current model's size; search ignores stored vectors of another size, and the backfill re-embeds them. Switching provider re-embeds every card at the next start.
- **Mode flag:** `/api/ask` returns `search_mode: semantic|keyword`, and the search log line shows it. (No UI badge, by choice.)
- **Real check (2026-10-29):** response `result.data` shape `[n, 1024]`; 4 sentences (Hindi, Marathi, Hinglish, English) in ~0.3 s, all unit length; 3 of 4 meaning-only questions picked the right card (the miss is covered by keyword search plus the lexicon); bad token → 401, no retry, `None` in 78 ms, next call skipped in 0 ms.

### Phase 3: Backfill (done)
- `extractor.backfill_embeddings(db)`: cards with no vector or a vector from another model, in batches by id, committed per batch; idempotent; stops cleanly when the provider is down.
- Runs at the end of `python -m seed.seed` and once in a background thread at API startup (never blocks startup).
- **Real check:** a card saved through the API with embeddings off had no vector; after a restart with embeddings on, all 33 cards had vectors. Switching to Cloudflare later re-embedded all 32 remaining cards from 1536 to 4096 bytes.

### Phase 4: Postgres support in code (done)
- `database.py`: `postgres://` URLs get the psycopg2 driver; `pool_pre_ping` + `pool_recycle=300`. Postgres `chunks_fts` table with a `tsvector` column, GIN index and primary key `(record_type, record_id)`; a Python tokenizer keeps Devanagari marks; OR query ranked by `ts_rank`. SQLite FTS5 code is unchanged.
- `analytics.py`: on Postgres the query runs in a `READ ONLY` transaction with `statement_timeout` 2 s; the guard also blocks `pg_sleep`, `set_config`, `copy`, `lo_*`, `dblink`; the LLM is told which SQL dialect to write.
- Tests: `TEST_DATABASE_URL=postgresql://... pytest -m "not live"` runs the whole suite on Postgres; `tests/test_postgres.py` (new file, marker `postgres`) covers what SQLite cannot.

### Phase 5: Real-Postgres check (done)
- Whole suite on Postgres 17: 268 passed (including the 8 Postgres-only tests: GIN index, Hindi/Marathi whole-word search, ranking, re-index without duplicates, analytics on seeded data, offline SQL valid on Postgres, `nextval()` refused in the read-only transaction, long query cancelled).
- App on Postgres: tables created, seed loaded, Hindi question → Ramesh's card #2; Marathi question → Suresh's Lathe-2 card #29, and with the VMC-3 filter → card #7; rejecting a card removed its index row (1 → 0).
- Not verified: Supabase itself (pooler, RLS, latency); that is phase 6.

### Phase 6: Supabase setup and seed (done)
- **You do:** create the project in a region close to Render; copy the **pooler** connection string (the direct one is IPv6-only and Render has no IPv6) into `backend/.env` as `DATABASE_URL`. Never paste it or the password into chat or the repo.
- Enable row-level security on every table with no policies so the public API cannot read employee data (small SQL script; a file outside PRD §8, to be flagged).
- Run the seed once from your laptop with `EMBEDDING_PROVIDER=cloudflare`: it creates the tables, loads the data and embeds every card. Do not re-run it on every start.
- **Check:** row counts per table, 4096-byte vectors present, a search returns results with `search_mode: semantic`.
- **Result:** project in Stockholm (eu-north-1), Postgres 17, Session pooler. RLS on every table (`init_db` enables it). Seed loaded, 41 cards all with 4096-byte vectors, and every feature filled with demo activity through the real code (warnings, guided runs, routed questions, an interview, sensor anomalies, a meeting, a video procedure, ERP sync, a Marathi voice note).
- Fixed on the way: passwords with `@` in `DATABASE_URL`, `SUPABASE_URL` pasted with `/rest/v1/`, pooler-dropped connections (keepalives, `pool_recycle=60`, small pool), orphaned transactions holding locks (`idle_in_transaction_session_timeout` 5 min), analytics counting timeline events as breakdowns (table notes in the prompt).
- From the laptop each new connection to Stockholm takes 16–22 s (network path); expected to be fast from Render in Frankfurt. Measure in phase 9.

### Phase 7: Supabase Storage (done)
- **Files:** new `services/storage.py` (outside PRD §8, to be flagged), `utils/files.py`, `services/capture/video.py`, `services/ask/search.py` (`media_url`), `main.py`, `config.py`, tests.
- **Steps:**
  1. Settings: `STORAGE_BACKEND=local|supabase`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `SUPABASE_BUCKET`.
  2. Upload flow: validate, save to a temp file (OpenCV and speech-to-text need local paths), process, upload to a private bucket as `kind/uuid.ext`, delete the temp file. The database keeps the same relative path.
  3. Serve through signed URLs with expiry; the `/media/...` route redirects to one.
  4. Cap upload size and clip length and compress, to fit the free quota (about 1 GB total, about 50 MB per file: verify).
- **Real check:** upload a photo, restart the server, confirm it still loads.
- **Result:** private bucket `media` holds 15 files; `/media/...` redirects (307) to a signed URL; local mode serves the file with Range support. Video cap 50 MB.

### Phase 8: Deploy config (done)
- **Files:** `render.yaml`, `frontend/vercel.json`, `frontend/src/api/client.js` (base URL from `VITE_API_URL`), `.env.example`, README deploy section.
- **Render:** pin the Python version (Render's default is newer than numpy 1.26.4 supports); build installs `requirements-base.txt`; start with `uvicorn app.main:app --host 0.0.0.0 --port $PORT`; health check `/api/health`. Environment: `DATABASE_URL`, `GROQ_API_KEY`, `OPENROUTER_API_KEY`, `EMBEDDING_PROVIDER=cloudflare`, `CF_ACCOUNT_ID`, `CF_API_TOKEN`, `FRONTEND_ORIGIN`, `STORAGE_BACKEND`, `SUPABASE_*`. Secrets live only in the Render dashboard.
- **Vercel:** root directory `frontend`, Vite preset, SPA fallback rewrite, `VITE_API_URL` pointing at Render. Check the frontend for hardcoded `/media` URLs. The 30 s axios timeout is shorter than a Render cold start (~50 s), so the first request needs a retry or a longer timeout.
- **Optional:** keep-alive ping (GitHub Actions cron) so Render and Supabase do not sleep or pause.
- **You do:** create the Render and Vercel accounts and choose the Free and Hobby plans.
- **Result:** `render.yaml` (Python 3.11.9, region frankfurt, one worker), `frontend/vercel.json`, wake-up ping and one GET retry in `client.js`, keep-alive workflow. A Render-like Docker build (Python 3.11) passed the tests and the health check.

### Phase 9: Rehearsal (on the live URLs, from a phone)
1. First request after sleep: measure the cold start.
2. Capture a photo note, a voice note and a short video.
3. Ask a Hindi or Marathi question and get a cited answer.
4. Review and reject a card.
5. Restart Render; confirm data and files are still there.
6. Use a bad Cloudflare token; confirm search falls back to keywords (`search_mode: keyword` in the `/api/ask` response).

## Concerns
**Performance:** Render cold start (about 50 s after 15 min idle); Supabase pauses after about a week inactive; cross-region latency (put Render and Supabase in the same region); Supabase connection limits (use the pooler, keep the pool small).
**Memory:** torch is off on Render; OpenCV and audio processing can still spike RAM on big uploads, so cap sizes.
**Embeddings:** Cloudflare may retire models over time (re-check `@cf/baai/bge-m3` before the demo); a provider switch re-embeds everything at the next start; card text and questions leave the server for Cloudflare; Postgres `ts_rank` ranks differently from SQLite BM25 (checked in phase 5, results looked right).
**Files:** Render's disk is wiped; storage quota and per-file cap; private buckets need signed URLs; large uploads can hit Render or Vercel limits; processing needs a temp file.
**Security:** enable RLS (tables in `public` are reachable through Supabase's public API otherwise); secrets only in dashboards; `FRONTEND_ORIGIN` must match the Vercel domain exactly; free tiers have no SLA or backup guarantee.
**Cost and accounts:** no card should be needed, but Render's signup is unconfirmed; Vercel Hobby is non-commercial; Supabase may prompt you to upgrade past the free limits.
**Project:** the `map3d` router is not mounted in `main.py` and your teammate owns that work; the simulators are separate processes with no host yet; many dependencies (Vercel, Render, Supabase, Cloudflare, Groq, OpenRouter) mean rehearsal and a laptop-plus-tunnel fallback.
