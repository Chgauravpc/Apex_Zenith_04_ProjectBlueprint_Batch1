import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Dashboard from '../../pages/Dashboard';
import * as transferApi from '../../api/transfer';
import * as machinesApi from '../../api/machines';

vi.mock('../../api/transfer', () => ({ getRisk: vi.fn(), getMetrics: vi.fn() }));
vi.mock('../../api/machines', () => ({ getMachines: vi.fn(), getTimeline: vi.fn() }));

// Shapes match backend RiskCell / TransferMetrics / TimelineOut.
const RISK = [
  {
    machine_id: 1, component_id: null, name: 'VMC-3', cards: 18, holders: 1, bus: 0, coverage: 100,
    expert: 'Ramesh Patil', expert_id: 1, expert_leaving_on: '2027-05-29', status: 'critical',
  },
  {
    machine_id: 1, component_id: 1, name: 'VMC-3 · Spindle', cards: 9, holders: 1, bus: 0, coverage: 100,
    expert: 'Ramesh Patil', expert_id: 1, expert_leaving_on: '2027-05-29', status: 'critical',
  },
  {
    machine_id: 1, component_id: 4, name: 'VMC-3 · Coolant nozzle', cards: 3, holders: 2, bus: 2, coverage: 100,
    expert: 'Suresh Jadhav', expert_id: 3, expert_leaving_on: null, status: 'ok',
  },
];

const METRICS = {
  coverage: 74, parts_total: 23, parts_at_risk: 6, verified_cards: 40, pending_review: 5,
  guardian_stops: 7, guardian_cautions: 11, warnings_with_fix: 9, questions_routed: 3,
  questions_answered: 2, handover_progress: 40,
  new_employees: [
    { employee_id: 2, employee: 'Priya Shinde', days_on_job: 30, independent_ops: 0, trained_ops: 2, clean_runs: 1 },
  ],
};

describe('Dashboard page and components (T24)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    transferApi.getRisk.mockResolvedValue(RISK);
    transferApi.getMetrics.mockResolvedValue(METRICS);
    machinesApi.getMachines.mockResolvedValue([{ id: 1, name: 'VMC-3' }, { id: 3, name: 'Lathe-2' }]);
    machinesApi.getTimeline.mockResolvedValue({
      machine_id: 1,
      machine: 'VMC-3',
      total: 1,
      limit: 20,
      offset: 0,
      items: [
        {
          id: 7, machine_id: 1, kind: 'warning', ref_type: 'warning', ref_id: 3,
          summary: 'STOP: feed 0.3 is above the SS304 limit 0.2', occurred_at: '2026-10-27T11:42:00',
        },
      ],
    });
  });

  it('renders tabs and the risk heatmap from /transfer/risk', async () => {
    render(<Dashboard />);

    expect(screen.getByText(/Knowledge Risk Heatmap/i)).toBeDefined();
    expect(screen.getByText(/Transfer & Quality ROI/i)).toBeDefined();
    expect(screen.getByText(/Machine Event Stream/i)).toBeDefined();

    expect(await screen.findByText(/Machine: VMC-3/i)).toBeDefined();
    expect(screen.getByText('Spindle')).toBeDefined();
    expect(screen.getByText('Coolant nozzle')).toBeDefined();
    expect(screen.getAllByText(/BF: 0/i).length).toBe(1);
  });

  it('opens details drawer when a cell is clicked', async () => {
    render(<Dashboard />);

    fireEvent.click(await screen.findByText('Spindle'));

    expect(screen.getByText(/Identified Knowledge Gap:/i)).toBeDefined();
    expect(screen.getByText(/Only Ramesh Patil has recorded know-how here/i)).toBeDefined();
  });

  it('shows metrics counted by the backend', async () => {
    render(<Dashboard />);
    fireEvent.click(screen.getByText(/Transfer & Quality ROI/i));

    expect(await screen.findByText('74%')).toBeDefined();
    expect(screen.getByText(/7 Stops/i)).toBeDefined();
    expect(screen.getByText('2/3')).toBeDefined();
    expect(screen.getByText('Priya Shinde')).toBeDefined();
  });

  it('shows the machine timeline from /machines/{id}/timeline', async () => {
    render(<Dashboard />);
    fireEvent.click(screen.getByText(/Machine Event Stream/i));

    expect(screen.getByText(/Machine Event Timeline/i)).toBeDefined();
    expect(await screen.findByText(/feed 0.3 is above the SS304 limit/i)).toBeDefined();
    expect(machinesApi.getTimeline).toHaveBeenCalledWith(1, { limit: 20 }, expect.anything());
  });

  it('shows an error with retry when the API fails', async () => {
    transferApi.getRisk.mockRejectedValueOnce(new Error('backend down'));
    render(<Dashboard />);

    expect(await screen.findByText(/Could not load: backend down/i)).toBeDefined();
    fireEvent.click(screen.getByText('Retry'));
    expect(await screen.findByText(/Machine: VMC-3/i)).toBeDefined();
  });
});
