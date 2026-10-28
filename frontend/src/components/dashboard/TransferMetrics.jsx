import React from 'react';
import { getMetrics } from '../../api/transfer';
import useApi from '../../hooks/useApi';
import LoadState from '../common/LoadState';

/** Metric tiles built from GET /transfer/metrics; every number is counted from the records. */
const buildMetrics = (m) => [
  {
    label: 'Knowledge Coverage',
    value: `${m.coverage}%`,
    delta: `${m.parts_at_risk} parts at risk`,
    isGood: m.parts_at_risk === 0,
    baseline: `${m.parts_total} machine parts tracked`,
    desc: 'Machine parts with at least one verified know-how card from an old employee.',
  },
  {
    label: 'Guardian Halts',
    value: `${m.guardian_stops} Stops`,
    delta: `${m.warnings_with_fix} showed an old employee's fix`,
    isGood: true,
    baseline: `${m.guardian_cautions} cautions raised`,
    desc: 'Risky notes and settings stopped before the machine ran, with the evidence.',
  },
  {
    label: 'Questions Answered Once',
    value: `${m.questions_answered}/${m.questions_routed}`,
    delta: 'Answers became verified cards',
    isGood: m.questions_answered === m.questions_routed,
    baseline: 'Routed to the old employee who knows',
    desc: 'Questions the assistant could not answer, answered by an expert for everyone.',
  },
  {
    label: 'Handover Progress',
    value: m.handover_progress === null ? '—' : `${m.handover_progress}%`,
    delta: `${m.verified_cards} verified cards`,
    isGood: (m.handover_progress || 0) >= 50,
    baseline: `${m.pending_review} cards waiting for review`,
    desc: 'Mean progress of active exit handover plans.',
  },
];

export default function TransferMetrics() {
  const metrics = useApi((signal) => getMetrics(signal), []);
  const m = metrics.data;

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
            How much of the old employees&apos; know-how is captured, checked and reaching new employees.
          </p>
        </div>
      </div>

      <LoadState loading={metrics.loading} error={metrics.error} onRetry={metrics.reload} label="Loading metrics…" />

      {m && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {buildMetrics(m).map((tile) => (
              <div
                key={tile.label}
                className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2 shadow-sm flex flex-col justify-between"
              >
                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    {tile.label}
                  </span>
                  <div className="text-2xl font-black text-white mt-1 font-mono tracking-tight">{tile.value}</div>
                  <span
                    className={`inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold border ${
                      tile.isGood
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                        : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                    }`}
                  >
                    {tile.delta}
                  </span>
                </div>

                <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400">
                  <span className="font-semibold text-slate-300 block">{tile.baseline}</span>
                  <span className="text-slate-500 leading-tight block mt-0.5">{tile.desc}</span>
                </div>
              </div>
            ))}
          </div>

          {m.new_employees.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300 block">
                New Employees on the Way to Independence
              </span>
              <table className="w-full text-xs text-left">
                <thead className="text-slate-400">
                  <tr>
                    <th className="py-1.5 font-semibold">Employee</th>
                    <th className="py-1.5 font-semibold">Days on job</th>
                    <th className="py-1.5 font-semibold">Operations trained</th>
                    <th className="py-1.5 font-semibold">Independent</th>
                    <th className="py-1.5 font-semibold">Clean guided runs</th>
                  </tr>
                </thead>
                <tbody className="text-slate-200">
                  {m.new_employees.map((e) => (
                    <tr key={e.employee_id} className="border-t border-slate-800">
                      <td className="py-1.5">{e.employee}</td>
                      <td className="py-1.5 font-mono">{e.days_on_job ?? '—'}</td>
                      <td className="py-1.5 font-mono">{e.trained_ops}</td>
                      <td className="py-1.5 font-mono">{e.independent_ops}</td>
                      <td className="py-1.5 font-mono">{e.clean_runs}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
