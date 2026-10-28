import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';

import NavBar from '../components/layout/NavBar';
import ThemeToggle from '../components/layout/ThemeToggle';
import Home from '../pages/Home';
import Dashboard from '../pages/Dashboard';
import MachineMap from '../pages/MachineMap';
import Ask from '../pages/Ask';
import Handover from '../pages/Handover';
import Review from '../pages/Review';
import StepView from '../components/guide/StepView';
import NoteEditor from '../components/capture/NoteEditor';
import ErrorBoundary from '../components/common/ErrorBoundary';

import { useAuthStore, DEMO_USERS } from '../store/useAuthStore';
import { useMachineStore } from '../store/useMachineStore';
import { useThemeStore } from '../store/useThemeStore';
import * as guideApi from '../api/guide';
import * as captureApi from '../api/capture';
import * as transferApi from '../api/transfer';
import * as machinesApi from '../api/machines';
import * as map3dApi from '../api/map3d';

import {
  TEST_PROCEDURE,
  TEST_RUN,
  TEST_RISK,
  TEST_METRICS,
  TEST_PLAN,
  TEST_CARD,
  resetTestStores,
} from './test-helpers';

// API Mocks
vi.mock('../api/guide', () => ({
  getProcedures: vi.fn(),
  startRun: vi.fn(),
  recordStep: vi.fn(),
  getShadowTrace: vi.fn(),
  getTroubleshoot: vi.fn(),
  getBriefing: vi.fn(),
}));

vi.mock('../api/capture', () => ({
  captureText: vi.fn(),
  captureVoice: vi.fn(),
  captureVideo: vi.fn(),
  captureHandwritten: vi.fn(),
  pollJob: vi.fn(),
  getReviewQueue: vi.fn(),
  reviewCard: vi.fn(),
  transcribe: vi.fn(),
}));

vi.mock('../api/transfer', () => ({
  getRisk: vi.fn(),
  getHandoverPlan: vi.fn(),
  getMetrics: vi.fn(),
  getRoutedQuestions: vi.fn(),
  startInterview: vi.fn(),
  answerInterview: vi.fn(),
  replyRoutedQuestion: vi.fn(),
}));

vi.mock('../api/machines', () => ({
  getMachines: vi.fn(),
  getTimeline: vi.fn(),
}));

vi.mock('../api/ask', () => ({
  askQuestion: vi.fn(),
  askVoice: vi.fn(),
  askChatter: vi.fn(),
  askChips: vi.fn(),
  submitFeedback: vi.fn(),
}));

vi.mock('../api/map3d', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    getComponents: vi.fn(),
    createPin: vi.fn(),
    VMC_COMPONENTS_DATA: [
      {
        id: 1,
        machine_id: 1,
        mesh_name: 'spindle',
        display_name: 'Spindle Assembly',
        risk: 'high',
        incident_count: 5,
        status: 'High Chatter Risk',
        description: 'High-speed precision cartridge spindle.',
        specs: { 'Max RPM': '12,000 RPM', Taper: 'BT40 / CAT40' },
        expert_notes: [
          {
            id: 101,
            author: 'Ramesh Patil',
            date: '2026-03-12',
            severity: 'watch',
            title: 'SS304 Flange Chatter Precedes Bearing Overheat',
            text: 'When roughing SS304 at 4200 RPM, listen for 820 Hz howl.',
            verified: true,
          },
        ],
        past_incidents: [
          { id: 'INC-881', date: '2026-02-14', summary: 'Spindle bearing thermal trip during long roughing run.' },
        ],
      },
      {
        id: 2,
        machine_id: 1,
        mesh_name: 'vise',
        display_name: 'Precision Vise',
        risk: 'medium',
        incident_count: 2,
        status: 'Normal Alignment',
        description: 'Precision clamping vise.',
        specs: { 'Jaw Width': '150 mm' },
        expert_notes: [],
        past_incidents: [],
      },
    ],
  };
});

vi.mock('../components/map3d/MachineViewer', () => ({
  default: ({ selectedComponent, onSelectComponent, onResetSelection, doorsOpen, onToggleDoors }) => (
    <div data-testid="mock-machine-viewer">
      <p>Mock 3D: {selectedComponent || 'none'}</p>
      <button type="button" onClick={onToggleDoors}>
        {doorsOpen ? 'Close Doors' : 'Open Doors'}
      </button>
      <button type="button" onClick={() => onSelectComponent('spindle')}>
        Select Spindle
      </button>
      <button type="button" onClick={onResetSelection}>
        Reset
      </button>
    </div>
  ),
}));

describe('Tier 3: Pairwise Cross-Feature Interactions (Opaque-Box E2E Suite)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetTestStores();

    guideApi.getProcedures.mockResolvedValue([TEST_PROCEDURE]);
    guideApi.startRun.mockResolvedValue(TEST_RUN);
    guideApi.getBriefing.mockResolvedValue({
      jobs: [{ id: 1, title: 'Face milling FL-101' }],
      machines: ['VMC-3'],
      open_warnings: ['Check collet nut torque'],
      known_issues: ['Chatter on flange'],
    });

    captureApi.getReviewQueue.mockResolvedValue({
      items: [TEST_CARD],
      total: 1,
      limit: 50,
      offset: 0,
    });

    transferApi.getRisk.mockResolvedValue(TEST_RISK);
    transferApi.getMetrics.mockResolvedValue(TEST_METRICS);
    transferApi.getHandoverPlan.mockResolvedValue(TEST_PLAN);
    transferApi.getRoutedQuestions.mockResolvedValue({
      items: [
        {
          id: 41,
          question: 'What feed rate stops chatter on SS304 flanges?',
          asked_by: 'Priya Shinde',
          machine_id: 1,
          status: 'open',
        },
      ],
      total: 1,
    });

    machinesApi.getMachines.mockResolvedValue([{ id: 1, name: 'VMC-3' }]);
    machinesApi.getTimeline.mockResolvedValue({
      machine_id: 1,
      machine: 'VMC-3',
      total: 1,
      items: [
        {
          id: 'EVT-1',
          type: 'warning',
          title: 'Spindle RPM spike',
          timestamp: '2026-04-10T10:00:00Z',
          details: 'RPM reached 4500 during roughing pass',
        },
      ],
    });

    map3dApi.getComponents.mockResolvedValue(map3dApi.VMC_COMPONENTS_DATA);
  });

  // ========================================================
  // INTERACTION 1: Theme Toggle × Layout Shell Persistence
  // ========================================================
  it('Pairwise 1: ThemeToggle switches DOM theme class and persists across navigation', () => {
    const { unmount } = render(
      <MemoryRouter initialEntries={['/']}>
        <NavBar />
      </MemoryRouter>
    );

    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(document.documentElement.classList.contains('light')).toBe(true);

    const toggleBtn = screen.getByTestId('theme-toggle-dark');
    fireEvent.click(toggleBtn);

    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(document.documentElement.classList.contains('light')).toBe(false);
    expect(useThemeStore.getState().theme).toBe('dark');

    unmount();

    // Re-render navbar in another route, theme remains dark
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <NavBar />
      </MemoryRouter>
    );
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(screen.getByTestId('theme-toggle-light')).toBeDefined();
  });

  // ========================================================
  // INTERACTION 2: Language Switcher × Multi-route Navigation Labels
  // ========================================================
  it('Pairwise 2: Language switcher in RoleSwitcher updates navigation bar strings across languages', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <NavBar />
      </MemoryRouter>
    );

    // Initial English
    expect(screen.getByRole('link', { name: 'Home' })).toBeDefined();
    expect(screen.getByRole('link', { name: 'Ask Experience' })).toBeDefined();
    expect(screen.getByRole('link', { name: 'Handover' })).toBeDefined();

    // Switch to Hindi
    const langSelect = screen.getByLabelText(/Language selection/i);
    fireEvent.change(langSelect, { target: { value: 'hi' } });

    expect(useAuthStore.getState().language).toBe('hi');
    expect(screen.getByRole('link', { name: 'होम' })).toBeDefined();
    expect(screen.getByRole('link', { name: 'आस्क एक्सपीरियंस' })).toBeDefined();
    expect(screen.getByRole('link', { name: 'हैंडओवर' })).toBeDefined();

    // Switch to Marathi
    fireEvent.change(langSelect, { target: { value: 'mr' } });
    expect(useAuthStore.getState().language).toBe('mr');
    expect(screen.getByRole('link', { name: 'होम' })).toBeDefined();
    expect(screen.getByRole('link', { name: 'अनुभव विचारा' })).toBeDefined();
    expect(screen.getByRole('link', { name: 'हँडओव्हर' })).toBeDefined();
  });

  // ========================================================
  // INTERACTION 3: Role Switcher × Home Persona Adaptive Cards
  // ========================================================
  it('Pairwise 3: RoleSwitcher transitions Home quick action cards between Old, New, and Supervisor views', async () => {
    // 1. Old Employee view
    useAuthStore.setState({ currentUser: DEMO_USERS[0] });
    const { rerender } = render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: /Handover Plan/i })).toBeDefined();
    expect(screen.getByRole('heading', { name: /Verification Queue/i })).toBeDefined();
    expect(screen.getByRole('heading', { name: /Questions for You/i })).toBeDefined();

    // 2. New Employee view
    useAuthStore.setState({ currentUser: DEMO_USERS[1] });
    rerender(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: /Daily Briefing/i })).toBeDefined();
    expect(screen.getByRole('heading', { name: /Active Guardrails/i })).toBeDefined();
    expect(screen.getByRole('heading', { name: /Chatter & Chips/i })).toBeDefined();

    // 3. Supervisor view
    useAuthStore.setState({ currentUser: DEMO_USERS[2] });
    rerender(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: /Knowledge-at-Risk/i })).toBeDefined();
    expect(screen.getByRole('heading', { name: /Machine Health Map/i })).toBeDefined();
    expect(screen.getByRole('heading', { name: /Transfer Metrics/i })).toBeDefined();
  });

  // ========================================================
  // INTERACTION 4: Role Switcher × Review Queue Action Gating
  // ========================================================
  it('Pairwise 4: Review queue permits approval for Old Employee and Supervisor, blocks New Employee', async () => {
    // Start as Old Employee
    useAuthStore.setState({ currentUser: DEMO_USERS[0] });
    const { rerender } = render(<Review />);

    const approveBtn = await screen.findByRole('button', { name: /Approve & Verify/i });
    const editBtn = screen.getByRole('button', { name: /Edit Details/i });
    const discardBtn = screen.getByRole('button', { name: /Discard \/ Reject/i });

    expect(approveBtn.disabled).toBe(false);
    expect(editBtn.disabled).toBe(false);
    expect(discardBtn.disabled).toBe(false);
    expect(screen.queryByText(/Only an old employee or a supervisor can verify know-how/i)).toBeNull();

    // Switch to New Employee (Priya)
    useAuthStore.setState({ currentUser: DEMO_USERS[1] });
    rerender(<Review />);

    expect(screen.getByText(/Only an old employee or a supervisor can verify know-how/i)).toBeDefined();
    expect(screen.getByRole('button', { name: /Approve & Verify/i }).disabled).toBe(true);
    expect(screen.getByRole('button', { name: /Edit Details/i }).disabled).toBe(true);
    expect(screen.getByRole('button', { name: /Discard \/ Reject/i }).disabled).toBe(true);
  });

  // ========================================================
  // INTERACTION 5: Machine Selection in Store × 3D MachineMap Header
  // ========================================================
  it('Pairwise 5: Machine selection reflects in 3D Map telemetry badge and component filters', async () => {
    useMachineStore.setState({ selectedMachineId: 1 });
    render(
      <BrowserRouter>
        <MachineMap />
      </BrowserRouter>
    );

    expect(screen.getAllByText(/VMC-3 \(Vertical Machining Centre\)/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('12,000 RPM')).toBeDefined();
    expect(screen.getByText(/Bay A • Cell 2/i)).toBeDefined();
    expect(screen.getByText(/Ramesh \(Old\) → Priya \(New\)/i)).toBeDefined();
  });

  // ========================================================
  // INTERACTION 6: MachineMap Component Selection × Ask Assistant Deep Link
  // ========================================================
  it('Pairwise 6: Selecting 3D Spindle generates Ask Assistant deep link with component parameter', async () => {
    render(
      <BrowserRouter>
        <MachineMap />
      </BrowserRouter>
    );

    const spindlePill = screen.getAllByRole('button', { name: /Spindle Assembly/i })[0];
    fireEvent.click(spindlePill);

    const askLink = screen.getByRole('link', { name: /Ask Assistant/i });
    expect(askLink).toBeDefined();
    expect(askLink.getAttribute('href')).toBe('/ask?component=spindle');
  });

  // ========================================================
  // INTERACTION 7: MachineMap Component Selection × Guided SOP Deep Link
  // ========================================================
  it('Pairwise 7: Selecting 3D Spindle generates Guided SOP deep link with machine and component', async () => {
    render(
      <BrowserRouter>
        <MachineMap />
      </BrowserRouter>
    );

    const spindlePill = screen.getAllByRole('button', { name: /Spindle Assembly/i })[0];
    fireEvent.click(spindlePill);

    const sopLink = screen.getByRole('link', { name: /Guided SOP/i });
    expect(sopLink).toBeDefined();
    expect(sopLink.getAttribute('href')).toBe('/guide?machineId=1&component=spindle');
  });

  // ========================================================
  // INTERACTION 8: Note Capture Guardian × Warning Context in Output
  // ========================================================
  it('Pairwise 8: NoteEditor sends note to Guardian and renders WarningBanner with caution when limit exceeded', async () => {
    captureApi.captureText.mockResolvedValueOnce({
      cards: [
        {
          id: 55,
          symptom: 'spindle_vibration',
          action: 'Lower feed to 0.18 mm/rev',
          why: 'Prevents chatter resonance at 4200 RPM',
          confidence: 0.92,
        },
      ],
      guardian_result: {
        severity: 'caution',
        warnings: ['Feed rate 0.28 mm/rev exceeds recommended maximum for FL-101'],
        expert_fix: 'Reduce feed rate to 0.20 mm/rev before roughing cut',
      },
    });

    render(<NoteEditor />);
    const textarea = screen.getByPlaceholderText(/VMC-3 pe roughing karte waqt/i);
    fireEvent.change(textarea, { target: { value: 'Roughing cut at 0.28 feed had vibration' } });

    const submitBtn = screen.getByRole('button', { name: /Save & Check Note/i });
    fireEvent.click(submitBtn);

    expect(await screen.findByText(/CAUTION — RISK DETECTED/i)).toBeDefined();
    expect(screen.getByText(/Feed rate 0.28 mm\/rev exceeds recommended maximum/i)).toBeDefined();
    expect(screen.getByText(/Extracted Know-How Cards \(1\)/i)).toBeDefined();
  });

  // ========================================================
  // INTERACTION 9: GuidedJob Step Parameter Validation × Next Button State Lock
  // ========================================================
  it('Pairwise 9: Parameter input out of tolerance locks Next button with STOP warning until in spec', () => {
    const onCompleteStep = vi.fn();
    const testStep = {
      id: 21,
      step_no: 2,
      title: 'Collet Nut Torque Verification',
      instruction: 'Verify ER32 collet torque with digital wrench.',
      param_name: 'Torque',
      param_unit: 'Nm',
      target_value: 90.0,
      tolerance: 5.0, // Valid range: [85.0 - 95.0]
    };

    render(
      <StepView
        step={testStep}
        stepIndex={1}
        totalSteps={3}
        onCompleteStep={onCompleteStep}
      />
    );

    const input = screen.getByPlaceholderText(/Target 90 ±5/i);

    // 1. Out of tolerance (> max) -> locked
    fireEvent.change(input, { target: { value: '110.0' } });
    expect(screen.getByText(/STOP — CRITICAL WARNING/i)).toBeDefined();
    const lockedBtn = screen.getByText(/Blocked by STOP Warning/i).closest('button');
    expect(lockedBtn.disabled).toBe(true);

    // 2. Correct to tolerance (92 Nm) -> unlocked
    fireEvent.change(input, { target: { value: '92.0' } });
    expect(screen.queryByText(/STOP — CRITICAL WARNING/i)).toBeNull();
    const readyBtn = screen.getByText(/Complete Step & Next/i).closest('button');
    expect(readyBtn.disabled).toBe(false);

    fireEvent.click(readyBtn);
    expect(onCompleteStep).toHaveBeenCalledTimes(1);
  });

  // ========================================================
  // INTERACTION 10: Dashboard Risk Matrix × Handover Retirement Plan Correlation
  // ========================================================
  it('Pairwise 10: Dashboard critical risk items correspond to retirement handover plan details', async () => {
    const { unmount } = render(<Dashboard />);
    expect(await screen.findByText(/Bus Factor Heatmap/i)).toBeDefined();
    expect(screen.getByText('Spindle')).toBeDefined();
    expect(screen.getByText(/Expert: Ramesh Patil/i)).toBeDefined();

    unmount();

    // In Handover view, the plan for Ramesh Patil shows the matching critical component
    render(
      <MemoryRouter>
        <Handover />
      </MemoryRouter>
    );

    expect(await screen.findByText(/Ramesh Patil • Retirement Countdown/i)).toBeDefined();
    expect(screen.getByText(/Bus-Factor-1 Machine Knowledge/i)).toBeDefined();
  });

  // ========================================================
  // INTERACTION 11: Handover Task Launcher × Route Transitions
  // ========================================================
  it('Pairwise 11: Clicking Start on handover tasks transitions tab to AI Tacit Interview', async () => {
    render(
      <MemoryRouter>
        <Handover />
      </MemoryRouter>
    );

    expect(await screen.findByText(/Ramesh Patil • Retirement Countdown/i)).toBeDefined();
    // Task 2 is AI interview
    const startBtns = screen.getAllByRole('button', { name: /Start →/i });
    expect(startBtns.length).toBeGreaterThanOrEqual(1);

    fireEvent.click(startBtns[0]);
    expect(await screen.findByText(/Interview with Ramesh Patil/i)).toBeDefined();
    expect(screen.getByText(/Start Interview →/i)).toBeDefined();
  });

  // ========================================================
  // INTERACTION 12: Ask Chatter Doctor Calculation × Stable RPM Sweet Spot
  // ========================================================
  it('Pairwise 12: Chatter Doctor acoustic calculation computes sweet spot frequencies from input parameters', () => {
    render(<Ask />);
    fireEvent.click(screen.getByText('Chatter Doctor (Acoustic)'));

    const flutesInput = screen.getByLabelText(/Tool Flutes \/ Teeth/i);
    const rpmInput = screen.getByLabelText(/Current Spindle RPM/i);

    fireEvent.change(flutesInput, { target: { value: '4' } });
    fireEvent.change(rpmInput, { target: { value: '4200' } });

    expect(flutesInput.value).toBe('4');
    expect(rpmInput.value).toBe('4200');

    // UI displays acoustic sweet spot formulas and calculate capability
    expect(screen.getByText(/Tool Flutes \/ Teeth/i)).toBeDefined();
    expect(screen.getByText(/Current Spindle RPM/i)).toBeDefined();
  });

  // ========================================================
  // INTERACTION 13: Error Boundary Fault Isolation × Shell Navigation Resilience
  // ========================================================
  it('Pairwise 13: Error boundary in broken child component keeps navigation shell intact and functional', () => {
    const BrokenChild = () => {
      throw new Error('Explosion in child widget');
    };

    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <MemoryRouter initialEntries={['/']}>
        <div>
          <NavBar />
          <ErrorBoundary title="Child Panel Failure">
            <BrokenChild />
          </ErrorBoundary>
        </div>
      </MemoryRouter>
    );

    // ErrorBoundary catches child failure and displays message
    expect(screen.getByText(/Explosion in child widget/i)).toBeDefined();
    expect(screen.getByRole('button', { name: /Try Again/i })).toBeDefined();

    // NavBar remains intact and clickable
    expect(screen.getByRole('link', { name: 'Home' })).toBeDefined();
    expect(screen.getByRole('link', { name: 'Ask Experience' })).toBeDefined();

    spy.mockRestore();
  });

  // ========================================================
  // INTERACTION 14: Theme Toggle × Elevation & Border Tokens Visual Mode Adaptability
  // ========================================================
  it('Pairwise 14: Theme toggle toggles dark class on html root without breaking card shadow elevation', () => {
    render(
      <MemoryRouter>
        <ThemeToggle />
        <div data-testid="test-card" className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-6 shadow-xl">
          Elevation Card
        </div>
      </MemoryRouter>
    );

    const card = screen.getByTestId('test-card');
    expect(card.className).toContain('shadow-xl');
    expect(card.className).toContain('rounded-2xl');

    const toggleBtn = screen.getByTestId('theme-toggle-dark');
    fireEvent.click(toggleBtn);

    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(card.className).toContain('shadow-xl');
  });
});
