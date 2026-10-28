import React from 'react';
import { useThemeStore } from '../../store/useThemeStore';
import { SunIcon, MoonIcon } from '../common/Icons';

/**
 * ThemeToggle component for Project Blueprint.
 * Switches between Light Theme (Clean White & Emerald) and Dark Theme (Graphite & Teal).
 */
export default function ThemeToggle() {
  const { theme, setTheme } = useThemeStore();

  return (
    <div
      role="radiogroup"
      aria-label="Theme selection"
      className="flex items-center bg-slate-200/80 dark:bg-slate-900/90 border border-slate-300 dark:border-slate-700/80 p-0.5 rounded-xl shadow-sm backdrop-blur-sm flex-shrink-0"
    >
      <button
        id="theme-toggle-light"
        data-testid="theme-toggle-light"
        type="button"
        role="radio"
        aria-checked={theme === 'light'}
        aria-label="Switch to Light Theme (Clean White & Emerald)"
        onClick={() => setTheme('light')}
        title="Light Theme (Clean White & Emerald)"
        className={`px-2 py-1 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer ${
          theme === 'light'
            ? 'bg-white text-emerald-800 shadow-sm border border-emerald-600/30 font-bold'
            : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
        }`}
      >
        <SunIcon className="w-3.5 h-3.5" />
        <span className="hidden 2xl:inline text-[11px]">Light</span>
      </button>

      <button
        id="theme-toggle-dark"
        data-testid="theme-toggle-dark"
        type="button"
        role="radio"
        aria-checked={theme === 'dark'}
        aria-label="Switch to Dark Theme (Graphite & Teal)"
        onClick={() => setTheme('dark')}
        title="Dark Theme (Graphite & Teal)"
        className={`px-2 py-1 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all focus:outline-none focus:ring-1 focus:ring-teal-400 cursor-pointer ${
          theme === 'dark'
            ? 'bg-slate-800 text-teal-300 shadow-sm border border-teal-500/40 font-bold'
            : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
        }`}
      >
        <MoonIcon className="w-3.5 h-3.5" />
        <span className="hidden 2xl:inline text-[11px]">Dark</span>
      </button>
    </div>
  );
}
