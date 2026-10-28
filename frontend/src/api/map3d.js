import client from './client';

/**
 * 3D Machine Knowledge Map API client.
 * Connects to /machines/{id}/components and /components/{id}/knowledge.
 * Reference: PRD.md §9.4 and TASKS.md T12 / T21.
 */

/**
 * Seeded fallback components for VMC-3 when backend 3D router is offline or not yet mounted.
 */
export const VMC_COMPONENTS_DATA = [
  {
    id: 1,
    machine_id: 1,
    mesh_name: 'spindle',
    display_name: 'Spindle Assembly',
    category: 'Drive & Headstock',
    risk: 'high',
    incident_count: 5,
    status: 'High Chatter Risk',
    specs: {
      'Max RPM': '12,000 RPM',
      'Taper': 'BT40 / CAT40',
      'Drive Power': '15 kW Direct Drive',
      'Bearings': 'Ceramic Hybrid Angular Contact',
      'Coolant': 'Through-Spindle + Ring Nozzles',
    },
    position: [0, 1.45, -0.15],
    pin_position: [0, 1.85, 0.15],
    expert_notes: [
      {
        id: 101,
        author: 'Ramesh (Old Employee)',
        role: 'Master Machinist (18 yrs exp)',
        date: '12-Oct-2024',
        severity: 'stop',
        title: 'SS304 Flange Chatter Precedes Bearing Overheat',
        text: 'Above 8,000 RPM on SS304 roughing, spindle harmonics create 427 Hz chatter. Always verify pre-load and reduce feed to 0.15 mm/rev. Do not exceed 0.3 mm on finish pass.',
        verified: true,
      },
      {
        id: 102,
        author: 'Ramesh (Old Employee)',
        role: 'Master Machinist (18 yrs exp)',
        date: '24-Aug-2024',
        severity: 'watch',
        title: 'Spindle Lube Line & Thermal Growth Check',
        text: 'Check spindle chiller oil reservoir weekly before first shift. Spindle housing temp must remain below 55°C during continuous heavy cuts.',
        verified: true,
      },
    ],
    past_incidents: [
      {
        id: 'INC-881',
        date: '14-Oct-2024',
        type: 'Chatter Spike',
        summary: 'Severe 427 Hz chatter spike on VMC-3 during 50mm face milling. Part scrap avoided by operator feed override.',
      },
      {
        id: 'INC-742',
        date: '02-Sep-2024',
        type: 'Thermal Alarm',
        summary: 'Spindle temperature exceeded 56°C. Coolant return line was partially restricted by chip buildup.',
      },
      {
        id: 'INC-618',
        date: '11-Jun-2024',
        type: 'Bearing Pre-load',
        summary: 'Annual vibration spectrum analysis flagged 2.1 mm/s RMS on front bearings.',
      },
    ],
  },
  {
    id: 2,
    machine_id: 1,
    mesh_name: 'tool_holder',
    display_name: 'Tool Holder & ATC Carousel',
    category: 'Tooling & Magazine',
    risk: 'medium',
    incident_count: 2,
    status: 'Caution — Runout Check',
    specs: {
      'Magazine Capacity': '24 Tools',
      'Changer Type': 'Twin-Arm High Speed',
      'Tool Change Time': '2.2 sec',
      'Max Tool Weight': '7.0 kg',
      'Max Tool Diameter': '80 mm (adjacent empty: 120 mm)',
    },
    position: [-0.72, 1.55, -0.1],
    pin_position: [-0.78, 1.95, 0.15],
    expert_notes: [
      {
        id: 103,
        author: 'Ramesh (Old Employee)',
        role: 'Master Machinist (18 yrs exp)',
        date: '05-Sep-2024',
        severity: 'watch',
        title: 'BT40 Pull Stud & Collet Torque Check',
        text: 'ER32 collet must be torqued to 85 Nm using the bench torque fixture, never tightened by hand hammer. Inspect pull studs for wear marks before loading into magazine pockets.',
        verified: true,
      },
    ],
    past_incidents: [
      {
        id: 'INC-609',
        date: '20-Jul-2024',
        type: 'Axial Runout',
        summary: 'Tool pull stud looseness caused 0.08 mm axial runout on finishing pocket cut.',
      },
      {
        id: 'INC-431',
        date: '18-Mar-2024',
        type: 'ATC Jam',
        summary: 'Pocket #7 proximity sensor missed engagement due to dried coolant mist.',
      },
    ],
  },
  {
    id: 3,
    machine_id: 1,
    mesh_name: 'worktable',
    display_name: 'T-Slot Worktable & Ways',
    category: 'Axes & Table',
    risk: 'low',
    incident_count: 1,
    status: 'Normal Calibration',
    specs: {
      'Table Surface': '1000 x 500 mm',
      'T-Slot Geometry': '18 mm x 4 Longitudinal Slots',
      'Max Table Load': '600 kg',
      'X / Y Travel': '760 x 510 mm',
      'Rapid Traverse': '36 m/min',
    },
    position: [0, 0.65, 0.05],
    pin_position: [0.55, 0.85, 0.35],
    expert_notes: [
      {
        id: 104,
        author: 'Suresh (Old Employee)',
        role: 'Senior Toolmaker (22 yrs exp)',
        date: '18-Jun-2024',
        severity: 'info',
        title: 'T-Slot Stone Deburring Before Mounting',
        text: 'Stone the table top surface lightly before mounting fixtures or vises. Even a 0.02 mm chip burr under the vise throws bed parallelism out of tolerance.',
        verified: true,
      },
    ],
    past_incidents: [
      {
        id: 'INC-511',
        date: '12-May-2024',
        type: 'Cover Jam',
        summary: 'Fine metal fines jammed in rear Y-axis telescopic way covers. Cleaned and wipers replaced.',
      },
    ],
  },
  {
    id: 4,
    machine_id: 1,
    mesh_name: 'vise',
    display_name: 'Precision Milling Vise',
    category: 'Workholding Fixture',
    risk: 'low',
    incident_count: 0,
    status: 'Optimal — Trammed 0.005mm',
    specs: {
      'Model': 'Kurt 6-Inch AngLock Precision Vise',
      'Jaw Width': '152 mm (6.0 in)',
      'Jaw Opening': '225 mm',
      'Clamping Force': '35 kN at 90 Nm torque',
      'Bed Height': '73.0 ± 0.01 mm matched',
    },
    position: [0, 0.84, 0.0],
    pin_position: [0, 1.05, 0.25],
    expert_notes: [
      {
        id: 105,
        author: 'Ramesh (Old Employee)',
        role: 'Master Machinist (18 yrs exp)',
        date: '11-Nov-2024',
        severity: 'watch',
        title: 'Vise Jaw Clamping on SS304 Raw Billets',
        text: 'Clamp SS304 billets with serrated step jaws. Torque vise hex handle to 85 Nm. Always seat the workpiece with a dead-blow brass hammer onto parallels before tightening.',
        verified: true,
      },
    ],
    past_incidents: [],
  },
  {
    id: 5,
    machine_id: 1,
    mesh_name: 'control_panel',
    display_name: 'CNC Control Panel & Pendant',
    category: 'Control Interface',
    risk: 'low',
    incident_count: 1,
    status: 'Standby / Ready',
    specs: {
      'Controller': 'Fanuc 0i-MF / NextGen CNC',
      'Display': '15-Inch High-Contrast Color LCD',
      'Position Feedback': '0.001 mm Absolute Optical Scales',
      'Emergency Controls': 'Dual-contact safety E-Stop with yellow collar',
      'Tower Light': '3-Tier Industrial LED (Green / Amber / Red)',
    },
    position: [1.35, 1.45, 0.95],
    pin_position: [1.4, 1.8, 1.05],
    expert_notes: [
      {
        id: 106,
        author: 'Ramesh (Old Employee)',
        role: 'Master Machinist (18 yrs exp)',
        date: '08-Oct-2024',
        severity: 'watch',
        title: 'G54 Work Offset Zero Verification',
        text: 'Always dry run Z-axis at +50 mm clearance plane after touching off with the 3D edge finder before engaging Cycle Start.',
        verified: true,
      },
    ],
    past_incidents: [
      {
        id: 'INC-492',
        date: '19-Apr-2024',
        type: 'E-Stop Fault',
        summary: 'Emergency stop circuit intermittently tripped by strained pendant harness. Repinned and routed with strain relief.',
      },
    ],
  },
  {
    id: 6,
    machine_id: 1,
    mesh_name: 'doors',
    display_name: 'Enclosure Safety Doors',
    category: 'Safety & Interlocks',
    risk: 'low',
    incident_count: 0,
    status: 'Safety Interlock Engaged',
    specs: {
      'Viewing Glass': '12 mm Polycarbonate / Laminated Safety Glass',
      'Interlock Type': 'RFID Solenoid Locking Switch (Category 4 / PLe)',
      'Sealing': 'Twin Neoprene Coolant Wipers',
      'Action': 'Dual-slide counterbalanced guide rails',
    },
    position: [0, 1.35, 0.95],
    pin_position: [0.35, 1.55, 1.05],
    expert_notes: [
      {
        id: 107,
        author: 'Suresh (Old Employee)',
        role: 'Senior Toolmaker (22 yrs exp)',
        date: '14-Aug-2024',
        severity: 'stop',
        title: 'Never Bypass Door Interlock During High-Pressure Coolant',
        text: 'Never use bypass keys. High-pressure through-spindle coolant and potential carbide chipping at 10,000 RPM can pierce thin guards.',
        verified: true,
      },
    ],
    past_incidents: [],
  },
  {
    id: 7,
    machine_id: 1,
    mesh_name: 'machine_body',
    display_name: 'Machine Body, Base & Column',
    category: 'Structural Casting',
    risk: 'low',
    incident_count: 0,
    status: 'Foundation Balanced',
    specs: {
      'Bed Casting': 'Heavy-Ribbed Meehanite Cast Iron GC-300',
      'Machine Weight': '4,850 kg',
      'Footprint': '2,400 x 2,200 mm',
      'Leveling': '6 Vibration-Damping Leveling Wedges',
      'Chip Handling': 'Integrated Chute with Conveyor Trough',
    },
    position: [0, 1.35, 0],
    pin_position: [-0.95, 0.45, 0.85],
    expert_notes: [
      {
        id: 108,
        author: 'Ramesh (Old Employee)',
        role: 'Master Machinist (18 yrs exp)',
        date: '02-Jan-2024',
        severity: 'info',
        title: '6-Month Machine Bed Leveling Audit',
        text: 'Audit machine level with master 0.02 mm/m precision spirit level across X and Y leveling pads every six months.',
        verified: true,
      },
    ],
    past_incidents: [],
  },
];

/**
 * Fetch all components for a machine, with real API call and robust fallback.
 * @param {number|string} machineId
 * @param {AbortSignal} [signal]
 */
export const getComponents = async (machineId = 1, signal) => {
  try {
    const res = await client.get(`/machines/${machineId}/components`, { signal });
    if (res.data && Array.isArray(res.data) && res.data.length > 0) {
      return res.data;
    }
  } catch (_err) {
    // Graceful offline fallback using domain data
  }
  return VMC_COMPONENTS_DATA;
};

/**
 * Fetch detailed knowledge, incidents, and expert tips for a component.
 * @param {number|string} componentId
 * @param {Object} [params]
 * @param {AbortSignal} [signal]
 */
export const getComponentKnowledge = async (componentId, params, signal) => {
  try {
    const res = await client.get(`/components/${componentId}/knowledge`, { params, signal });
    if (res.data) {
      return res.data;
    }
  } catch (_err) {
    // Graceful offline fallback
  }

  const comp = VMC_COMPONENTS_DATA.find(
    (c) => c.id === Number(componentId) || c.mesh_name === componentId
  );
  if (comp) {
    return {
      component: comp,
      cards: comp.expert_notes,
      incidents: comp.past_incidents,
      specs: comp.specs,
    };
  }
  return null;
};

/**
 * Create a new pinned knowledge note for a 3D component.
 * @param {number|string} componentId
 * @param {Object} pinData
 */
export const createPin = async (componentId, pinData) => {
  try {
    const res = await client.post(`/components/${componentId}/pins`, pinData);
    return res.data;
  } catch (_err) {
    // Offline simulation returning a compliant card
    return {
      id: Date.now(),
      component_id: Number(componentId),
      title: pinData.title || 'Pinned Knowledge Note',
      text: pinData.text || '',
      severity: pinData.severity || 'watch',
      author: pinData.author || 'Priya (New Employee)',
      date: new Date().toISOString().split('T')[0],
      verified: false,
    };
  }
};

export default {
  VMC_COMPONENTS_DATA,
  getComponents,
  getComponentKnowledge,
  createPin,
};
