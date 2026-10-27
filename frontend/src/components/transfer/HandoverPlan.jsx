import React, { useState } from 'react';

/**
 * HandoverPlan component.
 * Tracks tacit knowledge transfer before an old employee's retirement.
 */
export default function HandoverPlan({
  plan = null,
  onStartTask,
}) {
  const fallbackPlan = {
    employee_name: 'Ramesh Sharma',
    retirement_date: 'May 31, 2027',
    days_remaining: 216,
    coverage_percent: 68,
    target_percent: 95,
    bus_factor_components: [
      { id: 1, name: 'VMC-3 Spindle Bearing & Drawbar', risk: 'Critical', cards_count: 8, gap: 'Tensioner adjustment undocumented' },
      { id: 2, name: 'VMC-3 Tool Changer Arm Timing', risk: 'High', cards_count: 5, gap: 'Pneumatic sensor calibration uncaptured' },
      { id: 3, name: 'Lathe-2 Turret Index Cam', risk: 'High', cards_count: 3, gap: 'Backlash backlash compensation by sound' },
    ],
    tasks: [
      { id: 101, title: 'Record setup video for SS304 Flange Operation', status: 'done', category: 'Video' },
      { id: 102, title: 'Answer 5 AI interview questions on Spindle Chatter', status: 'in_progress', category: 'Interview' },
      { id: 103, title: 'Sign off on Priya’s first solo vise setup run', status: 'pending', category: 'Mentorship' },
      { id: 104, title: 'Review 4 draft know-how cards in verification queue', status: 'pending', category: 'Review' },
    ],
  };

  const currentPlan = plan || fallbackPlan;
  const [tasks, setTasks] = useState(currentPlan.tasks);

  const toggleTask = (taskId) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? { ...t, status: t.status === 'done' ? 'pending' : 'done' }
          : t
      )
    );
  };

  const doneCount = tasks.filter((t) => t.status === 'done').length;
  const progressPercent = Math.round((doneCount / tasks.length) * 100);

  return (
    <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-6 shadow-xl space-y-6">
      {/* Top Banner: Employee Countdown & Knowledge Coverage */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-700/60 pb-5">
        <div>
          <span className="text-[10px] uppercase font-bold text-cyan-400 tracking-wider">
            Active Handover Plan
          </span>
          <h2 className="text-xl font-bold text-white mt-0.5">
            {currentPlan.employee_name} • Retirement Countdown
          </h2>
          <p className="text-slate-400 text-xs mt-1">
            Scheduled Exit: <strong className="text-slate-200">{currentPlan.retirement_date}</strong> ({currentPlan.days_remaining} days left)
          </p>
        </div>

        <div className="flex items-center space-x-4 bg-slate-900/80 px-4 py-2.5 rounded-xl border border-slate-800">
          <div>
            <div className="text-[10px] text-slate-400 font-bold uppercase">
              Coverage
            </div>
            <div className="text-xl font-extrabold text-cyan-300 font-mono">
              {currentPlan.coverage_percent}%
            </div>
          </div>
          <div className="h-7 w-px bg-slate-800" />
          <div>
            <div className="text-[10px] text-slate-400 font-bold uppercase">
              Target
            </div>
            <div className="text-xl font-extrabold text-emerald-400 font-mono">
              {currentPlan.target_percent}%
            </div>
          </div>
        </div>
      </div>

      {/* Bus Factor = 1 Critical Components */}
      <div className="space-y-3">
        <div className="flex items-center space-x-2">
          <span className="text-red-400 font-bold">⚠️</span>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Bus-Factor-1 Machine Knowledge (Sole Expert: Ramesh)
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {currentPlan.bus_factor_components.map((comp) => (
            <div
              key={comp.id}
              className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 space-y-1.5"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200 truncate">
                  {comp.name}
                </span>
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                    comp.risk === 'Critical'
                      ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  }`}
                >
                  {comp.risk}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-snug">
                Gap: {comp.gap}
              </p>
              <div className="text-[10px] text-cyan-400 font-semibold pt-1">
                {comp.cards_count} know-how cards captured
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Handover Tasks Checklist */}
      <div className="space-y-3 pt-2 border-t border-slate-700/60">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Transfer Milestone Tasks ({doneCount}/{tasks.length} Complete)
          </h3>
          <span className="text-xs font-mono font-semibold text-cyan-400">
            {progressPercent}% Complete
          </span>
        </div>

        <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
          <div
            className="bg-cyan-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <div className="space-y-2 pt-2">
          {tasks.map((task) => {
            const isDone = task.status === 'done';
            return (
              <div
                key={task.id}
                className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800 transition hover:bg-slate-900"
              >
                <div className="flex items-center space-x-3">
                  <button
                    type="button"
                    onClick={() => toggleTask(task.id)}
                    className={`w-5 h-5 rounded-md flex items-center justify-center text-xs font-bold border transition ${
                      isDone
                        ? 'bg-emerald-600 text-white border-emerald-500'
                        : 'border-slate-600 hover:border-cyan-400'
                    }`}
                    aria-label={`Mark task ${task.title} as ${isDone ? 'incomplete' : 'complete'}`}
                  >
                    {isDone ? '✓' : ''}
                  </button>

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
                    {task.category}
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
