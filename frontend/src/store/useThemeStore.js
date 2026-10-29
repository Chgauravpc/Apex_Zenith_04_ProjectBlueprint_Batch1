import { create } from 'zustand';

const THEME_STORAGE_KEY = 'blueprint_theme';

const getInitialTheme = () => {
  try {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined' && localStorage?.getItem) {
      const saved = localStorage.getItem(THEME_STORAGE_KEY);
      if (saved === 'dark' || saved === 'light') {
        return saved;
      }
    }
  } catch (e) {
    // Ignore storage errors in test or restricted environments
  }
  // Default to Light Theme per prompt requirements
  return 'light';
};

const applyThemeToDOM = (theme) => {
  if (typeof window !== 'undefined') {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
    }
  }
};

export const useThemeStore = create((set) => ({
  theme: getInitialTheme(),

  setTheme: (newTheme) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(THEME_STORAGE_KEY, newTheme);
      applyThemeToDOM(newTheme);
    }
    set({ theme: newTheme });
  },

  toggleTheme: () => {
    set((state) => {
      const nextTheme = state.theme === 'light' ? 'dark' : 'light';
      if (typeof window !== 'undefined') {
        localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
        applyThemeToDOM(nextTheme);
      }
      return { theme: nextTheme };
    });
  },
}));

// Apply on initial script load to ensure no flash of wrong theme
if (typeof window !== 'undefined') {
  applyThemeToDOM(getInitialTheme());
}

export default useThemeStore;
