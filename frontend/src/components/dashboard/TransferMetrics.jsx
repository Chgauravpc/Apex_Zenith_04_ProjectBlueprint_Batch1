import React from 'react';

export default function TransferMetrics() {
  const metrics = [
    {
      label: 'Time-to-Independence',
      value: '42 Days',
      delta: '-65% faster',
      isGood: true,
      baseline: 'Industry baseline: 120 days',
      desc: 'Days until a new employee completes first unsupervised setup run.',
    },
    {
      label: 'Knowledge Coverage',
      value: '74%',
      delta: '+42% since start',
      isGood: true,
      baseline: 'Target: 90% by Q2',
      desc: 'Percentage of critical components with ≥ 5 verified know-how cards.',
    },
    {
      label: 'Guardian Halts Prevented',
      value: '19 Incidents',
      delta: 'Zero Spindle Failures',
      isGood: true,
      baseline: 'Prior: 3 spindle seizures / year',
      desc: 'Dangerous feeds or unclampped tools blocked before spindle start.',
    },
    {
      label: 'Shop Floor Scrap Rate',
      value: '1.4%',
      delta: '-71% reject reduction',
      isGood: true,
      baseline: 'Previous reject average: 4.8%',
      desc: 'Workpieces rejected during first-piece setup inspection.',
    },
  ];

  return (
    <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-6 shadow-xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-700/60 pb-4">
        <div>
          <span className="text-[10px] uppercase font-bold text-cyan-400 tracking-wider">
            Executive Transfer ROI
          </span>
          <h2 className="text-lg font-bold text-white flex items-center space-x-2 mt-0.5">
            <span>📈</span>
            <span>Knowledge Transfer & Quality Impact Metrics</span>
          </h2>
          <p className="text-slate-400 text-xs mt-1">
            Quantifying shop-floor mentoring transfer into operational uptime and reject reduction.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((m) => (
          <div
            key={m.label}
            className="group bg-slate-900/90 hover:bg-slate-900 border border-slate-800 hover:border-slate-700/80 rounded-2xl p-5 space-y-3 shadow-md transition-all flex flex-col justify-between"
          >
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">
                {m.label}
              </span>
              <div className="text-3xl font-extrabold text-white mt-1 font-mono tracking-tight group-hover:text-cyan-300 transition-colors">
                {m.value}
              </div>
              <span className="inline-flex items-center space-x-1 mt-2 px-2.5 py-0.5 rounded-lg text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-mono shadow-sm">
                <span>{m.delta}</span>
              </span>
            </div>

            <div className="pt-3 border-t border-slate-800/80 text-[11px] text-slate-400 leading-snug">
              <span className="font-semibold text-slate-300 block">{m.baseline}</span>
              <span className="text-slate-500 leading-normal block mt-1">{m.desc}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
