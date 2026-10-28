import React, { useState } from 'react';
import RiskHeatmap from '../components/dashboard/RiskHeatmap';
import TransferMetrics from '../components/dashboard/TransferMetrics';
import MachineTimeline from '../components/dashboard/MachineTimeline';
import { useAuthStore } from '../store/useAuthStore';
import { t } from '../utils/i18n';
import { BarChartIcon, MapPinIcon, TrendingUpIcon, ClockIcon } from '../components/common/Icons';

export default function Dashboard() {
  const { language } = useAuthStore();
  const [activeTab, setActiveTab] = useState('heatmap');

  const tabs = [
    { id: 'heatmap', label: 'Knowledge Risk Heatmap', icon: <MapPinIcon className="w-3.5 h-3.5" /> },
    { id: 'metrics', label: 'Transfer & Quality ROI', icon: <TrendingUpIcon className="w-3.5 h-3.5" /> },
    { id: 'timeline', label: 'Machine Event Stream', icon: <ClockIcon className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-700/60 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center space-x-2.5">
            <BarChartIcon className="w-6 h-6 text-cyan-400" />
            <span>{t('navDashboard', language)}</span>
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-1.5 font-medium leading-relaxed">
            Plant-wide operational dashboard. Track bus-factor-1 risks, handover velocity, and machine uptime.
          </p>
        </div>
      </div>

      {/* Mode Tabs (Industrial Segmented Control) */}
      <div className="flex overflow-x-auto pb-1">
        <div className="inline-flex p-1 bg-slate-950/80 border border-slate-700/80 rounded-xl gap-1 shadow-inner">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`btn-touch px-3.5 py-2 rounded-lg text-xs font-semibold transition-all flex items-center space-x-2 whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-slate-800 text-cyan-300 border border-slate-700 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        {activeTab === 'heatmap' && <RiskHeatmap />}
        {activeTab === 'metrics' && <TransferMetrics />}
        {activeTab === 'timeline' && <MachineTimeline />}
      </div>
    </div>
  );
}
