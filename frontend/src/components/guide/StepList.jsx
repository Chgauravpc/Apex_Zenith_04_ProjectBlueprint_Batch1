import React from 'react';

export default function StepList({
  steps = [],
  currentStepIndex = 0,
  completedStepIndices = [],
  onSelectStep,
  isChecklistMode = false,
}) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 space-y-2">
      <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
        <span>{isChecklistMode ? 'Expert Checklist (L3)' : 'Procedure Steps'}</span>
        <span>
          {completedStepIndices.length} / {steps.length} Done
        </span>
      </div>

      <nav aria-label="Procedure Steps Navigation" className="space-y-1.5">
        {steps.map((step, idx) => {
          const isCurrent = idx === currentStepIndex;
          const isDone = completedStepIndices.includes(idx);

          return (
            <button
              key={step.id || idx}
              type="button"
              onClick={() => onSelectStep && onSelectStep(idx)}
              className={`w-full text-left p-2.5 rounded-lg text-xs font-medium transition flex items-center justify-between ${
                isCurrent
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                  : isDone
                    ? 'bg-slate-800/80 text-emerald-400 hover:bg-slate-800'
                    : 'bg-slate-950/60 text-slate-400 hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center space-x-2 truncate">
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    isDone
                      ? 'bg-emerald-500 text-slate-950'
                      : isCurrent
                        ? 'bg-cyan-400 text-slate-950'
                        : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {isDone ? '✓' : idx + 1}
                </span>
                <span className="truncate">{step.title || step.instruction}</span>
              </div>

              {step.param_name && (
                <span className="text-[10px] text-slate-500 font-mono ml-2">
                  ±{step.tolerance || 'tol'}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
