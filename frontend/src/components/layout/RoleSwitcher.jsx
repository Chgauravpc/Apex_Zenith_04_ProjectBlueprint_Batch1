import React from 'react';
import { useAuthStore, DEMO_USERS } from '../../store/useAuthStore';
import { LANGUAGES, t } from '../../utils/i18n';

export default function RoleSwitcher() {
  const { currentUser, setUser, language, setLanguage } = useAuthStore();

  return (
    <div className="flex items-center gap-1.5 sm:gap-2 bg-white/95 border border-slate-200/90 rounded-full px-2.5 sm:px-3 py-1 shadow-xs text-xs backdrop-blur-sm flex-shrink-0 hover:border-slate-300 transition">
      <div className="flex items-center space-x-1 sm:space-x-1.5">
        <span className="text-slate-500 font-semibold text-[11px] whitespace-nowrap flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-maroon-700" aria-hidden="true" />
          <span>{t('activeRole', language)}:</span>
        </span>
        <select
          value={currentUser.id}
          onChange={(e) => {
            const found = DEMO_USERS.find((u) => u.id === Number(e.target.value));
            if (found) setUser(found);
          }}
          aria-label="Select Demo User and Role"
          className="bg-slate-50 hover:bg-slate-100/80 border border-slate-200 text-maroon-900 font-semibold py-1 pl-2 pr-6 rounded-lg cursor-pointer transition text-xs max-w-[125px] sm:max-w-[155px] xl:max-w-[195px] truncate focus:outline-none focus:ring-2 focus:ring-maroon-500 focus:border-maroon-500"
        >
          {DEMO_USERS.map((user) => (
            <option key={user.id} value={user.id}>
              {user.name} ({user.role === 'old_employee' ? 'Old' : user.role === 'new_employee' ? 'New' : user.role === 'operator' ? 'Operator' : user.role === 'maintenance_lead' ? 'Maintenance' : user.role === 'plant_manager' ? 'Manager' : 'Supervisor'}) — {user.machine}
            </option>
          ))}
        </select>
      </div>

      <div className="h-4 w-px bg-slate-200 hidden sm:block" />

      <div className="flex items-center">
        <label htmlFor="lang-select" className="sr-only">
          Language
        </label>
        <select
          id="lang-select"
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          aria-label="Language selection"
          className="bg-slate-50 hover:bg-slate-100/80 border border-slate-200 text-slate-700 font-medium py-1 pl-2 pr-6 rounded-lg cursor-pointer transition text-xs focus:outline-none focus:ring-2 focus:ring-maroon-500 focus:border-maroon-500"
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
