import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';

import NavBar from '../components/layout/NavBar';
import Home from '../pages/Home';
import Dashboard from '../pages/Dashboard';
import MachineMap from '../pages/MachineMap';
import GuidedJob from '../pages/GuidedJob';
import Handover from '../pages/Handover';
import Review from '../pages/Review';

import { useAuthStore, DEMO_USERS } from '../store/useAuthStore';
import * as guideApi from '../api/guide';
import * as captureApi from '../api/capture';
import * as transferApi from '../api/transfer';
import * as machinesApi from '../api/machines';
import * as map3dApi from '../api/map3d';
import * as askApi from '../api/ask';

import {
  TEST_PROCEDURE,
  TEST_RUN,
  TEST_RISK,
  TEST_METRICS,
  TEST_PLAN,
  TEST_CARD,
  TEST_ANSWER,
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

describe('Tier 4: Real-World Application Scenarios (Opaque-Box E2E Suite)', () => {
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
    transferApi.getRoutedQuestions.mockResolvedValue({ items: [], total: 0 });

    machinesApi.getMachines.mockResolvedValue([{ id: 1, name: 'VMC-3' }]);
    machinesApi.getTimeline.mockResolvedValue({
      machine_id: 1,
      machine: 'VMC-3',
      total: 1,
      items: [
        {
          id: 'EVT-1',
          kind: 'warning',
          summary: 'Spindle RPM spike',
          occurred_at: '2026-04-10T10:00:00Z',
        },
      ],
    });

    map3dApi.getComponents.mockResolvedValue(map3dApi.VMC_COMPONENTS_DATA);
  });

  // =========================================================================
  // SCENARIO 1: Technician Guided Maintenance & Safety Parameter Interlock
  // =========================================================================
  it('Scenario 1: New technician executes Guided SOP, triggers STOP on out-of-tolerance, corrects parameter and completes job', async () => {
    useAuthStore.setState({ currentUser: DEMO_USERS[1] }); // Priya Shinde (New Employee)

    // Setup step record mock transitions
    guideApi.recordStep
      .mockResolvedValueOnce({
        can_continue: true,
        next_step_no: 2,
        run_status: 'in_progress',
        warnings: [],
      })
      .mockResolvedValueOnce({
        can_continue: true,
        next_step_no: null,
        run_status: 'done',
        warnings: [],
      });

    render(<GuidedJob />);

    // Step A: Select procedure and click Start Guided Run
    expect(await screen.findByText(/Face milling FL-101 flange on VMC-3/i)).toBeDefined();
    const startBtn = screen.getByRole('button', { name: /Start Guided Run →/i });
    fireEvent.click(startBtn);

    // Step B: Step 1 active: Clamp FL-101 in the vise
    expect(await screen.findByText(/Clamp FL-101 in the vise/i)).toBeDefined();
    expect(screen.getByText(/Feel under the parallels for chips/i)).toBeDefined();
    expect(screen.getByText(/Ramesh Patil’s Shop-Floor Tip/i)).toBeDefined();

    // Step C: Complete Step 1
    const nextBtn1 = screen.getByRole('button', { name: /Complete Step & Next/i });
    fireEvent.click(nextBtn1);

    // Step D: Step 2 active: Check stick-out (target 12.0 ± 0.5 mm -> [11.5 - 12.5])
    expect(await screen.findByText(/Check stick-out/i)).toBeDefined();
    const input = screen.getByPlaceholderText(/Target 12 ±0.5/i);

    // Step E: Operator enters out-of-tolerance measurement 15.0 mm (> 12.5 max)
    fireEvent.change(input, { target: { value: '15.0' } });
    expect(screen.getByText(/STOP — CRITICAL WARNING/i)).toBeDefined();
    expect(screen.getByText(/Measurement 15 is out of tolerance/i)).toBeDefined();

    // Verify interlock: Next button is locked
    const lockedBtn = screen.getByText(/Blocked by STOP Warning/i).closest('button');
    expect(lockedBtn.disabled).toBe(true);

    // Step F: Operator corrects stick-out to 12.1 mm
    fireEvent.change(input, { target: { value: '12.1' } });
    expect(screen.queryByText(/STOP — CRITICAL WARNING/i)).toBeNull();

    // Next button unlocks
    const readyBtn = screen.getByText(/Complete Run/i).closest('button');
    expect(readyBtn.disabled).toBe(false);
    fireEvent.click(readyBtn);

    // Step G: Job successfully completed
    expect(await screen.findByText(/Setup Run Completed Successfully!/i)).toBeDefined();
    expect(screen.getByText(/All 2 steps of Face milling FL-101 flange on VMC-3 are recorded/i)).toBeDefined();
  });

  // =========================================================================
  // SCENARIO 2: Retiring Senior Machinist Handover & Tacit Know-How Capture
  // =========================================================================
  it('Scenario 2: Retiring senior employee completes tacit interview, capturing audio know-how into verified card', async () => {
    useAuthStore.setState({ currentUser: DEMO_USERS[0] }); // Ramesh Patil (Old Employee)

    transferApi.startInterview.mockResolvedValueOnce({
      id: 88,
      employee_id: 1,
      machine_id: 1,
      status: 'open',
      mode: 'live',
      questions: [
        {
          id: 1,
          text: 'What unusual vibration cues warn of spindle bearing failure on VMC-3?',
          reason: 'No card covers acoustic warning before thermal trip',
          answered: false,
        },
      ],
    });

    transferApi.answerInterview.mockResolvedValueOnce({
      session_id: 88,
      question_id: 1,
      remaining: 0,
      card: {
        id: 77,
        title: 'Spindle bearing acoustic vibration',
        machine: 'VMC-3',
        action: 'Listen for high-pitch 820 Hz howl above 4000 RPM; check coolant nozzle alignment before bearing damage.',
        confidence: 0.95,
      },
    });

    render(
      <MemoryRouter>
        <Handover />
      </MemoryRouter>
    );

    // Step A: View Retirement Countdown Banner
    expect(await screen.findByText(/Ramesh Patil • Retirement Countdown/i)).toBeDefined();
    expect(screen.getByText(/213 days left/i)).toBeDefined();
    expect(screen.getByText(/Bus-Factor-1 Machine Knowledge/i)).toBeDefined();

    // Step B: Switch to AI Tacit Interview tab
    fireEvent.click(screen.getByText(/AI Tacit Interview/i));
    const launchBtn = await screen.findByText(/Start Interview →/i);
    fireEvent.click(launchBtn);

    // Step C: Question appears from AI Interview engine
    expect(await screen.findByText(/What unusual vibration cues warn of spindle bearing failure/i)).toBeDefined();

    // Step D: Senior machinist provides answer
    const answerInput = screen.getByLabelText(/Your Answer/i);
    fireEvent.change(answerInput, {
      target: {
        value: 'Listen for high-pitch 820 Hz howl above 4000 RPM; check coolant nozzle alignment before bearing damage.',
      },
    });

    // Step E: Save & Publish Card
    const publishBtn = screen.getByRole('button', { name: /Save & Publish Card/i });
    fireEvent.click(publishBtn);

    // Step F: Verified card created and added to verified cards
    expect(await screen.findByText('Spindle bearing acoustic vibration')).toBeDefined();
    expect(screen.getByText(/Verified by Ramesh/i)).toBeDefined();
  });

  // =========================================================================
  // SCENARIO 3: Spatial Machine Inspection, Failure Diagnostics & Assistant Escalation
  // =========================================================================
  it('Scenario 3: Operator inspects 3D MachineMap, toggles enclosure doors, checks INC-881 and escalates to Ask Assistant', async () => {
    askApi.askQuestion.mockResolvedValueOnce(TEST_ANSWER);

    render(
      <BrowserRouter>
        <MachineMap />
      </BrowserRouter>
    );

    // Step A: Inspect 3D Map Header & Telemetry
    expect(screen.getAllByText(/VMC-3 \(Vertical Machining Centre\)/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('12,000 RPM')).toBeDefined();
    expect(screen.getByText(/Bay A • Cell 2/i)).toBeDefined();

    // Step B: Toggle Enclosure Doors
    const doorsBtn = screen.getByRole('button', { name: /Open Doors/i });
    fireEvent.click(doorsBtn);
    expect(screen.getByRole('button', { name: /Close Doors/i })).toBeDefined();

    // Step C: Select Spindle Assembly
    const spindlePill = screen.getAllByRole('button', { name: /Spindle Assembly/i })[0];
    fireEvent.click(spindlePill);

    // Step D: Inspect component know-how and failure logs
    expect(screen.getByRole('heading', { name: 'Spindle Assembly' })).toBeDefined();
    expect(screen.getByText(/High-speed precision cartridge spindle/i)).toBeDefined();
    expect(screen.getByText('INC-881')).toBeDefined();
    expect(screen.getByText(/Spindle bearing thermal trip during long roughing run/i)).toBeDefined();
    expect(screen.getByText(/SS304 Flange Chatter Precedes Bearing Overheat/i)).toBeDefined();

    // Step E: Deep-link to Ask Assistant
    const askLink = screen.getByRole('link', { name: /Ask Assistant/i });
    expect(askLink.getAttribute('href')).toBe('/ask?component=spindle');
  });

  // =========================================================================
  // SCENARIO 4: Shift Supervisor Plant Audit, Risk Heatmap & Review Sign-Off
  // =========================================================================
  it('Scenario 4: Shift Supervisor audits plant risk heatmap, checks ROI metrics, and approves card in Review Queue', async () => {
    useAuthStore.setState({ currentUser: DEMO_USERS[2] }); // Anil Kulkarni (Supervisor)

    captureApi.reviewCard.mockResolvedValueOnce({
      card: {
        ...TEST_CARD,
        action: 'Nozzle was blocked with aluminum chips, cleared orifice and finish improved.',
        verified_by: 'Anil Kulkarni',
      },
    });

    const { unmount } = render(<Dashboard />);

    // Step A: Supervisor checks Knowledge Risk Heatmap
    expect(await screen.findByText(/Bus Factor Heatmap/i)).toBeDefined();
    expect(screen.getByText('Spindle')).toBeDefined();
    expect(screen.getByText(/BF: 0/i)).toBeDefined();

    // Step B: Supervisor checks Transfer & Quality ROI
    fireEvent.click(screen.getByText(/Transfer & Quality ROI/i));
    expect(await screen.findByText(/Executive Transfer ROI/i)).toBeDefined();
    expect(screen.getByText(/74%/i)).toBeDefined();
    expect(screen.getByText(/40 Verified Cards/i)).toBeDefined();

    // Step C: Supervisor checks Machine Event Stream
    fireEvent.click(screen.getByText(/Machine Event Stream/i));
    expect(await screen.findByText(/Machine Event Timeline/i)).toBeDefined();
    expect(screen.getByText(/Spindle RPM spike/i)).toBeDefined();

    unmount();

    // Step D: Supervisor navigates to Review Queue to audit and verify cards
    render(<Review />);
    expect(await screen.findByText(/1 Cards Pending Verification/i)).toBeDefined();
    expect(screen.getByText(/Cleaned coolant nozzle/i)).toBeDefined();

    // Step E: Supervisor edits details with engineering justification
    fireEvent.click(screen.getByRole('button', { name: /Edit Details/i }));
    const actionInput = screen.getByDisplayValue(/Nozzle was blocked/i);
    fireEvent.change(actionInput, {
      target: { value: 'Nozzle was blocked with aluminum chips, cleared orifice and finish improved.' },
    });

    // Step F: Supervisor approves and verifies card
    fireEvent.click(screen.getByRole('button', { name: /Save Changes & Approve/i }));

    expect(
      await screen.findByText(/Card #31 was verified and published to the plant knowledge base!/i)
    ).toBeDefined();
    expect(screen.getByText(/Recently Verified Cards/i)).toBeDefined();
  });

  // =========================================================================
  // SCENARIO 5: Multilingual Operator Onboarding & Role-Based Persona Traversal
  // =========================================================================
  it('Scenario 5: Operator onboards through Hindi, Marathi, and English, switching roles smoothly with complete isolation', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <div>
          <NavBar />
          <Home />
        </div>
      </MemoryRouter>
    );

    // Step A: Start in English as New Employee
    const userSelect = screen.getByLabelText(/Select Demo User and Role/i);
    const langSelect = screen.getByLabelText(/Language selection/i);

    fireEvent.change(userSelect, { target: { value: '2' } }); // Priya Shinde (New)
    expect(useAuthStore.getState().currentUser.role).toBe('new_employee');
    expect(screen.getByRole('heading', { name: /Daily Briefing/i })).toBeDefined();

    // Step B: Switch to Hindi
    fireEvent.change(langSelect, { target: { value: 'hi' } });
    expect(useAuthStore.getState().language).toBe('hi');
    expect(screen.getByRole('link', { name: 'होम' })).toBeDefined();
    expect(screen.getByRole('link', { name: 'आस्क एक्सपीरियंस' })).toBeDefined();

    // Step C: Switch to Marathi
    fireEvent.change(langSelect, { target: { value: 'mr' } });
    expect(useAuthStore.getState().language).toBe('mr');
    expect(screen.getByRole('link', { name: 'होम' })).toBeDefined();
    expect(screen.getByRole('link', { name: 'अनुभव विचारा' })).toBeDefined();

    // Step D: Switch back to English and transition to Supervisor
    fireEvent.change(langSelect, { target: { value: 'en' } });
    fireEvent.change(userSelect, { target: { value: '4' } }); // Anil Kulkarni (Supervisor)
    expect(useAuthStore.getState().currentUser.role).toBe('supervisor');
    expect(screen.getByRole('heading', { name: /Knowledge-at-Risk/i })).toBeDefined();
    expect(screen.getByRole('heading', { name: /Transfer Metrics/i })).toBeDefined();

    // Step E: Transition to Old Employee
    fireEvent.change(userSelect, { target: { value: '1' } }); // Ramesh Patil (Old)
    expect(useAuthStore.getState().currentUser.role).toBe('old_employee');
    expect(screen.getByRole('heading', { name: /Handover Plan/i })).toBeDefined();
    expect(screen.getByRole('heading', { name: /Verification Queue/i })).toBeDefined();
  });
});
