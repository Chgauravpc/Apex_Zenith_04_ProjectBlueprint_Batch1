import React from 'react';
import { useAuthStore, DEMO_USERS } from '../../store/useAuthStore';
import { LANGUAGES, t } from '../../utils/i18n';

export default function RoleSwitcher() {
  const { currentUser, setUser, language, setLanguage } = useAuthStore();

  return (
    <div className="flex items-center gap-1.5 sm:gap-2 bg-slate-900/90 border border-slate-700/80 rounded-xl px-2 sm:px-2.5 py-1 shadow-sm text-xs backdrop-blur-sm flex-shrink-0">
      <div className="flex items-center space-x-1 sm:space-x-1.5">
        <span className="text-slate-400 font-medium text-[11px] whitespace-nowrap hidden xl:inline">
          {t('activeRole', language)}:
        </span>
        <select
          value={currentUser.id}
          onChange={(e) => {
            const found = DEMO_USERS.find((u) => u.id === Number(e.target.value));
            if (found) setUser(found);
          }}
          aria-label="Select Demo User and Role"
          className="bg-slate-800/90 border border-slate-700 text-cyan-300 font-semibold py-1 pl-2 pr-6 rounded-lg cursor-pointer hover:border-slate-600 transition text-xs max-w-[125px] sm:max-w-[155px] xl:max-w-[185px] truncate focus:border-cyan-400"
        >
          {DEMO_USERS.map((user) => (
            <option key={user.id} value={user.id}>
              {user.name} ({user.role === 'old_employee' ? 'Old' : user.role === 'new_employee' ? 'New' : 'Supervisor'}) — {user.machine}
            </option>
          ))}
        </select>
      </div>

      <div className="h-4 w-px bg-slate-700/80 hidden sm:block" />

      <div className="flex items-center">
        <label htmlFor="lang-select" className="sr-only">
          Language
        </label>
        <select
          id="lang-select"
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          aria-label="Language selection"
          className="bg-slate-800/90 border border-slate-700 text-slate-200 py-1 pl-2 pr-6 rounded-lg cursor-pointer hover:border-slate-600 transition text-xs focus:border-cyan-400"
        >
          {LANGUAGES.map((lang) => (
            <option key={lang.code} value={lang.code}>
              {lang.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
