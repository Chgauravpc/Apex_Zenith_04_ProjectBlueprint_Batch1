import React from 'react';
import { getMetrics } from '../../api/transfer';
import useApi from '../../hooks/useApi';
import LoadState from '../common/LoadState';
import { TrendingUpIcon } from '../common/Icons';

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
    <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <span className="text-[10px] uppercase font-bold text-maroon-700 tracking-wider">
            Executive Transfer ROI
          </span>
          <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2 mt-0.5">
            <TrendingUpIcon className="w-5 h-5 text-maroon-700" />
            <span>Knowledge Transfer & Quality Impact Metrics</span>
          </h2>
          <p className="text-slate-600 text-xs mt-1">
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
                className="group bg-white hover:bg-slate-50/50 border border-slate-200/80 hover:border-maroon-200 rounded-2xl p-5 space-y-3 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between"
              >
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block font-mono">
                    {tile.label}
                  </span>
                  <div className="text-3xl font-extrabold text-slate-900 mt-1 font-mono tracking-tight group-hover:text-maroon-700 transition-colors">
                    {tile.value}
                  </div>
                  <span
                    className={`inline-block mt-2 px-2.5 py-0.5 rounded-lg text-[10px] font-bold font-mono border ${
                      tile.isGood
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : 'bg-amber-50 text-amber-800 border-amber-200'
                    }`}
                  >
                    {tile.delta}
                  </span>
                </div>

                <div className="pt-3 border-t border-slate-200/80 text-[11px] text-slate-600 leading-snug">
                  <span className="font-semibold text-slate-800 block">{tile.baseline}</span>
                  <span className="text-slate-500 leading-normal block mt-1">{tile.desc}</span>
                </div>
              </div>
            ))}
          </div>

          {m.new_employees.length > 0 && (
            <div className="space-y-3 pt-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
                New Employees on the Way to Independence
              </span>
              <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-xs">
                <table className="w-full text-xs text-left bg-white">
                  <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3 font-semibold">Employee</th>
                      <th className="py-2.5 px-3 font-semibold">Days on job</th>
                      <th className="py-2.5 px-3 font-semibold">Operations trained</th>
                      <th className="py-2.5 px-3 font-semibold">Independent</th>
                      <th className="py-2.5 px-3 font-semibold">Clean guided runs</th>
                    </tr>
                  </thead>
                  <tbody className="text-slate-800 divide-y divide-slate-200">
                    {m.new_employees.map((e) => (
                      <tr key={e.employee_id} className="hover:bg-slate-50/60 transition">
                        <td className="py-2 px-3 font-medium text-slate-900">{e.employee}</td>
                        <td className="py-2 px-3 font-mono text-slate-600">{e.days_on_job ?? '—'}</td>
                        <td className="py-2 px-3 font-mono text-slate-600">{e.trained_ops}</td>
                        <td className="py-2 px-3 font-mono text-slate-600">{e.independent_ops}</td>
                        <td className="py-2 px-3 font-mono text-slate-600">{e.clean_runs}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
