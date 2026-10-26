# AGENTS.md — instructions for AI coding assistants (Gemini, Claude, GPT, Copilot, …)

You are building **Project Blueprint**: knowledge transfer from old employees to new employees in CNC/VMC machining.
Tech stack is fixed: **Python 3.9+ / FastAPI backend** and **React 18 + Vite frontend**. AI providers: **Groq + OpenRouter free tiers only**.

## Read in this order
1. `AGENTS.md` (this file) — rules that always apply.
2. `PRD.md` — what to build, file structure (§8) and what each file contains (§9).
3. `ENGINEERING.md` — coding standards, performance budgets, templates. **Follow it exactly.**
4. `TASKS.md` — do **one task at a time**, in order, unless told otherwise. Each task lists files, signatures and tests.
5. `PLAN.md` — detailed feature behaviour; read the section for your current task only.

## Non-negotiable rules
1. Implement only the current task. Do not create files that are not in `PRD.md` §8 without saying why.
2. Use the exact function signatures, endpoint paths and schema names from `TASKS.md` / `PRD.md`. Other tasks depend on them.
3. Python must run on **3.9**: use `Optional[X]` / `List[X]` from `typing`, no `X | Y`, no `match`.
4. Routers stay thin → services hold logic → models are SQLAlchemy only. No SQL in routers, no HTTP in services.
5. Every LLM call goes through `app/services/llm.py`, returns validated Pydantic objects, and has an offline fallback.
6. Never invent citation IDs: after an LLM answer, keep only source IDs that exist in the retrieved set.
7. No secrets in code. Read config from `app/config.py` (`.env`).
8. Each task ends with tests passing: `pytest -q` (backend), `npm test` (frontend), plus `ruff check` and `npm run lint` clean.
9. Respect the performance budgets in `ENGINEERING.md` §4. No N+1 queries, no unbounded lists, no reading whole uploads into memory, no blocking the event loop.
10. Wording: say "old employee" / "new employee" (never "senior/junior"). Outputs advise and teach; they never replace a person's decision.

## Definition of done (every task)
- [ ] Matches signatures and file paths in `TASKS.md`
- [ ] Type hints on every function; docstring on every public function
- [ ] Input validation + clear errors (`ENGINEERING.md` §6)
- [ ] Tests added and passing (happy path + at least one failure/edge case)
- [ ] Lint/format clean (ruff + black / eslint + prettier)
- [ ] No TODOs left without an issue note in the task's checklist
- [ ] Commit message: `feat(<area>): <task id> <short summary>`
