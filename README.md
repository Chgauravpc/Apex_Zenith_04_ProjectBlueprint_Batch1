# Project Blueprint.....
Knowledge transfer from old employees to new employees in CNC/VMC machining (Surjanna Hackathon, Problem 2).

Docs: [PRD.md](PRD.md) · [PLAN.md](PLAN.md) · [AGENTS.md](AGENTS.md) · [ENGINEERING.md](ENGINEERING.md) · [TASKS.md](TASKS.md)

## Structure
- `backend/` — Python 3.9+, FastAPI, SQLite (see PRD §8–9)
- `frontend/` — React 18 + Vite, React Three Fiber

## Setup (filled in as tasks are completed — see TASKS.md T26)
```bash
cd backend && python -m venv .venv && .venv\Scripts\activate && pip install -r requirements.txt
copy .env.example .env   # add GROQ_API_KEY, OPENROUTER_API_KEY
cd ../frontend && npm install
```
Status: all features built and tested (backend `pytest`, frontend `vitest`); see `TASKS.md` for the task list.

## Deploy (free tiers)
Backend on **Render**, database and files on **Supabase**, frontend on **Vercel**, embeddings on **Cloudflare Workers AI**. Full plan, reasons and status: [DEPLOYMENT.md](DEPLOYMENT.md). Secrets go only in `backend/.env` (git-ignored) and the Render dashboard, never in the repo.

1. **Supabase** (ours is in Stockholm, eu-north-1; [`render.yaml`](render.yaml) puts Render in Frankfurt, the nearest Render region. Keep the two close.)
   - Create a project. Copy the **pooler** connection string (Connect → Session or Transaction pooler; the direct string is IPv6-only and Render cannot reach it).
   - Storage → create a **private** bucket named `media`.
   - Project Settings → API: copy the project URL and the `service_role` key.
2. **Seed once from your laptop** into Supabase (creates tables, loads demo data, embeds every card, uploads sample media):
   ```bash
   cd backend
   # backend/.env: DATABASE_URL=<pooler string>, EMBEDDING_PROVIDER=cloudflare, CF_ACCOUNT_ID, CF_API_TOKEN,
   #               STORAGE_BACKEND=supabase, SUPABASE_URL, SUPABASE_SERVICE_KEY
   python -m seed.seed
   ```
3. **Render** → New → Blueprint → this repo. It reads [`render.yaml`](render.yaml) and asks for the secrets: `DATABASE_URL`, `GROQ_API_KEY`, `OPENROUTER_API_KEY`, `CF_ACCOUNT_ID`, `CF_API_TOKEN`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `FRONTEND_ORIGIN` (the Vercel URL), `PUBLIC_BASE_URL` (the Render URL). Check `https://<render-url>/api/health`.
4. **Vercel** → New Project → this repo, root directory `frontend` (settings come from [`frontend/vercel.json`](frontend/vercel.json)). Environment variable `VITE_API_URL=https://<render-url>`. Then set `FRONTEND_ORIGIN` on Render to the Vercel URL and redeploy.
5. **Optional keep-alive:** GitHub → Settings → Secrets and variables → Actions → Variables → `KEEPALIVE_URL=https://<render-url>`. [`.github/workflows/keepalive.yml`](.github/workflows/keepalive.yml) then pings every 14 minutes so Render does not sleep and Supabase does not pause.

The free Render service sleeps after 15 minutes idle; the first request then takes about 50 s. The frontend starts waking it on page load and retries a read once.
