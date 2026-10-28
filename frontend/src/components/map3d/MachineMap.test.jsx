import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ComponentPanel from './ComponentPanel';
import PinForm from './PinForm';
import { VMC_COMPONENTS_DATA } from '../../api/map3d';

describe('3D Machine Knowledge Map Components (T21)', () => {
  const spindleComponent = VMC_COMPONENTS_DATA.find((c) => c.mesh_name === 'spindle');
  const viseComponent = VMC_COMPONENTS_DATA.find((c) => c.mesh_name === 'vise');

  it('renders ComponentPanel with spindle know-how, parameters and past incidents', () => {
    const handleClose = vi.fn();
    const handleOpenPinForm = vi.fn();
    const handleFocus = vi.fn();

    render(
      <BrowserRouter>
        <ComponentPanel
          component={spindleComponent}
          onClose={handleClose}
          onOpenPinForm={handleOpenPinForm}
          onFocusComponent={handleFocus}
        />
      </BrowserRouter>
    );

    // Component name and risk badge
    expect(screen.getByText('Spindle Assembly')).toBeDefined();
    expect(screen.getByText(/High Risk/i)).toBeDefined();

    // Engineering parameters
    expect(screen.getByText(/Engineering Parameters/i)).toBeDefined();
    expect(screen.getByText('12,000 RPM')).toBeDefined();
    expect(screen.getByText('BT40 / CAT40')).toBeDefined();

    // Old employee verified know-how
    expect(screen.getByText(/SS304 Flange Chatter Precedes Bearing Overheat/i)).toBeDefined();
    expect(screen.getAllByText(/Ramesh \(Old Employee\)/i).length).toBeGreaterThanOrEqual(1);

    // Historical failure incidents
    expect(screen.getByText('INC-881')).toBeDefined();
    expect(screen.getByText(/Severe 427 Hz chatter spike/i)).toBeDefined();

    // Action buttons
    const pinBtn = screen.getByRole('button', { name: /Pin Know-How/i });
    fireEvent.click(pinBtn);
    expect(handleOpenPinForm).toHaveBeenCalledWith(spindleComponent);

    const focusBtn = screen.getByRole('button', { name: /Focus View/i });
    fireEvent.click(focusBtn);
    expect(handleFocus).toHaveBeenCalledWith('spindle');
  });

  it('renders empty prompt when no component is selected', () => {
    render(
      <BrowserRouter>
        <ComponentPanel component={null} />
      </BrowserRouter>
    );

    expect(screen.getByText(/Select a 3D Component/i)).toBeDefined();
    expect(screen.getByText(/Click on any part of the 3D VMC model/i)).toBeDefined();
  });

  it('renders PinForm modal and submits a new pinned knowledge card', async () => {
    const handleClose = vi.fn();
    const handleSubmit = vi.fn().mockResolvedValue();

    render(
      <PinForm
        component={viseComponent}
        isOpen={true}
        onClose={handleClose}
        onSubmit={handleSubmit}
      />
    );

    expect(screen.getByText(/Pin Knowledge Card/i)).toBeDefined();
    expect(screen.getByText('Precision Milling Vise')).toBeDefined();

    // Fill in title and text
    const titleInput = screen.getByPlaceholderText(/e\.g\. Flange vibration/i);
    fireEvent.change(titleInput, { target: { value: 'Kurt Vise Jaw Tramming' } });

    const textArea = screen.getByPlaceholderText(/Explain the symptom/i);
    fireEvent.change(textArea, {
      target: {
        value: 'Ensure vise base is stoned clean and indicated within 0.005 mm across full jaw width.',
      },
    });

    // Select severity
    const select = screen.getByDisplayValue(/WATCH — Caution \/ Anomaly/i);
    fireEvent.change(select, { target: { value: 'info' } });

    // Submit form
    const submitBtn = screen.getByRole('button', { name: /Pin to 3D Model/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(handleSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          component_id: viseComponent.id,
          mesh_name: 'vise',
          title: 'Kurt Vise Jaw Tramming',
          text: 'Ensure vise base is stoned clean and indicated within 0.005 mm across full jaw width.',
          severity: 'info',
        })
      );
    });
  });
});
