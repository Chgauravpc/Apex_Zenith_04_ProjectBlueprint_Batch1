import React from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { t } from '../utils/i18n';

export default function Dashboard() {
  const { language } = useAuthStore();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center space-x-2">
            <span>📊</span>
            <span>{t('navDashboard', language)}</span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Plant-wide knowledge coverage, bus-factor risk heatmap, and handover velocity metrics.
          </p>
        </div>
      </div>

      <div className="bg-slate-800/80 border border-slate-700/70 rounded-xl p-8 text-center">
        <div className="w-16 h-16 mx-auto mb-4 bg-sky-500/10 border border-sky-500/20 text-sky-400 rounded-2xl flex items-center justify-center text-3xl">
          📊
        </div>
        <h2 className="text-xl font-semibold text-white">Operations & Risk Dashboard</h2>
        <p className="text-slate-400 text-sm max-w-md mx-auto mt-2">
          RiskHeatmap, TransferMetrics charts, and MachineTimeline are loaded here in T24.
        </p>
      </div>
    </div>
  );
}
