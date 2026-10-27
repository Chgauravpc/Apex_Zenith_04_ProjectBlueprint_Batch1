import React from 'react';

const SKILL_LEVELS = {
  0: { label: 'L0 Novice', badge: 'bg-slate-700 text-slate-300', desc: 'Guided training with all video clips & safety tips' },
  1: { label: 'L1 Supervised', badge: 'bg-blue-600 text-white', desc: 'Step-by-step guidance with parameter limits' },
  2: { label: 'L2 Independent', badge: 'bg-emerald-600 text-white', desc: 'Standard guidance with safety guardrails' },
  3: { label: 'L3 Expert', badge: 'bg-purple-600 text-white', desc: 'Checklist mode with critical alerts only' },
  4: { label: 'L4 Master', badge: 'bg-amber-500 text-slate-950 font-black', desc: 'Authoring and verification authority' },
};

export default function SkillBadge({ level = 1, showDetails = false }) {
  const info = SKILL_LEVELS[level] || SKILL_LEVELS[1];

  return (
    <div className="inline-flex items-center space-x-2">
      <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-sm ${info.badge}`}>
        {info.label}
      </span>
      {showDetails && (
        <span className="text-slate-400 text-xs hidden sm:inline">
          {info.desc}
        </span>
      )}
    </div>
  );
}
