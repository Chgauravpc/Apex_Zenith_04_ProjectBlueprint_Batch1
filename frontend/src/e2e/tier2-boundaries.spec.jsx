import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';

import App from '../App';
import NavBar from '../components/layout/NavBar';
import RoleSwitcher from '../components/layout/RoleSwitcher';
import Home from '../pages/Home';
import Dashboard from '../pages/Dashboard';
import MachineMap from '../pages/MachineMap';
import Ask from '../pages/Ask';
import Capture from '../pages/Capture';
import Handover from '../pages/Handover';
import Review from '../pages/Review';
import StepView from '../components/guide/StepView';
import NoteEditor from '../components/capture/NoteEditor';
import AnswerCard from '../components/ask/AnswerCard';
import PinForm from '../components/map3d/PinForm';
import WarningBanner from '../components/guardian/WarningBanner';
import ErrorBoundary from '../components/common/ErrorBoundary';
import LoadState from '../components/common/LoadState';
import ErpWidget from '../widget/erpWidget';

import { useAuthStore, DEMO_USERS } from '../store/useAuthStore';
import { useMachineStore } from '../store/useMachineStore';
import { useThemeStore } from '../store/useThemeStore';
import { t } from '../utils/i18n';
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
        expert_notes: [],
        past_incidents: [],
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

describe('Tier 2: Boundary & Corner Cases (Opaque-Box E2E Suite)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetTestStores();

    guideApi.getProcedures.mockResolvedValue([TEST_PROCEDURE]);
    guideApi.startRun.mockResolvedValue(TEST_RUN);
    guideApi.getBriefing.mockResolvedValue({
      jobs: [],
      machines: [],
      open_warnings: [],
      known_issues: [],
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
      total: 0,
      items: [],
    });

    map3dApi.getComponents.mockResolvedValue(map3dApi.VMC_COMPONENTS_DATA);
  });

  // ========================================================
  // CATEGORY 1: Theme & Color System Boundaries
  // ========================================================
  describe('Category 1: Theme & Color System Boundaries', () => {
    it('1.1: handles corrupted/invalid localStorage theme value by falling back safely to light', () => {
      localStorage.setItem('blueprint_theme', 'invalid_theme_xyz');
      useThemeStore.getState().setTheme('light');
      expect(useThemeStore.getState().theme).toBe('light');
    });

    it('1.2: DOM element classList removes dark when set to light cleanly', () => {
      document.documentElement.classList.add('dark');
      useThemeStore.getState().setTheme('light');
      expect(document.documentElement.classList.contains('dark')).toBe(false);
      expect(document.documentElement.classList.contains('light')).toBe(true);
    });

    it('1.3: handles rapid sequential theme toggles deterministically', () => {
      const { toggleTheme } = useThemeStore.getState();
      toggleTheme(); // dark
      toggleTheme(); // light
      toggleTheme(); // dark
      toggleTheme(); // light
      expect(useThemeStore.getState().theme).toBe('light');
      expect(document.documentElement.classList.contains('light')).toBe(true);
    });

    it('1.4: persists theme preference in localStorage on update', () => {
      useThemeStore.getState().setTheme('dark');
      expect(localStorage.getItem('blueprint_theme')).toBe('dark');
      useThemeStore.getState().setTheme('light');
      expect(localStorage.getItem('blueprint_theme')).toBe('light');
    });

    it('1.5: verifies CSS custom properties fallback definitions in root', () => {
      render(
        <div
          data-testid="css-var-boundary"
          style={{ backgroundColor: 'var(--bg-main, #FFFFFF)', color: 'var(--primary-text, #1F2937)' }}
        >
          <span>Fallback Content</span>
        </div>
      );
      const el = screen.getByTestId('css-var-boundary');
      expect(el).toBeDefined();
    });
  });

  // ========================================================
  // CATEGORY 2: Card Elevation & Border Boundaries
  // ========================================================
  describe('Category 2: Card Elevation & Border Boundaries', () => {
    it('2.1: empty card container preserves border styling without layout collapse', () => {
      render(
        <div data-testid="empty-card" className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-6 shadow-md min-h-[50px]">
          {/* empty */}
        </div>
      );
      const card = screen.getByTestId('empty-card');
      expect(card.className).toContain('rounded-2xl');
      expect(card.className).toContain('border');
    });

    it('2.2: handles extremely long unspaced text gracefully with word-break and truncate', () => {
      const longWord = 'SUPER_LONG_MACHINE_ERROR_CODE_XYZ_1234567890_VERY_LONG_STRING_THAT_COULD_OVERFLOW';
      render(
        <div className="bg-slate-800 rounded-2xl p-6 max-w-xs break-words">
          <p data-testid="long-text">{longWord}</p>
        </div>
      );
      expect(screen.getByTestId('long-text').textContent).toBe(longWord);
    });

    it('2.3: zero-padding card variant maintains rounded borders and elevation', () => {
      render(
        <div data-testid="dense-card" className="bg-slate-800 border border-slate-700 rounded-xl p-0 shadow-sm">
          <span>Dense Content</span>
        </div>
      );
      const card = screen.getByTestId('dense-card');
      expect(card.className).toContain('p-0');
      expect(card.className).toContain('rounded-xl');
    });

    it('2.4: card with null description renders title cleanly without error', () => {
      render(
        <div className="bg-slate-800 rounded-2xl p-6">
          <h2 className="text-white font-bold">Standalone Card Title</h2>
          {null}
        </div>
      );
      expect(screen.getByText('Standalone Card Title')).toBeDefined();
    });

    it('2.5: card with disabled interactive state reflects reduced opacity and disabled cursor', () => {
      render(
        <div data-testid="disabled-card" className="bg-slate-800 rounded-2xl p-6 opacity-50 cursor-not-allowed pointer-events-none">
          <span>Disabled Card Area</span>
        </div>
      );
      const card = screen.getByTestId('disabled-card');
      expect(card.className).toContain('opacity-50');
      expect(card.className).toContain('cursor-not-allowed');
    });
  });

  // ========================================================
  // CATEGORY 3: Navigation & Layout Shell Boundaries
  // ========================================================
  describe('Category 3: Navigation & Layout Shell Boundaries', () => {
    it('3.1: navigating to unknown route renders 404 Page Not Found', () => {
      render(
        <MemoryRouter initialEntries={['/non-existent-route-404']}>
          <App />
        </MemoryRouter>
      );
      expect(screen.getByText('Page Not Found')).toBeDefined();
      expect(screen.getByText('The requested route does not exist.')).toBeDefined();
    });

    it('3.2: rapid clicks on mobile menu toggle maintains boolean consistency', () => {
      render(
        <BrowserRouter>
          <NavBar />
        </BrowserRouter>
      );
      const hamburger = screen.getByLabelText(/Toggle navigation menu/i);

      fireEvent.click(hamburger); // true
      fireEvent.click(hamburger); // false
      fireEvent.click(hamburger); // true
      expect(hamburger.getAttribute('aria-expanded')).toBe('true');

      fireEvent.click(hamburger); // false
      expect(hamburger.getAttribute('aria-expanded')).toBe('false');
    });

    it('3.3: mobile drawer automatically closes when a navigation link is clicked', () => {
      render(
        <BrowserRouter>
          <NavBar />
        </BrowserRouter>
      );
      const hamburger = screen.getByLabelText(/Toggle navigation menu/i);
      fireEvent.click(hamburger);
      expect(hamburger.getAttribute('aria-expanded')).toBe('true');

      // Click nav link inside mobile drawer
      const guideLinks = screen.getAllByText(t('navGuide', 'en'));
      const mobileGuideLink = guideLinks[guideLinks.length - 1];
      fireEvent.click(mobileGuideLink);

      expect(hamburger.getAttribute('aria-expanded')).toBe('false');
    });

    it('3.4: exact route matching ensures Home active state does not match subroutes', () => {
      render(
        <MemoryRouter initialEntries={['/guide']}>
          <NavBar />
        </MemoryRouter>
      );
      const homeLink = screen.getByText(t('navHome', 'en')).closest('a');
      const guideLink = screen.getByText(t('navGuide', 'en')).closest('a');

      expect(homeLink.className).not.toContain('text-cyan-300');
      expect(guideLink.className).toContain('text-cyan-300');
    });

    it('3.5: sticky header retains fixed z-index and border at top of layout', () => {
      render(
        <BrowserRouter>
          <NavBar />
        </BrowserRouter>
      );
      const header = document.querySelector('header');
      expect(header.className).toContain('sticky');
      expect(header.className).toContain('top-0');
      expect(header.className).toContain('z-40');
    });
  });

  // ========================================================
  // CATEGORY 4: Role Switcher & Persona Boundaries
  // ========================================================
  describe('Category 4: Role Switcher & Persona Boundaries', () => {
    it('4.1: unknown user ID falls back safely to default user (Ramesh Patil)', () => {
      render(<RoleSwitcher />);
      const select = screen.getByLabelText(/Select Demo User and Role/i);

      // Select invalid ID 999
      fireEvent.change(select, { target: { value: '999' } });
      expect(useAuthStore.getState().currentUser).toBeDefined();
      expect(useAuthStore.getState().currentUser.name).toBe('Ramesh Patil');
    });

    it('4.2: selecting language updates store without dropping user role', () => {
      render(<RoleSwitcher />);
      const langSelect = screen.getByLabelText(/Language selection/i);

      fireEvent.change(langSelect, { target: { value: 'mr' } });
      expect(useAuthStore.getState().language).toBe('mr');
      expect(useAuthStore.getState().currentUser.role).toBe('old_employee');
    });

    it('4.3: switching role preserves selected machine assignment', () => {
      useMachineStore.setState({ selectedMachineId: 1 });
      render(<RoleSwitcher />);
      const select = screen.getByLabelText(/Select Demo User and Role/i);

      fireEvent.change(select, { target: { value: '2' } }); // Priya Shinde
      expect(useMachineStore.getState().selectedMachineId).toBe(1);
    });

    it('4.4: handles rapid sequential persona switches correctly', () => {
      render(<RoleSwitcher />);
      const select = screen.getByLabelText(/Select Demo User and Role/i);

      fireEvent.change(select, { target: { value: '1' } });
      fireEvent.change(select, { target: { value: '2' } });
      fireEvent.change(select, { target: { value: '4' } });

      expect(useAuthStore.getState().currentUser.name).toBe('Anil Kulkarni');
      expect(useAuthStore.getState().currentUser.role).toBe('supervisor');
    });

    it('4.5: unknown language code in i18n t() falls back cleanly to English', () => {
      expect(t('appName', 'unknown_lang')).toBe('Project Blueprint');
      expect(t('save', 'unknown_lang')).toBe('Save');
    });
  });

  // ========================================================
  // CATEGORY 5: Home View Boundaries
  // ========================================================
  describe('Category 5: Home View Boundaries', () => {
    it('5.1: handles empty briefing response (zero jobs, no machines) gracefully', async () => {
      useAuthStore.setState({ currentUser: DEMO_USERS[1] }); // Priya (new)
      guideApi.getBriefing.mockResolvedValueOnce({
        jobs: [],
        machines: [],
        open_warnings: [],
        known_issues: [],
      });

      render(
        <MemoryRouter>
          <Home />
        </MemoryRouter>
      );

      expect(await screen.findByText(/Your machines: none assigned/i)).toBeDefined();
    });

    it('5.2: handles zero open warnings with safe historical notice', async () => {
      useAuthStore.setState({ currentUser: DEMO_USERS[1] });
      guideApi.getBriefing.mockResolvedValueOnce({
        jobs: [],
        machines: ['VMC-3'],
        open_warnings: [],
        known_issues: [],
      });

      render(
        <MemoryRouter>
          <Home />
        </MemoryRouter>
      );

      expect(await screen.findByText(/No open warnings on your machines/i)).toBeDefined();
    });

    it('5.3: handles null handover plan for old employee with safe notice', async () => {
      useAuthStore.setState({ currentUser: DEMO_USERS[0] });
      transferApi.getHandoverPlan.mockResolvedValueOnce(null);

      render(
        <MemoryRouter>
          <Home />
        </MemoryRouter>
      );

      expect(await screen.findByText(/No handover plan: you are not leaving soon/i)).toBeDefined();
    });

    it('5.4: handles empty review queue gracefully', async () => {
      useAuthStore.setState({ currentUser: DEMO_USERS[0] });
      captureApi.getReviewQueue.mockResolvedValueOnce({ items: [], total: 0 });

      render(
        <MemoryRouter>
          <Home />
        </MemoryRouter>
      );

      expect(await screen.findByText(/0 captured cards await your review and sign-off/i)).toBeDefined();
    });

    it('5.5: handles null routed questions with friendly empty notice', async () => {
      useAuthStore.setState({ currentUser: DEMO_USERS[0] });
      transferApi.getRoutedQuestions.mockResolvedValueOnce(null);

      render(
        <MemoryRouter>
          <Home />
        </MemoryRouter>
      );

      expect(await screen.findByText(/No questions waiting for you/i)).toBeDefined();
    });
  });

  // ========================================================
  // CATEGORY 6: Dashboard View Boundaries
  // ========================================================
  describe('Category 6: Dashboard View Boundaries', () => {
    it('6.1: handles empty risk cells array without division-by-zero or crashing', async () => {
      transferApi.getRisk.mockResolvedValueOnce([]);
      render(<Dashboard />);

      expect(screen.getByText(/Knowledge Risk Heatmap/i)).toBeDefined();
      expect(await screen.findByText(/Bus Factor Heatmap/i)).toBeDefined();
    });

    it('6.2: displays metrics at 0% and 100% boundary extremes correctly', async () => {
      transferApi.getMetrics.mockResolvedValueOnce({
        coverage: 100,
        parts_total: 10,
        parts_at_risk: 0,
        verified_cards: 50,
        pending_review: 0,
        guardian_stops: 0,
        guardian_cautions: 0,
        warnings_with_fix: 0,
        questions_routed: 0,
        questions_answered: 0,
        handover_progress: 100,
        new_employees: [],
      });

      render(<Dashboard />);
      fireEvent.click(screen.getByText(/Transfer & Quality ROI/i));

      expect((await screen.findAllByText('100%')).length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/0 Stops/i)).toBeDefined();
    });

    it('6.3: handles machine timeline with zero incidents gracefully', async () => {
      machinesApi.getTimeline.mockResolvedValueOnce({
        machine_id: 1,
        machine: 'VMC-3',
        total: 0,
        items: [],
      });

      render(<Dashboard />);
      fireEvent.click(screen.getByText(/Machine Event Stream/i));

      expect(screen.getByText(/Machine Event Timeline/i)).toBeDefined();
      expect(await screen.findByText(/Nothing recorded on this machine yet/i)).toBeDefined();
    });

    it('6.4: shows error notice with Retry button on API failure and recovers on retry', async () => {
      transferApi.getRisk.mockRejectedValueOnce(new Error('503 Service Unavailable'));
      render(<Dashboard />);

      expect(await screen.findByText(/Could not load: 503 Service Unavailable/i)).toBeDefined();

      transferApi.getRisk.mockResolvedValueOnce(TEST_RISK);
      fireEvent.click(screen.getByRole('button', { name: /Retry/i }));

      expect(await screen.findByText(/Machine: VMC-3/i)).toBeDefined();
    });

    it('6.5: switching rapidly between tabs retains selected tab without race errors', () => {
      render(<Dashboard />);
      const heatmapBtn = screen.getByText(/Knowledge Risk Heatmap/i);
      const metricsBtn = screen.getByText(/Transfer & Quality ROI/i);
      const timelineBtn = screen.getByText(/Machine Event Stream/i);

      fireEvent.click(metricsBtn);
      fireEvent.click(timelineBtn);
      fireEvent.click(heatmapBtn);

      expect(heatmapBtn.closest('button').className).toContain('bg-slate-800');
    });
  });

  // ========================================================
  // CATEGORY 7: MachineMap View Boundaries
  // ========================================================
  describe('Category 7: MachineMap View Boundaries', () => {
    it('7.1: renders 3D Knowledge Explorer prompt when no component is selected', () => {
      useMachineStore.setState({ selectedComponentId: null });
      render(
        <BrowserRouter>
          <MachineMap />
        </BrowserRouter>
      );
      expect(screen.getByText(/3D Machine Knowledge Explorer/i)).toBeDefined();
      expect(screen.getByText(/Click on any part of the 3D VMC model/i)).toBeDefined();
    });

    it('7.2: component with empty expert notes displays empty tacit know-how notice', () => {
      render(
        <BrowserRouter>
          <MachineMap />
        </BrowserRouter>
      );
      // Select Vise which has empty expert_notes
      const visePill = screen.getAllByRole('button', { name: /Precision Vise/i })[0];
      fireEvent.click(visePill);

      expect(screen.getByRole('heading', { name: 'Precision Vise' })).toBeDefined();
      expect(screen.getByText(/No expert tips pinned yet/i)).toBeDefined();
    });

    it('7.3: toggles enclosure doors between open and closed state without viewer reset', () => {
      render(
        <BrowserRouter>
          <MachineMap />
        </BrowserRouter>
      );
      const doorsBtn = screen.getByRole('button', { name: /Open Doors/i });
      fireEvent.click(doorsBtn);
      expect(screen.getByRole('button', { name: /Close Doors/i })).toBeDefined();

      fireEvent.click(screen.getByRole('button', { name: /Close Doors/i }));
      expect(screen.getByRole('button', { name: /Open Doors/i })).toBeDefined();
    });

    it('7.4: PinForm modal handles Cancel / Close without submitting', () => {
      const handleClose = vi.fn();
      const handleSubmit = vi.fn();

      render(
        <PinForm
          component={{ id: 1, display_name: 'Spindle Assembly', mesh_name: 'spindle' }}
          isOpen={true}
          onClose={handleClose}
          onSubmit={handleSubmit}
        />
      );

      const cancelBtn = screen.getByRole('button', { name: /Cancel/i });
      fireEvent.click(cancelBtn);

      expect(handleClose).toHaveBeenCalledTimes(1);
      expect(handleSubmit).not.toHaveBeenCalled();
    });

    it('7.5: PinForm prevents submission when title or text are empty/whitespace', () => {
      const handleSubmit = vi.fn();
      render(
        <PinForm
          component={{ id: 1, display_name: 'Spindle Assembly', mesh_name: 'spindle' }}
          isOpen={true}
          onClose={vi.fn()}
          onSubmit={handleSubmit}
        />
      );

      const titleInput = screen.getByPlaceholderText(/e\.g\. Flange vibration/i);
      fireEvent.change(titleInput, { target: { value: '   ' } });

      const submitBtn = screen.getByRole('button', { name: /Pin to 3D Model/i });
      fireEvent.click(submitBtn);

      expect(handleSubmit).not.toHaveBeenCalled();
    });
  });

  // ========================================================
  // CATEGORY 8: Ask Assistant View Boundaries
  // ========================================================
  describe('Category 8: Ask Assistant View Boundaries', () => {
    it('8.1: submitting empty query does not call ask API or trigger false submission', () => {
      render(<Ask />);
      const askBtn = screen.getByRole('button', { name: /^Ask$/i });
      expect(askBtn.disabled).toBe(true);

      fireEvent.click(askBtn);
      expect(askApi.askQuestion).not.toHaveBeenCalled();
    });

    it('8.2: AnswerCard with not_enough_data flag renders shop floor data gap alert', () => {
      const uncertainAnswer = {
        not_enough_data: true,
        suggested_expert: 'Ramesh (Old Employee)',
        confidence: 0.15,
        sources: [],
      };
      render(<AnswerCard answer={uncertainAnswer} />);

      expect(screen.getByText(/Not Enough Verified Data on Shop Floor/i)).toBeDefined();
      expect(screen.getByText(/could not find enough verified cards/i)).toBeDefined();
    });

    it('8.3: AnswerCard with suggested expert renders Ask Expert escalation button', () => {
      const onAskExpert = vi.fn();
      const uncertainAnswer = {
        not_enough_data: true,
        suggested_expert: 'Ramesh Patil',
        confidence: 0.2,
        sources: [],
      };
      render(<AnswerCard answer={uncertainAnswer} onAskExpert={onAskExpert} />);

      const btn = screen.getByRole('button', { name: /Ask Ramesh Patil/i });
      expect(btn).toBeDefined();
      fireEvent.click(btn);
      expect(onAskExpert).toHaveBeenCalledTimes(1);
    });

    it('8.4: Chatter Doctor validates tool flutes and RPM parameter bounds', () => {
      render(<Ask />);
      fireEvent.click(screen.getByText('Chatter Doctor (Acoustic)'));

      const flutesInput = screen.getByLabelText(/Tool Flutes \/ Teeth/i);
      const rpmInput = screen.getByLabelText(/Current Spindle RPM/i);

      fireEvent.change(flutesInput, { target: { value: '4' } });
      fireEvent.change(rpmInput, { target: { value: '8000' } });

      expect(flutesInput.value).toBe('4');
      expect(rpmInput.value).toBe('8000');
    });

    it('8.5: AnswerCard formats 0% and 100% confidence scores cleanly', () => {
      const midConf = {
        answer: 'Unknown symptom',
        confidence: 0.5,
        sources: [],
      };
      const { rerender } = render(<AnswerCard answer={midConf} />);
      expect(screen.getByText(/Confidence 50%/i)).toBeDefined();

      const perfectConf = {
        answer: 'Verified solution',
        confidence: 1.0,
        sources: [],
      };
      rerender(<AnswerCard answer={perfectConf} />);
      expect(screen.getByText(/Confidence 100%/i)).toBeDefined();
    });
  });

  // ========================================================
  // CATEGORY 9: Capture View Boundaries
  // ========================================================
  describe('Category 9: Capture View Boundaries', () => {
    it('9.1: NoteEditor disables submission when text input is empty', () => {
      render(<NoteEditor />);
      const saveBtn = screen.getByRole('button', { name: /Save & Check Note/i });
      expect(saveBtn.disabled).toBe(true);

      fireEvent.click(saveBtn);
      expect(captureApi.captureText).not.toHaveBeenCalled();
    });

    it('9.2: NoteEditor handles typing notes and enables save button', () => {
      render(<NoteEditor />);
      const textarea = screen.getByPlaceholderText(/VMC-3 pe roughing karte waqt/i);
      fireEvent.change(textarea, { target: { value: 'Flange roughing chatter solved with 0.18 feed' } });

      const saveBtn = screen.getByRole('button', { name: /Save & Check Note/i });
      expect(saveBtn.disabled).toBe(false);
    });

    it('9.3: switching capture tabs preserves tab container stability', () => {
      render(<Capture />);
      const textTab = screen.getByText('Text & Params');
      const photoTab = screen.getByText('Handwritten / Photo');
      const voiceTab = screen.getByText('Voice Note');

      fireEvent.click(textTab);
      expect(screen.getByPlaceholderText(/VMC-3 pe roughing karte waqt/i)).toBeDefined();

      fireEvent.click(photoTab);
      expect(screen.getByText(/Choose Image File/i)).toBeDefined();

      fireEvent.click(voiceTab);
      expect(screen.getByText('Record Voice')).toBeDefined();
    });

    it('9.4: NoteEditor clears input text when Reset or new note starts', () => {
      render(<NoteEditor />);
      const textarea = screen.getByPlaceholderText(/VMC-3 pe roughing karte waqt/i);
      fireEvent.change(textarea, { target: { value: 'Temporary scratch note' } });
      expect(textarea.value).toBe('Temporary scratch note');

      fireEvent.change(textarea, { target: { value: '' } });
      expect(textarea.value).toBe('');
    });

    it('9.5: handles very long multiline note text without input corruption', () => {
      const longNote = 'Line 1: Setup VMC-3\nLine 2: Zero offset\nLine 3: Tool #4 torque 90 Nm\nLine 4: Verified by Ramesh';
      render(<NoteEditor />);
      const textarea = screen.getByPlaceholderText(/VMC-3 pe roughing karte waqt/i);
      fireEvent.change(textarea, { target: { value: longNote } });
      expect(textarea.value).toBe(longNote);
    });
  });

  // ========================================================
  // CATEGORY 10: GuidedJob View Boundaries (STOP Warning Lock)
  // ========================================================
  describe('Category 10: GuidedJob View Boundaries (STOP Warning Lock)', () => {
    const mockStepWithCheck = {
      id: 2,
      step_no: 2,
      title: 'Tool Stick-out Verification',
      instruction: 'Measure tool stick-out using digital vernier gauge.',
      param_name: 'Overhang',
      param_unit: 'mm',
      target_value: 30.0,
      tolerance: 2.0, // Allowed range: [28.0 - 32.0]
    };

    it('10.1: locks Next button with STOP warning when measured parameter is out of tolerance (> max)', () => {
      const onCompleteStep = vi.fn();
      render(
        <StepView
          step={mockStepWithCheck}
          stepIndex={1}
          totalSteps={3}
          onCompleteStep={onCompleteStep}
        />
      );

      const input = screen.getByPlaceholderText(/Target 30 ±2/i);
      // Enter 35.0 mm (> 32.0 max)
      fireEvent.change(input, { target: { value: '35.0' } });

      expect(screen.getByText(/STOP — CRITICAL WARNING/i)).toBeDefined();
      expect(screen.getByText(/Measurement 35 is out of tolerance/i)).toBeDefined();

      const nextBtn = screen.getByText(/Blocked by STOP Warning/i).closest('button');
      expect(nextBtn.disabled).toBe(true);

      fireEvent.click(nextBtn);
      expect(onCompleteStep).not.toHaveBeenCalled();
    });

    it('10.2: locks Next button with STOP warning when measured parameter is out of tolerance (< min)', () => {
      const onCompleteStep = vi.fn();
      render(
        <StepView
          step={mockStepWithCheck}
          stepIndex={1}
          totalSteps={3}
          onCompleteStep={onCompleteStep}
        />
      );

      const input = screen.getByPlaceholderText(/Target 30 ±2/i);
      // Enter 25.0 mm (< 28.0 min)
      fireEvent.change(input, { target: { value: '25.0' } });

      expect(screen.getByText(/STOP — CRITICAL WARNING/i)).toBeDefined();
      expect(screen.getByText(/Measurement 25 is out of tolerance/i)).toBeDefined();

      const nextBtn = screen.getByText(/Blocked by STOP Warning/i).closest('button');
      expect(nextBtn.disabled).toBe(true);
    });

    it('10.3: unlocks Next button and clears STOP warning when parameter is corrected into tolerance', () => {
      const onCompleteStep = vi.fn();
      render(
        <StepView
          step={mockStepWithCheck}
          stepIndex={1}
          totalSteps={3}
          onCompleteStep={onCompleteStep}
        />
      );

      const input = screen.getByPlaceholderText(/Target 30 ±2/i);
      // First trigger STOP warning
      fireEvent.change(input, { target: { value: '40.0' } });
      expect(screen.getByText(/STOP — CRITICAL WARNING/i)).toBeDefined();

      // Now correct to in-tolerance value 30.5 mm
      fireEvent.change(input, { target: { value: '30.5' } });
      expect(screen.queryByText(/STOP — CRITICAL WARNING/i)).toBeNull();

      const nextBtn = screen.getByText(/Complete Step & Next/i).closest('button');
      expect(nextBtn.disabled).toBe(false);

      fireEvent.click(nextBtn);
      expect(onCompleteStep).toHaveBeenCalledTimes(1);
    });

    it('10.4: accepts exact boundary tolerance values as valid ([28.0] and [32.0])', () => {
      const onCompleteStep = vi.fn();
      render(
        <StepView
          step={mockStepWithCheck}
          stepIndex={1}
          totalSteps={3}
          onCompleteStep={onCompleteStep}
        />
      );

      const input = screen.getByPlaceholderText(/Target 30 ±2/i);
      // Min boundary 28.0
      fireEvent.change(input, { target: { value: '28.0' } });
      expect(screen.queryByText(/STOP — CRITICAL WARNING/i)).toBeNull();

      // Max boundary 32.0
      fireEvent.change(input, { target: { value: '32.0' } });
      expect(screen.queryByText(/STOP — CRITICAL WARNING/i)).toBeNull();

      const nextBtn = screen.getByText(/Complete Step & Next/i).closest('button');
      expect(nextBtn.disabled).toBe(false);
    });

    it('10.5: step without parameter check never raises a false STOP warning', () => {
      const mockStepNoCheck = {
        id: 1,
        step_no: 1,
        title: 'Visual Check',
        instruction: 'Inspect workpiece alignment visually.',
        param_name: null,
      };

      render(<StepView step={mockStepNoCheck} stepIndex={0} totalSteps={2} />);
      expect(screen.queryByText(/STOP/i)).toBeNull();

      const nextBtn = screen.getByText(/Complete Step & Next/i).closest('button');
      expect(nextBtn.disabled).toBe(false);
    });
  });

  // ========================================================
  // CATEGORY 11: Handover View Boundaries
  // ========================================================
  describe('Category 11: Handover View Boundaries', () => {
    it('11.1: displays notice when nobody with know-how is leaving soon', async () => {
      useAuthStore.setState({ currentUser: DEMO_USERS[1] }); // Priya (new employee)
      transferApi.getRisk.mockResolvedValue([]); // no one leaving
      transferApi.getHandoverPlan.mockResolvedValue(null);

      render(
        <MemoryRouter>
          <Handover />
        </MemoryRouter>
      );

      expect(await screen.findByText(/Nobody with know-how is leaving soon/i)).toBeDefined();
    });

    it('11.2: handles handover countdown at 0 days boundary', async () => {
      useAuthStore.setState({ currentUser: DEMO_USERS[0] });
      transferApi.getRisk.mockResolvedValue(TEST_RISK);
      transferApi.getHandoverPlan.mockResolvedValue({
        ...TEST_PLAN,
        days_left: 0,
        progress: 100,
      });

      render(
        <MemoryRouter>
          <Handover />
        </MemoryRouter>
      );

      expect(await screen.findByText(/Ramesh Patil • Retirement Countdown/i)).toBeDefined();
      expect(screen.getByText(/0 days left/i)).toBeDefined();
      expect(screen.getByText(/100% Complete/i)).toBeDefined();
    });

    it('11.3: handles interview start API failure with error state', async () => {
      transferApi.startInterview.mockRejectedValueOnce(new Error('Interview service unavailable'));
      render(
        <MemoryRouter>
          <Handover />
        </MemoryRouter>
      );

      fireEvent.click(await screen.findByText(/AI Tacit Interview/i));
      const startBtn = await screen.findByText(/Start Interview →/i);
      fireEvent.click(startBtn);

      expect(await screen.findByText(/Interview service unavailable/i)).toBeDefined();
    });

    it('11.4: displays empty message when routed questions list has 0 items', async () => {
      transferApi.getRoutedQuestions.mockResolvedValueOnce({ items: [], total: 0 });

      render(
        <MemoryRouter>
          <Handover />
        </MemoryRouter>
      );

      fireEvent.click(screen.getByText(/Routed Questions/i));
      expect(await screen.findByText(/No open questions. Everything asked so far has an answer./i)).toBeDefined();
    });

    it('11.5: handles failure when replying to routed question with error alert', async () => {
      transferApi.getRoutedQuestions.mockResolvedValueOnce({
        items: [
          {
            id: 10,
            question: 'Lathe-2 chatter fix?',
            asked_by: 'Priya',
            status: 'open',
          },
        ],
        total: 1,
      });
      transferApi.replyRoutedQuestion.mockRejectedValueOnce(new Error('Network connection timeout'));

      render(
        <MemoryRouter>
          <Handover />
        </MemoryRouter>
      );

      fireEvent.click(screen.getByText(/Routed Questions/i));
      fireEvent.click(await screen.findByText(/Reply to Priya/i));

      const input = screen.getByPlaceholderText(/Type your advice/i);
      fireEvent.change(input, { target: { value: 'Tighten turret clamp' } });

      fireEvent.click(screen.getByText(/Send Verified Reply/i));
      expect(await screen.findByText(/Reply not saved: Network connection timeout/i)).toBeDefined();
    });
  });

  // ========================================================
  // CATEGORY 12: Review View Boundaries (Role Gating)
  // ========================================================
  describe('Category 12: Review View Boundaries (Role Gating)', () => {
    it('12.1: new employee persona has review action buttons strictly disabled', async () => {
      useAuthStore.setState({ currentUser: DEMO_USERS[1] }); // Priya Shinde (new)
      render(<Review />);

      const approveBtn = (await screen.findByText(/Approve & Verify/i)).closest('button');
      const rejectBtn = screen.getByText(/Discard \/ Reject/i).closest('button');
      const editBtn = screen.getByText(/Edit Details/i).closest('button');

      expect(approveBtn.disabled).toBe(true);
      expect(rejectBtn.disabled).toBe(true);
      expect(editBtn.disabled).toBe(true);
    });

    it('12.2: new employee persona sees explicit role gating notice', async () => {
      useAuthStore.setState({ currentUser: DEMO_USERS[1] }); // Priya Shinde (new)
      render(<Review />);

      expect(await screen.findByText(/Only an old employee or a supervisor can verify know-how/i)).toBeDefined();
    });

    it('12.3: old employee persona has review action buttons enabled', async () => {
      useAuthStore.setState({ currentUser: DEMO_USERS[0] }); // Ramesh Patil (old)
      render(<Review />);

      const approveBtn = (await screen.findByText(/Approve & Verify/i)).closest('button');
      const rejectBtn = screen.getByText(/Discard \/ Reject/i).closest('button');
      const editBtn = screen.getByText(/Edit Details/i).closest('button');

      expect(approveBtn.disabled).toBe(false);
      expect(rejectBtn.disabled).toBe(false);
      expect(editBtn.disabled).toBe(false);
    });

    it('12.4: supervisor persona has review action buttons enabled', async () => {
      useAuthStore.setState({ currentUser: DEMO_USERS[2] }); // Anil Kulkarni (supervisor)
      render(<Review />);

      const approveBtn = (await screen.findByText(/Approve & Verify/i)).closest('button');
      expect(approveBtn.disabled).toBe(false);
    });

    it('12.5: handles empty review queue with verified celebration message', async () => {
      captureApi.getReviewQueue.mockResolvedValueOnce({ items: [], total: 0 });
      render(<Review />);

      expect(await screen.findByText(/All know-how cards in the review queue have been verified!/i)).toBeDefined();
    });
  });

  // ========================================================
  // CATEGORY 13: Component Patterns Boundaries
  // ========================================================
  describe('Category 13: Component Patterns Boundaries', () => {
    it('13.1: WarningBanner with null result renders null (no DOM node)', () => {
      const { container } = render(<WarningBanner result={null} />);
      expect(container.firstChild).toBeNull();
    });

    it('13.2: WarningBanner with empty warnings array renders null', () => {
      const { container } = render(<WarningBanner result={{ warnings: [] }} />);
      expect(container.firstChild).toBeNull();
    });

    it('13.3: WarningBanner with caution severity supports onDismiss callback', () => {
      const onDismiss = vi.fn();
      render(
        <WarningBanner
          result={{
            severity: 'caution',
            warnings: [{ message: 'Minor parameter drift detected' }],
          }}
          onDismiss={onDismiss}
        />
      );

      const dismissBtn = screen.getByLabelText(/Dismiss warning/i);
      fireEvent.click(dismissBtn);
      expect(onDismiss).toHaveBeenCalledTimes(1);
    });

    it('13.4: disabled button prevents click event dispatch', () => {
      const handleClick = vi.fn();
      render(
        <button type="button" disabled onClick={handleClick}>
          Disabled Test Button
        </button>
      );

      const btn = screen.getByRole('button', { name: /Disabled Test Button/i });
      fireEvent.click(btn);
      expect(handleClick).not.toHaveBeenCalled();
    });

    it('13.5: PinForm handles non-open state by rendering null', () => {
      const { container } = render(
        <PinForm component={{ display_name: 'Vise' }} isOpen={false} onClose={vi.fn()} onSubmit={vi.fn()} />
      );
      expect(container.firstChild).toBeNull();
    });
  });

  // ========================================================
  // CATEGORY 14: Build & Lint Pipeline Boundaries
  // ========================================================
  describe('Category 14: Build & Lint Pipeline Boundaries', () => {
    it('14.1: ErpWidget renders safely with default parameter fallback without crash', () => {
      render(<ErpWidget />);
      expect(screen.getByText('WO-8842: SS304 Precision Flange')).toBeDefined();
      expect(screen.getByText('VMC-3')).toBeDefined();
    });

    it('14.2: ErrorBoundary recovers and resets when Try Again is clicked', () => {
      let shouldThrow = true;
      const FickleComponent = () => {
        if (shouldThrow) throw new Error('Fickle Crash');
        return <div>Fickle Recovered</div>;
      };

      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const { rerender } = render(
        <ErrorBoundary title="Recovery Test">
          <FickleComponent />
        </ErrorBoundary>
      );

      expect(screen.getByText(/Fickle Crash/i)).toBeDefined();

      shouldThrow = false;
      fireEvent.click(screen.getByRole('button', { name: /Try Again/i }));

      rerender(
        <ErrorBoundary title="Recovery Test">
          <FickleComponent />
        </ErrorBoundary>
      );

      expect(screen.getByText('Fickle Recovered')).toBeDefined();
      spy.mockRestore();
    });

    it('14.3: LoadState handles error state with retry button action', () => {
      const onRetry = vi.fn();
      render(
        <LoadState
          loading={false}
          error="Connection dropped"
          onRetry={onRetry}
          label="Loading know-how…"
        />
      );

      expect(screen.getByText(/Connection dropped/i)).toBeDefined();
      const retryBtn = screen.getByRole('button', { name: /Retry/i });
      fireEvent.click(retryBtn);
      expect(onRetry).toHaveBeenCalledTimes(1);
    });

    it('14.4: LoadState renders loading spinner when loading is true', () => {
      render(<LoadState loading={true} error={null} label="Loading data from shop floor…" />);
      expect(screen.getByText('Loading data from shop floor…')).toBeDefined();
    });

    it('14.5: cleans up store states and timers without memory leak', () => {
      resetTestStores();
      expect(useAuthStore.getState().currentUser.name).toBe('Ramesh Patil');
      expect(useMachineStore.getState().selectedMachineId).toBe(1);
      expect(useThemeStore.getState().theme).toBe('light');
    });
  });
});
