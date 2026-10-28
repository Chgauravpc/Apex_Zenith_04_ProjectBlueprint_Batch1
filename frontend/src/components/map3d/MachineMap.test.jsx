import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ComponentPanel from './ComponentPanel';
import PinForm from './PinForm';
import GuardianDemoBanner from './GuardianDemoBanner';
import { VMC_COMPONENTS_DATA } from '../../api/map3d';
import { GUARDIAN_DEMO_INCIDENT } from '../../data/guardianDemoIncident';

describe('3D Machine Knowledge Map Components (T21)', () => {
  const spindleComponent = VMC_COMPONENTS_DATA.find((c) => c.mesh_name === 'spindle');
  const viseComponent = VMC_COMPONENTS_DATA.find((c) => c.mesh_name === 'vise');

  it('renders ComponentPanel with component name, description, knowledge counts, expert tips, and troubleshooting', () => {
    const handleReset = vi.fn();
    const handleOpenPinForm = vi.fn();
    const handleFocus = vi.fn();

    render(
      <BrowserRouter>
        <ComponentPanel
          component={spindleComponent}
          onClose={handleReset}
          onResetSelection={handleReset}
          onOpenPinForm={handleOpenPinForm}
          onFocusComponent={handleFocus}
        />
      </BrowserRouter>
    );

    // Component name and risk badge
    expect(screen.getByText('Spindle Assembly')).toBeDefined();
    expect(screen.getByText(/High Risk/i)).toBeDefined();

    // Knowledge Count summary badge and counters
    expect(screen.getByText(/Knowledge Count:/i)).toBeDefined();
    expect(screen.getAllByText(/Expert Tips/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Guides/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Incidents/i).length).toBeGreaterThanOrEqual(1);

    // Short description
    expect(screen.getByText(/Component Description/i)).toBeDefined();
    expect(screen.getByText(/High-speed precision cartridge spindle/i)).toBeDefined();

    // Placeholder for expert knowledge
    expect(screen.getByText(/Expert Knowledge & Tacit Know-How/i)).toBeDefined();

    // Engineering parameters
    expect(screen.getByText(/Engineering Parameters/i)).toBeDefined();
    expect(screen.getByText('12,000 RPM')).toBeDefined();
    expect(screen.getByText('BT40 / CAT40')).toBeDefined();

    // Associated expert tips authored by Ramesh (Old Employee)
    expect(screen.getByText(/SS304 Flange Chatter Precedes Bearing Overheat/i)).toBeDefined();
    expect(screen.getAllByText(/Ramesh \(Old Employee\)/i).length).toBeGreaterThanOrEqual(1);

    // Dedicated Troubleshooting guidance section
    expect(screen.getByText(/Troubleshooting Guidance/i)).toBeDefined();
    expect(screen.getByText(/Headstock Chatter & Vibration/i)).toBeDefined();
    expect(screen.getByText(/Probable Cause:/i)).toBeDefined();
    expect(screen.getByText(/Step-by-Step Diagnostic Checks:/i)).toBeDefined();
    expect(screen.getByText(/Ramesh: "Don’t just crank down feed override blindly/i)).toBeDefined();

    // Historical failure incidents
    expect(screen.getByText('INC-881')).toBeDefined();
    expect(screen.getByText(/Severe 427 Hz chatter spike/i)).toBeDefined();
    expect(screen.getByText(/Chatter Harmonic Spike/i)).toBeDefined();

    // Action buttons & Reset Selection
    const pinBtn = screen.getByRole('button', { name: /Pin New Know-How Card/i });
    fireEvent.click(pinBtn);
    expect(handleOpenPinForm).toHaveBeenCalledWith(spindleComponent);

    const focusBtn = screen.getByRole('button', { name: /Focus View/i });
    fireEvent.click(focusBtn);
    expect(handleFocus).toHaveBeenCalledWith('spindle');

    // Reset selection option
    const resetBtns = screen.getAllByRole('button', { name: /Reset/i });
    expect(resetBtns.length).toBeGreaterThanOrEqual(1);
    fireEvent.click(resetBtns[0]);
    expect(handleReset).toHaveBeenCalled();
  });

  it('renders active Note Guardian demo incident in ComponentPanel with evidence and Ramesh advice', () => {
    render(
      <BrowserRouter>
        <ComponentPanel
          component={spindleComponent}
          activeDemoIncident={GUARDIAN_DEMO_INCIDENT}
        />
      </BrowserRouter>
    );

    // Clearly labeled demo alert and severity
    expect(screen.getByText(/\[DEMO DATA · SIMULATED INCIDENT\]/i)).toBeDefined();
    expect(screen.getByText(/STOP — CRITICAL CHATTER HARMONIC/i)).toBeDefined();
    expect(screen.getByText(/Abnormal 427 Hz Chatter on Spindle during SS304 Roughing/i)).toBeDefined();

    // Telemetry
    expect(screen.getAllByText(/427 Hz/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/4.8 mm\/s/i)).toBeDefined();

    // Cited Historical evidence
    expect(screen.getByText(/Cited Historical Evidence:/i)).toBeDefined();
    expect(screen.getByText(/98% match on frequency & material/i)).toBeDefined();

    // Ramesh's expert guidance
    expect(screen.getByText(/Expert Guidance \(Ramesh \(Old Employee\)\)/i)).toBeDefined();
    expect(screen.getByText(/Shift spindle RPM down from 8,200 RPM to stable sweet-spot of 7,200 RPM/i)).toBeDefined();
    expect(screen.getByText(/8,000 to 8,400 RPM is the death zone for SS304/i)).toBeDefined();

    // Demo disclaimer
    expect(screen.getByText(/No physical CNC machine has been diagnosed/i)).toBeDefined();
  });

  it('handles Note Guardian warning demo banner interactions', () => {
    const handleSelect = vi.fn();
    const handleDismiss = vi.fn();

    // Initial inactive state
    const { rerender } = render(
      <GuardianDemoBanner
        isActive={false}
        onSelectIncident={handleSelect}
        onDismissIncident={handleDismiss}
      />
    );

    expect(screen.getByText(/\[DEMO DATA · SIMULATED INCIDENT\]/i)).toBeDefined();
    expect(screen.getByText(/Abnormal 427 Hz Chatter on Spindle during SS304 Roughing/i)).toBeDefined();

    // Click inspect in 3D
    const inspectBtn = screen.getByRole('button', { name: /Inspect Incident in 3D/i });
    fireEvent.click(inspectBtn);
    expect(handleSelect).toHaveBeenCalledWith(GUARDIAN_DEMO_INCIDENT);

    // Active state
    rerender(
      <GuardianDemoBanner
        isActive={true}
        onSelectIncident={handleSelect}
        onDismissIncident={handleDismiss}
      />
    );

    // Shows clear demo button
    const clearBtn = screen.getByRole('button', { name: /Clear Demo/i });
    expect(clearBtn).toBeDefined();
    fireEvent.click(clearBtn);
    expect(handleDismiss).toHaveBeenCalled();
  });

  it('toggles troubleshooting guidance items accordion for a component', () => {
    render(
      <BrowserRouter>
        <ComponentPanel component={spindleComponent} />
      </BrowserRouter>
    );

    expect(screen.getByText(/Troubleshooting Guidance/i)).toBeDefined();
    expect(screen.getByText(/Headstock Chatter & Vibration/i)).toBeDefined();

    // Second troubleshooting guide button
    const secondGuideBtn = screen.getByText(/Spindle Taper Tool Sticking/i);
    expect(secondGuideBtn).toBeDefined();
    fireEvent.click(secondGuideBtn);

    expect(screen.getByText(/Thermal expansion vacuum or dry bellville washer/i)).toBeDefined();
    expect(screen.getByText(/Never strike a stuck tool holder with a mallet/i)).toBeDefined();
  });

  it('renders empty prompt when no component is selected, with assembly shortcuts', () => {
    const handleSelect = vi.fn();

    render(
      <BrowserRouter>
        <ComponentPanel component={null} onSelectComponent={handleSelect} />
      </BrowserRouter>
    );

    expect(screen.getByText(/3D Machine Knowledge Explorer/i)).toBeDefined();
    expect(screen.getByText(/Click on any part of the 3D VMC model/i)).toBeDefined();

    // Assembly buttons
    const viseShortcut = screen.getByRole('button', { name: /Precision Vise/i });
    expect(viseShortcut).toBeDefined();
    fireEvent.click(viseShortcut);
    expect(handleSelect).toHaveBeenCalledWith('vise');
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

  it('attaches knowledge with procedure type and stable component ID', async () => {
    const handleClose = vi.fn();
    const handleSubmit = vi.fn().mockResolvedValue();

    render(
      <PinForm
        component={spindleComponent}
        isOpen={true}
        onClose={handleClose}
        onSubmit={handleSubmit}
      />
    );

    // Select procedure type
    const procedureTypeBtn = screen.getByRole('button', { name: /Procedure/i });
    fireEvent.click(procedureTypeBtn);

    const titleInput = screen.getByPlaceholderText(/e\.g\. Flange vibration/i);
    fireEvent.change(titleInput, { target: { value: 'Spindle Chiller Flush SOP' } });

    const textArea = screen.getByPlaceholderText(/Explain the symptom/i);
    fireEvent.change(textArea, {
      target: {
        value: 'Step 1: Shut off chiller pump. Step 2: Flush lines with solvent. Step 3: Refill with Mobil Velocite No. 6.',
      },
    });

    const submitBtn = screen.getByRole('button', { name: /Attach & Pin to 3D Model/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(handleSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          component_id: 1, // Stable component ID for spindle
          mesh_name: 'spindle',
          title: 'Spindle Chiller Flush SOP',
          knowledge_type: 'procedure',
          type: 'procedure',
          description: 'Step 1: Shut off chiller pump. Step 2: Flush lines with solvent. Step 3: Refill with Mobil Velocite No. 6.',
        })
      );
    });
  });

  it('renders attached operating procedures when present on a component', () => {
    const componentWithProcedures = {
      ...spindleComponent,
      procedures: [
        {
          id: 'SOP-101',
          title: 'Pre-Shift Ceramic Bearing Spindle Warmup',
          description: 'Run spindle at 3,000 RPM for 3 mins, then 6,000 RPM for 3 mins before cutting.',
          author: 'Ramesh (Old Employee)',
          date: '28-Oct-2024',
        },
      ],
    };

    render(
      <BrowserRouter>
        <ComponentPanel component={componentWithProcedures} />
      </BrowserRouter>
    );

    expect(screen.getByText(/Operating Procedures \(SOPs\)/i)).toBeDefined();
    expect(screen.getByText(/Pre-Shift Ceramic Bearing Spindle Warmup/i)).toBeDefined();
    expect(screen.getByText(/Run spindle at 3,000 RPM for 3 mins/i)).toBeDefined();
  });

  it('verifies stable component IDs for all machine assemblies', () => {
    const expectedIds = {
      spindle: 1,
      tool_holder: 2,
      worktable: 3,
      vise: 4,
      control_panel: 5,
      doors: 6,
      machine_body: 7,
    };

    VMC_COMPONENTS_DATA.forEach((comp) => {
      expect(comp.id).toBe(expectedIds[comp.mesh_name]);
    });
  });
});
