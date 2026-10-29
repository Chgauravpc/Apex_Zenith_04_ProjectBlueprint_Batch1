import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import GuidedJob from '../../pages/GuidedJob';
import StepView from './StepView';
import * as guideApi from '../../api/guide';
import { DEMO_USERS, useAuthStore } from '../../store/useAuthStore';

vi.mock('../../api/guide', () => ({
  getProcedures: vi.fn(),
  startRun: vi.fn(),
  recordStep: vi.fn(),
  getShadowTrace: vi.fn(),
  getTroubleshoot: vi.fn(),
}));

// Shapes match backend ProcedureSummary / GuidedRunOut / RunStepOut.
const STEPS = [
  {
    id: 11, step_no: 1, title: 'Clamp the flange', instruction: 'Clamp FL-101 in the vise.',
    component: 'Vise', param_name: null, target_value: null, tolerance: null,
    expert_tip: 'Feel under the parallels for chips.', expert_tip_author: 'Ramesh Patil', critical: false,
  },
  {
    id: 12, step_no: 2, title: 'Check stick-out', instruction: 'Measure tool stick-out.',
    component: 'Spindle', param_name: 'stick-out', param_unit: 'mm', target_value: 12, tolerance: 0.5,
    critical: true,
  },
];
const RUN = {
  run_id: 5, employee_id: 2, skill_level: 1, skill_label: 'Guided', view: 'full',
  procedure: {
    id: 1, key: 'vmc3-fl101-face', title: 'Face milling FL-101 flange on VMC-3', machine_id: 1,
    machine: 'VMC-3', version: 1, status: 'approved', steps_count: 2, author: 'Ramesh Patil', steps: STEPS,
  },
};

const startGuidedRun = async () => {
  render(<GuidedJob />);
  fireEvent.click(await screen.findByText(/Start Guided Run/i));
  await screen.findByText(/Clamp FL-101 in the vise/i);
};

describe('GuidedJob page and components (T22)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ currentUser: DEMO_USERS[1] });
    guideApi.getProcedures.mockResolvedValue([
      { id: 1, title: 'Face milling FL-101 flange on VMC-3', version: 1, steps_count: 2, author: 'Ramesh Patil' },
    ]);
    guideApi.startRun.mockResolvedValue(RUN);
  });

  it('starts a real run: procedure, steps, skill badge and the old employee’s tip', async () => {
    await startGuidedRun();

    expect(guideApi.startRun).toHaveBeenCalledWith({ employee_id: 2, procedure_id: 1 });
    expect(screen.getByText(/Face milling FL-101 flange on VMC-3 \(v1\) on VMC-3/i)).toBeDefined();
    expect(screen.getByText(/L1 Guided/i)).toBeDefined();
    expect(screen.getByText(/Ramesh Patil’s Shop-Floor Tip/i)).toBeDefined();
  });

  it('a stop from the backend keeps the operator on the step', async () => {
    guideApi.recordStep
      .mockResolvedValueOnce({ run_id: 5, step_no: 1, passed: true, warnings: [], can_continue: true, next_step_no: 2, run_status: 'running' })
      .mockResolvedValueOnce({
        run_id: 5, step_no: 2, passed: false, can_continue: false, next_step_no: null, run_status: 'running',
        warnings: [{ rule: 'param_limit', severity: 'stop', message: 'Feed 0.3 is above the SS304 limit 0.2', evidence: [] }],
      });
    await startGuidedRun();

    fireEvent.click(screen.getByText(/Complete Step & Next/i));
    expect(await screen.findByText(/Measure tool stick-out/i)).toBeDefined();

    fireEvent.change(screen.getByPlaceholderText(/Target 12 ±0.5/i), { target: { value: '12.2' } });
    fireEvent.click(screen.getByText(/Complete Run/i));

    expect(await screen.findByText(/Feed 0.3 is above the SS304 limit/i)).toBeDefined();
    expect(guideApi.recordStep).toHaveBeenLastCalledWith(5, { step_no: 2, value: 12.2, values: {}, notes: null });
    expect(screen.getByText(/Measure tool stick-out/i)).toBeDefined();
    expect(screen.getByPlaceholderText(/Target 12 ±0.5/i).value).toBe('12.2');
  });

  it('triggers STOP warning and blocks Next button when measurement is out of tolerance', () => {
    const mockStep = {
      title: 'Check tool stick-out on 12mm endmill',
      instruction: 'Verify gauge length is less than 35 mm.',
      param_name: 'Tool Overhang',
      param_unit: 'mm',
      target_value: 32.0,
      tolerance: 3.0, // allowed: [29.0, 35.0]
    };

    const onCompleteStep = vi.fn();

    render(
      <StepView
        step={mockStep}
        stepIndex={2}
        totalSteps={4}
        skillLevel={1}
        onCompleteStep={onCompleteStep}
      />
    );

    const input = screen.getByPlaceholderText(/Target 32 ±3/i);

    // Enter out-of-tolerance value: 40 mm (> 35)
    fireEvent.change(input, { target: { value: '40.0' } });

    // Confirm STOP alert is shown, without made-up repair advice
    expect(screen.getByText(/STOP — CRITICAL WARNING/i)).toBeDefined();
    expect(screen.getByText(/Measurement 40 is out of tolerance \[29.00 – 35.00\]/i)).toBeDefined();
    expect(screen.queryByText(/re-align clamp/i)).toBeNull();

    // Confirm next button is blocked
    const nextBtn = screen.getByText(/Blocked by STOP Warning/i).closest('button');
    expect(nextBtn.disabled).toBe(true);
    fireEvent.click(nextBtn);
    expect(onCompleteStep).not.toHaveBeenCalled();

    // Now enter valid in-tolerance value: 31.5 mm
    fireEvent.change(input, { target: { value: '31.5' } });

    // Warning cleared, button enabled
    expect(screen.queryByText(/STOP — CRITICAL WARNING/i)).toBeNull();
    const activeBtn = screen.getByText(/Complete Step & Next/i).closest('button');
    expect(activeBtn.disabled).toBe(false);

    fireEvent.click(activeBtn);
    expect(onCompleteStep).toHaveBeenCalledTimes(1);
    expect(onCompleteStep).toHaveBeenCalledWith(
      expect.objectContaining({
        step_no: 3,
        value: 31.5,
      })
    );
  });

  it('sends the machine settings used at a step for the limit check', async () => {
    const onCompleteStep = vi.fn().mockResolvedValue(true);
    render(
      <StepView
        step={{ step_no: 4, title: 'Rough face', instruction: 'Rough face at 0.15', params: { feed: 0.15, depth: 1 } }}
        stepIndex={3}
        totalSteps={6}
        onCompleteStep={onCompleteStep}
      />
    );
    const feed = screen.getByLabelText('Setting feed');
    expect(feed.value).toBe('0.15'); // prefilled from the procedure
    fireEvent.change(feed, { target: { value: '0.3' } });
    fireEvent.click(screen.getByText(/Complete Step & Next/i));

    await waitFor(() =>
      expect(onCompleteStep).toHaveBeenCalledWith(
        expect.objectContaining({ step_no: 4, values: { feed: 0.3, depth: 1 } })
      )
    );
  });

  it('loads ShadowTrace and the troubleshooting tree from the API', async () => {
    guideApi.getShadowTrace.mockResolvedValue({
      procedure_id: 1, title: 'Face milling', author: 'Ramesh Patil', video_url: null,
      steps: [{ step_no: 1, instruction: 'Clamp FL-101 in the vise.', components_checked: ['Vise'] }],
    });
    guideApi.getTroubleshoot.mockResolvedValue([
      {
        symptom: 'chatter', label: 'Chatter', incidents: 4,
        causes: [{ cause: 'Worn spindle bearing', count: 3, share: 0.75, frequency: '75% of past incidents', fix: 'Reduce feed to 0.15', fix_author: 'Ramesh Patil' }],
      },
    ]);
    await startGuidedRun();

    fireEvent.click(screen.getByText(/ShadowTrace™/i));
    expect(await screen.findByText(/Ramesh Patil’s Gold-Standard Run/i)).toBeDefined();

    fireEvent.click(screen.getByText('Troubleshoot'));
    fireEvent.click(await screen.findByText(/Chatter \(4 past incidents\)/i));
    expect(screen.getByText(/Reduce feed to 0.15/i)).toBeDefined();
    await waitFor(() => expect(guideApi.getTroubleshoot).toHaveBeenCalledWith(1, expect.anything()));
  });

  it('a step without a measurement never raises a false STOP', () => {
    render(<StepView step={STEPS[0]} stepIndex={0} totalSteps={2} skillLevel={1} />);
    expect(screen.queryByText(/STOP/)).toBeNull();
    expect(screen.getByText(/Complete Step & Next/i).closest('button').disabled).toBe(false);
  });
});
