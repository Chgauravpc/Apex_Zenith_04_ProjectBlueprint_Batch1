/**
 * Component-specific Machining Knowledge Demo Dataset.
 * Pinned tacit know-how, expert tips, past failure incidents,
 * and troubleshooting guidance authored by Ramesh (Old Employee, 18 yrs exp).
 *
 * Dedicated local demo data for the 3D Machine Knowledge Map (T21).
 */

export const COMPONENT_KNOWLEDGE_DEMO = {
  spindle: {
    id: 1,
    machine_id: 1,
    mesh_name: 'spindle',
    display_name: 'Spindle Assembly',
    category: 'Drive & Headstock',
    description:
      'High-speed precision cartridge spindle with ceramic hybrid angular contact bearings. Driven by a 15 kW direct-drive motor up to 12,000 RPM. Houses the BT40 taper tool holder and internal coolant channels.',
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
    pin_position: [0, 1.95, 0.05],
    expert_tips: [
      {
        id: 101,
        author: 'Ramesh (Old Employee)',
        role: 'Master Machinist (18 yrs exp)',
        date: '12-Oct-2024',
        severity: 'stop',
        title: 'SS304 Flange Chatter Precedes Bearing Overheat',
        text: 'Above 8,000 RPM on SS304 roughing, spindle harmonics create 427 Hz chatter. Always verify pre-load and reduce feed to 0.15 mm/rev. Do not exceed 0.3 mm on finish pass.',
        cue: '👂 High-pitched 427 Hz metallic ringing from headstock',
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
        cue: '🌡️ Spindle jacket infrared probe reads > 50°C',
        verified: true,
      },
      {
        id: 103,
        author: 'Ramesh (Old Employee)',
        role: 'Master Machinist (18 yrs exp)',
        date: '15-Jul-2024',
        severity: 'info',
        title: 'Pre-Shift Warm-Up Cycle',
        text: 'Always run 10-minute stepped warm-up (3,000 → 6,000 → 9,000 RPM) if the machine stood idle for > 4 hours to distribute ceramic bearing grease uniformly.',
        cue: '⏱️ Run warm-up subprogram O9001 before roughing',
        verified: true,
      },
    ],
    past_incidents: [
      {
        id: 'INC-881',
        date: '14-Oct-2024',
        type: 'Chatter Harmonic Spike',
        summary: 'Severe 427 Hz chatter spike on VMC-3 during 50mm face milling. Part scrap avoided by operator feed override.',
        root_cause: 'Cutter overhang exceeded 4x diameter; tool pulled out 0.12 mm under radial load.',
        resolution: 'Ramesh shortened tool stick-out to 45 mm and reduced spindle speed to 7,450 RPM.',
        downtime: '45 mins',
      },
      {
        id: 'INC-742',
        date: '02-Sep-2024',
        type: 'Thermal Alarm Overheat',
        summary: 'Spindle housing temperature reached 56.4°C triggering automatic axis interlock.',
        root_cause: 'Coolant return line was partially restricted by chip buildup inside radiator fins.',
        resolution: 'Flushed chiller coil and set low-limit temperature sensor trip to 52°C.',
        downtime: '1 hr 20 mins',
      },
      {
        id: 'INC-618',
        date: '11-Jun-2024',
        type: 'Front Bearing Vibration',
        summary: 'Annual vibration spectrum analysis flagged 2.1 mm/s RMS on front bearings.',
        root_cause: 'Minor micro-spalling on outer raceway after heavy interrupted cut.',
        resolution: 'Ramesh inspected pre-load spacer ring and scheduled preventative ceramic bearing swap.',
        downtime: '3 hrs',
      },
    ],
    troubleshooting: [
      {
        id: 'TB-SP-01',
        title: 'Headstock Chatter & Vibration',
        symptom: 'Rhythmic metallic hum or visible ripple marks (chatter) on finished workpiece surface.',
        probable_cause: 'Resonant harmonic frequency match between tool tooth-pass and spindle natural frequency.',
        steps: [
          'Touch spindle housing with vibration pen — measure RMS velocity (must stay < 1.8 mm/s).',
          'Reduce spindle RPM by 12% to drop below 427 Hz resonance peak or switch to variable-pitch end mill.',
          'Check collet taper runout with a 0.002 mm dial test indicator (DTI) at tool tip.',
        ],
        ramesh_tip:
          'Ramesh: "Don’t just crank down feed override blindly — adjust RPM first. On this machine, 7,200 RPM cuts glass-smooth where 8,100 RPM chatters violently."',
      },
      {
        id: 'TB-SP-02',
        title: 'Spindle Taper Tool Sticking',
        symptom: 'Loud popping bang or ATC arm error during tool unclamp sequence.',
        probable_cause: 'Thermal expansion vacuum or dry bellville washer drawbar spring stack.',
        steps: [
          'Check pneumatic line pressure on the rear FRL unit (minimum 6.2 bar required for drawbar cylinder).',
          'Inspect internal taper for micro-fretting corrosion or dried coolant varnish.',
          'Apply thin film of Klüber spindle grease to retention knob pull studs.',
        ],
        ramesh_tip:
          'Ramesh: "Never strike a stuck tool holder with a mallet. Tap the manual unclamp foot pedal while gently rocking the holder with leather gloves."',
      },
    ],
  },

  tool_holder: {
    id: 2,
    machine_id: 1,
    mesh_name: 'tool_holder',
    display_name: 'Tool Holder & ATC Carousel',
    category: 'Tooling & Magazine',
    description:
      'Precision BT40 tool holder with ER32 collet chuck securing the cutting tool, paired with a 24-tool automatic tool changer (ATC) twin-arm carousel magazine for rapid 2.2-second tool changes.',
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
    pin_position: [-0.85, 1.95, 0.15],
    expert_tips: [
      {
        id: 104,
        author: 'Ramesh (Old Employee)',
        role: 'Master Machinist (18 yrs exp)',
        date: '05-Sep-2024',
        severity: 'watch',
        title: 'BT40 Pull Stud & Collet Torque Check',
        text: 'ER32 collet must be torqued to 85 Nm using the bench torque fixture, never tightened by hand hammer. Inspect pull studs for wear marks before loading into magazine pockets.',
        cue: '🔧 Use calibrated torque wrench on collet nut',
        verified: true,
      },
      {
        id: 105,
        author: 'Ramesh (Old Employee)',
        role: 'Master Machinist (18 yrs exp)',
        date: '19-Jun-2024',
        severity: 'info',
        title: 'ATC Arm Gripper Spring Tension',
        text: 'Inspect twin-arm claw plunger springs monthly. If chips accumulate behind the spring plunger, tool drops during rapid rotation can occur.',
        cue: '👁️ Check claw closure gap with feeler gauge',
        verified: true,
      },
    ],
    past_incidents: [
      {
        id: 'INC-609',
        date: '20-Jul-2024',
        type: 'Axial Runout In Finishing',
        summary: 'Tool pull stud looseness caused 0.08 mm axial runout on finishing pocket cut.',
        root_cause: 'Pull stud thread was hand-tightened without Loctite 243 threadlocker.',
        resolution: 'Ramesh instituted standard pull stud torque protocol with torque adapter.',
        downtime: '30 mins',
      },
      {
        id: 'INC-431',
        date: '18-Mar-2024',
        type: 'ATC Magazine Jam',
        summary: 'Pocket #7 proximity sensor missed engagement due to dried coolant mist.',
        root_cause: 'Optical reflection obscured by fine aerosol mist in carousel housing.',
        resolution: 'Cleaned sensor lens and adjusted shutter gap to 1.5 mm.',
        downtime: '20 mins',
      },
    ],
    troubleshooting: [
      {
        id: 'TB-TH-01',
        title: 'Excessive Tool Runout (> 0.01 mm)',
        symptom: 'Premature edge wear on carbide end mill teeth or uneven bore dimensions.',
        probable_cause: 'Collet seat contaminated with fine chips or uneven torque on ER nut.',
        steps: [
          'Disassemble collet and clean taper cavity with brass wire brush and degreaser.',
          'Measure runout at collet face and 50 mm out using a 2-micron dial test indicator.',
          'If runout exceeds 0.008 mm, replace ER32 collet — do not attempt to re-grind.',
        ],
        ramesh_tip:
          'Ramesh: "One tiny chip trapped in the collet slit causes 0.03 mm runout. Always wipe both mating cones with dry microfiber before inserting the cutter."',
      },
      {
        id: 'TB-TH-02',
        title: 'Tool Changer Arm Misalignment',
        symptom: 'Metallic scraping sound when ATC twin-arm grips the spindle tool holder.',
        probable_cause: 'Z-axis tool change position offset drift or arm keyway wear.',
        steps: [
          'Check parameter 1815 (Z-axis reference point) and verify Z-height at G30 tool change position.',
          'Manually jog arm to 90° position with E-stop engaged and inspect key engagement.',
          'Verify twin-arm clamping dogs snap freely onto the retention groove.',
        ],
        ramesh_tip:
          'Ramesh: "When jogging the ATC arm in manual maintenance mode, keep one hand on the red E-stop knob at all times."',
      },
    ],
  },

  worktable: {
    id: 3,
    machine_id: 1,
    mesh_name: 'worktable',
    display_name: 'T-Slot Worktable & Ways',
    category: 'Axes & Table',
    description:
      'Heavy cast Meehanite iron table (1000 x 500 mm) with 4 precision ground longitudinal T-slots for fixture clamping. Mounted on rigid linear guide ways with stainless telescopic way covers.',
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
    pin_position: [0.65, 0.95, 0.35],
    expert_tips: [
      {
        id: 106,
        author: 'Ramesh (Old Employee)',
        role: 'Master Machinist (18 yrs exp)',
        date: '18-Jun-2024',
        severity: 'watch',
        title: 'T-Slot Stone Deburring Before Mounting',
        text: 'Stone the table top surface lightly before mounting fixtures or vises. Even a 0.02 mm chip burr under the vise throws bed parallelism out of tolerance.',
        cue: '🪨 Rub fine India oilstone flat across T-slot lands',
        verified: true,
      },
      {
        id: 107,
        author: 'Ramesh (Old Employee)',
        role: 'Master Machinist (18 yrs exp)',
        date: '04-Apr-2024',
        severity: 'info',
        title: 'Way Cover Wiper Inspection',
        text: 'Clean telescopic stainless way covers daily. Wipe old gummy grease away from brass scrapers so chips cannot slide into ballscrew balls.',
        cue: '🧹 Inspect wipers for chips jammed under lip',
        verified: true,
      },
    ],
    past_incidents: [
      {
        id: 'INC-511',
        date: '12-May-2024',
        type: 'Way Cover Telescopic Jam',
        summary: 'Fine metal fines jammed in rear Y-axis telescopic way covers during deep pocket milling.',
        root_cause: 'Polyurethane wiper seal was worn flat allowing cast iron dust to pack behind section 3.',
        resolution: 'Cleaned sliding guides, fitted new bronze wipers, and re-torqued spring dampeners.',
        downtime: '1 hr 15 mins',
      },
    ],
    troubleshooting: [
      {
        id: 'TB-WT-01',
        title: 'Table Out of Level / Parallelism Loss',
        symptom: 'Part thickness varies across X-axis length (e.g. 0.04 mm taper over 400 mm cut).',
        probable_cause: 'Burr beneath fixture, un-trammed table bed, or chips trapped under subplate.',
        steps: [
          'Remove fixture and stone the table top with a flat India oilstone and solvent.',
          'Mount 0.002 mm dial indicator on spindle nose and sweep 600 mm across X and Y.',
          'Verify table flatness is within 0.010 mm full sweep.',
        ],
        ramesh_tip:
          'Ramesh: "Before blaming the ballscrew, feel the underside of your vise base. 9 times out of 10, there is a hardened metal splinter stuck to the steel."',
      },
    ],
  },

  vise: {
    id: 4,
    machine_id: 1,
    mesh_name: 'vise',
    display_name: 'Precision Milling Vise',
    category: 'Workholding Fixture',
    description:
      'Kurt-style 6-inch precision milling vise clamped to table T-slots with hardened ground jaws. Delivers up to 35 kN clamping force at 90 Nm torque to securely hold billets during heavy cutting.',
    risk: 'low',
    incident_count: 0,
    status: 'Optimal — Trammed 0.005mm',
    specs: {
      Model: 'Kurt 6-Inch AngLock Precision Vise',
      'Jaw Width': '152 mm (6.0 in)',
      'Jaw Opening': '225 mm',
      'Clamping Force': '35 kN at 90 Nm torque',
      'Bed Height': '73.0 ± 0.01 mm matched',
    },
    position: [0, 0.84, 0.0],
    pin_position: [-0.25, 1.15, 0.25],
    expert_tips: [
      {
        id: 108,
        author: 'Ramesh (Old Employee)',
        role: 'Master Machinist (18 yrs exp)',
        date: '11-Nov-2024',
        severity: 'watch',
        title: 'Vise Jaw Clamping on SS304 Raw Billets',
        text: 'Clamp SS304 billets with serrated step jaws. Torque vise hex handle to 85 Nm. Always seat the workpiece with a dead-blow brass hammer onto parallels before tightening.',
        cue: '🔨 Tap down workpiece until parallels do not rattle',
        verified: true,
      },
      {
        id: 109,
        author: 'Ramesh (Old Employee)',
        role: 'Master Machinist (18 yrs exp)',
        date: '14-Oct-2024',
        severity: 'info',
        title: 'Stationary Jaw Tramming Standard',
        text: 'Always indicate the solid stationary jaw to within 0.005 mm across 150 mm using a lever DTI. Never clamp against movable jaw without equalizing torque.',
        cue: '📐 Dial indicator needle deviation ≤ 2.5 marks',
        verified: true,
      },
    ],
    past_incidents: [
      {
        id: 'INC-398',
        date: '09-Jan-2024',
        type: 'Workpiece Lift Under Heavy Cut',
        summary: 'Billet pulled up 0.15 mm during 12 mm roughing end mill cut, creating depth step.',
        root_cause: 'Operator did not tap billet down onto parallels after initial clamping.',
        resolution: 'Ramesh retrained shift operators on the parallel pinch tap check.',
        downtime: '15 mins',
      },
    ],
    troubleshooting: [
      {
        id: 'TB-VS-01',
        title: 'Workpiece Lifting During Jaw Tightening',
        symptom: 'Parallels beneath billet become loose or workpiece tilts upwards by 0.02–0.05 mm.',
        probable_cause: 'Movable jaw lift due to worn spherical segment or lack of lubrication on thrust bearing.',
        steps: [
          'Clean chips out of internal needle thrust bearing cavity and apply Moly grease.',
          'Seat workpiece with brass hammer while holding 50% clamp torque, then torque to 85 Nm.',
          'Try sliding parallels with fingers — both parallels must be solidly pinched.',
        ],
        ramesh_tip:
          'Ramesh: "If you can wiggle the ground parallel with your fingers after tightening, stop! Your part is riding up. Loosen, tap, and re-torque."',
      },
    ],
  },

  control_panel: {
    id: 5,
    machine_id: 1,
    mesh_name: 'control_panel',
    display_name: 'CNC Control Panel & Pendant',
    category: 'Control Interface',
    description:
      'Ergonomic swiveling CNC pendant featuring a high-contrast display screen, coordinate DRO readouts, membrane keypad, emergency stop, cycle controls, and 3-tier status tower stack light.',
    risk: 'low',
    incident_count: 1,
    status: 'Standby / Ready',
    specs: {
      Controller: 'Fanuc 0i-MF / NextGen CNC',
      Display: '15-Inch High-Contrast Color LCD',
      'Position Feedback': '0.001 mm Absolute Optical Scales',
      'Emergency Controls': 'Dual-contact safety E-Stop with yellow collar',
      'Tower Light': '3-Tier Industrial LED (Green / Amber / Red)',
    },
    position: [1.35, 1.45, 0.95],
    pin_position: [1.45, 1.85, 1.05],
    expert_tips: [
      {
        id: 110,
        author: 'Ramesh (Old Employee)',
        role: 'Master Machinist (18 yrs exp)',
        date: '08-Oct-2024',
        severity: 'stop',
        title: 'G54 Work Offset Zero Verification',
        text: 'Always dry run Z-axis at +50 mm clearance plane after touching off with the 3D edge finder before engaging Cycle Start.',
        cue: '👁️ Verify G54 Z on DRO screen before hitting Green button',
        verified: true,
      },
      {
        id: 111,
        author: 'Ramesh (Old Employee)',
        role: 'Master Machinist (18 yrs exp)',
        date: '15-Aug-2024',
        severity: 'watch',
        title: 'Feed Hold Safety Habit',
        text: 'On first part after setup, keep left thumb resting on RED Feed Hold button and right hand on Rapid Override knob set to 25%.',
        cue: '🔴 Thumb on Feed Hold during first plunge',
        verified: true,
      },
    ],
    past_incidents: [
      {
        id: 'INC-492',
        date: '19-Apr-2024',
        type: 'E-Stop Fault Intermittent',
        summary: 'Emergency stop circuit intermittently tripped by strained pendant harness.',
        root_cause: 'Swivel bracket was rotated beyond 180° limit stop, pinching safety loop cable.',
        resolution: 'Ramesh repinned wires and installed mechanical limit stopper collar on swivel arm.',
        downtime: '40 mins',
      },
    ],
    troubleshooting: [
      {
        id: 'TB-CP-01',
        title: 'Axis Interlock / Not Ready Alarm (AL-1002)',
        symptom: 'Machine refuses to jog; NC alarm screen shows AXIS INTERLOCK or SERVO NOT READY.',
        probable_cause: 'Pendant E-stop contact open, door safety limit switch tripped, or lube pressure low.',
        steps: [
          'Check physical E-stop buttons (pendant, chip conveyor, and rear electrical cabinet).',
          'Verify door RFID sensor green LED is steady on (not flashing yellow).',
          'Inspect waypoint lubrication reservoir level switch on diagnostic screen D450.0.',
        ],
        ramesh_tip:
          'Ramesh: "90% of Not Ready alarms on this Fanuc controller are caused by the central lube oil reservoir dropping below the minimum float switch."',
      },
    ],
  },

  doors: {
    id: 6,
    machine_id: 1,
    mesh_name: 'doors',
    display_name: 'Enclosure Safety Doors',
    category: 'Safety & Interlocks',
    description:
      'Twin sliding safety enclosure doors with 12 mm impact-resistant polycarbonate observation windows and interlock switches, containing high-pressure coolant spray and flying chips.',
    risk: 'low',
    incident_count: 0,
    status: 'Safety Interlock Engaged',
    specs: {
      'Viewing Glass': '12 mm Polycarbonate / Laminated Safety Glass',
      'Interlock Type': 'RFID Solenoid Locking Switch (Category 4 / PLe)',
      Sealing: 'Twin Neoprene Coolant Wipers',
      Action: 'Dual-slide counterbalanced guide rails',
    },
    position: [0, 1.35, 0.95],
    pin_position: [0.55, 1.65, 1.05],
    expert_tips: [
      {
        id: 112,
        author: 'Ramesh (Old Employee)',
        role: 'Master Machinist (18 yrs exp)',
        date: '14-Aug-2024',
        severity: 'stop',
        title: 'Never Bypass Door Interlock During High-Pressure Coolant',
        text: 'Never use bypass keys. High-pressure through-spindle coolant (70 bar) and potential carbide chipping at 10,000 RPM can pierce thin guards.',
        cue: '🔒 Ensure solenoid lock engagement click is heard',
        verified: true,
      },
      {
        id: 113,
        author: 'Ramesh (Old Employee)',
        role: 'Master Machinist (18 yrs exp)',
        date: '22-May-2024',
        severity: 'info',
        title: 'Door Guide Rail Chip Clearance',
        text: 'Blow out bottom door track every evening shift. Metal shavings cake with coolant residue and jam the nylon sliding rollers.',
        cue: '🚪 Door should slide with light two-finger effort',
        verified: true,
      },
    ],
    past_incidents: [
      {
        id: 'INC-310',
        date: '14-Feb-2024',
        type: 'Door Switch Misalignment',
        summary: 'Solenoid pin failed to engage on door close, halting automatic cycle in M06.',
        root_cause: 'Heavy door slam bent the receiver bracket 2 mm out of true.',
        resolution: 'Ramesh straightened bracket and added rubber bumper stops.',
        downtime: '20 mins',
      },
    ],
    troubleshooting: [
      {
        id: 'TB-DR-01',
        title: 'Door Open Alarm While Closed',
        symptom: 'Door is physically shut, but screen shows DOOR NOT CLOSED and spindle cannot start.',
        probable_cause: 'RFID key misaligned or metal chips stuck to magnetic sensor face.',
        steps: [
          'Inspect magnetic RFID sensor face on top right door jam for metal fuzz.',
          'Wipe sensor clean with rag and close door gently to verify latch click.',
          'Check diagnostic bit X004.2 on operator panel to confirm switch continuity.',
        ],
        ramesh_tip:
          'Ramesh: "Steel chips cling magnetically to the interlock switch face. Wipe it clean with a rag — do not use an air gun, or chips fly into the electrical track."',
      },
    ],
  },

  machine_body: {
    id: 7,
    machine_id: 1,
    mesh_name: 'machine_body',
    display_name: 'Machine Body, Base & Column',
    category: 'Structural Casting',
    description:
      'Rigid Meehanite cast-iron base bed and vertical Z-axis column providing high vibration damping, vibration isolation leveling pads, internal coolant splash guards, and chip conveyor trough.',
    risk: 'low',
    incident_count: 0,
    status: 'Foundation Balanced',
    specs: {
      'Bed Casting': 'Heavy-Ribbed Meehanite Cast Iron GC-300',
      'Machine Weight': '4,850 kg',
      Footprint: '2,400 x 2,200 mm',
      Leveling: '6 Vibration-Damping Leveling Wedges',
      'Chip Handling': 'Integrated Chute with Conveyor Trough',
    },
    position: [0, 1.35, 0],
    pin_position: [-1.05, 0.55, 0.85],
    expert_tips: [
      {
        id: 114,
        author: 'Ramesh (Old Employee)',
        role: 'Master Machinist (18 yrs exp)',
        date: '02-Jan-2024',
        severity: 'info',
        title: '6-Month Machine Bed Leveling Audit',
        text: 'Audit machine level with master 0.02 mm/m precision spirit level across X and Y leveling pads every six months to prevent frame torsion.',
        cue: '📏 Precision spirit level bubble within center division',
        verified: true,
      },
      {
        id: 115,
        author: 'Ramesh (Old Employee)',
        role: 'Master Machinist (18 yrs exp)',
        date: '11-Sep-2024',
        severity: 'watch',
        title: 'Chip Trough Angle & Coolant Sump Flow',
        text: 'Ensure internal sloped sheet metal guards are cleared of chip dams. If coolant pools in the column cavity, it leaks past Z-axis way bellows.',
        cue: '🌊 Coolant must flow freely into rear chip conveyor',
        verified: true,
      },
    ],
    past_incidents: [
      {
        id: 'INC-244',
        date: '05-Dec-2023',
        type: 'Leveling Wedge Sinking',
        summary: 'Southwest leveling anchor loosened by 0.5 turn, causing 0.03 mm twist on X-axis travel.',
        root_cause: 'Vibration settling into factory concrete floor expansion joint.',
        resolution: 'Ramesh releveled all 6 mounting pads and torqued locknuts to 160 Nm.',
        downtime: '2 hrs',
      },
    ],
    troubleshooting: [
      {
        id: 'TB-MB-01',
        title: 'Coolant Overflow / Trough Clogging',
        symptom: 'Coolant pooling around machine base or leaking onto shop floor.',
        probable_cause: 'Chip conveyor basket filter clogged with aluminum fines or chips dams.',
        steps: [
          'Check chip conveyor intake trough and remove chip nests using rake.',
          'Inspect coolant return strainer basket above sump tank.',
          'Verify chip washdown pump nozzles are aimed properly at casting corners.',
        ],
        ramesh_tip:
          'Ramesh: "Clear the chip trough every 3 hours during heavy roughing. Coolant backed up inside the casting will rust the Z-axis linear guide rails."',
      },
    ],
  },
};

/**
 * Helper to compute knowledge counts for a component.
 * @param {Object} comp
 * @returns {{ tips: number, incidents: number, troubleshooting: number, total: number }}
 */
export const getKnowledgeCounts = (comp) => {
  if (!comp) return { tips: 0, incidents: 0, troubleshooting: 0, procedures: 0, total: 0 };
  const tips = (comp.expert_tips || comp.expert_notes || []).length;
  const incidents = (comp.past_incidents || []).length;
  const troubleshooting = (comp.troubleshooting || []).length;
  const procedures = (comp.procedures || []).length;
  return {
    tips,
    incidents,
    troubleshooting,
    procedures,
    total: tips + incidents + troubleshooting + procedures,
  };
};

/**
 * Array format matching VMC components list with backward-compatible expert_notes.
 */
export const VMC_DEMO_COMPONENTS_LIST = Object.values(COMPONENT_KNOWLEDGE_DEMO).map(
  (comp) => ({
    ...comp,
    expert_notes: comp.expert_tips,
    knowledge_count: getKnowledgeCounts(comp),
  })
);
