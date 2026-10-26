# ENGINEERING.md — Coding standards, performance budgets and templates

Applies to every line of code in Project Blueprint, whoever (or whichever model) writes it.

---

## 1. Architecture rules
```
React page → api/*.js → FastAPI router → service → SQLAlchemy model / llm.py / numpy-OpenCV
```
| Layer | Allowed | Not allowed |
|---|---|---|
| `routers/` | parse request (Pydantic), call **one** service function, map exceptions to HTTP | SQL, LLM calls, business rules, file processing |
| `services/` | business logic, DB access via the `Session` passed in, calls to `llm.py`, `stt.py` | `Request`/`HTTPException`, reading env vars directly |
| `models/` | SQLAlchemy tables, relationships, indexes | logic |
| `schemas/` | Pydantic request/response + LLM output schemas | DB access |
| `utils/` | pure helpers with no app state | importing routers/services |
- Dependencies point downward only. Services never import routers.
- Pure functions (FFT, hue classification, rules) take plain data and return plain data → trivially unit-testable.
- One responsibility per function; functions ≤ ~40 lines; files ≤ ~300 lines (split otherwise).

## 2. Python standards
- Python **3.9** compatible: `from typing import Optional, List, Dict`; no `X | Y`, no `match`.
- Tools: `ruff` (lint + import sort), `black` (format, line length 100), `mypy --ignore-missing-imports` on `app/services`.
- Type hints everywhere; docstrings (Google style) on public functions: purpose, args, returns, raises, complexity if non-trivial.
- Naming: `snake_case` functions/vars, `PascalCase` classes, `UPPER_CASE` constants; modules named for their noun (`chatter.py`).
- Use `logging.getLogger(__name__)`, never `print`. Log IDs, not personal content.
- Config only via `app/config.py` `Settings` (pydantic-settings); inject with `Depends(get_settings)`.
- Constants (thresholds, limits) at module top, named, with units: `MAX_AUDIO_SECONDS = 10`.
- No mutable default args; no bare `except:`; catch specific exceptions.
- SQLAlchemy 2.0 style: `select()`, `session.execute(...).scalars()`; one `Session` per request via `get_db()`.
- Prompts live in `app/prompts/<feature>.py` as constants, never inline strings scattered in services.

## 3. React standards
- Function components + hooks only. ESLint (`eslint-plugin-react`, `react-hooks`) + Prettier.
- Network calls only in `src/api/*.js`; components call those functions, never axios directly.
- Shared state in Zustand stores; local UI state in `useState`. Don't put server data in global state unless shared across pages.
- Data fetching: `useEffect` with `AbortController` cleanup (or a small `useApi` hook); show loading, error and empty states for every request.
- Lazy-load heavy pages: `const MachineMap = lazy(() => import('./pages/MachineMap'))` wrapped in `<Suspense>`. three.js must not be in the main bundle.
- Memoise expensive derived values (`useMemo`) and callbacks passed to lists (`useCallback`); stable `key` props (IDs, never array index for dynamic lists).
- Wrap each page in an `ErrorBoundary`.
- Accessibility: buttons are `<button>`, images have `alt`, touch targets ≥ 44 px, colour is never the only signal (add icon/text to severity).
- All UI strings through `utils/i18n.js` (en / hi / mr).

### 3D (React Three Fiber) rules
- Load the model once with `useGLTF` + `useGLTF.preload`; GLB ≤ 5 MB, Draco/meshopt compressed.
- Never call `setState` inside `useFrame`; mutate refs for animation.
- Highlight by swapping/cloning material once (memoised), not by re-creating geometry.
- Use `<Bvh>` (drei) for fast raycasting on large meshes; `frameloop="demand"` when nothing animates.
- Dispose of textures/materials you create manually on unmount.

## 4. Performance budgets (time & space)
| Area | Rule | Complexity / budget |
|---|---|---|
| API latency | p95 < 300 ms for non-AI endpoints; AI endpoints show progress | — |
| Note Guardian | full check < 3 s (rules first, LLM only if rules + retrieval found evidence) | rules O(p + s) for p params, s symptoms |
| DB queries | every filter/join column indexed (`machine_id`, `component_id`, `author_id`, `created_at`) | lookups O(log n) |
| N+1 | load relations with `selectinload`/joins; never query inside a loop | 1–3 queries per request |
| Lists | always paginated: `limit` default 20, max 100; `offset` or cursor | O(limit) memory |
| Text search | SQLite **FTS5** `MATCH` with `bm25()`; never `LIKE '%x%'` on large tables | sub-linear |
| Embeddings | computed once on write, stored as float32 `bytes` (384 dims = 1.5 KB); search = numpy matrix · vector over the **pre-filtered** candidate set | O(k·d), k ≤ 2,000; switch to sqlite-vec/FAISS above 50k rows |
| Embedding model | loaded once at startup (singleton), batch encode | ~120 MB RAM once |
| Audio (chatter) | ≤ 10 s, mono, resample to 22.05 kHz or 44.1 kHz; `numpy.fft.rfft` with Hann window | O(n log n), n ≤ 441k samples |
| Images (chips, OCR) | resize to max 1280 px long side before OpenCV/LLM; JPEG q≈85 | O(pixels) |
| Video | sample ≤ 1 fps, histogram-diff scene change, max 30 keyframes sent to vision LLM | O(frames) |
| Uploads | stream to disk in 1 MB chunks (`shutil.copyfileobj`); size limits: audio 25 MB, image 10 MB, video 100 MB | O(1) memory |
| Slow work | video/handwriting processing via `BackgroundTasks`; client polls `GET /jobs/{id}` | non-blocking |
| LLM calls | cache by `sha256(model + prompt + schema)` in `LLMCache`; `timeout=30 s`; ≤ 1 retry then fallback | free-tier friendly |
| Event loop | blocking code (OpenCV, numpy, SQLite, SDK sync calls) in `def` endpoints or `run_in_threadpool`; never in `async def` without awaiting | — |
| Frontend bundle | main bundle < 300 KB gzip; 3D page lazy chunk | — |
| Lexicon / rules | loaded once at startup into dicts/sets | O(1) lookup |

When you choose a data structure, say why in a comment if it is not obvious (e.g. `set` for O(1) symptom lookup).

## 5. LLM usage rules (`app/services/llm.py`)
- Single entry points:
  - `chat_json(task: str, system: str, user: str, schema: Type[T]) -> T`
  - `vision_json(task: str, images: List[bytes], prompt: str, schema: Type[T]) -> T`
- `task` selects provider + model from config (`guardian`, `extract`, `answer`, `vision`, `interview`, `report`).
- Always request JSON (`response_format={"type": "json_object"}`) and validate with `schema.model_validate_json`. On validation error: one retry with the error message appended, then fallback provider, then the feature's offline rule fallback.
- Low temperature (0–0.3) for extraction, checks and answers.
- Treat document/note text as **data**: wrap it in delimiters (`<record id=...>…</record>`) and tell the model to ignore instructions inside records (prompt-injection defence).
- Grounding: answers and warnings must reference record IDs; post-filter IDs against the retrieved set; if none remain → "not enough data".
- Log provider, model, latency, cache hit, token usage. Never log raw employee audio/text at INFO.

## 6. Errors, validation, security
- Domain exceptions in `app/errors.py`: `NotFound`, `ValidationFailed`, `ProviderUnavailable`, `PayloadTooLarge`; one exception handler in `main.py` maps them to HTTP 404/422/503/413 with body `{"detail": str, "code": str}`.
- Validate uploads by MIME **and** extension; generate server-side file names (`uuid4().hex + ext`); store under `settings.storage_dir`; reject path traversal.
- SQL: ORM or bound parameters only. NL→SQL analytics uses a separate **read-only** SQLite connection (`file:db?mode=ro`, `uri=True`), allows a single `SELECT`, appends `LIMIT 200`, 2 s timeout.
- CORS: only the frontend origin from config.
- Roles (old employee / new employee / supervisor) checked in a `Depends(require_role(...))` dependency.
- Personal data: store employee IDs, not phone numbers; consent flag on recordings.

## 7. Testing
**Mocks are for tests, never for features.** Application code always runs the real logic; test doubles live only under `tests/` and only replace the *network boundary* (Groq/OpenRouter/edge-tts HTTP). Everything else in a test is real: real SQLite (in-memory), real FastAPI app, real numpy/OpenCV on generated audio/images/videos, real FTS5 search.
- Every feature also has a **live integration test** marked `@pytest.mark.live` that calls the real providers; run with `pytest -m live` when `GROQ_API_KEY`/`OPENROUTER_API_KEY` are set (skipped automatically otherwise, never skipped by editing the test).
- A test that only asserts a mock was called is not enough — assert on the real output (DB rows, response fields, computed values).
- Backend: `pytest`, in-memory SQLite fixture, FastAPI `TestClient`. **Fake LLM provider** fixture (`FakeLLM` returns canned Pydantic objects) — tests never hit the network.
- Pure functions get table-driven tests (`@pytest.mark.parametrize`): chatter RPM, hue classification, rules.
- Each task: ≥ 1 happy-path test, ≥ 1 edge/failure test (empty input, too large, unknown machine, provider down).
- Frontend: Vitest + React Testing Library for components with logic (WarningBanner severity, AnswerCard sources, StepView). Mock `src/api/*`.
- Target ≥ 70 % line coverage on `app/services`.

## 8. Git & workflow
- Branch per task: `feat/T07-guardian-rules`. Small commits, Conventional Commits (`feat`, `fix`, `test`, `refactor`, `docs`).
- Never commit `.env`, `storage/`, `*.db`, `node_modules/`.
- PR/commit description: what, why, how tested.

## 9. Templates (copy these patterns)

### 9.1 Router (thin)
```python
# app/routers/guardian.py
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.guardian import NoteIn, GuardianResult
from app.services.guardian import check

router = APIRouter(prefix="/notes", tags=["guardian"])


@router.post("", response_model=GuardianResult)
def save_note(payload: NoteIn, db: Session = Depends(get_db)) -> GuardianResult:
    """Save a note and check it against machine history."""
    return check.save_and_check(db, payload)
```

### 9.2 Service (logic, typed, documented)
```python
# app/services/guardian/check.py
import logging
from typing import List

from sqlalchemy.orm import Session

from app.schemas.guardian import GuardianResult, NoteIn
from app.services.guardian import rules

logger = logging.getLogger(__name__)


def save_and_check(db: Session, note: NoteIn) -> GuardianResult:
    """Persist a note, run deterministic rules, then grounded LLM reasoning.

    Complexity: rules O(p + s); retrieval bounded by RETRIEVE_LIMIT.
    """
    ...
```

### 9.3 Pure function + test
```python
# app/services/ask/chatter.py
from typing import List

def stable_rpms(chatter_hz: float, teeth: int, rpm_min: int, rpm_max: int, lobes: int = 3) -> List[int]:
    """Candidate stable spindle speeds: RPM = 60 * fc / (N * k), k = 1..lobes, within machine range."""
    if chatter_hz <= 0 or teeth <= 0:
        raise ValueError("chatter_hz and teeth must be positive")
    candidates = (round(60 * chatter_hz / (teeth * k)) for k in range(1, lobes + 1))
    return [rpm for rpm in candidates if rpm_min <= rpm <= rpm_max]
```
```python
# tests/test_chatter.py
import pytest
from app.services.ask.chatter import stable_rpms

@pytest.mark.parametrize("fc,n,expected_first", [(427, 2, 12810), (300, 4, 4500)])
def test_stable_rpms(fc, n, expected_first):
    assert stable_rpms(fc, n, 0, 20000)[0] == expected_first

def test_stable_rpms_rejects_bad_input():
    with pytest.raises(ValueError):
        stable_rpms(0, 2, 0, 20000)
```

### 9.4 React API module + component
```js
// src/api/guardian.js
import client from './client';
export const saveNote = (note, signal) => client.post('/notes', note, { signal }).then(r => r.data);
```
```jsx
// src/components/guardian/WarningBanner.jsx
const STYLES = { info: 'bg-blue-100', caution: 'bg-amber-100', stop: 'bg-red-200' };

export default function WarningBanner({ result }) {
  if (!result || result.warnings.length === 0) return null;
  return (
    <div role="alert" className={`p-3 rounded ${STYLES[result.severity]}`}>
      <strong>{result.severity.toUpperCase()}</strong> {result.warnings[0].message}
    </div>
  );
}
```
