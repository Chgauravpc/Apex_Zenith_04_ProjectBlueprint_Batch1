import { create } from 'zustand';

export const useMachineStore = create((set) => ({
  selectedMachineId: 1, // VMC-3 by default
  selectedComponentId: null,
  highlightedComponentId: null,
  activeRunId: null,

  setSelectedMachineId: (id) => set({ selectedMachineId: id }),
  setSelectedComponentId: (id) => set({ selectedComponentId: id }),
  setHighlightedComponentId: (id) => set({ highlightedComponentId: id }),
  setActiveRunId: (id) => set({ activeRunId: id }),
}));

export default useMachineStore;
