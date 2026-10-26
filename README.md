# Project Blueprint
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
Status: folder structure only. Source files contain header comments describing what they will hold; implement them task by task (`TASKS.md`).
