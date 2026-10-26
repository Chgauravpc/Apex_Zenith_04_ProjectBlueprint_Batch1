# PRD — Project Blueprint
**Knowledge transfer from old employees to new employees in CNC/VMC machining**
Surjanna Hackathon · Problem 2 (Manufacturing): *When experience walks out the door*
Detailed feature design: see [PLAN.md](PLAN.md).

---

## 1. Problem
Experienced machinists carry setup tricks, small adjustments and "the sound of a tool about to fail" in their heads. When they retire or leave, that knowledge leaves with them, and new employees take months to catch up.

## 2. Goal
Capture old employees' know-how from every available source, make it searchable, and turn it into step-by-step guidance and instant warnings for new employees, inside the factory's ERP and daily routine.
**Principle:** transfer knowledge, don't replace people. Every output cites the old employee who contributed it, explains the *why*, and leaves the decision to the new employee.

## 3. Users
| Persona | Example | Needs |
|---|---|---|
| Old / experienced employee | Ramesh, 28 yrs, retiring in 7 months | Share knowledge quickly (voice, video, photo) without writing manuals; get credit |
| New employee | Priya, 2 months in | Answers at the machine, step-by-step jobs, warnings before mistakes |
| Supervisor / manager | Shift in-charge, plant head | See knowledge at risk, handover progress, new employees' skill levels |

## 4. Scope (hackathon lanes)
| Lane | Features |
|---|---|
| 1 · Capture (video, voice, notes) | Voice notes, setup video → procedure, handwritten logbook/meeting photos, ERP sync, sensor simulator, AI exit interview, 3D component pinning |
| 2 · Searchable assistant | Ask Experience (cited answers, Hindi/Marathi/English, voice), chatter → stable RPM, chip colour reader, reports/handbooks, analytics |
| 3 · Step-by-step guidance | Guided Jobs (skill-adaptive), ShadowTrace, troubleshooting tree, onboarding path, skill matrix |
| Cross-cutting | **Note Guardian**, **Old → New transfer engine** (handover plans, buddy pairing, question routing), **3D Machine Knowledge Map** |

## 5. Functional requirements
| ID | Requirement | Priority |
|---|---|---|
| FR-1 | Record a voice note (hi/mr/en) at the machine → transcribed → structured Know-How Card linked to machine, component and author | Must |
| FR-2 | Upload a setup video → keyframes + transcript → draft procedure steps → old employee approves | Must |
| FR-3 | Upload a photo of a handwritten report/meeting notes → extracted issues, decisions, action items | Must |
| FR-4 | Sync machines, parts, work orders, employees (with exit dates), QC rejects, maintenance from ERP (mock ERPNext API) | Must |
| FR-5 | **Note Guardian**: every saved note is checked against history; warning with severity, cited evidence and the old employee's fix within 3 s | Must |
| FR-6 | **Ask Experience**: question in text/voice → answer only from sources, with citations and "who knows more"; otherwise route to an old employee | Must |
| FR-7 | Unanswered question routed to the old employee; their reply becomes a verified card | Must |
| FR-8 | **Exit handover**: when ERP sets an exit date → handover plan, knowledge-at-risk per machine/component, AI interview questions | Must |
| FR-9 | **Guided Jobs**: step-by-step procedure per machine/part/operation, detail adapts to skill level L0–L4, values checked live by Guardian | Must |
| FR-10 | **3D Machine Knowledge Map** *(owned by 3D teammate)*: rotate/zoom model, click a component, pin voice/text/video, see incidents per component | Must |
| FR-11 | Chatter → stable RPM from a phone recording (RPM = 60·fc/(N·k)) shown next to the old employee's own fix | Must |
| FR-12 | Chip colour reader from a photo (HSV hue rules by tool material) with the old employee's note | Must |
| FR-13 | Machine handbook / exit-handover report as PDF | Should |
| FR-14 | ShadowTrace: follow the old employee's recorded run with checked components highlighted in 3D | Should |
| FR-15 | Troubleshooting decision tree, onboarding path, quiz | Should |
| FR-16 | Natural-language analytics (read-only SQL), Telegram bot, real ERPNext connector | Could |

## 6. Non-functional requirements
- **Free services only**: Groq + OpenRouter free tiers, local/open-source everything else.
- **Shop-floor UX**: mobile-first, big touch targets, voice in/out, works on low-cost Android; offline cache of assigned machines (PWA).
- **Trust**: no answer or warning without ≥1 cited record; every AI action in an audit log; old employee validates low-confidence items.
- **Resilience**: provider fallback (Groq → OpenRouter → offline rules); LLM responses cached to stay inside free limits.
- **Privacy**: recording only with consent; role-based access (old employee, new employee, supervisor).

## 7. Tech stack
| Layer | Choice |
|---|---|
| Backend | **Python 3.9+**, FastAPI, Uvicorn, Pydantic v2, SQLAlchemy 2 |
| Database | SQLite + FTS5 (Postgres-ready via SQLAlchemy) |
| AI | Groq (Llama / gpt-oss text, Whisper STT), OpenRouter free models (vision) — via `openai` SDK with two base URLs |
| ML / signal | numpy (FFT), OpenCV (keyframes, chip hue), sentence-transformers 5.1.0 (`multilingual-e5-small`) |
| TTS | edge-tts (Hindi/Marathi), browser speechSynthesis fallback |
| Reports | Jinja2 HTML → browser print-to-PDF |
| Frontend | **React 18 + Vite**, React Router, Zustand (state), Axios, Tailwind CSS |
| 3D | three.js via **@react-three/fiber** + **@react-three/drei** |
| Charts / PWA | react-chartjs-2, vite-plugin-pwa |
| Testing | pytest (backend), Vitest + React Testing Library (frontend) |
| Hosting (free) | Laptop + Cloudflare quick tunnel; Render free as fallback |

---

## 8. File structure
```
Project Blueprint/
├── PLAN.md                      Detailed feature design
├── PRD.md                       This document
├── README.md                    Setup & run instructions
├── AGENTS.md                    Rules for AI coding assistants (read first)
├── ENGINEERING.md               Coding standards, performance budgets, templates
├── TASKS.md                     Ordered build tasks with signatures & tests
├── GEMINI.md / CLAUDE.md        Pointers to AGENTS.md
├── .gitignore
├── backend/
│   ├── requirements.txt
│   ├── pyproject.toml           ruff, black, pytest, mypy config
│   ├── .env.example
│   ├── app/
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── database.py
│   │   ├── errors.py
│   │   ├── prompts/             extract, handwritten, video, guardian, answer, interview
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   ├── erp.py
│   │   │   ├── knowledge.py
│   │   │   ├── guardian.py
│   │   │   ├── transfer.py
│   │   │   ├── guide.py
│   │   │   ├── map3d.py
│   │   │   └── ops.py
│   │   ├── schemas/
│   │   │   ├── capture.py
│   │   │   ├── ask.py
│   │   │   ├── guardian.py
│   │   │   ├── transfer.py
│   │   │   ├── guide.py
│   │   │   └── map3d.py
│   │   ├── routers/
│   │   │   ├── capture.py
│   │   │   ├── ask.py
│   │   │   ├── guardian.py
│   │   │   ├── transfer.py
│   │   │   ├── guide.py
│   │   │   ├── map3d.py
│   │   │   ├── machines.py
│   │   │   ├── reports.py
│   │   │   └── erp.py
│   │   ├── services/
│   │   │   ├── llm.py
│   │   │   ├── stt.py
│   │   │   ├── tts.py
│   │   │   ├── embeddings.py
│   │   │   ├── capture/
│   │   │   │   ├── voice.py
│   │   │   │   ├── video.py
│   │   │   │   ├── handwritten.py
│   │   │   │   ├── extractor.py
│   │   │   │   ├── erp_sync.py
│   │   │   │   └── sensors.py
│   │   │   ├── ask/
│   │   │   │   ├── search.py
│   │   │   │   ├── qa.py
│   │   │   │   ├── chatter.py
│   │   │   │   ├── chips.py
│   │   │   │   ├── analytics.py
│   │   │   │   └── reports.py
│   │   │   ├── guardian/
│   │   │   │   ├── check.py
│   │   │   │   └── rules.py
│   │   │   ├── transfer/
│   │   │   │   ├── profiles.py
│   │   │   │   ├── handover.py
│   │   │   │   ├── interview.py
│   │   │   │   └── routing.py
│   │   │   ├── guide/
│   │   │   │   ├── authoring.py
│   │   │   │   ├── guided.py
│   │   │   │   ├── skills.py
│   │   │   │   ├── shadowtrace.py
│   │   │   │   ├── troubleshoot.py
│   │   │   │   └── onboarding.py
│   │   │   └── map3d/
│   │   │       ├── components.py
│   │   │       └── pins.py
│   │   ├── utils/
│   │   │   ├── lexicon.py
│   │   │   ├── files.py
│   │   │   └── audit.py
│   │   └── templates/
│   │       ├── machine_handbook.html
│   │       ├── handover_report.html
│   │       └── shift_summary.html
│   ├── simulators/
│   │   ├── mock_erp.py
│   │   └── sensor_sim.py
│   ├── seed/
│   │   ├── seed.py
│   │   └── assets/              handwritten photos, audio clips, chip photos, videos
│   ├── storage/                 uploaded media (git-ignored)
│   └── tests/
│       ├── conftest.py
│       ├── test_capture.py
│       ├── test_guardian.py
│       ├── test_ask.py
│       ├── test_chatter.py
│       ├── test_transfer.py
│       └── test_map3d.py
└── frontend/
    ├── package.json
    ├── vite.config.js
    ├── index.html
    ├── public/
    │   ├── manifest.webmanifest
    │   └── models/vmc.glb
    └── src/
        ├── main.jsx
        ├── App.jsx
        ├── api/
        │   ├── client.js
        │   ├── capture.js
        │   ├── ask.js
        │   ├── guardian.js
        │   ├── transfer.js
        │   ├── guide.js
        │   └── map3d.js
        ├── store/
        │   ├── useAuthStore.js
        │   └── useMachineStore.js
        ├── hooks/
        │   ├── useRecorder.js
        │   ├── useSpeech.js
        │   └── useCamera.js
        ├── pages/
        │   ├── Home.jsx
        │   ├── Capture.jsx
        │   ├── Ask.jsx
        │   ├── GuidedJob.jsx
        │   ├── MachineMap.jsx
        │   ├── Handover.jsx
        │   ├── Review.jsx
        │   └── Dashboard.jsx
        ├── components/
        │   ├── common/ErrorBoundary.jsx
        │   ├── layout/{NavBar,RoleSwitcher}.jsx
        │   ├── capture/{VoiceRecorder,VideoUpload,PhotoUpload,NoteEditor}.jsx
        │   ├── ask/{ChatWindow,AnswerCard,SourceCard,ChatterDoctor,ChipReader}.jsx
        │   ├── guardian/{WarningBanner,EvidenceList}.jsx
        │   ├── guide/{StepView,StepList,SkillBadge,ShadowTracePlayer,TroubleshootTree}.jsx
        │   ├── map3d/{MachineViewer,ComponentMesh,PinMarker,ComponentPanel,PinForm}.jsx
        │   ├── transfer/{HandoverPlan,InterviewSession,RoutedQuestions}.jsx
        │   └── dashboard/{RiskHeatmap,TransferMetrics,MachineTimeline}.jsx
        ├── widget/
        │   └── erpWidget.jsx
        ├── utils/{format.js,i18n.js}
        └── styles/index.css
```

## 9. What each file contains

### 9.1 Backend core
| File | Contents |
|---|---|
| `app/main.py` | Creates FastAPI app, CORS for the React dev server, includes all routers under `/api`, static serving of `storage/` media and the built React app, startup hook (create tables, load lexicon) |
| `app/config.py` | Pydantic `Settings` from `.env`: `GROQ_API_KEY`, `OPENROUTER_API_KEY`, model IDs per task, DB URL, storage path, feature flags |
| `app/errors.py` | Domain exceptions (`NotFound`, `ValidationFailed`, `ProviderUnavailable`, `PayloadTooLarge`) + handlers mapping to HTTP with `{detail, code}` |
| `app/prompts/*.py` | Prompt text constants per feature (kept out of services) |
| `app/database.py` | SQLAlchemy engine/session, `Base`, `get_db()` dependency, FTS5 virtual table `chunks_fts` creation + index/search helpers |
| `requirements.txt` | fastapi, uvicorn, pydantic, pydantic-settings, sqlalchemy, python-multipart, openai, groq, numpy, opencv-python, sentence-transformers==5.1.0, edge-tts, jinja2, pytest, httpx |
| `.env.example` | All env vars with placeholder values |

### 9.2 Models (`app/models/`) — SQLAlchemy tables
| File | Tables |
|---|---|
| `erp.py` | `Machine` (rpm_min/max, teeth, type), `Part`, `Material`, `Tool`, `Operation`, `Employee` (role, join_date, exit_date), `WorkOrder`, `QCReject`, `Maintenance` |
| `knowledge.py` | `Document` (raw source: type, file path, text, uploader), `KnowledgeCard` (machine, component, symptom, action, why, author, confidence, verified_by, source_doc_id, unofficial), `Meeting`, `ActionItem`, `SoundClip`, `ChipSample` |
| `guardian.py` | `ParamLimit`, `FailurePrecursor`, `Warning` (note_id, severity, evidence_ids, card_id, component_id, status, response) |
| `transfer.py` | `ExperienceScore`, `KnowledgeBuddy`, `HandoverPlan`, `HandoverTask`, `InterviewSession`, `RoutedQuestion`, `KnowledgeGap` |
| `guide.py` | `Procedure` (version, status, author, approver), `ProcedureStep` (media, clip_start/end, params, tolerance, component_id), `GuidedRun`, `RunStep`, `SkillMatrix`, `TroubleshootNode`, `QuizItem` |
| `map3d.py` | `MachineModel` (machine, glb_path), `Component` (mesh_name, display_name, aliases), `ComponentPin` (card_id, component_id, x, y, z, author) |
| `ops.py` | `Job` (background task status), `Event` (unified machine timeline), `SensorReading`, `Anomaly`, `Query` (question, answer, sources, feedback), `LLMCache`, `AuditLog` |

### 9.3 Schemas (`app/schemas/`) — Pydantic request/response models
| File | Contents |
|---|---|
| `capture.py` | `VoiceNoteOut`, `VideoProcedureDraft`, `HandwrittenResult`, `ExtractedCard` (also the JSON schema the LLM must return) |
| `ask.py` | `AskRequest` (question, machine_id, component_id, language), `AskAnswer` (answer, steps, watch_out, sources[], experts[], confidence), `ChatterResult` (fc, candidate_rpms, expert_card), `ChipResult` |
| `guardian.py` | `NoteIn`, `GuardianResult` (severity, warnings[], evidence[], expert_fix, component_id) |
| `transfer.py` | `HandoverPlanOut`, `InterviewQuestion`, `RoutedQuestionIn/Out`, `RiskCell` |
| `guide.py` | `ProcedureOut`, `StepOut`, `RunStepIn`, `SkillLevelOut` |
| `map3d.py` | `ComponentOut` (incident_count, card_count, risk_color), `PinIn`, `PinOut` |

### 9.4 Routers (`app/routers/`) — API endpoints
| File | Endpoints |
|---|---|
| `capture.py` | `POST /capture/voice`, `POST /capture/video`, `POST /capture/handwritten`, `POST /capture/text`, `GET /capture/review-queue`, `POST /capture/review/{id}` |
| `ask.py` | `POST /ask`, `POST /ask/voice`, `POST /ask/chatter`, `POST /ask/chips`, `POST /ask/analytics`, `POST /ask/{query_id}/feedback` |
| `guardian.py` | `POST /notes` (save + check), `GET /warnings`, `POST /warnings/{id}/respond` |
| `transfer.py` | `GET /handover/{employee_id}`, `POST /interview/start`, `POST /interview/{id}/answer`, `GET /routed-questions`, `POST /routed-questions/{id}/reply`, `GET /risk` |
| `guide.py` | `GET /procedures`, `PUT /procedures/{id}` (approve/edit), `POST /runs`, `POST /runs/{id}/steps`, `GET /skills/{employee_id}`, `GET /troubleshoot/{machine_id}`, `GET /shadowtrace/{run_id}` |
| `map3d.py` | `GET /machines/{id}/components`, `GET /components/{id}/knowledge`, `POST /components/{id}/pins` |
| `machines.py` | `GET /machines`, `GET /machines/{id}`, `GET /machines/{id}/timeline`, `GET /machines/{id}/context` (things to know before a job) |
| `reports.py` | `GET /reports/handbook/{machine_id}`, `GET /reports/handover/{employee_id}`, `GET /reports/shift-summary` |
| `erp.py` | `POST /erp/sync`, `POST /erp/webhook` (job start/close, QC reject, exit date set) |

### 9.5 Services (`app/services/`) — business logic
| File | Contents |
|---|---|
| `llm.py` | One wrapper over the `openai` SDK with Groq and OpenRouter base URLs; `chat_json(task, prompt, schema)`, `vision_json(images, prompt, schema)`; task → provider routing, Pydantic validation, retry, provider fallback, offline rule fallback, `LLMCache` lookups |
| `embeddings.py` | Singleton multilingual-e5-small model; `embed(texts)` → normalised float32 array |
| `stt.py` | Groq Whisper transcription (`language` hint hi/mr/en), returns text + segments with timestamps |
| `tts.py` | edge-tts synthesis to mp3 for answers/steps |
| `capture/voice.py` | Voice file → STT → `extractor` → card + Guardian check |
| `capture/video.py` | OpenCV scene-change keyframes, STT on the video, vision LLM → draft steps with frame + timestamp |
| `capture/handwritten.py` | Photo → vision LLM → meeting/issue/action extraction with confidence |
| `capture/extractor.py` | Shared prompt + schema to turn any text into cards (machine, component, symptom, action, why, params) |
| `capture/erp_sync.py` | Pulls from mock ERP / ERPNext `/api/resource/<DocType>`, upserts ERP tables, emits timeline events |
| `capture/sensors.py` | Ingest readings, rolling z-score anomaly detection |
| `ask/search.py` | Query understanding, lexicon expansion, FTS5 + embedding hybrid search, filters (machine/component), LLM rerank |
| `ask/qa.py` | Grounded answer generation with citations, experts list, "not enough data" → routing |
| `ask/chatter.py` | FFT of audio, chatter frequency detection, stable RPM candidates `60·fc/(N·k)` within machine range, matching expert card |
| `ask/chips.py` | OpenCV chip segmentation, mean HSV hue, colour + shape class, rules by tool material, expert note |
| `ask/analytics.py` | NL → SQL with SELECT-only guard on a read-only connection |
| `ask/reports.py` | Collects data and renders Jinja2 templates |
| `guardian/check.py` | Note → extract → retrieve history → rules + LLM reasoning → `GuardianResult`; escalation + timeline event |
| `guardian/rules.py` | Param limit check, failure-precursor stats, maintenance overdue, live anomaly match |
| `transfer/profiles.py` | Experience scores per employee × machine/component, buddy pairing |
| `transfer/handover.py` | Exit-date trigger, bus-factor/knowledge-at-risk per machine & component, handover plan + progress |
| `transfer/interview.py` | Gap-driven and video-stimulated interview question generation; answers → cards |
| `transfer/routing.py` | Route unanswered questions to the right old employee; reply → verified card |
| `guide/authoring.py` | Draft procedure editing, approval, versioning |
| `guide/guided.py` | Assemble steps for machine+part+operation with cards and warnings; record run steps; live Guardian checks |
| `guide/skills.py` | Skill levels L0–L4, adaptive detail, promotion rules |
| `guide/shadowtrace.py` | Old employee's recorded run per step (clip, components checked) for side-by-side playback; deviation log |
| `guide/troubleshoot.py` | Build symptom → cause → fix decision tree from history |
| `guide/onboarding.py` | Learning path, daily briefing, quiz generation |
| `map3d/components.py` | Component registry per machine model, per-component stats and risk colour |
| `map3d/pins.py` | Create pins with evidence, auto-pin cards via `component` field + aliases |

### 9.6 Utils, templates, simulators, seed, tests
| File | Contents |
|---|---|
| `utils/lexicon.py` | Hindi/Marathi/English shop-floor synonyms for symptoms, components, machines |
| `utils/files.py` | Safe upload saving, file type checks, media URLs |
| `utils/audit.py` | Writes every AI action to `AuditLog` |
| `templates/*.html` | Handbook, handover report, shift summary (print-ready, footnoted sources) |
| `simulators/mock_erp.py` | Small FastAPI app shaped like ERPNext REST with demo data |
| `simulators/sensor_sim.py` | Streams spindle load/vibration/temperature with injectable anomalies |
| `seed/seed.py` | Demo story: Ramesh (retiring), Priya (new), VMC-3 history, cards, rejects, failures, clips, chip photos, components |
| `tests/*.py` | pytest per feature (see Acceptance criteria) |

### 9.7 Frontend (React)
| File | Contents |
|---|---|
| `package.json` | react, react-dom, react-router-dom, zustand, axios, three, @react-three/fiber, @react-three/drei, react-chartjs-2, chart.js, tailwindcss, vite, vite-plugin-pwa, vitest |
| `vite.config.js` | React plugin, PWA plugin (offline cache), dev proxy `/api` → FastAPI |
| `src/main.jsx` / `App.jsx` | Root render; routes for all pages; layout with NavBar; global WarningBanner |
| `api/client.js` | Axios instance (base URL, error handling); other `api/*.js` = one function per backend endpoint |
| `store/useAuthStore.js` | Current user and role (old employee / new employee / supervisor) — demo role switcher |
| `store/useMachineStore.js` | Selected machine, component, current guided run |
| `hooks/useRecorder.js` | MediaRecorder audio/video capture → Blob |
| `hooks/useSpeech.js` | Play TTS audio / speechSynthesis fallback |
| `hooks/useCamera.js` | Camera stream + photo capture |
| `pages/Home.jsx` | Role-based home: daily briefing (new), pending reviews/interviews (old), risk summary (supervisor) |
| `pages/Capture.jsx` | Voice / video / photo / text capture tabs, result preview, Guardian result |
| `pages/Ask.jsx` | Ask Experience chat + Chatter Doctor + Chip Reader tabs |
| `pages/GuidedJob.jsx` | Step-by-step job runner with skill-adaptive detail, live checks, ShadowTrace toggle |
| `pages/MachineMap.jsx` | 3D Machine Knowledge Map with component panel and pin form |
| `pages/Handover.jsx` | Handover plan, AI interview session, routed questions |
| `pages/Review.jsx` | Validation queue for old employees (approve/edit cards & procedures) |
| `pages/Dashboard.jsx` | Knowledge-at-risk heatmap, transfer metrics, machine timeline |
| `components/capture/*` | `VoiceRecorder` (push-to-talk), `VideoUpload`, `PhotoUpload`, `NoteEditor` |
| `components/ask/*` | `ChatWindow`, `AnswerCard` (steps, watch-out, confidence), `SourceCard` (photo/clip/voice playback), `ChatterDoctor` (record → RPM list), `ChipReader` (photo → diagnosis) |
| `components/guardian/*` | `WarningBanner` (severity colours), `EvidenceList` (cited records + old employee's fix) |
| `components/guide/*` | `StepView`, `StepList`, `SkillBadge`, `ShadowTracePlayer`, `TroubleshootTree` |
| `components/map3d/*` | `MachineViewer` (R3F Canvas, OrbitControls, GLB load), `ComponentMesh` (hover/select/highlight, risk colour), `PinMarker`, `ComponentPanel` (incidents, cards, experts), `PinForm` (attach voice/text/video) |
| `components/transfer/*` | `HandoverPlan`, `InterviewSession`, `RoutedQuestions` |
| `components/dashboard/*` | `RiskHeatmap`, `TransferMetrics` (charts), `MachineTimeline` |
| `widget/erpWidget.jsx` | Embeddable bundle for ERP pages: Guardian banner, "things to know before this job", Ask and Guide buttons |
| `utils/i18n.js` | UI strings in English / Hindi / Marathi |

## 10. Key user flows
1. **Capture**: Ramesh → Capture → records voice → card preview → saved, pinned to spindle on the 3D map.
2. **Guardian**: Priya saves a note → warning banner + spindle highlighted red + Ramesh's fix → supervisor and Ramesh notified.
3. **Ask**: Priya asks in Hindi → cited answer → "Ask Ramesh" if not enough data → reply becomes verified card.
4. **Guide**: Priya opens work order → Guided Job steps with Ramesh's tips; ShadowTrace shows his run.
5. **Handover**: Ramesh's exit date set → handover plan + interview on uncovered components → progress on Dashboard.

## 11. Acceptance criteria (demo)
- Seeded flawed note → Guardian warning with ≥1 citation in < 3 s; normal note → none.
- Every Ask answer has ≥1 source or says "not enough data".
- 427 Hz synthetic tone, N = 2 → RPM candidates include ≈12,810.
- Blue/silver chip photos classified correctly.
- Clicking each component on the 3D model shows its incidents; pinning creates a component-linked card.
- Exit date → handover plan lists bus-factor-1 machines/components.
- Works on a phone through the Cloudflare tunnel; demo runs with no API keys using offline fallbacks.

## 12. Success metrics (pitch)
Time-to-independence for new employees · knowledge coverage % per machine/component · handover progress before exit · Guardian warnings per new employee over time · scrap/reject rate.

## 13. Build guidance for AI coding assistants
This repo is written so any coding model (Gemini, GPT, Claude Sonnet/Opus, Copilot) can produce consistent, efficient code:
- `AGENTS.md`: read order, non-negotiable rules, definition of done (also pointed to by `GEMINI.md`, `CLAUDE.md`).
- `ENGINEERING.md`: layering, Python 3.9 / React standards, **time & space budgets** (indexes, no N+1, pagination, FTS5, O(n log n) FFT, streamed uploads, background jobs, LLM caching), security, testing, copyable templates.
- `TASKS.md`: 26 ordered tasks with exact files, function signatures (contracts), complexity notes and acceptance tests.
Work one task at a time; every task ends with tests + lint passing.

## 14. Out of scope (hackathon)
Real PLC/OPC-UA integration, production auth/SSO, multi-plant tenancy, native mobile apps, voice cloning of employees.
