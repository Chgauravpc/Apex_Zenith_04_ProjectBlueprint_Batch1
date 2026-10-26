# AGENTS.md — instructions for AI coding assistants (Gemini, Claude, GPT, Copilot, …)

You are building **Project Blueprint**: knowledge transfer from old employees to new employees in CNC/VMC machining.
Tech stack is fixed: **Python 3.9+ / FastAPI backend** and **React 18 + Vite frontend**. AI providers: **Groq + OpenRouter free tiers only**.

## Read in this order
1. `AGENTS.md` (this file) — rules that always apply.
2. `PRD.md` — what to build, file structure (§8) and what each file contains (§9).
3. `ENGINEERING.md` — coding standards, performance budgets, templates. **Follow it exactly.**
4. `TASKS.md` — do **one task at a time**, in order, unless told otherwise. Each task lists files, signatures and tests.
5. `PLAN.md` — detailed feature behaviour; read the section for your current task only.

## Rule 0 — Build it for real. Never mock it out.
The code you write must **actually perform the task** with real inputs. A task is NOT done if any of these appear in application code (`backend/app`, `frontend/src`):
- Stubs or placeholders: `pass`, `...`, `raise NotImplementedError`, `TODO: implement`, empty handlers, "coming soon" UI.
- Fake results: hard-coded or random return values standing in for real logic (e.g. `return {"rpm": 12810}`, `return [Card(...)]`, `Math.random()` scores, `sleep()` to simulate processing).
- Mock/fake objects, canned LLM responses or "demo mode" branches in production code paths.
- Frontend calling a fake/in-memory API or local JSON instead of the real FastAPI endpoint.
- Skipping a step of the spec (e.g. computing chip colour from the file name, keyword-matching instead of calling the LLM when keys are set, returning the first DB row instead of searching).
- Disabling, skipping (`@pytest.mark.skip`, `it.skip`) or weakening tests to make them pass.

**What is allowed (and why):**
| Allowed | Where | Why |
|---|---|---|
| `FakeLLM` / mocked HTTP clients | `backend/tests/**` unit tests only | tests must be deterministic and offline |
| Offline rule fallback | `llm.py` callers, used **only** when keys are missing or `ProviderUnavailable` is raised; response marks `"mode": "offline"` | demo resilience; must be real logic (lexicon, rules), not canned output |
| `simulators/mock_erp.py`, `simulators/sensor_sim.py` | separate processes, called over real HTTP | stand-ins for external hardware/ERP, specified in PRD |
| Seed data | `seed/` | demo story content, loaded into the real DB |

If something genuinely cannot be completed (missing key, unclear spec), **stop and say so** in your reply with the exact blocker. Do not paper over it with a fake.

## Prove it works (every task)
1. Run the unit tests (`pytest -q`, `npm test`).
2. Run the **real check** listed under "Real check" in the task (`TASKS.md`): start the server and call the endpoint with real files/data (and real API keys when available). Paste the command and its actual output in your summary.
3. Run the stub scan and confirm it prints nothing:
   ```bash
   grep -rnE "NotImplementedError|TODO|FIXME|^\s*pass\s*$|\bmock\b|fake|dummy|lorem|placeholder|Math\.random" backend/app frontend/src
   ```
   (Legitimate hits such as an HTML `placeholder=` attribute must be explained in the summary.)
4. Report honestly: what was run, what passed, what failed, what was not verified.

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
- [ ] Real implementation — Rule 0 respected, stub scan clean
- [ ] "Real check" from the task executed and its actual output reported
- [ ] Matches signatures and file paths in `TASKS.md`
- [ ] Type hints on every function; docstring on every public function
- [ ] Input validation + clear errors (`ENGINEERING.md` §6)
- [ ] Tests added and passing (happy path + at least one failure/edge case)
- [ ] Lint/format clean (ruff + black / eslint + prettier)
- [ ] No TODOs left without an issue note in the task's checklist
- [ ] Commit message: `feat(<area>): <task id> <short summary>`
