import React from 'react';
import { useAuthStore, DEMO_USERS } from '../../store/useAuthStore';
import { LANGUAGES, t } from '../../utils/i18n';

export default function RoleSwitcher() {
  const { currentUser, setUser, language, setLanguage } = useAuthStore();

  return (
    <div className="flex flex-wrap items-center gap-3 bg-slate-800/80 border border-slate-700/60 rounded-xl px-3 py-1.5 shadow-sm text-xs">
      <div className="flex items-center space-x-2">
        <span className="text-slate-400 font-medium">
          {t('activeRole', language)}:
        </span>
        <select
          value={currentUser.id}
          onChange={(e) => {
            const found = DEMO_USERS.find((u) => u.id === Number(e.target.value));
            if (found) setUser(found);
          }}
          aria-label="Select Demo User and Role"
          className="bg-slate-900 border border-slate-700 text-cyan-300 font-semibold py-1 px-2.5 rounded-lg cursor-pointer focus:ring-1 focus:ring-cyan-400 text-xs"
        >
          {DEMO_USERS.map((user) => (
            <option key={user.id} value={user.id}>
              {user.name} ({user.role === 'old_employee' ? 'Old' : user.role === 'new_employee' ? 'New' : 'Supervisor'}) — {user.machine}
            </option>
          ))}
        </select>
      </div>

      <div className="h-4 w-px bg-slate-700 hidden sm:block" />

      <div className="flex items-center space-x-1">
        <label htmlFor="lang-select" className="sr-only">
          Language
        </label>
        <select
          id="lang-select"
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          aria-label="Language selection"
          className="bg-slate-900 border border-slate-700 text-slate-300 py-1 px-2 rounded-lg cursor-pointer focus:ring-1 focus:ring-cyan-400 text-xs"
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
