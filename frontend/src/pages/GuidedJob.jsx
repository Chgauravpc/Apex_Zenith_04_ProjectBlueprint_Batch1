import React from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { t } from '../utils/i18n';

export default function GuidedJob() {
  const { language } = useAuthStore();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center space-x-2">
            <span>📋</span>
            <span>{t('navGuide', language)}</span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Step-by-step job execution with skill-adaptive detail and real-time Note Guardian guardrails.
          </p>
        </div>
      </div>

      <div className="bg-slate-800/80 border border-slate-700/70 rounded-xl p-8 text-center">
        <div className="w-16 h-16 mx-auto mb-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl flex items-center justify-center text-3xl">
          📋
        </div>
        <h2 className="text-xl font-semibold text-white">Guided Job Runner</h2>
        <p className="text-slate-400 text-sm max-w-md mx-auto mt-2">
          StepView, StepList, SkillBadge, and ShadowTrace side-by-side run player are loaded here in T22.
        </p>
      </div>
    </div>
  );
}
