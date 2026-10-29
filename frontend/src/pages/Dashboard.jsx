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
        sub="Vikram's morning view: where knowledge is thin, how fast it's moving, and whether new operators are standing on their own."
      />

      <Reveal delay={0.08}>
        <div className="mb-8 flex flex-wrap gap-2">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                data-testid={tab.testid}
                onClick={() => setActiveTab(tab.id)}
                className={`flex min-h-12 items-center gap-2.5 rounded-full px-5 py-3 text-sm font-semibold transition-colors duration-200 ${
                  active
                    ? 'bg-ink text-white'
                    : 'border border-slate-200 bg-white text-slate-600 hover:border-slate-400'
                }`}
              >
                <Icon size={17} className={active ? 'text-copper' : 'text-slate-400'} />
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
        Plant-wide operational dashboard. Live data from real shop floor logs, telemetry, and quality records.
      </p>
    </div>
  );
}
