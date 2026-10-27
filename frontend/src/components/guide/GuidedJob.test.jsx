import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import GuidedJob from '../../pages/GuidedJob';
import StepView from './StepView';

describe('GuidedJob page and components (T22)', () => {
  it('renders procedure title, step 1 instructions, and skill badge', () => {
    render(<GuidedJob />);

    expect(screen.getByText(/VMC-3 SS304 Flange Face & Bore Setup/i)).toBeDefined();
    expect(screen.getAllByText(/Wipe vise jaws and set work stop/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/L4 Master/i)).toBeDefined(); // Ramesh is default user (old_employee = L4)
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

    // Confirm STOP alert is shown
    expect(screen.getByText(/STOP — CRITICAL WARNING/i)).toBeDefined();
    expect(screen.getByText(/Measurement 40 is out of tolerance/i)).toBeDefined();

    // Confirm next button is blocked
    const nextBtn = screen.getByText(/Blocked by STOP Warning/i).closest('button');
    expect(nextBtn).toBeDefined();
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

  it('toggles ShadowTrace and Troubleshoot panels on the page', () => {
    render(<GuidedJob />);

    // Click ShadowTrace toggle
    const shadowBtn = screen.getByText(/ShadowTrace™/i);
    fireEvent.click(shadowBtn);
    expect(screen.getByText(/ShadowTrace™ Reference Player/i)).toBeDefined();

    // Click Troubleshoot toggle
    const troubleBtn = screen.getByText(/Troubleshoot/i);
    fireEvent.click(troubleBtn);
    expect(screen.getByText(/Diagnostic Decision Tree/i)).toBeDefined();
  });
});
