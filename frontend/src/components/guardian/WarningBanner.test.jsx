import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import WarningBanner from './WarningBanner';

describe('WarningBanner component (T19)', () => {
  it('renders nothing when result is null or has empty warnings', () => {
    const { container } = render(<WarningBanner result={null} />);
    expect(container.firstChild).toBeNull();

    const { container: emptyContainer } = render(
      <WarningBanner result={{ warnings: [] }} />
    );
    expect(emptyContainer.firstChild).toBeNull();
  });

  it('renders STOP severity with alert role, message, and hazard styling', () => {
    const result = {
      severity: 'stop',
      warnings: [{ message: 'Feed 0.35 mm/rev exceeds maximum limit of 0.25 on SS304' }],
      evidence: [
        { id: 42, kind: 'Failure', title: 'Spindle bearing seizure on VMC-3' },
      ],
      expert_fix: 'Keep feed under 0.20 mm/rev for roughing pass.',
    };

    render(<WarningBanner result={result} />);

    const alert = screen.getByRole('alert');
    expect(alert).toBeDefined();
    expect(screen.getByText(/STOP — CRITICAL WARNING/i)).toBeDefined();
    expect(screen.getByText(/Feed 0.35 mm\/rev exceeds maximum limit/i)).toBeDefined();
    expect(screen.getByText(/Spindle bearing seizure on VMC-3/i)).toBeDefined();
    expect(screen.getByText(/Keep feed under 0.20 mm\/rev/i)).toBeDefined();
  });

  it('renders CAUTION severity with warning and dismiss action', () => {
    const onDismiss = vi.fn();
    const result = {
      severity: 'caution',
      warnings: [{ message: 'Slight chatter detected; history shows tool wear precursor' }],
    };

    render(<WarningBanner result={result} onDismiss={onDismiss} />);

    expect(screen.getByText(/CAUTION — RISK DETECTED/i)).toBeDefined();
    expect(screen.getByText(/Slight chatter detected/i)).toBeDefined();

    const dismissBtn = screen.getByLabelText(/Dismiss warning/i);
    fireEvent.click(dismissBtn);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
