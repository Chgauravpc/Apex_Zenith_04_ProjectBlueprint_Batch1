import { create } from 'zustand';

export const DEMO_USERS = [
  {
    id: 1,
    name: 'Ramesh Sharma',
    role: 'old_employee',
    roleLabel: 'Old Employee (Retiring in 7 mos)',
    machine: 'VMC-3',
    experience: '28 years',
  },
  {
    id: 2,
    name: 'Priya Patel',
    role: 'new_employee',
    roleLabel: 'New Employee (Onboarding)',
    machine: 'VMC-3',
    experience: '3 months',
  },
  {
    id: 3,
    name: 'Suresh Rao',
    role: 'supervisor',
    roleLabel: 'Shop-Floor Supervisor',
    machine: 'All Shop Machines',
    experience: '15 years',
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
