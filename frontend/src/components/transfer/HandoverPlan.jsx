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
    <div className="bg-white border border-[#DADCE0] rounded-2xl p-6 shadow-card hover:border-slate-300 transition-all space-y-6">
      {/* Top Banner: Employee Countdown & Handover Progress */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <span className="text-[10px] uppercase font-bold text-maroon-700 tracking-wider">
            Active Handover Plan
          </span>
          <h2 className="text-xl font-bold text-slate-900 mt-0.5">
            {plan.employee} • Retirement Countdown
          </h2>
          <p className="text-slate-500 text-xs mt-1">
            Scheduled Exit: <strong className="text-slate-700">{formatDate(plan.exit_date)}</strong> (
            {plan.days_left} days left)
          </p>
        </div>

        <div className="flex items-center space-x-4 bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-200">
          <div>
            <div className="text-[10px] text-slate-500 font-bold uppercase">Progress</div>
            <div className="text-xl font-extrabold text-maroon-700 font-mono">{plan.progress}%</div>
          </div>
          <div className="h-7 w-px bg-slate-200" />
          <div>
            <div className="text-[10px] text-slate-500 font-bold uppercase">Target</div>
            <div className="text-xl font-extrabold text-emerald-600 font-mono">100%</div>
          </div>
        </div>
      </div>

      {/* Bus Factor = 1 Critical Components */}
      <div className="space-y-3">
        <div className="flex items-center space-x-2">
          <span className="text-amber-500 font-bold">⚠️</span>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Bus-Factor-1 Machine Knowledge (Sole Expert: {firstName})
          </h3>
        </div>

        {plan.sole_holder_machines.length > 0 && (
          <p className="text-[11px] text-slate-500">
            Only {firstName} knows: <strong className="text-slate-800">{plan.sole_holder_machines.join(', ')}</strong>
          </p>
        )}

        {soleParts.length === 0 ? (
          <p className="text-xs text-slate-500">No machine part depends on {firstName} alone.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {soleParts.map((comp) => (
              <div
                key={`${comp.machine_id}-${comp.component_id}`}
                className="bg-white border border-slate-200/90 rounded-xl p-4 space-y-2 shadow-xs hover:border-slate-300 transition"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 truncate">{comp.name}</span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      comp.status === 'critical'
                        ? 'bg-rose-50 text-rose-950 border border-rose-200'
                        : 'bg-amber-50 text-amber-950 border border-amber-200'
                    }`}
                  >
                    {comp.status === 'critical' ? 'Critical' : 'High'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 leading-snug">
                  {comp.holders === 1
                    ? `Only ${firstName} has recorded know-how on this part.`
                    : `${comp.holders} people know it, but most are leaving.`}
                </p>
                <div className="text-[10px] text-maroon-700 font-semibold pt-1">
                  {comp.cards} know-how {comp.cards === 1 ? 'card' : 'cards'} captured
                </div>
              </div>
            ))}
          </div>
        )}

        {plan.gaps.length > 0 && (
          <div className="text-[11px] text-slate-600 space-y-1">
            <span className="font-semibold text-slate-700">Questions nobody could answer yet:</span>
            <ul className="list-disc ml-5">
              {plan.gaps.map((g) => (
                <li key={g}>{g}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Handover Tasks Checklist */}
      <div className="space-y-3 pt-2 border-t border-slate-100">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Transfer Milestone Tasks ({doneCount}/{plan.tasks.length} Complete)
          </h3>
          <span className="text-xs font-mono font-semibold text-maroon-700">{plan.progress}% Complete</span>
        </div>

        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200/80">
          <div
            className="bg-maroon-700 h-2 rounded-full transition-all duration-300"
            style={{ width: `${plan.progress}%` }}
          />
        </div>

        <div className="space-y-2 pt-2">
          {plan.tasks.map((task) => {
            const isDone = task.status === 'done';
            return (
              <div
                key={task.id}
                className="flex items-center justify-between p-3.5 rounded-xl bg-white border border-slate-200/90 shadow-xs transition hover:border-slate-300"
              >
                <div className="flex items-center space-x-3">
                  <span
                    className={`w-5 h-5 rounded-md flex items-center justify-center text-xs font-bold border ${
                      isDone ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-white border-slate-300 text-transparent'
                    }`}
                    aria-label={isDone ? 'Done' : 'To do'}
                  >
                    {isDone ? '✓' : ''}
                  </span>

                  <span
                    className={`text-xs ${
                      isDone ? 'line-through text-slate-400 font-normal' : 'text-slate-800 font-medium'
                    }`}
                  >
                    {task.title}
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  <span className="text-[10px] text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-md font-mono border border-slate-200/60 font-medium">
                    {CATEGORY_LABELS[task.category] || task.category}
                  </span>
                  {onStartTask && !isDone && (
                    <button
                      type="button"
                      onClick={() => onStartTask(task)}
                      className="text-xs text-maroon-700 hover:text-maroon-800 hover:underline font-semibold"
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
