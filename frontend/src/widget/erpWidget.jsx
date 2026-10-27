import React, { useState } from 'react';
import WarningBanner from '../components/guardian/WarningBanner';

/**
 * Embeddable ERP Widget for shop-floor MES/ERP work order screens.
 * Reference: PRD.md §9.7 and TASKS.md T25.
 */
export default function ErpWidget({
  workOrder = {
    id: 'WO-8842',
    part: 'SS304 Precision Flange',
    machine: 'VMC-3',
    quantity: 50,
    operator: 'Priya Patel',
  },
  onLaunchGuide,
  onLaunchAsk,
}) {
  const [activeTab, setActiveTab] = useState('context');

  const guardianCheck = {
    severity: 'caution',
    warnings: [
      {
        message: 'Prior setup on VMC-3 had chatter on SS304 with feed > 0.25 mm/rev.',
      },
    ],
    expert_fix: 'Keep roughing pass feed under 0.20 mm/rev and torque ER32 collet to 90 Nm.',
    evidence: [
      {
        id: 12,
        kind: 'QC Reject',
        title: '3 Flanges rejected due to bore chatter marks on Nov 14',
      },
    ],
  };

  const thingsToKnow = [
    {
      icon: '💡',
      title: 'Vise parallel bar chip trap',
      tip: 'Wipe vise bed thoroughly by hand before placing raw billet; trapped chips cause 0.08 mm tilt.',
      author: 'Ramesh Sharma (Old Employee)',
    },
    {
      icon: '⚙️',
      title: 'Tool stick-out tolerance',
      tip: 'Tool #4 overhang must not exceed 35 mm to avoid resonance at 3200 RPM.',
      author: 'Ramesh Sharma',
    },
    {
      icon: '🚿',
      title: 'Coolant nozzle alignment',
      tip: 'Ensure nozzle #2 points directly at tool trailing edge to prevent stainless work-hardening.',
      author: 'Ramesh Sharma',
    },
  ];

  return (
    <div className="bg-slate-900 border border-slate-700/80 rounded-2xl p-5 shadow-2xl text-slate-100 max-w-xl mx-auto space-y-4 font-sans">
      {/* Widget Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center space-x-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center font-bold text-slate-950 text-xs shadow-sm">
            BP
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-cyan-400 tracking-wider block">
              Blueprint Machine Companion
            </span>
            <h2 className="text-sm font-bold text-white leading-tight">
              {workOrder.id}: {workOrder.part}
            </h2>
          </div>
        </div>

        <span className="text-[11px] bg-slate-800 border border-slate-700 text-slate-300 font-mono px-2 py-0.5 rounded">
          {workOrder.machine}
        </span>
      </div>

      {/* Pre-Job Guardian Warning */}
      <WarningBanner result={guardianCheck} />

      {/* Tab Controls */}
      <div className="flex space-x-2 border-b border-slate-800 pb-1">
        <button
          type="button"
          onClick={() => setActiveTab('context')}
          className={`px-3 py-1 text-xs font-semibold rounded-lg transition ${
            activeTab === 'context'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          3 Things to Know Before Job
        </button>
      </div>

      {/* Things to Know Cards */}
      {activeTab === 'context' && (
        <div className="space-y-2.5">
          {thingsToKnow.map((item, idx) => (
            <div
              key={idx}
              className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 space-y-1 text-xs"
            >
              <div className="flex items-center space-x-2">
                <span>{item.icon}</span>
                <span className="font-bold text-slate-200">{item.title}</span>
              </div>
              <p className="text-slate-300 pl-5 leading-relaxed">{item.tip}</p>
              <span className="text-[10px] text-cyan-400/80 pl-5 block">
                Source: {item.author}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Action Launch Buttons */}
      <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800">
        <button
          type="button"
          onClick={() => {
            if (onLaunchGuide) onLaunchGuide(workOrder);
            else window.location.href = '/guide';
          }}
          className="btn-touch px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-xl shadow flex items-center justify-center space-x-1.5 transition"
        >
          <span>📋</span>
          <span>Start Guided Run</span>
        </button>

        <button
          type="button"
          onClick={() => {
            if (onLaunchAsk) onLaunchAsk(workOrder);
            else window.location.href = '/ask';
          }}
          className="btn-touch px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-xl border border-slate-700 flex items-center justify-center space-x-1.5 transition"
        >
          <span>💡</span>
          <span>Ask Question</span>
        </button>
      </div>
    </div>
  );
}
