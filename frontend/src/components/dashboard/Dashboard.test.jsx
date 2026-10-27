import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Dashboard from '../../pages/Dashboard';

describe('Dashboard page and components (T24)', () => {
  it('renders Dashboard tabs and displays Risk Heatmap with bus-factor cells', () => {
    render(<Dashboard />);

    expect(screen.getByText(/Knowledge Risk Heatmap/i)).toBeDefined();
    expect(screen.getByText(/Transfer & Quality ROI/i)).toBeDefined();
    expect(screen.getByText(/Machine Event Stream/i)).toBeDefined();

    // Verify machine matrix
    expect(screen.getByText(/Machine: VMC-3/i)).toBeDefined();
    expect(screen.getByText(/Spindle & Bearings/i)).toBeDefined();
    expect(screen.getByText(/Tool Changer Arm/i)).toBeDefined();
    expect(screen.getAllByText(/BF: 1/i).length).toBeGreaterThan(0);
  });

  it('opens details drawer when a cell in Risk Heatmap is clicked', () => {
    render(<Dashboard />);

    const spindleCell = screen.getByText(/Spindle & Bearings/i);
    fireEvent.click(spindleCell);

    expect(screen.getByText(/Identified Knowledge Gap:/i)).toBeDefined();
    expect(screen.getByText(/High-speed bearing thermal expansion/i)).toBeDefined();
    expect(screen.getAllByText(/Ramesh Sharma/i).length).toBeGreaterThan(0);
  });

  it('switches to Metrics tab and renders time-to-independence reduction', () => {
    render(<Dashboard />);

    const metricsTab = screen.getByText(/Transfer & Quality ROI/i);
    fireEvent.click(metricsTab);

    expect(screen.getByText(/Time-to-Independence/i)).toBeDefined();
    expect(screen.getByText(/42 Days/i)).toBeDefined();
    expect(screen.getByText(/-65% faster/i)).toBeDefined();
    expect(screen.getByText(/Guardian Halts Prevented/i)).toBeDefined();
  });

  it('switches to Timeline tab and renders activity stream', () => {
    render(<Dashboard />);

    const timelineTab = screen.getByText(/Machine Event Stream/i);
    fireEvent.click(timelineTab);

    expect(screen.getByText(/Machine Event Timeline/i)).toBeDefined();
    expect(screen.getByText(/Spindle feed rate 0.35 mm\/rev exceeded limit/i)).toBeDefined();
  });
});
