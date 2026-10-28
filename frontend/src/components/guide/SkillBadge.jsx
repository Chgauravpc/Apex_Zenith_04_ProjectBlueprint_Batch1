import React from 'react';

// Same levels as the backend skill matrix (backend/app/models/guide.py).
const SKILL_LEVELS = {
  0: { label: 'L0 Not Trained', badge: 'bg-slate-100 text-slate-700 border border-slate-300', desc: 'Full guidance with every clip and safety tip' },
  1: { label: 'L1 Guided', badge: 'bg-blue-50 text-blue-700 border border-blue-200', desc: 'Every step with media and confirmations' },
  2: { label: 'L2 Supervised', badge: 'bg-emerald-50 text-emerald-800 border border-emerald-200', desc: 'Condensed steps, critical checks mandatory' },
  3: { label: 'L3 Independent', badge: 'bg-purple-50 text-purple-800 border border-purple-200', desc: 'Checklist mode with critical alerts only' },
  4: { label: 'L4 Can Teach', badge: 'bg-amber-50 text-amber-800 border border-amber-200 font-extrabold', desc: 'Authoring and verification authority' },
};

export default function SkillBadge({ level = 1, showDetails = false }) {
  const info = SKILL_LEVELS[level] || SKILL_LEVELS[1];

  return (
    <div className="inline-flex items-center space-x-2">
      <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-xs ${info.badge}`}>
        {info.label}
      </span>
      {showDetails && (
        <span className="text-slate-500 text-xs hidden sm:inline">
          {info.desc}
        </span>
      )}
    </div>
  );
}
