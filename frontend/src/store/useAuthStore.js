import { create } from 'zustand';

// Same people, ids and roles as backend/seed/seed.py, so every API call acts as them.
export const DEMO_USERS = [
  {
    id: 1,
    name: 'Ramesh Patil',
    role: 'old_employee',
    roleLabel: 'Old Employee (Retiring in 7 mos)',
    machine: 'VMC-3',
    machineId: 1,
    experience: '28 years',
  },
  {
    id: 2,
    name: 'Priya Shinde',
    role: 'new_employee',
    roleLabel: 'New Employee (Onboarding)',
    machine: 'VMC-3',
    machineId: 1,
    experience: '1 month',
  },
  {
    id: 4,
    name: 'Anil Kulkarni',
    role: 'supervisor',
    roleLabel: 'Shop-Floor Supervisor',
    machine: 'All Shop Machines',
    machineId: null,
    experience: '16 years',
  },
];

export const useAuthStore = create((set) => ({
  currentUser: DEMO_USERS[0],
  language: 'en',
  setUser: (user) => set({ currentUser: user }),
  setRole: (role) => {
    const matched = DEMO_USERS.find((u) => u.role === role) || DEMO_USERS[0];
    set({ currentUser: matched });
  },
  setLanguage: (lang) => set({ language: lang }),
}));

export default useAuthStore;
