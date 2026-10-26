# TASKS.md — Ordered build tasks

Do tasks **in order**. Each task is self-contained: read `AGENTS.md` + `ENGINEERING.md`, then only the task.
Signatures are contracts: later tasks call them. Keep names exactly. (`→` = returns.)
Paths are relative to `backend/` or `frontend/` as shown.

Legend: **Deps** = tasks that must be done first · **Done when** = acceptance tests.

---

## Phase 0 — Foundation

### T01 · Backend skeleton
- **Files**: `requirements.txt`, `.env.example`, `app/main.py`, `app/config.py`, `app/database.py`, `app/errors.py`, `pyproject.toml` (ruff/black/pytest config), `tests/conftest.py`
- **Spec**
  - `config.py`: `class Settings(BaseSettings)` with `groq_api_key: Optional[str]`, `openrouter_api_key: Optional[str]`, `model_text`, `model_vision`, `model_stt`, `database_url="sqlite:///./blueprint.db"`, `storage_dir="storage"`, `frontend_origin="http://localhost:5173"`; `get_settings() -> Settings` cached with `lru_cache`.
  - `database.py`: `engine`, `SessionLocal`, `Base`, `get_db() -> Iterator[Session]`, `init_db() -> None` (create tables + FTS5 table `chunks_fts(record_type, record_id UNINDEXED, machine_id UNINDEXED, text)`), `fts_index(db, record_type, record_id, machine_id, text) -> None`, `fts_search(db, query, machine_id=None, limit=20) -> List[Tuple[str, int, float]]` (uses `bm25`).
  - `errors.py`: `AppError(code, message)`, subclasses `NotFound`, `ValidationFailed`, `ProviderUnavailable`, `PayloadTooLarge`; `register_handlers(app)`.
  - `main.py`: app factory `create_app() -> FastAPI`, CORS, handlers, `GET /api/health` → `{"status": "ok"}`.
  - `conftest.py`: in-memory SQLite `db` fixture, `client` fixture, `fake_llm` fixture (monkeypatches `llm.chat_json`/`vision_json`).
- **Done when**: `pytest -q` passes `test_health`; `ruff check .` clean; `fts_search` returns inserted text ranked.

### T02 · Frontend skeleton
- **Deps**: —
- **Files**: `package.json`, `vite.config.js` (proxy `/api` → `http://localhost:8000`, PWA plugin), `index.html`, `src/main.jsx`, `src/App.jsx` (routes for all pages from PRD §8, pages lazy-loaded), `src/api/client.js`, `src/store/useAuthStore.js` (role switcher), `src/components/layout/{NavBar,RoleSwitcher}.jsx`, `src/components/common/ErrorBoundary.jsx`, `src/utils/i18n.js`, `.eslintrc`, `.prettierrc`, Tailwind config.
- **Done when**: `npm run dev` shows nav with all pages (placeholders); `npm run lint` clean; Vitest smoke test renders `App`.

### T03 · Data models + seed
- **Deps**: T01
- **Files**: `app/models/{erp,knowledge,guardian,transfer,guide,map3d,ops}.py`, `seed/seed.py`
- **Spec**: tables exactly as PRD §9.2. Indexes on every FK and on `created_at`. `KnowledgeCard.embedding: LargeBinary (nullable)`. Seed the demo story: machines VMC-3 (teeth 2–4, rpm 500–12000) + Lathe-2; employees Ramesh (old, exit date +7 months), Priya (new), Suresh (old); 30+ cards, 10 QC rejects, 5 failures where chatter preceded spindle failure on VMC-3, param limits, components per machine, sample sound/chip records.
- **Done when**: `python -m seed.seed` is idempotent (running twice gives same counts); test asserts counts and FTS hits for "chatter".

### T04 · LLM layer
- **Deps**: T01
- **Files**: `app/services/llm.py`, `app/prompts/__init__.py`, `tests/test_llm.py`
- **Spec**
  - `chat_json(task: str, system: str, user: str, schema: Type[T]) -> T`
  - `vision_json(task: str, images: List[bytes], prompt: str, schema: Type[T]) -> T`
  - Provider table `TASK_ROUTES: Dict[str, List[ProviderModel]]` (primary Groq/OpenRouter per PLAN free-stack, then fallback).
  - Uses `openai.OpenAI(base_url=..., api_key=..., timeout=30)`; clients created once.
  - Cache: `LLMCache(key=sha256, value=json, created_at)`; check before calling.
  - Raises `ProviderUnavailable` when all providers fail (callers then use offline fallback).
- **Done when**: tests with mocked clients cover: cache hit (no call), invalid JSON → retry → success, primary down → fallback used, all down → `ProviderUnavailable`.

### T05 · Speech (STT/TTS) + uploads
- **Deps**: T01, T04
- **Files**: `app/services/stt.py`, `app/services/tts.py`, `app/utils/files.py`
- **Spec**
  - `save_upload(file: UploadFile, kind: Literal["audio","image","video"]) -> Path` — streams in 1 MB chunks, enforces size/MIME limits from ENGINEERING §4.
  - `transcribe(path: Path, language: Optional[str] = None) -> Transcript` (`text`, `segments: List[Segment(start, end, text)]`) via Groq Whisper.
  - `synthesize(text: str, language: str) -> Path` via edge-tts (cache by text hash).
- **Done when**: oversize/wrong-type uploads raise `PayloadTooLarge`/`ValidationFailed`; transcribe tested with mocked client.

## Phase 1 — Capture (Lane 1)

### T06 · Card extraction + text/voice capture
- **Deps**: T03–T05
- **Files**: `app/prompts/extract.py`, `app/schemas/capture.py`, `app/services/capture/{extractor,voice}.py`, `app/routers/capture.py`, `app/utils/lexicon.py`
- **Spec**
  - `extract_cards(text: str, author_id: int, machine_hint: Optional[int]) -> List[ExtractedCard]` (LLM; offline fallback = lexicon keyword match for machine/component/symptom).
  - `save_cards(db, cards, source_doc_id) -> List[KnowledgeCard]` — also FTS index + embedding (batch).
  - Endpoints `POST /api/capture/text`, `POST /api/capture/voice` → `VoiceNoteOut` (transcript, cards, guardian result once T09 exists — leave hook `on_note_saved`).
- **Done when**: Hindi/English sample → card with machine VMC-3 + component spindle (fake LLM); offline fallback still produces a card.

### T07 · Handwritten notes + video → procedure
- **Deps**: T06
- **Files**: `app/services/capture/{handwritten,video}.py`, `app/prompts/{handwritten,video}.py`, `app/routers/capture.py` (+ `GET /api/jobs/{id}`), `app/models/ops.py` (`Job` table)
- **Spec**
  - `process_handwritten(db, image_path, uploader_id) -> HandwrittenResult` (issues, decisions, action_items, confidence per field; low confidence → review queue).
  - `extract_keyframes(video_path, max_frames=30, fps=1.0) -> List[Keyframe(ts, jpeg_bytes)]` — histogram-diff scene change, O(frames).
  - `draft_procedure(db, video_path, author_id, machine_id) -> Procedure` (status `draft`).
  - Both run in `BackgroundTasks`; endpoint returns `{"job_id"}`.
- **Done when**: keyframe test on a generated synthetic video (OpenCV `VideoWriter`, 3 colour scenes → 3 keyframes); job status moves `queued → done`.

### T08 · ERP sync + sensors + review queue
- **Deps**: T03
- **Files**: `simulators/mock_erp.py`, `simulators/sensor_sim.py`, `app/services/capture/{erp_sync,sensors}.py`, `app/routers/erp.py`, review endpoints in `app/routers/capture.py`
- **Spec**
  - `sync_erp(db, base_url) -> SyncReport` — upsert by external ID (idempotent).
  - `detect_anomalies(readings: np.ndarray, window=60, z=3.0) -> List[int]` — rolling mean/std via cumulative sums, O(n).
  - `POST /api/erp/webhook` handles `job_start`, `job_close`, `qc_reject`, `exit_date_set` (calls handover in T11).
  - `GET /api/capture/review-queue?limit&offset`, `POST /api/capture/review/{id}` (approve/edit → `verified_by`).
- **Done when**: sync twice = no duplicates; anomaly test with injected spike; approve sets `verified_by`.

## Phase 2 — Core features

### T09 · Note Guardian
- **Deps**: T06, T08
- **Files**: `app/services/guardian/{rules,check}.py`, `app/prompts/guardian.py`, `app/schemas/guardian.py`, `app/routers/guardian.py`
- **Spec**
  - Pure rules (no DB): `check_params(params: Dict[str, float], limits: List[ParamLimitDTO]) -> List[Finding]`, `check_precursors(symptoms: Set[str], stats: Dict[str, PrecursorStat]) -> List[Finding]`, `check_maintenance(last_done: date, interval_days: int, today: date) -> Optional[Finding]`.
  - `save_and_check(db, note: NoteIn) -> GuardianResult`: extract → retrieve (FTS + same machine/component, limit 20) → rules → LLM only if evidence exists → filter evidence IDs → persist `Warning` + timeline event → notify (DB notification rows).
  - Severity = max of findings; never warn without ≥ 1 evidence record.
  - Wire `on_note_saved` hook from T06.
- **Done when**: param above limit → caution; "chatter" on VMC-3 → stop/caution with ≥ 1 cited failure; normal note → no warning; LLM down → rules-only result; p95 < 3 s with fake LLM.

### T10 · Ask Experience (search + grounded answers)
- **Deps**: T06
- **Files**: `app/services/ask/{search,qa}.py`, `app/prompts/answer.py`, `app/schemas/ask.py`, `app/routers/ask.py`, `app/services/embeddings.py`
- **Spec**
  - `embed(texts: List[str]) -> np.ndarray` (singleton model, normalised float32).
  - `hybrid_search(db, query: str, machine_id: Optional[int], component_id: Optional[int], k: int = 6) -> List[Hit]` — FTS top 50 ∪ vector top 50 over filtered candidates, reciprocal-rank fusion, boost verified.
  - `answer(db, req: AskRequest) -> AskAnswer` — grounded; invalid source IDs removed; no sources → `not_enough_data=True` + suggested expert.
  - `POST /api/ask`, `POST /api/ask/voice`, `POST /api/ask/{query_id}/feedback`.
- **Done when**: answer cites only retrieved IDs (test with fake LLM returning a fake ID → dropped); empty DB → not_enough_data; Hindi query hits English card via lexicon.

### T11 · Old → New transfer engine
- **Deps**: T09, T10
- **Files**: `app/services/transfer/{profiles,handover,interview,routing}.py`, `app/prompts/interview.py`, `app/schemas/transfer.py`, `app/routers/transfer.py`
- **Spec**
  - `experience_scores(db) -> None` (one aggregate query, GROUP BY employee, machine, component).
  - `knowledge_risk(db, machine_id: Optional[int] = None) -> List[RiskCell]` — share of cards per old employee per machine/component; bus factor.
  - `create_handover_plan(db, employee_id) -> HandoverPlan` (bus-factor-1 machines/components, gap list, tasks).
  - `next_interview_questions(db, session_id, n=5) -> List[InterviewQuestion]` from gaps (unanswered queries, uncovered components).
  - `route_question(db, query_id) -> RoutedQuestion`; `reply(db, routed_id, text|audio) -> KnowledgeCard(verified)`.
- **Done when**: exit date webhook creates plan listing VMC-3 for Ramesh; reply creates verified card that the next Ask answer cites.

### T12 · 3D Machine Knowledge Map (backend)
- **Deps**: T03, T06
- **Files**: `app/services/map3d/{components,pins}.py`, `app/schemas/map3d.py`, `app/routers/map3d.py`
- **Spec**
  - `list_components(db, machine_id) -> List[ComponentOut]` — counts via one GROUP BY query; `risk_color` from incident count thresholds.
  - `component_knowledge(db, component_id, limit=20, offset=0) -> ComponentKnowledge` (incidents, cards, experts).
  - `create_pin(db, component_id, pin: PinIn, files) -> PinOut` (reuses T06 voice/text capture).
  - `auto_pin(db, card) -> Optional[int]` — alias match via lexicon (O(1) dict).
- **Done when**: list returns counts in one query (assert query count); pin creates component-linked card.

## Phase 3 — Assistant extras (Lane 2)

### T13 · Chatter → stable RPM
- **Deps**: T05, T10
- **Files**: `app/services/ask/chatter.py`, endpoint `POST /api/ask/chatter`
- **Spec**: `load_audio(path, sr=44100, max_seconds=10) -> np.ndarray`; `dominant_frequency(signal, sr, exclude: List[float], band=(50, 5000)) -> float` (Hann window + `rfft`, mask tooth-passing harmonics ± 3 %); `stable_rpms(...)` as ENGINEERING §9.3; response includes expert card for "chatter" on that machine.
- **Done when**: synthetic 427 Hz sine + noise → fc within ± 2 Hz; N=2 → 12,810 in list; out-of-range RPMs filtered.

### T14 · Chip colour reader
- **Deps**: T05, T10
- **Files**: `app/services/ask/chips.py`, endpoint `POST /api/ask/chips`
- **Spec**: `segment_chips(img_bgr) -> np.ndarray mask` (resize ≤ 1280, Otsu/background subtraction); `classify_hue(img_bgr, mask) -> ChipColour` (mean hue in HSV over mask; thresholds as named constants); `diagnose(colour, tool_material, workpiece) -> ChipResult` (rule table dict + expert note).
- **Done when**: generated solid blue/straw/silver images classify correctly; empty mask → `ValidationFailed`.

### T15 · Reports + analytics
- **Deps**: T10, T11
- **Files**: `app/services/ask/{reports,analytics}.py`, `app/templates/*.html`, `app/routers/reports.py`
- **Spec**: `render_handbook(db, machine_id) -> str (HTML)`, `render_handover(db, employee_id) -> str`, `render_shift_summary(db, day) -> str`; `run_analytics(question) -> AnalyticsResult` with read-only connection + SELECT-only guard.
- **Done when**: `DROP TABLE` / multi-statement rejected; handbook HTML contains footnoted sources.

## Phase 4 — Guidance (Lane 3)

### T16 · Procedures, guided jobs, skills
- **Deps**: T07, T09
- **Files**: `app/services/guide/{authoring,guided,skills}.py`, `app/schemas/guide.py`, `app/routers/guide.py`
- **Spec**: `approve_procedure(db, id, approver_id) -> Procedure` (new version, old kept); `start_run(db, employee_id, work_order_id) -> GuidedRunOut` (steps filtered by skill level); `record_step(db, run_id, step: RunStepIn) -> RunStepOut` (calls Guardian rules on values); `skill_level(db, employee_id, operation_id) -> int`; `maybe_promote(db, employee_id, operation_id) -> bool`.
- **Done when**: L1 sees all steps, L3 checklist only; out-of-tolerance value returns inline warning; promotion after N clean runs + sign-off.

### T17 · ShadowTrace, troubleshooting, onboarding
- **Deps**: T16, T12
- **Files**: `app/services/guide/{shadowtrace,troubleshoot,onboarding}.py`
- **Spec**: `shadow_trace(db, procedure_id) -> List[TraceStep(step_no, clip_start, clip_end, component_ids)]`; `build_tree(db, machine_id) -> TroubleshootNode` (symptom → causes ranked by frequency, one aggregate query); `daily_briefing(db, employee_id, day) -> Briefing`.
- **Done when**: tree ranks the most frequent cause first; briefing lists open warnings for assigned machines.

## Phase 5 — Frontend features
Each task: page + components + `src/api/<area>.js` + Vitest test for the logic component.

| Task | Page | Components | Done when |
|---|---|---|---|
| T18 | `Capture.jsx` | VoiceRecorder (`useRecorder`), PhotoUpload, VideoUpload (job polling with backoff), NoteEditor | records/uploads, shows cards + WarningBanner |
| T19 | global | WarningBanner, EvidenceList | severity styles + icon + text; evidence links open source |
| T20 | `Ask.jsx` | ChatWindow, AnswerCard, SourceCard, ChatterDoctor, ChipReader | sources render (photo/clip at timestamp/audio); "Ask Ramesh" when not enough data |
| T21 | `MachineMap.jsx` (lazy) | MachineViewer, ComponentMesh, PinMarker, ComponentPanel, PinForm | click selects mesh by name; badges coloured by risk; Guardian highlight via store; 60 fps on mid phone, `frameloop="demand"` |
| T22 | `GuidedJob.jsx` | StepView, StepList, SkillBadge, ShadowTracePlayer, TroubleshootTree | steps adapt to skill; inline warning blocks "next" on stop severity |
| T23 | `Handover.jsx`, `Review.jsx` | HandoverPlan, InterviewSession, RoutedQuestions, review list | approve/edit card; interview answers by voice |
| T24 | `Dashboard.jsx`, `Home.jsx` | RiskHeatmap, TransferMetrics, MachineTimeline | heatmap from `/api/risk`; timeline paginated |
| T25 | `widget/erpWidget.jsx` | separate Vite entry | embeddable script renders banner + context in a host page |

## Phase 6 — Hardening & demo

### T26 · End-to-end demo test + polish
- **Files**: `tests/test_demo_flow.py`, `README.md`
- **Spec**: scripted flow from PRD §10 using fake LLM; README with setup, `.env`, seed, run, tunnel.
- **Done when**: demo flow test passes; app runs with no API keys (offline fallbacks); Lighthouse PWA + accessibility ≥ 90 on Capture and Ask pages.
