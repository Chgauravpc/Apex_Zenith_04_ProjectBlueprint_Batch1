import React, { useState } from 'react';
import { AlertTriangle, TrendingDown, Clock } from 'lucide-react';
import RiskHeatmap from '../components/dashboard/RiskHeatmap';
import TransferMetrics from '../components/dashboard/TransferMetrics';
import MachineTimeline from '../components/dashboard/MachineTimeline';
import { PageHead, Reveal } from '../components/common';

const TABS = [
  { id: 'heatmap', label: 'Knowledge Risk Heatmap', icon: AlertTriangle, testid: 'tab-heatmap' },
  { id: 'metrics', label: 'Transfer & Quality ROI', icon: TrendingDown, testid: 'tab-metrics' },
  { id: 'timeline', label: 'Machine Event Stream', icon: Clock, testid: 'tab-timeline' },
];

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('heatmap');

  return (
    <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
      <PageHead
        eyebrow="Supervisor lens · Plant 2, A-shift"
        title="See the risk before it retires."
        sub="Plant-wide operational dashboard. Anil's morning view: where knowledge is thin, how fast it's moving, and whether new operators are standing on their own."
      />

      <Reveal delay={0.08}>
        <div className="mb-8 inline-flex flex-wrap gap-2 p-1.5 rounded-2xl bg-[#F1F3F4] border border-slate-200/80">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                data-testid={tab.testid}
                onClick={() => setActiveTab(tab.id)}
                className={`flex min-h-12 items-center gap-2.5 rounded-xl px-5 py-3 text-sm font-semibold transition-all duration-200 ${
                  active
                    ? 'bg-white text-maroon-800 font-bold shadow-xs border border-maroon-200/60'
                    : 'text-slate-600 hover:text-slate-900 font-medium hover:bg-white/60'
                }`}
              >
                <Icon size={17} className={active ? 'text-maroon-700' : 'text-slate-400'} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </Reveal>

      <Reveal delay={0.14}>
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div>
            {activeTab === 'heatmap' && <RiskHeatmap />}
            {activeTab === 'metrics' && <TransferMetrics />}
            {activeTab === 'timeline' && <MachineTimeline />}
          </div>
        </div>
      </Reveal>

      <p className="mt-8 flex items-center gap-2 text-xs text-slate-400">
        <Clock size={14} className="text-copper" />
        Live data from real shop floor logs, telemetry, and quality records.
      </p>
    </div>
  );
}
