import { create } from 'zustand';
import { getMachines } from '../api/machines';

let machinesRequest = null; // one shared request for every machine picker

export const useMachineStore = create((set) => ({
  selectedMachineId: 1, // VMC-3 by default
  selectedComponentId: null,
  highlightedComponentId: null,
  activeRunId: null,
  // Machines from GET /api/machines: [{ id, name, type, rpm_min, rpm_max, location }]
  machines: [],
  machinesError: null,

  setSelectedMachineId: (id) => set({ selectedMachineId: id }),
  setSelectedComponentId: (id) => set({ selectedComponentId: id }),
  setHighlightedComponentId: (id) => set({ highlightedComponentId: id }),
  setActiveRunId: (id) => set({ activeRunId: id }),

  /** Load the machine list once; later calls reuse it. A failed load can be retried. */
  loadMachines: () => {
    if (!machinesRequest) {
      machinesRequest = getMachines()
        .then((machines) => set({ machines, machinesError: null }))
        .catch((err) => {
          machinesRequest = null;
          set({ machinesError: err.message || 'could not load machines' });
        });
    }
    return machinesRequest;
  },
}));

export default useMachineStore;
