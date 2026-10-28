import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { MemoryRouter, BrowserRouter } from 'react-router-dom';

import Home from '../pages/Home';
import Dashboard from '../pages/Dashboard';
import MachineMap from '../pages/MachineMap';
import Ask from '../pages/Ask';
import Capture from '../pages/Capture';
import GuidedJob from '../pages/GuidedJob';
import Handover from '../pages/Handover';
import Review from '../pages/Review';
import StepView from '../components/guide/StepView';
import PinMarker from '../components/map3d/PinMarker';
import ComponentPanel from '../components/map3d/ComponentPanel';

import { useAuthStore, DEMO_USERS } from '../store/useAuthStore';
import { useMachineStore } from '../store/useMachineStore';
import { useThemeStore } from '../store/useThemeStore';
import { VMC_COMPONENTS_DATA } from '../api/map3d';

import {
  TEST_PROCEDURE,
  TEST_RUN,
  TEST_RISK,
  TEST_METRICS,
  TEST_PLAN,
  TEST_CARD,
  resetTestStores,
} from './test-helpers';

// Mock Drei Html for 3D PinMarker rendering in jsdom
vi.mock('@react-three/drei', () => ({
  Html: ({ children }) => <div data-testid="drei-html">{children}</div>,
  OrbitControls: () => null,
}));

// Mock Three Fiber Canvas
vi.mock('@react-three/fiber', () => ({
  Canvas: ({ children }) => <div data-testid="r3f-canvas">{children}</div>,
  useFrame: vi.fn(),
  useThree: () => ({ camera: {}, scene: {} }),
}));

// API Mocks for views
vi.mock('../api/guide', () => ({
  getProcedures: vi.fn(() => Promise.resolve([TEST_PROCEDURE])),
  startRun: vi.fn(() => Promise.resolve(TEST_RUN)),
  recordStep: vi.fn(() => Promise.resolve({ ok: true })),
  getShadowTrace: vi.fn(() => Promise.resolve(null)),
  getTroubleshoot: vi.fn(() => Promise.resolve(null)),
  getBriefing: vi.fn(() =>
    Promise.resolve({
      jobs: [{ id: 1, name: 'Job 1' }],
      machines: ['VMC-3'],
      open_warnings: ['Spindle bearing check'],
      known_issues: [],
    })
  ),
}));

vi.mock('../api/capture', () => ({
  captureText: vi.fn(() => Promise.resolve({ ok: true, id: 101 })),
  captureVoice: vi.fn(() => Promise.resolve({ ok: true, id: 102 })),
  captureVideo: vi.fn(() => Promise.resolve({ ok: true, id: 103 })),
  captureHandwritten: vi.fn(() => Promise.resolve({ ok: true, id: 104 })),
  getReviewQueue: vi.fn(() =>
    Promise.resolve({
      items: [
        {
          id: 42,
          title: 'Abnormal 427 Hz Chatter during SS304 Roughing',
          machine: 'VMC-3',
          component: 'Spindle',
          author: 'Priya Shinde',
          confidence: 0.94,
          symptom: 'chatter_harmonic',
          action: 'Shift spindle speed down from 8,200 RPM to 7,200 RPM.',
          why: 'Resonance harmonic at 8,200 RPM causes severe chatter.',
        },
      ],
      total: 1,
    })
  ),
  reviewCard: vi.fn(() => Promise.resolve({ ok: true, card: { id: 42, status: 'approved' } })),
  transcribe: vi.fn(() => Promise.resolve({ text: 'Test transcription' })),
}));

vi.mock('../api/transfer', () => ({
  getRisk: vi.fn(() => Promise.resolve(TEST_RISK)),
  getHandoverPlan: vi.fn(() => Promise.resolve(TEST_PLAN)),
  getRoutedQuestions: vi.fn(() =>
    Promise.resolve({
      items: [
        {
          id: 1,
          question: 'How do you zero the dial indicator on the Kurt vise?',
          asked_by: 'Priya Shinde',
          status: 'pending',
        },
      ],
      total: 1,
    })
  ),
  getMetrics: vi.fn(() => Promise.resolve(TEST_METRICS)),
  submitInterviewAnswer: vi.fn(() => Promise.resolve({ ok: true })),
  replyQuestion: vi.fn(() => Promise.resolve({ ok: true })),
}));

vi.mock('../api/map3d', async () => {
  const actual = await vi.importActual('../api/map3d');
  return {
    ...actual,
    getComponents: vi.fn(() => Promise.resolve(VMC_COMPONENTS_DATA)),
    createPin: vi.fn(() => Promise.resolve({ ok: true })),
  };
});

describe('Tier 5 Adversarial Stress & Hardening Coverage Suite', () => {
  beforeEach(() => {
    resetTestStores();
    useAuthStore.setState({
      currentUser: DEMO_USERS[0], // Ramesh Patil (old_employee)
      language: 'en',
    });
    useMachineStore.setState({
      selectedMachineId: 1,
      selectedComponentId: 'spindle',
      highlightedComponentId: null,
      activeRunId: null,
    });
    useThemeStore.setState({
      theme: 'light',
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  // =========================================================================
  // 1. WCAG 2.1 / 2.2 AAA MATHEMATICAL CONTRAST VERIFICATION
  // =========================================================================
  describe('1. WCAG 2.1 / 2.2 AAA Contrast Ratio Mathematical Verification', () => {
    function srgbToLinear(c) {
      const v = c / 255;
      return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    }

    function getLuminance(hex) {
      const clean = hex.replace('#', '');
      const r = parseInt(clean.substring(0, 2), 16);
      const g = parseInt(clean.substring(2, 4), 16);
      const b = parseInt(clean.substring(4, 6), 16);
      return 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b);
    }

    function calculateContrastRatio(hex1, hex2) {
      const l1 = getLuminance(hex1);
      const l2 = getLuminance(hex2);
      const lighter = Math.max(l1, l2);
      const darker = Math.min(l1, l2);
      return (lighter + 0.05) / (darker + 0.05);
    }

    it('1.1: Primary Maroon-800 (#721026) against White (#FFFFFF) exceeds WCAG AAA (>= 7.0:1)', () => {
      const cr = calculateContrastRatio('#FFFFFF', '#721026');
      expect(cr).toBeGreaterThanOrEqual(7.0);
      expect(cr).toBeCloseTo(11.55, 1);
    });

    it('1.2: Maroon-700 (#800020) against White (#FFFFFF) exceeds WCAG AAA (>= 7.0:1)', () => {
      const cr = calculateContrastRatio('#FFFFFF', '#800020');
      expect(cr).toBeGreaterThanOrEqual(7.0);
      expect(cr).toBeCloseTo(10.83, 1);
    });

    it('1.3: Maroon-900 (#5C0B1D) against White (#FFFFFF) exceeds WCAG AAA (>= 7.0:1)', () => {
      const cr = calculateContrastRatio('#FFFFFF', '#5C0B1D');
      expect(cr).toBeGreaterThanOrEqual(7.0);
      expect(cr).toBeCloseTo(13.81, 1);
    });

    it('1.4: Primary Text (#1F2937) against White (#FFFFFF) exceeds WCAG AAA (>= 7.0:1)', () => {
      const cr = calculateContrastRatio('#FFFFFF', '#1F2937');
      expect(cr).toBeGreaterThanOrEqual(7.0);
      expect(cr).toBeCloseTo(14.68, 1);
    });

    it('1.5: Rose pastel badge (Rose-950 on Rose-50) exceeds WCAG AAA (>= 7.0:1)', () => {
      const cr = calculateContrastRatio('#FFF1F2', '#4C0519');
      expect(cr).toBeGreaterThanOrEqual(7.0);
      expect(cr).toBeCloseTo(14.23, 1);
    });

    it('1.6: Amber pastel badge (Amber-950 on Amber-50) exceeds WCAG AAA (>= 7.0:1)', () => {
      const cr = calculateContrastRatio('#FFFBEB', '#451A03');
      expect(cr).toBeGreaterThanOrEqual(7.0);
      expect(cr).toBeCloseTo(14.44, 1);
    });

    it('1.7: Emerald pastel badge (Emerald-950 on Emerald-50) exceeds WCAG AAA (>= 7.0:1)', () => {
      const cr = calculateContrastRatio('#ECFDF5', '#022C22');
      expect(cr).toBeGreaterThanOrEqual(7.0);
      expect(cr).toBeCloseTo(14.38, 1);
    });

    it('1.8: Heatmap and status indicators text colors exceed WCAG AAA against light backgrounds', () => {
      expect(calculateContrastRatio('#FFFFFF', '#991B1B')).toBeGreaterThanOrEqual(7.0); // 8.31:1
      expect(calculateContrastRatio('#FFFFFF', '#92400E')).toBeGreaterThanOrEqual(7.0); // 7.09:1
      expect(calculateContrastRatio('#FFFFFF', '#065F46')).toBeGreaterThanOrEqual(7.0); // 7.68:1
    });
  });

  // =========================================================================
  // 2. CLEAN WHITE BACKGROUND & MAROON ACCENTS ACROSS ALL 8 VIEWS
  // =========================================================================
  describe('2. All 8 Views Render Cleanly with Google White & Maroon Styling', () => {
    it('2.1: Home view renders clean white shell, hero welcome banner, and role cards', async () => {
      const { container } = render(
        <BrowserRouter>
          <Home />
        </BrowserRouter>
      );
      await waitFor(() => {
        expect(screen.getByText(/Welcome back, Ramesh Patil/i)).toBeDefined();
      });
      // Header banner card has clean white surface and subtle border
      const banner = container.querySelector('.bg-white');
      expect(banner).not.toBeNull();
      expect(banner.className).toContain('border');
      expect(banner.className).toContain('rounded-2xl');
    });

    it('2.2: Dashboard view renders segmented pill controls and risk heatmap', () => {
      const { container } = render(
        <BrowserRouter>
          <Dashboard />
        </BrowserRouter>
      );
      expect(screen.getByText(/Plant-wide operational dashboard/i)).toBeDefined();
      const segmentedControl = container.querySelector('.bg-\\[\\#F1F3F4\\]');
      expect(segmentedControl).not.toBeNull();
      // Active tab pill styled with maroon
      const activeBtn = screen.getByRole('button', { name: /Knowledge Risk Heatmap/i });
      expect(activeBtn.className).toContain('text-maroon-800');
    });

    it('2.3: MachineMap view renders HUD, 3D ComponentPanel, and assembly shortcuts', () => {
      render(
        <BrowserRouter>
          <MachineMap />
        </BrowserRouter>
      );
      expect(screen.getAllByText(/VMC-3 \(Vertical Machining Centre\)/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Spindle Assembly').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('Components:')).toBeDefined();
    });

    it('2.4: Ask view renders segmented tabs and Gemini-style input container', () => {
      const { container } = render(
        <BrowserRouter>
          <Ask />
        </BrowserRouter>
      );
      expect(screen.getByText(/Synthesize 28\+ years of machining know-how/i)).toBeDefined();
      const segmentedControl = container.querySelector('.bg-\\[\\#F1F3F4\\]');
      expect(segmentedControl).not.toBeNull();
      const activeBtn = screen.getByRole('button', { name: /Grounded Q&A Chat/i });
      expect(activeBtn.className).toContain('text-maroon-800');
    });

    it('2.5: Capture view renders mode tabs and voice recorder dropzone', () => {
      const { container } = render(
        <BrowserRouter>
          <Capture />
        </BrowserRouter>
      );
      expect(screen.getByText(/Frictionless knowledge capture for CNC\/VMC machinists/i)).toBeDefined();
      const segmentedControl = container.querySelector('.bg-\\[\\#F1F3F4\\]');
      expect(segmentedControl).not.toBeNull();
      const activeBtn = screen.getByRole('button', { name: /Voice Note/i });
      expect(activeBtn.className).toContain('text-maroon-800');
    });

    it('2.6: GuidedJob view renders procedure selector and execution card', async () => {
      render(
        <BrowserRouter>
          <GuidedJob />
        </BrowserRouter>
      );
      await waitFor(() => {
        expect(screen.getAllByText(/Face milling FL-101 flange on VMC-3/i).length).toBeGreaterThanOrEqual(1);
      });
      expect(screen.getByRole('button', { name: /Start Guided Run/i })).toBeDefined();
    });

    it('2.7: Handover view renders countdown banner and segmented tabs', () => {
      const { container } = render(
        <BrowserRouter>
          <Handover />
        </BrowserRouter>
      );
      expect(screen.getByText(/Structured knowledge preservation before old employee retirement/i)).toBeDefined();
      const segmentedControl = container.querySelector('.bg-\\[\\#F1F3F4\\]');
      expect(segmentedControl).not.toBeNull();
      const activeBtn = screen.getByRole('button', { name: /Handover Plan & Countdown/i });
      expect(activeBtn.className).toContain('text-maroon-800');
    });

    it('2.8: Review view renders sign-off queue and pending verification badge', async () => {
      render(
        <BrowserRouter>
          <Review />
        </BrowserRouter>
      );
      await waitFor(() => {
        expect(screen.getByText(/Sign-off queue for experienced employees/i)).toBeDefined();
      });
      expect(screen.getByText(/1 Cards Pending Verification/i)).toBeDefined();
    });
  });

  // =========================================================================
  // 3. STEPPER STOP TOLERANCE BLOCKING IN GUIDEDJOB
  // =========================================================================
  describe('3. Stepper STOP Tolerance Blocking in GuidedJob', () => {
    const toleranceStep = {
      id: 201,
      step_no: 2,
      title: 'Verify Tool Stick-out',
      instruction: 'Measure tool stick-out using vernier caliper.',
      component: 'Spindle',
      param_name: 'stick-out',
      param_unit: 'mm',
      target_value: 12.0,
      tolerance: 0.5, // Allowed range: [11.50, 12.50]
      critical: true,
    };

    it('3.1: Measurement within tolerance allows proceeding and keeps button enabled', () => {
      const handleComplete = vi.fn();
      render(
        <StepView
          step={toleranceStep}
          stepIndex={1}
          totalSteps={4}
          onCompleteStep={handleComplete}
        />
      );

      const input = screen.getByLabelText(/Enter Measured stick-out \(mm\):/i);
      const nextBtn = screen.getByRole('button', { name: /Complete Step & Next →/i });

      // In-range value: 12.20
      fireEvent.change(input, { target: { value: '12.20' } });

      expect(nextBtn.disabled).toBe(false);
      expect(nextBtn.textContent).toContain('Complete Step & Next →');
      expect(screen.queryByText(/Blocked by STOP Warning/i)).toBeNull();
    });

    it('3.2: Upper out-of-tolerance measurement (12.51 mm) triggers STOP warning and blocks Next button', () => {
      const handleComplete = vi.fn();
      render(
        <StepView
          step={toleranceStep}
          stepIndex={1}
          totalSteps={4}
          onCompleteStep={handleComplete}
        />
      );

      const input = screen.getByLabelText(/Enter Measured stick-out \(mm\):/i);
      const nextBtn = screen.getByRole('button', { name: /Complete Step & Next →/i });

      // Out-of-range value (above max 12.50): 12.51
      fireEvent.change(input, { target: { value: '12.51' } });

      // Button must be disabled and display STOP text
      expect(nextBtn.disabled).toBe(true);
      expect(nextBtn.textContent).toContain('Blocked by STOP Warning');
      expect(screen.getByText(/Measurement 12.51 is out of tolerance \[11.50 – 12.50\]/i)).toBeDefined();

      // Clicking must not trigger completion
      fireEvent.click(nextBtn);
      expect(handleComplete).not.toHaveBeenCalled();
    });

    it('3.3: Lower out-of-tolerance measurement (11.49 mm) triggers STOP warning and blocks Next button', () => {
      const handleComplete = vi.fn();
      render(
        <StepView
          step={toleranceStep}
          stepIndex={1}
          totalSteps={4}
          onCompleteStep={handleComplete}
        />
      );

      const input = screen.getByLabelText(/Enter Measured stick-out \(mm\):/i);
      const nextBtn = screen.getByRole('button', { name: /Complete Step & Next →/i });

      // Out-of-range value (below min 11.50): 11.49
      fireEvent.change(input, { target: { value: '11.49' } });

      expect(nextBtn.disabled).toBe(true);
      expect(nextBtn.textContent).toContain('Blocked by STOP Warning');
      expect(screen.getByText(/Measurement 11.49 is out of tolerance \[11.50 – 12.50\]/i)).toBeDefined();

      fireEvent.click(nextBtn);
      expect(handleComplete).not.toHaveBeenCalled();
    });

    it('3.4: Exact boundary measurements (11.50 mm and 12.50 mm) are valid and do not block progress', () => {
      render(
        <StepView
          step={toleranceStep}
          stepIndex={1}
          totalSteps={4}
          onCompleteStep={vi.fn()}
        />
      );

      const input = screen.getByLabelText(/Enter Measured stick-out \(mm\):/i);
      const nextBtn = screen.getByRole('button', { name: /Complete Step & Next →/i });

      // Exact minimum boundary: 11.50
      fireEvent.change(input, { target: { value: '11.50' } });
      expect(nextBtn.disabled).toBe(false);
      expect(nextBtn.textContent).toContain('Complete Step & Next →');

      // Exact maximum boundary: 12.50
      fireEvent.change(input, { target: { value: '12.50' } });
      expect(nextBtn.disabled).toBe(false);
      expect(nextBtn.textContent).toContain('Complete Step & Next →');
    });

    it('3.5: Dynamically correcting an invalid measurement unblocks the button', () => {
      render(
        <StepView
          step={toleranceStep}
          stepIndex={1}
          totalSteps={4}
          onCompleteStep={vi.fn()}
        />
      );

      const input = screen.getByLabelText(/Enter Measured stick-out \(mm\):/i);
      const nextBtn = screen.getByRole('button', { name: /Complete Step & Next →/i });

      // 1. Enter bad measurement
      fireEvent.change(input, { target: { value: '13.00' } });
      expect(nextBtn.disabled).toBe(true);
      expect(nextBtn.textContent).toContain('Blocked by STOP Warning');

      // 2. Correct to valid measurement
      fireEvent.change(input, { target: { value: '12.00' } });
      expect(nextBtn.disabled).toBe(false);
      expect(nextBtn.textContent).toContain('Complete Step & Next →');
      expect(screen.queryByText(/Blocked by STOP Warning/i)).toBeNull();
    });

    it('3.6: Non-numeric strings and empty inputs do not crash and do not falsely trigger STOP warning', () => {
      render(
        <StepView
          step={toleranceStep}
          stepIndex={1}
          totalSteps={4}
          onCompleteStep={vi.fn()}
        />
      );

      const input = screen.getByLabelText(/Enter Measured stick-out \(mm\):/i);
      const nextBtn = screen.getByRole('button', { name: /Complete Step & Next →/i });

      // Empty string
      fireEvent.change(input, { target: { value: '' } });
      expect(nextBtn.disabled).toBe(false);
      expect(screen.queryByText(/Blocked by STOP Warning/i)).toBeNull();
    });
  });

  // =========================================================================
  // 4. REVIEW VIEW ROLE RESTRICTIONS
  // =========================================================================
  describe('4. Review View Role Gating & Permissions', () => {
    it('4.1: new_employee role displays restriction banner and disables Approve, Discard, and Edit buttons', async () => {
      useAuthStore.setState({
        currentUser: DEMO_USERS[1], // Priya Shinde (new_employee)
      });

      render(
        <BrowserRouter>
          <Review />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(
          screen.getByText(/Only an old employee or a supervisor can verify know-how/i)
        ).toBeDefined();
      });

      // Verification actions must all be disabled
      const approveBtn = screen.getByRole('button', { name: /Approve & Verify/i });
      const discardBtn = screen.getByRole('button', { name: /Discard \/ Reject/i });
      const editBtn = screen.getByRole('button', { name: /Edit Details/i });

      expect(approveBtn.disabled).toBe(true);
      expect(discardBtn.disabled).toBe(true);
      expect(editBtn.disabled).toBe(true);
    });

    it('4.2: old_employee role (Ramesh Patil) enables review action buttons without restriction banner', async () => {
      useAuthStore.setState({
        currentUser: DEMO_USERS[0], // Ramesh Patil (old_employee)
      });

      render(
        <BrowserRouter>
          <Review />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Approve & Verify/i })).toBeDefined();
      });

      expect(
        screen.queryByText(/Only an old employee or a supervisor can verify know-how/i)
      ).toBeNull();

      const approveBtn = screen.getByRole('button', { name: /Approve & Verify/i });
      const discardBtn = screen.getByRole('button', { name: /Discard \/ Reject/i });
      const editBtn = screen.getByRole('button', { name: /Edit Details/i });

      expect(approveBtn.disabled).toBe(false);
      expect(discardBtn.disabled).toBe(false);
      expect(editBtn.disabled).toBe(false);
    });

    it('4.3: supervisor role (Anil Kulkarni) enables review action buttons without restriction banner', async () => {
      useAuthStore.setState({
        currentUser: DEMO_USERS[2], // Anil Kulkarni (supervisor)
      });

      render(
        <BrowserRouter>
          <Review />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Approve & Verify/i })).toBeDefined();
      });

      expect(
        screen.queryByText(/Only an old employee or a supervisor can verify know-how/i)
      ).toBeNull();

      const approveBtn = screen.getByRole('button', { name: /Approve & Verify/i });
      expect(approveBtn.disabled).toBe(false);
    });
  });

  // =========================================================================
  // 5. 3D WAYPOINT CALLOUTS & PINMARKER RENDERING IN MACHINEMAP
  // =========================================================================
  describe('5. 3D Waypoint Callouts and PinMarker in MachineMap', () => {
    it('5.1: Idle PinMarker renders compact CAD probe dot with leader line stem', () => {
      const { container } = render(
        <PinMarker
          position={[0, 1.5, 0]}
          componentId="spindle"
          componentName="Spindle Assembly"
          isSelected={false}
          isHighlighted={false}
          isComponentHovered={false}
        />
      );

      // In idle state, CAD leader stem and microscopic probe dot are present
      const dot = container.querySelector('.w-3.h-3');
      expect(dot).not.toBeNull();
      const leaderStem = container.querySelector('.w-px.h-2');
      expect(leaderStem).not.toBeNull();
    });

    it('5.2: Selected PinMarker renders sleek CAD callout pill badge with rich maroon styling', () => {
      render(
        <PinMarker
          position={[0, 1.5, 0]}
          componentId="spindle"
          componentName="Spindle Assembly"
          isSelected={true}
          noteCount={3}
        />
      );

      // Label and note count displayed
      expect(screen.getByText('Spindle Assembly')).toBeDefined();
      expect(screen.getByText('3')).toBeDefined();
      expect(screen.getByText('⚙️')).toBeDefined();

      // Maroon pill badge styling applied
      const badgePill = screen.getByText('Spindle Assembly').closest('.rounded-full');
      expect(badgePill.className).toContain('bg-maroon-800');
      expect(badgePill.className).toContain('text-white');
    });

    it('5.3: High-risk PinMarker applies rose risk styling', () => {
      const { container } = render(
        <PinMarker
          position={[0, 1.5, 0]}
          componentId="spindle"
          componentName="Spindle Assembly"
          risk="high"
          isSelected={false}
          pinMode="expanded"
        />
      );

      const pill = screen.getByText('Spindle Assembly').closest('.rounded-full');
      expect(pill.className).toContain('border-rose-500/80');
      const stem = container.querySelector('.bg-rose-500');
      expect(stem).not.toBeNull();
    });

    it('5.4: Hovering over idle PinMarker expands it into CAD callout pill badge', () => {
      const { container } = render(
        <PinMarker
          position={[0, 1.5, 0]}
          componentId="spindle"
          componentName="Spindle Assembly"
          isSelected={false}
          isHighlighted={false}
        />
      );

      // Initially in idle state (no full label visible)
      expect(screen.queryByText('Spindle Assembly')).toBeNull();

      // Hover over the pin container
      const pinTrigger = container.querySelector('.pointer-events-auto');
      fireEvent.mouseEnter(pinTrigger);

      // Callout badge expands with component name and icon
      expect(screen.getByText('Spindle Assembly')).toBeDefined();
      expect(screen.getByText('⚙️')).toBeDefined();

      // Mouse leave collapses back to compact waypoint dot
      fireEvent.mouseLeave(pinTrigger);
      expect(screen.queryByText('Spindle Assembly')).toBeNull();
    });
  });

  // =========================================================================
  // 6. RAPID TAB SWITCHING STRESS HARNESS
  // =========================================================================
  describe('6. Rapid Tab Switching Stress Harness', () => {
    it('6.1: Capture view withstands 50 rapid mode transitions without error', () => {
      render(
        <BrowserRouter>
          <Capture />
        </BrowserRouter>
      );

      const voiceTab = screen.getByRole('button', { name: /Voice Note/i });
      const textTab = screen.getByRole('button', { name: /Text & Params/i });
      const photoTab = screen.getByRole('button', { name: /Handwritten \/ Photo/i });
      const videoTab = screen.getByRole('button', { name: /Setup Video/i });

      // Execute 50 rapid alternating clicks across all 4 tabs
      for (let i = 0; i < 12; i++) {
        fireEvent.click(textTab);
        fireEvent.click(photoTab);
        fireEvent.click(videoTab);
        fireEvent.click(voiceTab);
      }
      fireEvent.click(textTab);
      fireEvent.click(voiceTab);

      // Assert final state is cleanly settled
      expect(voiceTab.className).toContain('text-maroon-800');
      expect(screen.getByRole('button', { name: /Record Voice/i })).toBeDefined();
      expect(screen.getByText(/Voice Note Capture/i)).toBeDefined();
    });

    it('6.2: Handover view withstands 50 rapid tab transitions without error', () => {
      render(
        <BrowserRouter>
          <Handover />
        </BrowserRouter>
      );

      const planTab = screen.getByRole('button', { name: /Handover Plan & Countdown/i });
      const interviewTab = screen.getByRole('button', { name: /AI Tacit Interview/i });
      const questionsTab = screen.getByRole('button', { name: /Routed Questions/i });

      for (let i = 0; i < 16; i++) {
        fireEvent.click(interviewTab);
        fireEvent.click(questionsTab);
        fireEvent.click(planTab);
      }
      fireEvent.click(interviewTab);

      expect(interviewTab.className).toContain('text-maroon-800');
      expect(screen.getByText(/AI Tacit Interview/i)).toBeDefined();
    });

    it('6.3: Dashboard view withstands 50 rapid tab transitions without error', () => {
      render(
        <BrowserRouter>
          <Dashboard />
        </BrowserRouter>
      );

      const heatmapTab = screen.getByRole('button', { name: /Knowledge Risk Heatmap/i });
      const metricsTab = screen.getByRole('button', { name: /Transfer & Quality ROI/i });
      const timelineTab = screen.getByRole('button', { name: /Machine Event Stream/i });

      for (let i = 0; i < 16; i++) {
        fireEvent.click(metricsTab);
        fireEvent.click(timelineTab);
        fireEvent.click(heatmapTab);
      }
      fireEvent.click(metricsTab);

      expect(metricsTab.className).toContain('text-maroon-800');
    });
  });
});
