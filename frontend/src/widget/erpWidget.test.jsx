import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ErpWidget from './erpWidget';
import * as guardianApi from '../api/guardian';
import * as guideApi from '../api/guide';

vi.mock('../api/guardian', () => ({ getWarnings: vi.fn() }));
vi.mock('../api/guide', () => ({ getBriefing: vi.fn() }));

const WORK_ORDER = {
  id: 'WO-9001', part: 'FL-101 flange', machine: 'VMC-3', machineId: 1, quantity: 20,
  operator: 'Priya Shinde', operatorId: 2,
};

describe('ErpWidget component (T25)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    guardianApi.getWarnings.mockResolvedValue({
      total: 2,
      items: [
        { id: 1, severity: 'caution', status: 'open', message: 'Maintenance is 41 days overdue.', evidence: [] },
        { id: 2, severity: 'stop', status: 'open', message: 'Feed 0.3 is above the 0.2 limit.', evidence: [] },
      ],
    });
    guideApi.getBriefing.mockResolvedValue({
      known_issues: ['VMC-3: chatter on SS304 above feed 0.2', 'VMC-3: clean vise jaws before clamping'],
    });
  });

  it('shows the work order, the worst open Guardian warning and real tips', async () => {
    render(<ErpWidget workOrder={WORK_ORDER} />);

    expect(screen.getByText('WO-9001: FL-101 flange')).toBeDefined();
    expect(await screen.findByText(/STOP — CRITICAL WARNING/i)).toBeDefined();
    expect(screen.getByText(/Feed 0.3 is above the 0.2 limit/)).toBeDefined();
    expect(screen.getByText(/chatter on SS304 above feed 0.2/)).toBeDefined();
    expect(guardianApi.getWarnings).toHaveBeenCalledWith(1, expect.anything());
    expect(guideApi.getBriefing).toHaveBeenCalledWith(2, expect.anything());
  });

  it('says so when Blueprint cannot be reached instead of showing made-up advice', async () => {
    guardianApi.getWarnings.mockRejectedValueOnce(new Error('backend down'));
    guideApi.getBriefing.mockRejectedValueOnce(new Error('backend down'));
    render(<ErpWidget workOrder={WORK_ORDER} />);

    expect(await screen.findByText(/Guardian warnings not loaded: backend down/)).toBeDefined();
    expect(await screen.findByText(/Briefing not loaded: backend down/)).toBeDefined();
  });

  it('triggers onLaunchGuide and onLaunchAsk callback events', () => {
    const onLaunchGuide = vi.fn();
    const onLaunchAsk = vi.fn();
    render(<ErpWidget workOrder={WORK_ORDER} onLaunchGuide={onLaunchGuide} onLaunchAsk={onLaunchAsk} />);

    fireEvent.click(screen.getByText(/Start Guided Run/i));
    expect(onLaunchGuide).toHaveBeenCalledWith(WORK_ORDER);
    fireEvent.click(screen.getByText(/Ask Question/i));
    expect(onLaunchAsk).toHaveBeenCalledWith(WORK_ORDER);
  });
});
