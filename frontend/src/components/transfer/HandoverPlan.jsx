import React from 'react';

const CATEGORY_LABELS = {
  interview: 'Interview',
  record_setup: 'Video',
  validate: 'Review',
};

const formatDate = (iso) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

/**
 * HandoverPlan component.
 * Tracks tacit knowledge transfer before an old employee leaves.
 * `plan` is GET /transfer/handover/{id}; `riskCells` is GET /transfer/risk.
 * Tasks are ticked off by doing them (interview, setup video, card review), not by hand.
 */
export default function HandoverPlan({ plan, riskCells = [], onStartTask }) {
  if (!plan) return null;

  const firstName = plan.employee.split(' ')[0];
  const soleParts = riskCells.filter(
    (c) => c.component_id !== null && c.expert_id === plan.employee_id && c.status !== 'ok'
  );
  const doneCount = plan.tasks.filter((task) => task.status === 'done').length;

  return (
    <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-6 shadow-xl space-y-6">
      {/* Top Banner: Employee Countdown & Handover Progress */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-700/60 pb-5">
        <div>
          <span className="text-[10px] uppercase font-bold text-cyan-400 tracking-wider">
            Active Handover Plan
          </span>
          <h2 className="text-xl font-bold text-white mt-0.5">
            {plan.employee} • Retirement Countdown
          </h2>
          <p className="text-slate-400 text-xs mt-1">
            Scheduled Exit: <strong className="text-slate-200">{formatDate(plan.exit_date)}</strong> (
            {plan.days_left} days left)
          </p>
        </div>

        <div className="flex items-center space-x-4 bg-slate-900/80 px-4 py-2.5 rounded-xl border border-slate-800">
          <div>
            <div className="text-[10px] text-slate-400 font-bold uppercase">Progress</div>
            <div className="text-xl font-extrabold text-cyan-300 font-mono">{plan.progress}%</div>
          </div>
          <div className="h-7 w-px bg-slate-800" />
          <div>
            <div className="text-[10px] text-slate-400 font-bold uppercase">Target</div>
            <div className="text-xl font-extrabold text-emerald-400 font-mono">100%</div>
          </div>
        </div>
      </div>

      {/* Bus Factor = 1 Critical Components */}
      <div className="space-y-3">
        <div className="flex items-center space-x-2">
          <span className="text-red-400 font-bold">⚠️</span>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Bus-Factor-1 Machine Knowledge (Sole Expert: {firstName})
          </h3>
        </div>

        {plan.sole_holder_machines.length > 0 && (
          <p className="text-[11px] text-slate-400">
            Only {firstName} knows: <strong className="text-slate-200">{plan.sole_holder_machines.join(', ')}</strong>
          </p>
        )}

        {soleParts.length === 0 ? (
          <p className="text-xs text-slate-400">No machine part depends on {firstName} alone.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {soleParts.map((comp) => (
              <div
                key={`${comp.machine_id}-${comp.component_id}`}
                className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200 truncate">{comp.name}</span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                      comp.status === 'critical'
                        ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    }`}
                  >
                    {comp.status === 'critical' ? 'Critical' : 'High'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-snug">
                  {comp.holders === 1
                    ? `Only ${firstName} has recorded know-how on this part.`
                    : `${comp.holders} people know it, but most are leaving.`}
                </p>
                <div className="text-[10px] text-cyan-400 font-semibold pt-1">
                  {comp.cards} know-how {comp.cards === 1 ? 'card' : 'cards'} captured
                </div>
              </div>
            ))}
          </div>
        )}

        {plan.gaps.length > 0 && (
          <div className="text-[11px] text-slate-300 space-y-1">
            <span className="font-semibold text-slate-400">Questions nobody could answer yet:</span>
            <ul className="list-disc ml-5">
              {plan.gaps.map((g) => (
                <li key={g}>{g}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Handover Tasks Checklist */}
      <div className="space-y-3 pt-2 border-t border-slate-700/60">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Transfer Milestone Tasks ({doneCount}/{plan.tasks.length} Complete)
          </h3>
          <span className="text-xs font-mono font-semibold text-cyan-400">{plan.progress}% Complete</span>
        </div>

        <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
          <div
            className="bg-cyan-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${plan.progress}%` }}
          />
        </div>

        <div className="space-y-2 pt-2">
          {plan.tasks.map((task) => {
            const isDone = task.status === 'done';
            return (
              <div
                key={task.id}
                className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800 transition hover:bg-slate-900"
              >
                <div className="flex items-center space-x-3">
                  <span
                    className={`w-5 h-5 rounded-md flex items-center justify-center text-xs font-bold border ${
                      isDone ? 'bg-emerald-600 text-white border-emerald-500' : 'border-slate-600'
                    }`}
                    aria-label={isDone ? 'Done' : 'To do'}
                  >
                    {isDone ? '✓' : ''}
                  </span>

                  <span
                    className={`text-xs font-medium ${
                      isDone ? 'line-through text-slate-500' : 'text-slate-200'
                    }`}
                  >
                    {task.title}
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  <span className="text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded font-mono">
                    {CATEGORY_LABELS[task.category] || task.category}
                  </span>
                  {onStartTask && !isDone && (
                    <button
                      type="button"
                      onClick={() => onStartTask(task)}
                      className="text-[11px] text-cyan-400 hover:underline font-semibold"
                    >
                      Start →
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
