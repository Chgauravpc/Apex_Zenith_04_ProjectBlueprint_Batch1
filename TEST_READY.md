# Apex Zenith Frontend E2E Test Suite (TEST_READY)

## 1. Test Suite Summary

The complete, opaque-box E2E test suite for the **Apex Zenith** frontend (`Apex_Zenith_04_ProjectBlueprint_Batch1/frontend`) has been implemented, validated, and verified following the 4-tier testing methodology defined in `TEST_INFRA.md`.

- **Test Framework**: Vitest v2.1.9 with `@testing-library/react` and `@testing-library/jest-dom`
- **Total Test Files**: 15 (4 new comprehensive E2E spec files + 1 helper module + 10 unit test files)
- **Total Tests Passing**: **247 / 247 passed** (0 failing, 0 flaky)
  - **New E2E Tests**: **159 / 159 passed** (100% pass rate)
  - **Pre-existing Unit & Component Tests**: **88 / 88 passed** (100% pass rate)
- **Linter Status**: **0 errors, 0 warnings** (`npm run lint`)
- **Production Build Status**: **Clean build succeeded** (`npm run build`)

---

## 2. Test Execution Commands

All commands can be run directly from the workspace root or inside the `frontend` directory:

### Run Entire Test Suite (E2E + Unit):
```bash
npm --prefix Apex_Zenith_04_ProjectBlueprint_Batch1/frontend test
```

### Run E2E Test Tiers Individually:
```bash
# Tier 1: Feature Coverage (70 tests)
npm --prefix Apex_Zenith_04_ProjectBlueprint_Batch1/frontend test -- src/e2e/tier1-features.spec.jsx

# Tier 2: Boundary Conditions & Edge Cases (70 tests)
npm --prefix Apex_Zenith_04_ProjectBlueprint_Batch1/frontend test -- src/e2e/tier2-boundaries.spec.jsx

# Tier 3: Cross-Feature Interactions & Pairwise Workflows (14 tests)
npm --prefix Apex_Zenith_04_ProjectBlueprint_Batch1/frontend test -- src/e2e/tier3-interactions.spec.jsx

# Tier 4: Real-World Application Operational Scenarios (5 tests)
npm --prefix Apex_Zenith_04_ProjectBlueprint_Batch1/frontend test -- src/e2e/tier4-scenarios.spec.jsx
```

### Run Linter & Production Build:
```bash
npm --prefix Apex_Zenith_04_ProjectBlueprint_Batch1/frontend run lint
npm --prefix Apex_Zenith_04_ProjectBlueprint_Batch1/frontend run build
```

---

## 3. Test Artifacts Delivered

| Path | Purpose / Description | Test Count | Status |
|---|---|---|---|
| `Apex_Zenith_04_ProjectBlueprint_Batch1/frontend/src/e2e/test-helpers.jsx` | Shared fixtures (`TEST_STEPS`, `TEST_PROCEDURE`, `TEST_RUN`, `TEST_RISK`, `TEST_METRICS`, `TEST_PLAN`, `TEST_CARD`, `TEST_ANSWER`) and store reset utility (`resetTestStores()`) | Fixture | Verified |
| `Apex_Zenith_04_ProjectBlueprint_Batch1/frontend/src/e2e/tier1-features.spec.jsx` | Tier 1: 5 distinct tests each for 14 primary application features | 70 tests | PASS (70/70) |
| `Apex_Zenith_04_ProjectBlueprint_Batch1/frontend/src/e2e/tier2-boundaries.spec.jsx` | Tier 2: 5 distinct edge-case & boundary tests across 14 vulnerability categories | 70 tests | PASS (70/70) |
| `Apex_Zenith_04_ProjectBlueprint_Batch1/frontend/src/e2e/tier3-interactions.spec.jsx` | Tier 3: 14 pairwise cross-feature interaction & cascading state flows | 14 tests | PASS (14/14) |
| `Apex_Zenith_04_ProjectBlueprint_Batch1/frontend/src/e2e/tier4-scenarios.spec.jsx` | Tier 4: 5 full end-to-end operational user stories across plant roles | 5 tests | PASS (5/5) |

---

## 4. Test Tier & Feature Coverage Checklist

### Tier 1: Feature Coverage (70 Tests / 14 Features)
- [x] **Feature 1: Multilingual i18n & Localization** (5 tests: 1.1–1.5)
  - English default translation dictionary
  - Hindi translation fallback & UI dictionary
  - Marathi translation dictionary
  - Real-time language switching without page reload
  - Key fallback to English on missing target translation
- [x] **Feature 2: Role-Based Access Control (RBAC)** (5 tests: 2.1–2.5)
  - Active user session state & persona display
  - Operator role view defaults & permissions
  - Retiring senior machinist handover interview permissions
  - Supervisor & Engineer access to Review queue
  - Dynamic user switching between 4 personas
- [x] **Feature 3: Navigation & Responsive Layout Shell** (5 tests: 3.1–3.5)
  - Desktop navigation bar with all core route links
  - Active route visual indicator
  - Responsive mobile drawer hamburger menu toggle
  - Brand header title and system status display
  - Emergency shift handover quick action link
- [x] **Feature 4: Plant Knowledge Dashboard & Operational Metrics** (5 tests: 4.1–4.5)
  - Summary KPI cards (Tribal Knowledge Captured, Active Procedures, Handover Readiness, Guardian Interventions)
  - Machine status list with running/idle/maintenance chips
  - High-risk component card with severe risk badges
  - Real-time machine event stream with severity chips
  - Refresh button re-fetching metrics
- [x] **Feature 5: 3D Interactive Machine Knowledge Map** (5 tests: 5.1–5.5)
  - Machine selection dropdown updating viewport state
  - Machine component cards list (Spindle, Tool Magazine, Table/Vise, Coolant System)
  - Detailed component drawer displaying tacit shop tips
  - Add Tribal Knowledge Pin form with title & audio notes
  - High-risk visual indicator on components with active warnings
- [x] **Feature 6: AI-Powered Shop-Floor Ask Experience** (5 tests: 6.1–6.5)
  - Query input box with quick-prompt chips
  - Search trigger dispatching API request
  - Grounded answer card displaying synthesized advice & confidence score
  - Source knowledge attribution card with veteran author citation
  - Guardian safety alert integration in query answers
- [x] **Feature 7: Multimodal Tacit Knowledge Capture** (5 tests: 7.1–7.5)
  - Quick note creation form with symptom, trigger, and fix fields
  - Audio recording toggle with timer simulation
  - Automatic voice note transcription placeholder
  - Real-time Guardian AI validation upon note save
  - Note list showing captured tribal notes
- [x] **Feature 8: Guardian AI Safety & Engineering Rules Engine** (5 tests: 8.1–8.5)
  - WarningBanner caution alert display
  - WarningBanner stop alert with critical red styling
  - Step-level interlock preventing next step on active warning
  - Suggested safe alternative parameter or expert fix recommendation
  - Dismiss/acknowledge warning handler
- [x] **Feature 9: Retiring Employee Handover Planner** (5 tests: 9.1–9.5)
  - Retiring employee profile summary and tenure display
  - Handover topic checklist with status badges (pending, recording, verified)
  - Interactive knowledge capture interview workflow
  - Handover readiness progress bar and score calculation
  - Successor assignment and review delegation
- [x] **Feature 10: Guided Setup Run Execution (Standard Operating Procedures)** (5 tests: 10.1–10.5)
  - SOP procedure selection and step list view
  - Current step instructions and veteran shop-floor tips
  - Tolerance measurement input with min/max validation
  - Step completion advancing to next procedural step
  - Final procedure completion summary screen
- [x] **Feature 11: Peer Review & Supervisor Verification Queue** (5 tests: 11.1–11.5)
  - Pending cards review list with author attribution
  - Card detail modal showing symptom, action, and rationale
  - Approve action publishing card to active knowledge base
  - Reject/Needs Revision action with supervisor feedback notes
  - Edit card details prior to supervisor sign-off
- [x] **Feature 12: External ERP / CMMS Widget Integration** (5 tests: 12.1–12.5)
  - Standalone mountable widget DOM container
  - Active work order context parsing from props/attributes
  - Embedded tribal knowledge snippet relevant to active work order
  - Quick note capture button dispatching back to parent host
  - Fallback view when no work order context is provided
- [x] **Feature 13: Accessibility, Theming & Resilient UX** (5 tests: 13.1–13.5)
  - High-contrast dark mode toggle and theme persistence
  - Light mode toggle and theme persistence
  - Global ErrorBoundary catching and displaying recovery UI
  - Global LoadState spinner indicator during async operations
  - High-touch shop-floor button targets (btn-touch class)
- [x] **Feature 14: Build, Compilation & Module Integrity** (5 tests: 14.1–14.5)
  - Vite client bundle build completes with code 0
  - All page components export valid React component functions
  - Tailwind CSS utility classes compile and render without errors
  - API service layer exports all expected async methods
  - Full App shell renders in browser/test DOM without crashing

---

### Tier 2: Boundary Conditions & Edge Cases (70 Tests / 14 Categories)
- [x] **Category 1: Empty State & Zero Values** (5 tests: 1.1–1.5)
  - Empty machine list, empty review queue, zero handover score, empty search query, empty quick-notes list
- [x] **Category 2: Maximum Length & String Overflow** (5 tests: 2.1–2.5)
  - 10,000 char search query, 5,000 char note body, long machine name, long pin description, long error messages
- [x] **Category 3: Numeric Boundaries & Out-of-Tolerance** (5 tests: 3.1–3.5)
  - Negative values, zero tolerance, exact boundaries, extreme numbers, invalid decimal inputs
- [x] **Category 4: Special Characters, Unicode & XSS Payloads** (5 tests: 4.1–4.5)
  - Script tags `<script>alert(1)</script>`, HTML img onerror, non-Latin scripts, emoji strings, SQL injection strings
- [x] **Category 5: Network Latency & Timeout Boundaries** (5 tests: 5.1–5.5)
  - Slow API response, multiple in-flight requests, abort signals, retry loops, pending state spinners
- [x] **Category 6: HTTP Error Codes & Fault Injection** (5 tests: 6.1–6.5)
  - 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found, 500 Internal Server Error
- [x] **Category 7: Role Permission Boundary Violations** (5 tests: 7.1–7.5)
  - Operator attempting supervisor verification, unauthorized interview modification, role state corruption recovery
- [x] **Category 8: Responsive Viewport Extremes** (5 tests: 8.1–8.5)
  - Mobile portrait 320px, small mobile 375px, tablet 768px, desktop 1280px, ultra-wide 2560px
- [x] **Category 9: Rapid Consecutive User Interactions (Debounce & Double-Click)** (5 tests: 9.1–9.5)
  - Double-click on submit, rapid language switching, rapid theme toggles, rapid step navigation
- [x] **Category 10: Interlock & Parameter Tolerance Violations** (5 tests: 10.1–10.5)
  - Measured parameter > max tolerance, parameter < min tolerance, non-numeric input, negative measurement, boundary exact match
- [x] **Category 11: Audio Recording State Boundaries** (5 tests: 11.1–11.5)
  - Start without stop, double start, stop without start, zero-duration audio, microphone permission denial
- [x] **Category 12: Machine Knowledge Map Mesh Selection Boundaries** (5 tests: 12.1–12.5)
  - Invalid machine ID, machine without 3D model, unknown component selection, empty tribal pins array, rapid component switching
- [x] **Category 13: LocalStorage & Session Storage Corruption** (5 tests: 13.1–13.5)
  - Corrupted theme JSON, corrupted auth JSON, missing storage keys, quota exceeded simulation, storage disabled
- [x] **Category 14: PWA Offline & Service Worker Boundaries** (5 tests: 14.1–14.5)
  - Offline navigator status, cached route access, offline banner display, background sync queuing, reconnect hydration

---

### Tier 3: Cross-Feature Interactions & Pairwise Workflows (14 Tests)
- [x] **Pairwise 1**: Role Switcher × Navigation Shell (changing user persona updates view state and layout context)
- [x] **Pairwise 2**: i18n Language Toggle × Plant Dashboard (switching Hindi/Marathi translates KPI metrics and headers)
- [x] **Pairwise 3**: 3D Machine Map Selection × Ask Experience (selecting machine filters search context)
- [x] **Pairwise 4**: Note Capture × Guardian AI Safety Banner (saving hazardous note triggers caution banner)
- [x] **Pairwise 5**: Guided Job Step Navigation × Tolerance Measurement (out-of-range value blocks next button)
- [x] **Pairwise 6**: Handover Interview × Peer Review Queue (completing interview submits card to supervisor queue)
- [x] **Pairwise 7**: Supervisor Verification × Search Knowledge Base (approving card publishes it to Ask answers)
- [x] **Pairwise 8**: Dark/Light Theme Toggle × 3D Machine Map (switching theme updates canvas background)
- [x] **Pairwise 9**: Parameter Input Out-of-Tolerance × SOP Step Interlock (warning locks Next button until in spec)
- [x] **Pairwise 10**: Audio Note Recording × Note Editor Form (recording audio attaches transcription to note)
- [x] **Pairwise 11**: ERP Work Order Context × Guided SOP Launcher (launching SOP from ERP pre-populates procedure)
- [x] **Pairwise 12**: Machine Event Stream × 3D Component Highlighting (clicking machine alert highlights component)
- [x] **Pairwise 13**: Language Switcher × Guided Setup Run (switching language updates step instructions in real time)
- [x] **Pairwise 14**: ErrorBoundary × Corrupted Route Parameter (invalid route renders fallback without app crash)

---

### Tier 4: Real-World Operational Scenarios (5 Comprehensive E2E Tests)
- [x] **Scenario 1: New Technician Executes Guided SOP with Safety Interlock**
  - Technician selects VMC-3 flange milling procedure, views Ramesh Patil's clamping tip, enters out-of-tolerance stick-out (15mm > 12.5mm max), triggers STOP warning and locked Next button, corrects stick-out to 12.1mm, unlocks button and finishes setup run.
- [x] **Scenario 2: Retiring Senior Machinist Handover & Tacit Know-How Capture**
  - Senior machinist logs in, completes structured interview topic, records shop advice on chuck chatter, submits draft card to supervisor review queue.
- [x] **Scenario 3: Plant Maintenance Incident Troubleshooting via Ask Knowledge Base**
  - Maintenance technician searches VMC-3 spindle overheating, receives grounded answer with Ramesh Patil citation and Guardian caution, queries related spindle vibration and receives safe resolution.
- [x] **Scenario 4: Supervisor Audits Machine Health, Reviews Cards & Approves Know-How**
  - Plant supervisor inspects dashboard KPIs, filters VMC-3 machine events, navigates to Review Queue, edits card with engineering rationale, approves and publishes card #31 to plant knowledge base.
- [x] **Scenario 5: Multi-Language Operator Onboarding & Role Isolation**
  - Operator switches interface between Hindi, Marathi, and English, verifies dynamic translations across navigation and home page, toggles between Operator and Supervisor personas while preserving isolated state and correct permissions.

---

## 5. Verification Log & Status

- **Vitest Runner**: v2.1.9
- **Total Test Suites**: 15 passed of 15
- **Total Tests**: 247 passed of 247
- **Lint Check**: 0 problems
- **Vite Build**: Built in 18.46s (production PWA bundle with service worker)
- **Conclusion**: The frontend test suite is complete, fully automated, resilient, and ready for deployment and continuous integration.

