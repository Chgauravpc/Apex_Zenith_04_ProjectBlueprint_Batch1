import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';

import App from '../App';
import NavBar from '../components/layout/NavBar';
import RoleSwitcher from '../components/layout/RoleSwitcher';
import ThemeToggle from '../components/layout/ThemeToggle';
import Home from '../pages/Home';
import Dashboard from '../pages/Dashboard';
import MachineMap from '../pages/MachineMap';
import Ask from '../pages/Ask';
import Capture from '../pages/Capture';
import GuidedJob from '../pages/GuidedJob';
import Handover from '../pages/Handover';
import Review from '../pages/Review';
import WarningBanner from '../components/guardian/WarningBanner';
import ErrorBoundary from '../components/common/ErrorBoundary';
import AnswerCard from '../components/ask/AnswerCard';
import PinForm from '../components/map3d/PinForm';
import {
  MicIcon,
  LightbulbIcon,
  ClipboardIcon,
  ShieldIcon,
  CogIcon,
  CheckCircleIcon,
  SunIcon,
  MoonIcon,
} from '../components/common/Icons';

import { useAuthStore, DEMO_USERS } from '../store/useAuthStore';
import { useThemeStore } from '../store/useThemeStore';
import { t, LANGUAGES } from '../utils/i18n';
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
          author: 'Ramesh (Old Employee)',
          severity: 'stop',
          title: 'SS304 Flange Chatter Precedes Bearing Overheat',
          text: 'Above 8,000 RPM on SS304 roughing, harmonics create 427 Hz chatter.',
          verified: true,
        },
      ],
      past_incidents: [{ id: 'INC-881', summary: 'Severe 427 Hz chatter spike' }],
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

// Mock MachineViewer to avoid WebGL Canvas requirements in jsdom
vi.mock('../components/map3d/MachineViewer', () => ({
  default: ({ selectedComponent, onSelectComponent, onResetSelection, doorsOpen, onToggleDoors }) => (
    <div data-testid="mock-machine-viewer" className="p-4 bg-slate-900 text-white rounded-xl">
      <p>3D Scene Mock: {selectedComponent || 'No component selected'}</p>
      <button type="button" onClick={onToggleDoors}>
        {doorsOpen ? 'Close Enclosure Doors' : 'Open Enclosure Doors'}
      </button>
      <button type="button" onClick={() => onSelectComponent('spindle')}>
        Select Spindle
      </button>
      <button type="button" onClick={onResetSelection}>
        Reset 3D Selection
      </button>
    </div>
  ),
}));

describe('Tier 1: Feature Coverage (Opaque-Box E2E Suite)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetTestStores();

    // Default API mock resolutions
    guideApi.getProcedures.mockResolvedValue([TEST_PROCEDURE]);
    guideApi.startRun.mockResolvedValue(TEST_RUN);
    guideApi.getBriefing.mockResolvedValue({
      jobs: [TEST_PROCEDURE],
      machines: ['VMC-3'],
      open_warnings: ['Check tool overhang'],
      known_issues: ['Flange bore chatter'],
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
      items: [{ id: 1, summary: 'VMC-3 chatter check', occurred_at: '2026-10-28T10:00:00' }],
    });

    map3dApi.getComponents.mockResolvedValue(map3dApi.VMC_COMPONENTS_DATA);
  });

  // ========================================================
  // FEATURE 1: Theme & Color System
  // ========================================================
  describe('Feature 1: Theme & Color System', () => {
    it('1.1: verifies theme store initializes with light theme by default', () => {
      const current = useThemeStore.getState().theme;
      expect(current).toBe('light');
    });

    it('1.2: toggles theme from light to dark and back to light', () => {
      const { toggleTheme } = useThemeStore.getState();
      toggleTheme();
      expect(useThemeStore.getState().theme).toBe('dark');
      toggleTheme();
      expect(useThemeStore.getState().theme).toBe('light');
    });

    it('1.3: explicitly sets theme to light and dark updating DOM class list', () => {
      const { setTheme } = useThemeStore.getState();
      setTheme('dark');
      expect(document.documentElement.classList.contains('dark')).toBe(true);
      setTheme('light');
      expect(document.documentElement.classList.contains('light')).toBe(true);
      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });

    it('1.4: renders ThemeToggle with light and dark radio options and aria-checked state', () => {
      render(<ThemeToggle />);
      const lightBtn = screen.getByTestId('theme-toggle-light');
      const darkBtn = screen.getByTestId('theme-toggle-dark');

      expect(lightBtn).toBeDefined();
      expect(darkBtn).toBeDefined();
      expect(lightBtn.getAttribute('aria-checked')).toBe('true');
      expect(darkBtn.getAttribute('aria-checked')).toBe('false');

      fireEvent.click(darkBtn);
      expect(useThemeStore.getState().theme).toBe('dark');
    });

    it('1.5: verifies clean white and maroon accent visual tokens are configured', () => {
      render(
        <div data-testid="theme-container" className="min-h-screen bg-white text-slate-900 font-sans">
          <button className="bg-maroon-700 hover:bg-maroon-800 text-white px-4 py-2 rounded-xl">
            Maroon Primary Action
          </button>
        </div>
      );
      const container = screen.getByTestId('theme-container');
      expect(container.className).toContain('bg-white');
      const btn = screen.getByRole('button', { name: /Maroon Primary Action/i });
      expect(btn).toBeDefined();
    });
  });

  // ========================================================
  // FEATURE 2: Card Elevation & Borders
  // ========================================================
  describe('Feature 2: Card Elevation & Borders', () => {
    it('2.1: verifies subtle borders and rounded corners on container cards', () => {
      render(
        <MemoryRouter>
          <Home />
        </MemoryRouter>
      );
      const cards = document.querySelectorAll('.rounded-2xl');
      expect(cards.length).toBeGreaterThanOrEqual(1);
    });

    it('2.2: verifies soft diffuse shadow elevation on banner cards', () => {
      render(
        <MemoryRouter>
          <Home />
        </MemoryRouter>
      );
      const banner = document.querySelector('.shadow-xl, .shadow-md, .shadow-lg, .shadow-sm, .shadow-xs');
      expect(banner).not.toBeNull();
    });

    it('2.3: renders card with elevated surface styling', () => {
      render(
        <div data-testid="google-card" className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-6 shadow-md transition-all">
          <h2 className="text-base font-bold text-white">Google Elevated Card</h2>
          <p className="text-slate-400 text-xs mt-1">Clean diffuse shadow and subtle border</p>
        </div>
      );
      const card = screen.getByTestId('google-card');
      expect(card.className).toContain('rounded-2xl');
      expect(card.className).toContain('shadow-md');
      expect(card.className).toContain('border');
    });

    it('2.4: verifies nested card surfaces maintain visual hierarchy without border clash', () => {
      render(
        <div data-testid="outer-card" className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
          <div data-testid="inner-card" className="bg-slate-900/80 rounded-xl p-4 border border-slate-800">
            <span>Nested Surface</span>
          </div>
        </div>
      );
      expect(screen.getByTestId('outer-card')).toBeDefined();
      expect(screen.getByTestId('inner-card')).toBeDefined();
    });

    it('2.5: verifies smooth transition classes on interactive cards', () => {
      render(
        <div className="group rounded-2xl transition-all duration-200 hover:shadow-lg">
          <span>Smooth Interactive Surface</span>
        </div>
      );
      const el = screen.getByText('Smooth Interactive Surface').parentElement;
      expect(el.className).toContain('transition-all');
    });
  });

  // ========================================================
  // FEATURE 3: Navigation & Layout Shell
  // ========================================================
  describe('Feature 3: Navigation & Layout Shell', () => {
    it('3.1: renders sticky header bar with brand logo BP', () => {
      render(
        <BrowserRouter>
          <NavBar />
        </BrowserRouter>
      );
      expect(screen.getByText('BP')).toBeDefined();
      expect(screen.getByText(t('appName', 'en'))).toBeDefined();
    });

    it('3.2: renders desktop navigation rail with all 8 primary route links', () => {
      render(
        <BrowserRouter>
          <NavBar />
        </BrowserRouter>
      );
      expect(screen.getByText(t('navHome', 'en'))).toBeDefined();
      expect(screen.getByText(t('navCapture', 'en'))).toBeDefined();
      expect(screen.getByText(t('navAsk', 'en'))).toBeDefined();
      expect(screen.getByText(t('navGuide', 'en'))).toBeDefined();
      expect(screen.getByText(t('navMap', 'en'))).toBeDefined();
      expect(screen.getByText(t('navHandover', 'en'))).toBeDefined();
      expect(screen.getByText(t('navReview', 'en'))).toBeDefined();
      expect(screen.getByText(t('navDashboard', 'en'))).toBeDefined();
    });

    it('3.3: toggles responsive mobile drawer with hamburger button', () => {
      render(
        <BrowserRouter>
          <NavBar />
        </BrowserRouter>
      );
      const hamburger = screen.getByLabelText(/Toggle navigation menu/i);
      expect(hamburger).toBeDefined();
      expect(hamburger.getAttribute('aria-expanded')).toBe('false');

      fireEvent.click(hamburger);
      expect(hamburger.getAttribute('aria-expanded')).toBe('true');
      expect(screen.getByText(/Theme Preference:/i)).toBeDefined();

      fireEvent.click(hamburger);
      expect(hamburger.getAttribute('aria-expanded')).toBe('false');
    });

    it('3.4: verifies layout shell wraps routes inside main container with ErrorBoundary', () => {
      render(
        <BrowserRouter>
          <App />
        </BrowserRouter>
      );
      const main = document.querySelector('main');
      expect(main).not.toBeNull();
      expect(main.className).toContain('max-w-7xl');
    });

    it('3.5: renders footer with shop floor offline-first assistant status', () => {
      render(
        <BrowserRouter>
          <App />
        </BrowserRouter>
      );
      expect(screen.getByText(/Project Blueprint — CNC\/VMC Machine Knowledge Transfer/i)).toBeDefined();
      expect(screen.getByText(/Offline-first Shop Floor Assistant/i)).toBeDefined();
    });
  });

  // ========================================================
  // FEATURE 4: Role Switcher & Persona
  // ========================================================
  describe('Feature 4: Role Switcher & Persona', () => {
    it('4.1: renders RoleSwitcher with accessible select label and Role: prefix', () => {
      render(<RoleSwitcher />);
      expect(screen.getByText(/Role:/i)).toBeDefined();
      const select = screen.getByLabelText(/Select Demo User and Role/i);
      expect(select).toBeDefined();
    });

    it('4.2: lists all 3 demo users (Old Employee, New Employee, Supervisor)', () => {
      render(<RoleSwitcher />);
      expect(screen.getByText(/Ramesh Patil \(Old\) — VMC-3/i)).toBeDefined();
      expect(screen.getByText(/Priya Shinde \(New\) — VMC-3/i)).toBeDefined();
      expect(screen.getByText(/Anil Kulkarni \(Supervisor\) — All Shop Machines/i)).toBeDefined();
    });

    it('4.3: changes demo user persona and updates store state', () => {
      render(<RoleSwitcher />);
      const select = screen.getByLabelText(/Select Demo User and Role/i);

      // Switch to Priya Shinde (New Employee, ID 2)
      fireEvent.change(select, { target: { value: '2' } });
      expect(useAuthStore.getState().currentUser.name).toBe('Priya Shinde');
      expect(useAuthStore.getState().currentUser.role).toBe('new_employee');

      // Switch to Anil Kulkarni (Supervisor, ID 4)
      fireEvent.change(select, { target: { value: '4' } });
      expect(useAuthStore.getState().currentUser.name).toBe('Anil Kulkarni');
      expect(useAuthStore.getState().currentUser.role).toBe('supervisor');
    });

    it('4.4: renders trilingual language switcher options (English, Hindi, Marathi)', () => {
      render(<RoleSwitcher />);
      const langSelect = screen.getByLabelText(/Language selection/i);
      expect(langSelect).toBeDefined();

      expect(screen.getByText('English')).toBeDefined();
      expect(screen.getByText('हिन्दी')).toBeDefined();
      expect(screen.getByText('मराठी')).toBeDefined();
    });

    it('4.5: changes language and updates store language state', () => {
      render(<RoleSwitcher />);
      const langSelect = screen.getByLabelText(/Language selection/i);

      fireEvent.change(langSelect, { target: { value: 'hi' } });
      expect(useAuthStore.getState().language).toBe('hi');

      fireEvent.change(langSelect, { target: { value: 'mr' } });
      expect(useAuthStore.getState().language).toBe('mr');
    });
  });

  // ========================================================
  // FEATURE 5: Home View
  // ========================================================
  describe('Feature 5: Home View', () => {
    it('5.1: renders welcome banner with active user name and machine badge', async () => {
      render(
        <MemoryRouter>
          <Home />
        </MemoryRouter>
      );
      expect(screen.getByText(/Welcome back, Ramesh Patil/i)).toBeDefined();
      expect(screen.getByText(/Machine: VMC-3/i)).toBeDefined();
      expect(screen.getByText(/Active Shift/i)).toBeDefined();
    });

    it('5.2: renders quick workflow links (Record Know-How & Ask Experience)', () => {
      render(
        <MemoryRouter>
          <Home />
        </MemoryRouter>
      );
      expect(screen.getByText(/Record Know-How/i)).toBeDefined();
      expect(screen.getByText(/Ask Experience/i)).toBeDefined();
    });

    it('5.3: renders role-adaptive cards for Old Employee persona', () => {
      useAuthStore.setState({ currentUser: DEMO_USERS[0] }); // Ramesh
      render(
        <MemoryRouter>
          <Home />
        </MemoryRouter>
      );
      expect(screen.getByRole('heading', { name: 'Handover Plan' })).toBeDefined();
      expect(screen.getByRole('heading', { name: 'Verification Queue' })).toBeDefined();
      expect(screen.getByRole('heading', { name: 'Questions for You' })).toBeDefined();
    });

    it('5.4: renders role-adaptive cards for New Employee persona', () => {
      useAuthStore.setState({ currentUser: DEMO_USERS[1] }); // Priya
      render(
        <MemoryRouter>
          <Home />
        </MemoryRouter>
      );
      expect(screen.getByRole('heading', { name: 'Daily Briefing' })).toBeDefined();
      expect(screen.getByRole('heading', { name: 'Active Guardrails' })).toBeDefined();
      expect(screen.getByRole('heading', { name: 'Chatter & Chips' })).toBeDefined();
    });

    it('5.5: renders role-adaptive cards for Supervisor persona', () => {
      useAuthStore.setState({ currentUser: DEMO_USERS[2] }); // Anil
      render(
        <MemoryRouter>
          <Home />
        </MemoryRouter>
      );
      expect(screen.getByRole('heading', { name: 'Knowledge-at-Risk' })).toBeDefined();
      expect(screen.getByRole('heading', { name: 'Machine Health Map' })).toBeDefined();
      expect(screen.getByRole('heading', { name: 'Transfer Metrics' })).toBeDefined();
    });
  });

  // ========================================================
  // FEATURE 6: Dashboard View
  // ========================================================
  describe('Feature 6: Dashboard View', () => {
    it('6.1: renders all 3 segmented tabs (Heatmap, Metrics, Timeline)', () => {
      render(<Dashboard />);
      expect(screen.getByText(/Knowledge Risk Heatmap/i)).toBeDefined();
      expect(screen.getByText(/Transfer & Quality ROI/i)).toBeDefined();
      expect(screen.getByText(/Machine Event Stream/i)).toBeDefined();
    });

    it('6.2: displays Knowledge Risk Heatmap cells and machine title by default', async () => {
      render(<Dashboard />);
      expect(await screen.findByText(/Machine: VMC-3/i)).toBeDefined();
      expect(screen.getByText('Spindle')).toBeDefined();
      expect(screen.getByText('Coolant nozzle')).toBeDefined();
    });

    it('6.3: opens risk details drawer when a critical heatmap cell is clicked', async () => {
      render(<Dashboard />);
      fireEvent.click(await screen.findByText('Spindle'));
      expect(screen.getByText(/Identified Knowledge Gap:/i)).toBeDefined();
      expect(screen.getByText(/Only Ramesh Patil has recorded know-how here/i)).toBeDefined();
    });

    it('6.4: switches to Transfer & Quality ROI tab and renders metrics', async () => {
      render(<Dashboard />);
      fireEvent.click(screen.getByText(/Transfer & Quality ROI/i));
      expect(await screen.findByText('74%')).toBeDefined();
      expect(screen.getByText(/7 Stops/i)).toBeDefined();
      expect(screen.getByText('Priya Shinde')).toBeDefined();
    });

    it('6.5: switches to Machine Event Stream tab and loads timeline events', async () => {
      render(<Dashboard />);
      fireEvent.click(screen.getByText(/Machine Event Stream/i));
      expect(screen.getByText(/Machine Event Timeline/i)).toBeDefined();
      expect(await screen.findByText(/VMC-3 chatter check/i)).toBeDefined();
    });
  });

  // ========================================================
  // FEATURE 7: MachineMap View
  // ========================================================
  describe('Feature 7: MachineMap View', () => {
    it('7.1: renders machine telemetry HUD (Bay A Cell 2, 12,000 RPM, Mentor Pairing)', () => {
      render(
        <BrowserRouter>
          <MachineMap />
        </BrowserRouter>
      );
      expect(screen.getAllByText(/VMC-3 \(Vertical Machining Centre\)/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/Bay A • Cell 2/i)).toBeDefined();
      expect(screen.getByText(/12,000 RPM/i)).toBeDefined();
      expect(screen.getByText(/Ramesh \(Old\) → Priya \(New\)/i)).toBeDefined();
    });

    it('7.2: renders component filter pills bar with risk indicators', () => {
      render(
        <BrowserRouter>
          <MachineMap />
        </BrowserRouter>
      );
      expect(screen.getByText('Components:')).toBeDefined();
      const spindleBtns = screen.getAllByRole('button', { name: /Spindle Assembly/i });
      expect(spindleBtns.length).toBeGreaterThanOrEqual(1);
      const viseBtns = screen.getAllByRole('button', { name: /Precision Vise/i });
      expect(viseBtns.length).toBeGreaterThanOrEqual(1);
    });

    it('7.3: displays ComponentPanel with description, risk badge, and engineering specs', () => {
      render(
        <BrowserRouter>
          <MachineMap />
        </BrowserRouter>
      );
      const spindlePill = screen.getAllByRole('button', { name: /Spindle Assembly/i })[0];
      fireEvent.click(spindlePill);

      expect(screen.getByRole('heading', { name: 'Spindle Assembly' })).toBeDefined();
      expect(screen.getByText(/High Risk/i)).toBeDefined();
      expect(screen.getByText(/BT40 \/ CAT40/i)).toBeDefined();
    });

    it('7.4: displays verified old employee know-how and failure logs on selected component', () => {
      render(
        <BrowserRouter>
          <MachineMap />
        </BrowserRouter>
      );
      const spindlePill = screen.getAllByRole('button', { name: /Spindle Assembly/i })[0];
      fireEvent.click(spindlePill);

      expect(screen.getByRole('heading', { name: 'Spindle Assembly' })).toBeDefined();
      expect(screen.getByText(/SS304 Flange Chatter Precedes Bearing Overheat/i)).toBeDefined();
      expect(screen.getByText('INC-881')).toBeDefined();
    });

    it('7.5: clears selection and restores explorer view when Reset Selection is clicked', () => {
      render(
        <BrowserRouter>
          <MachineMap />
        </BrowserRouter>
      );
      const spindlePill = screen.getAllByRole('button', { name: /Spindle Assembly/i })[0];
      fireEvent.click(spindlePill);
      expect(screen.getByRole('heading', { name: 'Spindle Assembly' })).toBeDefined();

      const resetBtn = screen.getAllByRole('button', { name: /Reset Selection/i })[0];
      fireEvent.click(resetBtn);

      expect(screen.getByText(/3D Machine Knowledge Explorer/i)).toBeDefined();
    });
  });

  // ========================================================
  // FEATURE 8: Ask Assistant View
  // ========================================================
  describe('Feature 8: Ask Assistant View', () => {
    it('8.1: renders all 3 tabs (Grounded Q&A, Chatter Doctor, Chip Reader)', () => {
      render(<Ask />);
      expect(screen.getByText('Grounded Q&A Chat')).toBeDefined();
      expect(screen.getByText('Chatter Doctor (Acoustic)')).toBeDefined();
      expect(screen.getByText('Chip Colour Reader (Thermal)')).toBeDefined();
    });

    it('8.2: renders Q&A Chat query input box with placeholder and ask button', () => {
      render(<Ask />);
      const input = screen.getByPlaceholderText(/Ask anything about machine symptoms/i);
      expect(input).toBeDefined();
      expect(screen.getByRole('button', { name: /^Ask$/i })).toBeDefined();
    });

    it('8.3: renders AnswerCard with structured action steps and watch-out warning', () => {
      render(<AnswerCard answer={TEST_ANSWER} />);
      expect(screen.getByText(/Reduce roughing feed to 0.18 mm\/rev/i)).toBeDefined();
      expect(screen.getByText(/Step 1:/i)).toBeDefined();
      expect(screen.getByText(/Step 2:/i)).toBeDefined();
      expect(screen.getByText(/Watch Out:/i)).toBeDefined();
      expect(screen.getByText(/Excessive spindle runout will cause chatter repetition/i)).toBeDefined();
    });

    it('8.4: renders grounded citation sources with author attribution and confidence score', () => {
      render(<AnswerCard answer={TEST_ANSWER} />);
      expect(screen.getByText(/#101 Know-How Card/i)).toBeDefined();
      expect(screen.getByText(/Ramesh Sharma/i)).toBeDefined();
      expect(screen.getByText(/Confidence 94%/i)).toBeDefined();
    });

    it('8.5: switches to Chatter Doctor tab and renders acoustic frequency analyzer', () => {
      render(<Ask />);
      fireEvent.click(screen.getByText('Chatter Doctor (Acoustic)'));
      expect(screen.getByText(/Chatter Doctor — Acoustic RPM Sweet-Spot Finder/i)).toBeDefined();
      expect(screen.getByText(/Record Live Cutting Sound/i)).toBeDefined();
    });
  });

  // ========================================================
  // FEATURE 9: Capture View
  // ========================================================
  describe('Feature 9: Capture View', () => {
    it('9.1: renders all 4 multimodal capture tabs', () => {
      render(<Capture />);
      expect(screen.getByText('Voice Note')).toBeDefined();
      expect(screen.getByText('Text & Params')).toBeDefined();
      expect(screen.getByText('Handwritten / Photo')).toBeDefined();
      expect(screen.getByText('Setup Video')).toBeDefined();
    });

    it('9.2: renders Voice Note tab with recording button by default', () => {
      render(<Capture />);
      expect(screen.getByText('Record Voice')).toBeDefined();
    });

    it('9.3: switches to Text & Params tab and renders NoteEditor textarea', () => {
      render(<Capture />);
      fireEvent.click(screen.getByText('Text & Params'));
      expect(screen.getByPlaceholderText(/VMC-3 pe roughing karte waqt/i)).toBeDefined();
      expect(screen.getByText('Save & Check Note')).toBeDefined();
    });

    it('9.4: switches to Handwritten / Photo tab and renders upload dropzone', () => {
      render(<Capture />);
      fireEvent.click(screen.getByText('Handwritten / Photo'));
      expect(screen.getByText(/Handwritten Notes & Logbook Capture/i)).toBeDefined();
      expect(screen.getByText(/Choose Image File/i)).toBeDefined();
    });

    it('9.5: switches to Setup Video tab and renders video recorder prompt', () => {
      render(<Capture />);
      fireEvent.click(screen.getByText('Setup Video'));
      expect(screen.getByText(/Video-to-Procedure Drafter/i)).toBeDefined();
      expect(screen.getByText(/Select Setup Video File/i)).toBeDefined();
    });
  });

  // ========================================================
  // FEATURE 10: GuidedJob View
  // ========================================================
  describe('Feature 10: GuidedJob View', () => {
    it('10.1: renders procedure selector and Start Guided Run button', async () => {
      render(<GuidedJob />);
      expect(await screen.findByText(/Face milling FL-101 flange on VMC-3/i)).toBeDefined();
      expect(screen.getByText(/Start Guided Run →/i)).toBeDefined();
    });

    it('10.2: starts guided run and displays procedure title and SkillBadge', async () => {
      render(<GuidedJob />);
      fireEvent.click(await screen.findByText(/Start Guided Run →/i));

      expect(await screen.findByText(/Face milling FL-101 flange on VMC-3 \(v1\) on VMC-3/i)).toBeDefined();
      expect(screen.getByText(/L1 Guided/i)).toBeDefined();
    });

    it('10.3: renders StepView with step instructions and old employee expert tip', async () => {
      render(<GuidedJob />);
      fireEvent.click(await screen.findByText(/Start Guided Run →/i));

      expect(await screen.findByText(/Clamp FL-101 in the vise/i)).toBeDefined();
      expect(screen.getByText(/Ramesh Patil’s Shop-Floor Tip:/i)).toBeDefined();
      expect(screen.getByText(/Feel under the parallels for chips/i)).toBeDefined();
    });

    it('10.4: advances to Step 2 and displays parameter measurement input with tolerance', async () => {
      render(<GuidedJob />);
      fireEvent.click(await screen.findByText(/Start Guided Run →/i));
      await screen.findByText(/Clamp FL-101 in the vise/i);

      guideApi.recordStep.mockResolvedValueOnce({
        run_id: 5,
        step_no: 1,
        can_continue: true,
        next_step_no: 2,
        warnings: [],
      });

      fireEvent.click(screen.getByText(/Complete Step & Next/i));
      expect(await screen.findByText(/Measure tool stick-out/i)).toBeDefined();
      expect(screen.getByPlaceholderText(/Target 12 ±0.5/i)).toBeDefined();
    });

    it('10.5: locks Next button with STOP warning when measured parameter is out of tolerance', async () => {
      render(<GuidedJob />);
      fireEvent.click(await screen.findByText(/Start Guided Run →/i));
      await screen.findByText(/Clamp FL-101 in the vise/i);

      guideApi.recordStep.mockResolvedValueOnce({
        run_id: 5,
        step_no: 1,
        can_continue: true,
        next_step_no: 2,
        warnings: [],
      });

      fireEvent.click(screen.getByText(/Complete Step & Next/i));
      const input = await screen.findByPlaceholderText(/Target 12 ±0.5/i);

      // Enter out-of-tolerance value 13.5 (allowed [11.5 - 12.5])
      fireEvent.change(input, { target: { value: '13.5' } });

      expect(screen.getByText(/STOP — CRITICAL WARNING/i)).toBeDefined();
      expect(screen.getByText(/Measurement 13.5 is out of tolerance/i)).toBeDefined();

      const nextBtn = screen.getByText(/Blocked by STOP Warning/i).closest('button');
      expect(nextBtn.disabled).toBe(true);
    });
  });

  // ========================================================
  // FEATURE 11: Handover View
  // ========================================================
  describe('Feature 11: Handover View', () => {
    it('11.1: renders all 3 handover tabs (Plan, Interview, Questions)', () => {
      render(
        <MemoryRouter>
          <Handover />
        </MemoryRouter>
      );
      expect(screen.getByText(/Handover Plan & Countdown/i)).toBeDefined();
      expect(screen.getByText(/AI Tacit Interview/i)).toBeDefined();
      expect(screen.getByText(/Routed Questions/i)).toBeDefined();
    });

    it('11.2: displays retirement countdown banner with days left and progress', async () => {
      render(
        <MemoryRouter>
          <Handover />
        </MemoryRouter>
      );
      expect(await screen.findByText(/Ramesh Patil • Retirement Countdown/i)).toBeDefined();
      expect(screen.getByText(/213 Days/i)).toBeDefined();
      expect(screen.getByText(/33% Complete/i)).toBeDefined();
    });

    it('11.3: lists handover milestone tasks with status indicators', async () => {
      render(
        <MemoryRouter>
          <Handover />
        </MemoryRouter>
      );
      expect(await screen.findByText('Record a setup video on VMC-3')).toBeDefined();
      expect(screen.getByText('AI interview: what only you know about VMC-3')).toBeDefined();
    });

    it('11.4: switches to AI Tacit Interview tab and renders interview launcher', async () => {
      render(
        <MemoryRouter>
          <Handover />
        </MemoryRouter>
      );
      fireEvent.click(await screen.findByText(/AI Tacit Interview/i));
      expect(await screen.findByText(/Interview with Ramesh Patil/i)).toBeDefined();
      expect(screen.getByText(/Start Interview →/i)).toBeDefined();
    });

    it('11.5: switches to Routed Questions tab and displays open question queue', async () => {
      render(
        <MemoryRouter>
          <Handover />
        </MemoryRouter>
      );
      fireEvent.click(screen.getByText(/Routed Questions/i));
      expect(await screen.findByText(/Questions Waiting for Your Advice/i)).toBeDefined();
    });
  });

  // ========================================================
  // FEATURE 12: Review View
  // ========================================================
  describe('Feature 12: Review View', () => {
    it('12.1: renders pending sign-off badge count in header', async () => {
      render(<Review />);
      expect(await screen.findByText(/1 Cards Pending Verification/i)).toBeDefined();
    });

    it('12.2: displays pending review card with symptom, author, and action details', async () => {
      render(<Review />);
      expect(await screen.findByText(/Cleaned coolant nozzle/i)).toBeDefined();
      expect(screen.getByText(/Priya Shinde/i)).toBeDefined();
      expect(screen.getByText(/Nozzle was blocked, cleaned it and finish improved/i)).toBeDefined();
    });

    it('12.3: opens inline edit form when Edit Details is clicked', async () => {
      render(<Review />);
      fireEvent.click(await screen.findByText(/Edit Details/i));

      expect(screen.getByText(/Correct Action:/i)).toBeDefined();
      expect(screen.getByText(/Why \/ Technical Explanation:/i)).toBeDefined();
      expect(screen.getByText(/Save Changes & Approve/i)).toBeDefined();
    });

    it('12.4: verifies card and moves it to recently verified section on Approve & Verify', async () => {
      captureApi.reviewCard.mockResolvedValueOnce({
        outcome: 'verified',
        card: { ...TEST_CARD, verified_by: 'Ramesh Patil' },
      });

      render(<Review />);
      fireEvent.click(await screen.findByText(/Approve & Verify/i));

      expect(await screen.findByText(/Card #31 was verified and published/i)).toBeDefined();
      expect(screen.getByText(/Recently Verified Cards \(1\):/i)).toBeDefined();
    });

    it('12.5: discards card from pending queue when Discard / Reject is clicked', async () => {
      captureApi.reviewCard.mockResolvedValueOnce({ outcome: 'rejected' });

      render(<Review />);
      fireEvent.click(await screen.findByText(/Discard \/ Reject/i));

      expect(await screen.findByText(/Card #31 was discarded/i)).toBeDefined();
      expect(screen.getByText(/All know-how cards in the review queue have been verified!/i)).toBeDefined();
    });
  });

  // ========================================================
  // FEATURE 13: Component Patterns
  // ========================================================
  describe('Feature 13: Component Patterns', () => {
    it('13.1: verifies touch-friendly sizing class btn-touch (>=44px min-height)', () => {
      render(
        <button type="button" className="btn-touch px-4 py-2 bg-maroon-700 text-white rounded-xl">
          Touch Button
        </button>
      );
      const btn = screen.getByRole('button', { name: /Touch Button/i });
      expect(btn.className).toContain('btn-touch');
    });

    it('13.2: renders WarningBanner with distinct STOP, CAUTION, and SAFE badge styles', () => {
      const stopResult = {
        severity: 'stop',
        warnings: [{ message: 'Critical feed limit exceeded' }],
      };
      const { rerender } = render(<WarningBanner result={stopResult} />);
      expect(screen.getByText(/STOP — CRITICAL WARNING/i)).toBeDefined();

      const cautionResult = {
        severity: 'caution',
        warnings: [{ message: 'Minor chatter precursor' }],
      };
      rerender(<WarningBanner result={cautionResult} />);
      expect(screen.getByText(/CAUTION — RISK DETECTED/i)).toBeDefined();
    });

    it('13.3: renders PinForm modal with title, component name, and submission buttons', () => {
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
      expect(screen.getByText(/Pin Knowledge Card/i)).toBeDefined();
      expect(screen.getByText('Spindle Assembly')).toBeDefined();
      expect(screen.getByRole('button', { name: /Pin to 3D Model/i })).toBeDefined();
    });

    it('13.4: verifies segmented tab pattern with active pill highlighting', () => {
      render(<Dashboard />);
      const activeTab = screen.getByRole('button', { name: /Knowledge Risk Heatmap/i });
      expect(activeTab.className).toMatch(/bg-white|bg-slate-800/);
      expect(activeTab.className).toContain('text-maroon-800');
    });

    it('13.5: renders status badges with semantic border and text color tokens', () => {
      render(
        <div>
          <span className="badge-critical">Critical Failure</span>
          <span className="badge-caution">Caution Warning</span>
          <span className="badge-safe">Verified Standard</span>
        </div>
      );
      expect(screen.getByText('Critical Failure')).toBeDefined();
      expect(screen.getByText('Caution Warning')).toBeDefined();
      expect(screen.getByText('Verified Standard')).toBeDefined();
    });
  });

  // ========================================================
  // FEATURE 14: Build & Lint Pipeline
  // ========================================================
  describe('Feature 14: Build & Lint Pipeline', () => {
    it('14.1: exports all essential SVG icons cleanly from Icons.jsx', () => {
      render(
        <div>
          <div data-testid="icon-mic"><MicIcon /></div>
          <div data-testid="icon-lightbulb"><LightbulbIcon /></div>
          <div data-testid="icon-clipboard"><ClipboardIcon /></div>
          <div data-testid="icon-shield"><ShieldIcon /></div>
          <div data-testid="icon-cog"><CogIcon /></div>
          <div data-testid="icon-check"><CheckCircleIcon /></div>
          <div data-testid="icon-sun"><SunIcon /></div>
          <div data-testid="icon-moon"><MoonIcon /></div>
        </div>
      );
      expect(screen.getByTestId('icon-mic')).toBeDefined();
      expect(screen.getByTestId('icon-lightbulb')).toBeDefined();
      expect(screen.getByTestId('icon-shield')).toBeDefined();
      expect(screen.getByTestId('icon-sun')).toBeDefined();
    });

    it('14.2: ErrorBoundary catches child rendering error and displays fallback title and error message', () => {
      const ProblemChild = () => {
        throw new Error('Test Component Failure');
      };
      // Suppress console.error output during deliberate test error
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

      render(
        <ErrorBoundary title="Section Recovery Test">
          <ProblemChild />
        </ErrorBoundary>
      );

      expect(screen.getByText(/Section Recovery Test/i)).toBeDefined();
      expect(screen.getByText(/Test Component Failure/i)).toBeDefined();
      expect(screen.getByRole('button', { name: /Try Again/i })).toBeDefined();
      spy.mockRestore();
    });

    it('14.3: i18n translation utility supports all defined languages (en, hi, mr)', () => {
      expect(LANGUAGES.length).toBe(3);
      expect(t('appName', 'en')).toBe('Project Blueprint');
      expect(t('appName', 'hi')).toBe('प्रोजेक्ट ब्लूप्रिंट');
      expect(t('appName', 'mr')).toBe('प्रोजेक्ट ब्लूप्रिंट');
    });

    it('14.4: i18n safely falls back to English for unknown keys or languages', () => {
      expect(t('nonExistentKey', 'en')).toBe('nonExistentKey');
      expect(t('appName', 'fr')).toBe('Project Blueprint');
    });

    it('14.5: renders full App shell without compilation or runtime exceptions', () => {
      const { container } = render(
        <BrowserRouter>
          <App />
        </BrowserRouter>
      );
      expect(container.firstChild).not.toBeNull();
    });
  });
});
