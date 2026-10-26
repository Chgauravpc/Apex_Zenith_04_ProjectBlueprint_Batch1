# Plan: Blueprint — ERP-integrated Knowledge Transfer System (Surjanna Hackathon, Problem 2)

## Context
Problem: experienced machinists' know-how (setup tricks, small adjustments, the sound of a failing tool) leaves with them when they retire or quit; new employees take months to catch up.
Hackathon lanes: (1) capturing knowledge through video, voice or notes, (2) searchable assistants built on that knowledge, (3) step-by-step guidance for new operators.
User's asks:
- A system living inside the ERP and the employee's daily routine, collecting data from as many sources as possible (handwritten team-meeting reports, sensors, notes, ERP records) into a queryable database, helping new employees (assistant, generated reports, guidance).
- **Note Guardian**: every note a new employee saves is instantly checked against historical records for machine flaws; automatic warning if any.
- Central focus on **knowledge transfer from old (outgoing/experienced) employees to new employees**.
- AI providers: **OpenRouter and Groq** (not Anthropic API).
- **Free services only** (free tiers / open-source / local).
Outcome: one product covering all three lanes on a shared data backbone, with Note Guardian and Old→New Employee Transfer as headline features, demoable in ~30h.

**Design principle — transfer knowledge, don't replace people**: Blueprint never acts on its own or replaces the old or new employee. Every output (answer, warning, RPM suggestion, chip diagnosis) is *advice that teaches*: it shows the old employee's own knowledge with their name, explains the *why*, and leaves the decision to the new employee. Unclear cases go to a human (the old employee / supervisor). Success is measured by how fast the new employee becomes independent, not by automation.
Env (verified): project folder empty, no git; Python 3.9, FastAPI 0.115, `openai` 2.20, `groq` 1.0, OpenCV 4.13, SQLite 3.45 with FTS5. No ffmpeg (not needed — Groq Whisper accepts mp4 directly).

## Existing solutions & our differentiation
| Product | What it covers | Gap vs Blueprint |
|---|---|---|
| Augmentir | AI connected worker; skill-adaptive guidance; doc/video→SOP; offline | Enterprise $$; no handwriting, no Indian languages |
| Poka (IFS) | Video→instructions, multilingual search, AI agents, MCP server | Enterprise; no note checking |
| Dozuki (CreatorPro/Forge AI) | Narrated video→SOP in minutes | SOP-centric; no history-based warnings |
| Tulip Frontline Copilot | Chat over SOPs with citations, NL over tables, 29 languages | Must build apps yourself; generic |
| Workerbase | AI knowledge capture for retiring experts, troubleshooting agent | Closest competitor; enterprise, German, no handwriting/Indic voice, no exit-handover workflow |
| MaintainX CoPilot / UpKeep / Fiix / IBM Maximo | Asset-scoped chat over manuals + work orders; voice→work order; numeric anomaly flags | Maintenance-only; numeric flags, not free-text note checking |
| MachineMetrics Max AI, Siemens Industrial Copilot, MS Factory Ops Agent | CNC/OT-data copilots, shift summaries | Need connected/modern machines & big digital plants |
| Azumuta, SwipeGuide, VKS | Step-by-step instructions, skills matrix | $350–695/mo; little AI |
| Retrocausal, Drishti | Camera AI for assembly steps | Assembly lines, not machining |
Sources: augmentir.com/product, poka.io, workerbase.com/en/marketplace/ai-knowledge-capture, tulip.co/blog/introducing-ai-copilot…, help.getmaintainx.com/ask-your-asset, MachineMetrics Max AI (PMM), NSF PAR 10563580 (machinist tacit-knowledge study).

**Borrowed (proven) patterns**: cited answers (Tulip/MaintainX), asset-scoped chat (Fiix), video→SOP with expert review (Dozuki/Poka), skill-adaptive guidance + restricted steps (Augmentir/Azumuta), capturing expert deviations/workarounds (Workerbase), value flags vs history (MaintainX), AI shift-handover summary (MachineMetrics), audit log + expert sign-off, API/MCP layer for ERP & other copilots (Poka), video-stimulated interviews (UC Irvine/RIT study).

**Our pitch — whitespace none of them cover**:
1. **Handwritten note & logbook ingestion** (mixed Hindi/Marathi/English).
2. **Code-mixed Indian-language voice** + shop-floor jargon lexicon.
3. **Note Guardian** — proactive check of free-text notes against machine history (others only flag numeric meter values).
4. **Structured exit handover** with per-machine knowledge-coverage score.
5. **Works for old, non-networked CNCs** — knowledge from people + phone mic, sensors optional.
6. **SME-affordable & lightweight**: low-cost Android PWA, offline, OpenRouter/Groq (cheap, fast), plugs into small ERPs (ERPNext/Tally-style) — priced per machine.
7. **Machining-specific structure**: machine × material × tool × operation × defect, with feeds/speeds limits.

## Architecture
```
 LANE 1: CAPTURE                 BACKBONE                              LANE 2: ASSIST          LANE 3: GUIDE
 Video clip  ─┐                                                        "Ask Experience" chat   Step-by-step job
 Voice note  ─┤→ ingest → AI extract → SQLite (entities, events,   →   w/ citations         →  guides with old
 Handwritten ─┤  (Groq STT,  + link to    cards, FTS) ──┐              NL→SQL analytics        employees' tips +
 meeting notes│  OpenRouter   machine/part/person       │              reports/handbooks       video per step
 Sensors/ERP ─┘  vision)                                ▼
                         NOTE GUARDIAN: new note saved → check vs history → warn + escalate
                         TRANSFER ENGINE: old-employee profiles, handover plans, interviews, routing
```
ERP = system of record (machines, parts, work orders, employees incl. exit/retirement dates, QC rejects, maintenance). Blueprint hooks ERP events (job start / job close / QC reject / employee exit flagged).

## AI provider layer (`app/llm.py`)
- Both providers are OpenAI-compatible → one client wrapper using the installed `openai` SDK with `base_url` (`https://api.groq.com/openai/v1`, `https://openrouter.ai/api/v1`); `groq` SDK only if needed for audio.
- Routing by task (all model IDs configurable in `.env`, defaults chosen at build time from each provider's current model list):
  - **Groq** — speed-critical: speech-to-text (Whisper large-v3), Note Guardian checks, extraction from text, chat answers.
  - **OpenRouter** — capability-critical: vision (handwritten notes, video keyframes), long reports/handbooks, interview question generation.
- JSON-mode responses validated with Pydantic; retry once, then fall back to the other provider, then offline heuristic (keyword rules) so the demo never breaks.
- Env: `GROQ_API_KEY`, `OPENROUTER_API_KEY`, `GROQ_TEXT_MODEL`, `GROQ_STT_MODEL`, `OPENROUTER_VISION_MODEL`, `OPENROUTER_TEXT_MODEL`.

## Free-services stack (verified Oct 2026 — re-check model IDs on build day)
| Layer | Primary (free) | Fallback (free) |
|---|---|---|
| Text LLM | Groq `llama-3.3-70b-versatile` / `openai/gpt-oss-120b` (JSON mode, tool use; ~30 RPM, ~1K req/day) | OpenRouter `nvidia/nemotron-3-super-120b-a12b:free` |
| Vision (handwriting, video frames, chips) | OpenRouter `nvidia/nemotron-3.5-super-vl:free` (20 RPM, 50 req/day free → cache every result) | Groq `qwen/qwen3.8-27b` (preview) → PaddleOCR Devanagari model |
| Speech-to-text (hi/mr/en) | Groq `whisper-large-v3` (mp4/webm direct, 25 MB, `language=hi/mr`) | Bhashini ASR (Govt of India, free registration) |
| Text-to-speech | edge-tts Hindi/Marathi neural voices | browser `speechSynthesis` (`hi-IN`) |
| Translation | Groq LLM | Bhashini / IndicTrans2-dist-200M (local) |
| Embeddings | local `intfloat/multilingual-e5-small` via `sentence-transformers==5.1.0` (Py 3.9 compatible) | FTS5-only |
| Audio & image processing | numpy FFT, OpenCV | — |
| Database | SQLite + FTS5 | Neon free Postgres |
| Hosting | laptop + Cloudflare quick tunnel (FastAPI serves PWA) | Render free (pre-warm before demo) |
| ERP | mock ERPNext-shaped API | self-hosted ERPNext (frappe_docker) |
| Bot (stretch) | Telegram Bot API | — |
Notes: HF Spaces no longer hosts FastAPI/Docker for free; WhatsApp Cloud API is not reliably free → Telegram. `llm_cache` table + provider fallback keep usage inside free limits.

## Lane 1 — Capture (video, voice, notes + extra sources)
| Source | Input | Processing | Output |
|---|---|---|---|
| Voice note at machine | 1-tap record in PWA (Hindi/Marathi/English) | Groq Whisper → Groq extraction | Know-How Card (context→symptom→action→why) |
| Video of a setup | phone video upload | OpenCV keyframes + Groq Whisper on the mp4 → OpenRouter vision on frames + transcript | Draft step-by-step procedure with frame per step |
| Handwritten reports / meeting notes | phone photo | OpenRouter vision OCR + structuring | Meeting record: issues, decisions, action items, owners, machines |
| Typed notes | text box | Groq extraction | Card / event (and Guardian check) |
| Sensors / CNC alarms | MQTT/CSV (simulator for demo) | rolling z-score anomaly detection | Anomaly events on machine timeline |
| ERP records | mock ERP REST (ERPNext-shaped) | sync job | Machines, parts, work orders, rejects, employees |
- Every extracted item stores `source_doc_id`, `author`, `confidence`; low-confidence items go to the **validation queue** of the experienced employee for that machine.

## Core feature A — Note Guardian (instant check of every new note)
On save of any note (typed / voice / handwritten photo) by a new employee — `app/guardian/check.py`, synchronous, result returned in the save response:
1. **Extract** machine, part, material, parameters (speed/feed/depth/torque/temp/pressure), symptoms (chatter, burr, noise, vibration, smell, leak, dimension drift), actions.
2. **Retrieve history** for that machine/part: similar past notes (FTS + symptom lexicon), Know-How Cards from old employees, QC rejects, maintenance records, recent anomalies + latest sensor readings, approved parameter limits.
3. **Check**
   - Rules (deterministic, `app/guardian/rules.py`): parameter outside approved range; symptom that historically preceded a breakdown/reject on this machine (precursor stats); maintenance overdue; live sensor anomaly matches.
   - LLM reasoning (Groq, grounded only in retrieved records): contradictions with how experienced employees handled it, patterns the rules miss.
4. **Warn**: severity (info / caution / stop-machine), cited evidence, **what the experienced employee did last time** (their card + name), recommended next step. Shown instantly as a banner/popup in PWA and ERP widget.
5. **Escalate & learn**: caution/stop → notify shift supervisor + the experienced employee mapped to that machine; outcome logged on machine timeline; the resolution becomes a new card. Employee can mark "false alarm" → tunes thresholds.
- Never warns without ≥1 cited record; otherwise "no known issues".

## Core feature B — Old Employee → New Employee knowledge transfer (central focus)
- **Experience profiles**: for each machine/operation, rank experienced employees by authored + validated cards, fixes, ERP history, years on machine.
- **Knowledge buddy pairing**: each new employee is paired with the experienced employee(s) for their assigned machines.
- **Exit / retirement handover** (`app/transfer/handover.py`): when ERP flags an exit date, auto-generate a handover plan — machines where this person is the only knowledge holder (bus-factor = 1), uncovered topics — and schedule:
  - **AI interview sessions**: model asks targeted gap questions; old employee answers by voice → cards.
  - **Video-stimulated interviews**: old employee watches their own setup clip; the AI pauses at key moments and asks "why did you do that here?" → reasoning captured as step tips (method from machinist tacit-knowledge research).
  - **Capture the deviations**: wherever an old employee's guided runs deviate from the SOP (skipped step, tweaked parameter) without a bad outcome, prompt them to explain → card ("unofficial but proven" tag until validated).
  - **"Record your setup"** video tasks per critical operation → procedures.
  - Handover progress % visible to management; target 100% before last working day.
- **Question routing**: if the assistant can't answer from records, the question goes to the experienced employee in-app; their reply becomes a verified card — asked once, answered forever, even after they leave.
- **Validation loop**: new employees' notes and AI-extracted cards are reviewed by experienced employees → "verified by Ramesh" label + credit.
- **ShadowTrace (shadow mode)**: new employee runs a guided job alongside the old employee's recorded steps/tips; deviations logged for review.
- **Transfer metrics**: knowledge coverage % per machine, handover progress per leaving employee, new employee skill level per operation, time-to-independence, Guardian warnings trend per new employee.

## Core feature C — 3D Machine Knowledge Map (component-pinned knowledge)
**Idea**: expert knowledge is stored not only as text/voice/video but also **where on the machine it applies**. An interactive 3D model of the CNC/VMC is the visual index of everything Blueprint knows about that machine.
**How it works**
1. **3D viewer** (`web/machine3d.js`, Three.js, free/MIT): rotate, zoom, pan; works on phone/tablet (touch) and in the ERP widget. Model = free CC-licensed GLB of a VMC/lathe, or a simple model built from Three.js primitives (fallback). Named meshes = components: spindle, tool holder/ATC, table & vise/fixture, workpiece, coolant system, axes/ways (X/Y/Z), chuck, control panel, chip conveyor.
2. **Pin knowledge (old employee)**: click a component (raycasting) → optional exact 3D point → attach **voice note / text / repair video / photo** describing symptoms, how the problem was identified, checks performed, and the fix. Reuses Lane 1 pipelines (Groq Whisper, extraction, video→steps) → saved as a **component-linked Know-How Card** (machine + component + 3D point + evidence + author + verified_by).
3. **Explore (new employee)**: components show **heat-coloured badges** (number of incidents/cards, red = frequent problems); click the spindle → past incidents, old employees' explanations, verified troubleshooting steps, linked videos, who to ask.
4. **Auto-pinning**: cards/notes/rejects from other sources are mapped to a component by the LLM extraction (`component` field + lexicon, e.g. "chuck jaw", "coolant nozzle", "spindle bearing"), so the map fills itself from logbooks, meetings and ERP history; low-confidence mappings go to the validation queue.
**Integration with existing features**
- **Ask Experience**: component click = asset + component filter for retrieval; answers highlight the component in 3D; "ask about this part" button.
- **Note Guardian**: a warning highlights the affected component in red on the 3D model with its past incidents ("spindle — 3 of last 4 failures started with chatter").
- **Guided Jobs**: each step can point to a component → camera flies to it and highlights it ("step 4: tighten vise jaw — here"); "watch for" warnings come from that component's history.
- **ShadowTrace**: the old employee's recorded run shows which components they touched/checked at each step, highlighted on the model, so the new employee sees *where* the expert looked.
- **Transfer metrics / handover**: knowledge coverage per component (grey = no knowledge captured) → exit interviews target uncovered components of the retiring employee's machines.
**Free stack**: Three.js + GLTFLoader (CDN), free GLB model (Sketchfab/Poly Haven CC-licensed) or primitive model; no paid 3D services.

## Lane 2 — Searchable assistant ("Ask Experience")
**2.1 Retrieval pipeline** (`app/assist/search.py`)
1. Query understanding (Groq, JSON): intent (how-to / troubleshoot / history / analytics / who-knows), entities (machine, part, material, operation, symptom), language.
2. Expansion with a **shop-floor lexicon** (`symptom_lexicon`): English/Hindi/Marathi/slang synonyms (e.g. "chatter" = "kaanpna" = "awaaz aa rahi hai"; "burr" = "dhaar"), part/machine aliases.
3. Hybrid retrieval: SQLite FTS5 BM25 + semantic vectors (local multilingual sentence-transformers model if installable; FTS-only otherwise) + hard filters from entities + boost for verified cards and recent records.
4. LLM rerank of top 20 → top 6 with reasons.
**2.2 Answer format** (`app/assist/qa.py`): short answer → numbered steps → "watch out" → **sources** as cards (thumbnail of handwritten page / video clip jumped to timestamp / voice note playback) → **who knows more** (old employee + buddy, with "Ask them" button) → confidence badge + verified/unverified. Strict grounding: answers only from sources; otherwise "not enough data" + one-tap route to an experienced employee (Feature B).
**2.3 Ways to ask (multimodal)**
- Text + **voice** (push-to-talk → Groq Whisper; answer read aloud via browser speechSynthesis in hi/mr/en).
- **Photo-to-fix**: snap a defective part / alarm screen / setup → OpenRouter vision describes defect/alarm code → search similar past rejects & fixes.
  - **Chip colour reader**: photo of chips → OpenCV segment + mean HSV hue (hue is the strongest signal, ~95% in Pagani et al. 2020) → colour class (silver / straw / blue / violet) + shape (6/9 curls vs long stringy) → rules by tool material (HSS vs carbide) and workpiece → "blue chips on HSS = too hot, reduce speed" **plus the old employee's own note on reading chips**, so the new employee learns the cue. Framed as a learning cue, not a verdict (lighting/coolant affect colour).
- **Sound match**: record 5 s of machine sound → FFT/MFCC fingerprint (numpy; librosa if available) → cosine match against labelled clips from old employees ("sounds like worn insert — similar to Ramesh's 12-Mar recording") — directly addresses "the sound of a tool about to fail".
  - **Chatter → stable RPM**: same recording → FFT → dominant peak excluding tooth-passing harmonics = chatter frequency fc → candidate stable speeds RPM = 60·fc / (N·k), k = 1, 2, 3 (N = cutter teeth; Smith & Tlusty stability-lobe rule), limited to the machine's RPM range from ERP → shown next to **what the old employee did for chatter on this machine**, with the formula explained. The new employee chooses; the outcome is logged to improve the card.
- **Contextual ERP mode**: opened from a work order in the ERP widget → pre-filtered to that machine/part, shows "things to know before this job" without asking.
**2.4 Analytics** — "how many tool breaks on Lathe-2 last month?" → `run_sql` tool on read-only connection (SELECT-only, row limit) → table + simple chart (Chart.js).
**2.5 Report generator** (`app/assist/reports.py`), on demand ("make a report on VMC-3 spindle issues") or scheduled:
- Machine handbook (for new employees), daily shift-handover summary (auto, end of shift), weekly issues & meeting-actions report, new-employee progress report, exit handover report, troubleshooting guide per machine. HTML templates (Jinja2) → print-to-PDF; every claim footnoted to source.
**2.6 Learning loop**: 👍/👎 + "this fix worked / didn't" adjusts card score; unanswered questions logged → **knowledge-gap list** feeds AI interview questions for old employees (Feature B); popular questions become FAQ.
**2.7 Machine timeline**: unified chronological view per machine across ERP, sensors, notes, meetings, warnings, guided runs.
**2.8 Open API**: REST endpoints (`/api/ask`, `/api/notes`, `/api/machines/{id}/context`) so the ERP — or other copilots — can query Blueprint; every AI action written to an `audit_log`. Stretch: WhatsApp/Telegram-style bot for voice-note capture and asking.

## Lane 3 — Step-by-step guidance for new operators
**3.1 Procedure authoring** (old employees, minimal effort)
- **Video → procedure**: OpenCV scene-change keyframes + Whisper transcript (timestamps) → OpenRouter vision drafts steps, each with a keyframe + clip timestamp → old employee reviews in a simple step editor (reorder, edit, record voice tip per step) → approve → versioned procedure.
- Also: import SOP PDF/text, or photo of a handwritten SOP; voice dictation ("step one…").
**3.2 Step structure**: instruction · media (image / clip segment) · parameters with limits · tips from old employees (name + verified) · "watch for" warnings auto-linked from history (rejects/anomalies at that step) · safety/PPE icon · verification input (e.g. measured dimension with tolerance → pass/fail; photo of first-off part) · expected time.
**3.3 Guided job mode** (`app/guide/guided.py`): scan machine QR / open from ERP work order → procedure for that machine+part+operation, enriched with relevant cards at the right step.
- Values entered at a step (feed, offset, measured dimension) are **checked live** by Note Guardian rules → inline warning before moving on.
- "Stuck" → assistant opened with the current step as context → escalate to knowledge buddy.
- Hands-free/shop-floor UX: voice commands ("next", "repeat", "help"), read-aloud steps in hi/mr/en, big glove-friendly buttons, offline cache of assigned machines' procedures (PWA service worker).
- Run log: per-step time, values, photos, deviations → ERP work order + skill record; slow/failing steps flagged to authors for improvement.
**3.4 Adaptive guidance by skill level** — per operator per operation, skill matrix levels 0–4 (L0 not trained, L1 guided, L2 supervised, L3 independent, L4 can teach):
- L1: every step + media + mandatory confirmations; L2: condensed steps, critical checks mandatory; L3: checklist only; L4: can author/validate.
- Promotion: N successful runs without stop-level Guardian warnings + knowledge-buddy sign-off.
**3.5 Troubleshooting flows**: generated from history per machine — symptom → likely causes ranked by past frequency → check steps → fixes (each from an old employee's card) as an interactive decision tree; unresolved branch → routes question.
**3.6 ShadowTrace (shadow mode)**: new employee follows an old employee's recorded run side by side (their clip per step, plus the components they checked highlighted on the 3D model — Feature C); deviations logged and reviewed with the buddy.
**3.7 Onboarding learning path** (`app/guide/onboarding.py`): per role & machine — Watch (videos) → Learn (cards + quiz) → Do (guided runs with buddy) → Certify (sign-off → skill level). Daily briefing: today's jobs, known issues on assigned machines, 2 spaced-repetition questions on critical tips, open action items from meetings.

## Data model (SQLite, Postgres-ready)
`machines, parts, materials, operations, employees(join_date, exit_date), work_orders, qc_rejects, maintenance` (from ERP)
`documents` (raw source), `knowledge_cards` (… author, confidence, verified_by, source_doc_id), `procedures`, `procedure_steps`
`meetings`, `action_items`, `events` (unified timeline), `sensor_readings`, `anomalies`, `chunks_fts` (FTS5)
`param_limits`, `symptom_lexicon`, `warnings` (note_id, severity, evidence_ids, card_id, status, response)
`knowledge_buddies`, `experience_scores`, `handover_plans`, `handover_tasks`, `interview_sessions`, `routed_questions`
3D map: `machine_models` (machine, glb_path), `components` (machine, mesh_name, display_name, aliases), `component_pins` (card_id, component_id, x, y, z, author) — `knowledge_cards`, `warnings`, `procedure_steps` get a `component_id`
Lane 2: `queries` (question, answer, sources, feedback), `knowledge_gaps`, `sound_clips` (machine, label, fingerprint, contributor), `reports`
Lane 3: `procedures` (versioned, status draft/approved, author, approver), `procedure_steps` (media, clip_start/end, params, tolerance, safety), `step_tips`, `guided_runs`, `run_steps` (time, values, photo, deviation), `skill_matrix` (employee, operation, level, signed_off_by), `troubleshoot_nodes`, `quiz_items`

## Files to create
Tech stack: **Python (FastAPI) backend + React (Vite) frontend** (3D map with @react-three/fiber). Full file structure and what each file contains: see [PRD.md](PRD.md) sections 7–9. Coding rules for AI assistants: [AGENTS.md](AGENTS.md), [ENGINEERING.md](ENGINEERING.md); build order: [TASKS.md](TASKS.md).

## Build phases
1. Backbone: schema, mock ERP, seed history (past notes, rejects, failures, old employees with exit dates) (3h)
2. LLM layer (Groq + OpenRouter + fallback) (2h)
3. Lane 1 capture: notes/handwritten → voice → video → sensors, validation queue (6h)
4. Note Guardian (5h)
5. Old→New transfer: profiles, buddy pairing, handover plan, AI interview, question routing (5h)
6. Lane 2: retrieval + cited answers + voice (3h), photo-to-fix + sound match (2h), analytics + reports (2h)
7. Lane 3: video→procedure authoring + step editor (3h), guided job w/ live checks + skill levels (3h), troubleshooting tree + onboarding path (2h)
8. 3D Machine Knowledge Map: viewer + component select + pin/attach + badges (3h), integration hooks into Ask / Guardian / Guided Jobs / ShadowTrace (2h)
9. UI polish, ERP widget, dashboard, demo script (3h)
Must-have for demo: phases 1–5, Lane 2 sections 2.1, 2.2, 2.5 (handbook), chatter → stable RPM, chip colour reader, Lane 3 sections 3.1 (video→procedure), 3.3, 3.4, 3D map (pin + explore + Guardian highlight). Stretch: clip-to-clip sound match, ShadowTrace 3D trace, guided-step fly-to, general photo-to-fix, analytics charts, chat bot.

## Demo script (3 min)
1. Ramesh (retiring in 7 months) records a voice tip + setup video → card + procedure; photo of handwritten meeting notes → actions + issues. On the **3D model of VMC-3** he clicks the spindle and pins his voice note on how he diagnosed a bearing problem.
2. **Guardian**: Priya (new employee) saves "VMC-3 slight chatter, increased feed to 0.3 on SS304" → instant red warning: chatter preceded 3 of last 4 spindle failures + feed above limit; the **spindle glows red on the 3D model**; shows Ramesh's fix; supervisor + Ramesh notified. Priya clicks the spindle → Ramesh's pinned explanation and past incidents.
3. Priya opens guided job on VMC-3 → Ramesh's tip appears at step 4.
4. Her unanswerable question → routed to Ramesh → his reply becomes a verified card.
5. Dashboard: Ramesh is sole knowledge holder for VMC-3 → handover plan 40% → AI interview session; one-click handbook PDF.

## Verification
- `pip install -r requirements.txt`; set keys in `.env`; `python seed/seed.py`; `uvicorn app.main:app` → http://localhost:8000.
- `tests/smoke.py`: upload sample note image, voice/text note, sensor batch, ask question (asserts citations), guided run, report.
- Guardian tests: seeded flawed notes (out-of-range param, known precursor symptom) → warning with cited evidence; normal notes → none.
- Transfer tests: employee with exit date → handover plan listing bus-factor-1 machines; unanswerable question routed; reply creates verified card.
- Provider tests: run with both keys, with only one key (fallback), and with none (offline heuristics).
- Chatter → RPM: synthetic 427 Hz tone, N = 2 → candidate list includes ≈12,810 RPM (k=1) clipped to machine range. Chip reader: seeded blue/silver chip photos classified correctly with the old employee's note attached.
- 3D map: clicking each named mesh selects the right component; pinning a voice note creates a component-linked card; seeded spindle incidents show as a red badge; a Guardian warning about chatter highlights the spindle; component filter narrows Ask answers; works with touch on a phone.
- Manual walkthrough of demo script in browser.
