/**
 * Note Guardian Warning Demonstration Dataset.
 * Clearly labeled synthetic demonstration data for VMC-3 Spindle chatter incident.
 *
 * NOTE: This is purely simulated demo data for UI/UX demonstration.
 * No real CNC machine has been diagnosed or connected to backend detection.
 */

export const GUARDIAN_DEMO_INCIDENT = {
  id: 'DEMO-INC-VMC3-01',
  isDemo: true,
  label: '[DEMO DATA · SIMULATED INCIDENT]',
  disclaimer:
    'Demonstration Scenario: This is simulated demo data for training and evaluation. No physical CNC machine has been diagnosed.',
  machine_id: 1,
  machine_name: 'VMC-3 (Vertical Machining Centre)',
  component_id: 'spindle',
  component_name: 'Spindle Assembly',
  severity: 'stop',
  severity_label: 'STOP — CRITICAL CHATTER HARMONIC',
  title: 'Abnormal 427 Hz Chatter on Spindle during SS304 Roughing',
  detected_at: 'Just now (Simulated live telemetry)',
  symptom:
    'Severe regenerative chatter spike at 427 Hz frequency coinciding with 0.35 mm/rev feed override at 8,200 RPM on SS304 stainless billet.',
  details: {
    acoustic_peak: '427 Hz (Amplitude: +14.2 dB above baseline noise threshold)',
    vibration_velocity: '4.8 mm/s RMS on front ceramic bearing collar (Safe limit: < 2.0 mm/s)',
    risk_assessment:
      'Imminent tool insert micro-fracture and ceramic spindle bearing race brinelling within 45 seconds of continuous cutting.',
    material: 'SS304 Stainless Steel (Tensile 505 MPa, BHN 215)',
    tool: '50mm Face Mill, 4 Flute TiAlN Coated Carbide Inserts',
  },
  historical_evidence: [
    {
      id: 'INC-881',
      date: '14-Oct-2024',
      type: 'Chatter Spike & Thermal Alarm',
      summary:
        'VMC-3 spindle suffered 427 Hz harmonic resonance during SS304 face milling. Part scrap prevented only because operator hit Feed Hold.',
      cited_source: 'VMC-3 Maintenance & QC Incident Log',
      similarity: '98% match on frequency & material',
    },
    {
      id: 'PRECURSOR-03',
      date: '02-Sep-2024',
      type: 'Bearing Overheat Precursor',
      summary:
        'Continuous cutting under 420–440 Hz chatter caused spindle housing temperature to rise by 18°C in 6 minutes, triggering thermal shutdown.',
      cited_source: 'Note Guardian Failure Precursor Matrix',
      similarity: 'Bearing thermal escalation match',
    },
    {
      id: 'QC-441',
      date: '19-Aug-2024',
      type: 'Surface Waviness Rejection',
      summary:
        'SS304 flange rejected due to 6.3 µm Ra waviness caused by running at 8,100 RPM with 55 mm tool stick-out.',
      cited_source: 'QC Inspection Report',
      similarity: 'Setup parameter mismatch',
    },
  ],
  expert_guidance: {
    author: 'Ramesh (Old Employee)',
    role: 'Master Machinist (18 yrs exp)',
    verification_status: 'Verified Old Employee Standard',
    immediate_actions: [
      '1. Immediately press FEED HOLD or reduce Feed Override to 50% (< 0.15 mm/rev).',
      '2. Shift spindle RPM down from 8,200 RPM to stable sweet-spot of 7,200 RPM (drops out of 427 Hz harmonic zone).',
      '3. Verify tool stick-out does not exceed 40 mm (each 5 mm reduction halves harmonic vibration).',
      '4. Ensure through-spindle coolant is delivering > 20 bar to flush chips away from cutter teeth.',
    ],
    ramesh_golden_rule:
      'Ramesh says: "On this VMC-3, 8,000 to 8,400 RPM is the death zone for SS304. Drop to 7,200 RPM and it cuts like butter without heating the spindle bearings."',
  },
};

export default GUARDIAN_DEMO_INCIDENT;
