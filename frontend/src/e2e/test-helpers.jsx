import { useAuthStore, DEMO_USERS } from '../store/useAuthStore';
import { useMachineStore } from '../store/useMachineStore';
import { useThemeStore } from '../store/useThemeStore';

// Common test fixtures
export const TEST_STEPS = [
  {
    id: 11,
    step_no: 1,
    title: 'Clamp the flange',
    instruction: 'Clamp FL-101 in the vise.',
    component: 'Vise',
    param_name: null,
    target_value: null,
    tolerance: null,
    expert_tip: 'Feel under the parallels for chips.',
    expert_tip_author: 'Ramesh Patil',
    critical: false,
  },
  {
    id: 12,
    step_no: 2,
    title: 'Check stick-out',
    instruction: 'Measure tool stick-out.',
    component: 'Spindle',
    param_name: 'stick-out',
    param_unit: 'mm',
    target_value: 12.0,
    tolerance: 0.5,
    critical: true,
  },
];

export const TEST_PROCEDURE = {
  id: 1,
  key: 'vmc3-fl101-face',
  title: 'Face milling FL-101 flange on VMC-3',
  machine_id: 1,
  machine: 'VMC-3',
  version: 1,
  status: 'approved',
  steps_count: 2,
  author: 'Ramesh Patil',
  steps: TEST_STEPS,
};

export const TEST_RUN = {
  run_id: 5,
  employee_id: 2,
  skill_level: 1,
  skill_label: 'Guided',
  view: 'full',
  procedure: TEST_PROCEDURE,
};

export const TEST_RISK = [
  {
    machine_id: 1,
    component_id: null,
    name: 'VMC-3',
    cards: 18,
    holders: 1,
    bus: 0,
    coverage: 100,
    expert: 'Ramesh Patil',
    expert_id: 1,
    expert_leaving_on: '2027-05-29',
    status: 'critical',
  },
  {
    machine_id: 1,
    component_id: 1,
    name: 'VMC-3 · Spindle',
    cards: 9,
    holders: 1,
    bus: 0,
    coverage: 100,
    expert: 'Ramesh Patil',
    expert_id: 1,
    expert_leaving_on: '2027-05-29',
    status: 'critical',
  },
  {
    machine_id: 1,
    component_id: 4,
    name: 'VMC-3 · Coolant nozzle',
    cards: 3,
    holders: 2,
    bus: 2,
    coverage: 100,
    expert: 'Suresh Jadhav',
    expert_id: 3,
    expert_leaving_on: null,
    status: 'ok',
  },
];

export const TEST_METRICS = {
  coverage: 74,
  parts_total: 23,
  parts_at_risk: 6,
  verified_cards: 40,
  pending_review: 5,
  guardian_stops: 7,
  guardian_cautions: 11,
  warnings_with_fix: 9,
  questions_routed: 3,
  questions_answered: 2,
  handover_progress: 40,
  new_employees: [
    {
      employee_id: 2,
      employee: 'Priya Shinde',
      days_on_job: 30,
      independent_ops: 0,
      trained_ops: 2,
      clean_runs: 1,
    },
  ],
};

export const TEST_PLAN = {
  id: 1,
  employee_id: 1,
  employee: 'Ramesh Patil',
  exit_date: '2027-05-29',
  days_left: 213,
  status: 'active',
  progress: 33,
  sole_holder_machines: ['VMC-3'],
  gaps: [],
  tasks: [
    {
      id: 1,
      title: 'Record a setup video on VMC-3',
      category: 'record_setup',
      status: 'done',
      machine_id: 1,
      component_id: null,
    },
    {
      id: 2,
      title: 'AI interview: what only you know about VMC-3',
      category: 'interview',
      status: 'todo',
      machine_id: 1,
      component_id: null,
    },
  ],
};

export const TEST_CARD = {
  id: 31,
  title: 'Cleaned coolant nozzle',
  machine_id: 1,
  component_id: 4,
  symptom: 'poor_finish',
  context: null,
  action: 'Nozzle was blocked, cleaned it and finish improved.',
  why: null,
  params: {},
  confidence: 0.6,
  author_id: 2,
  verified_by_id: null,
  unofficial: false,
  machine: 'VMC-3',
  component: 'Coolant nozzle',
  author: 'Priya Shinde',
};

export const TEST_ANSWER = {
  answer: 'Reduce roughing feed to 0.18 mm/rev and check tool holder clamp torque.',
  steps: [
    'Stop machine spindle and inspect insert tip for wear.',
    'Torque collet nut to 90 Nm using torque wrench.',
  ],
  watch_out: 'Excessive spindle runout will cause chatter repetition.',
  confidence: 0.94,
  sources: [
    {
      id: 101,
      kind: 'Know-How Card',
      author: 'Ramesh Sharma',
      snippet: 'VMC-3 chatter reduced after torquing ER32 collet to 90 Nm.',
      verified: true,
    },
  ],
};

/**
 * Reset all stores to canonical baseline state.
 */
export function resetTestStores() {
  useAuthStore.setState({
    currentUser: DEMO_USERS[0], // Ramesh Patil (Old Employee)
    language: 'en',
  });

  useMachineStore.setState({
    selectedMachineId: 1,
    selectedComponentId: null,
    highlightedComponentId: null,
    activeRunId: null,
  });

  useThemeStore.setState({
    theme: 'light',
  });

  if (typeof document !== 'undefined') {
    document.documentElement.classList.remove('dark');
    document.documentElement.classList.add('light');
  }
}
