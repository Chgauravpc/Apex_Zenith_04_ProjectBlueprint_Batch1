import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ErpWidget from './erpWidget';

describe('ErpWidget component (T25)', () => {
  it('renders work order context, Guardian warning, and pre-job tips', () => {
    render(<ErpWidget />);

    expect(screen.getByText(/WO-8842/i)).toBeDefined();
    expect(screen.getByText(/SS304 Precision Flange/i)).toBeDefined();
    expect(screen.getByText(/CAUTION — RISK DETECTED/i)).toBeDefined();
    expect(screen.getByText(/Prior setup on VMC-3 had chatter/i)).toBeDefined();
    expect(screen.getByText(/Vise parallel bar chip trap/i)).toBeDefined();
    expect(screen.getByText(/Ramesh Sharma \(Old Employee\)/i)).toBeDefined();
  });

  it('triggers onLaunchGuide and onLaunchAsk callback events', () => {
    const onLaunchGuide = vi.fn();
    const onLaunchAsk = vi.fn();

    render(
      <ErpWidget
        onLaunchGuide={onLaunchGuide}
        onLaunchAsk={onLaunchAsk}
      />
    );

    const guideBtn = screen.getByText(/Start Guided Run/i);
    fireEvent.click(guideBtn);
    expect(onLaunchGuide).toHaveBeenCalledTimes(1);

    const askBtn = screen.getByText(/Ask Question/i);
    fireEvent.click(askBtn);
    expect(onLaunchAsk).toHaveBeenCalledTimes(1);
  });
});
