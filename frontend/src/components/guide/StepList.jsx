import React from 'react';

export default function StepList({
  steps = [],
  currentStepIndex = 0,
  completedStepIndices = [],
  onSelectStep,
  isChecklistMode = false,
}) {
  return (
    <div className="bg-white border border-[#DADCE0] rounded-xl p-3.5 space-y-2 shadow-card">
      <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 border-b border-slate-100 pb-2">
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
                  ? 'bg-maroon-50 text-maroon-900 border border-maroon-200 shadow-xs font-semibold'
                  : isDone
                    ? 'bg-[#F8F9FA] text-emerald-800 hover:bg-slate-100/80 border border-slate-200/60 font-medium'
                    : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200/40'
              }`}
            >
              <div className="flex items-center space-x-2 truncate">
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    isDone
                      ? 'bg-emerald-600 text-white'
                      : isCurrent
                        ? 'bg-maroon-700 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-500 border border-slate-200'
                  }`}
                >
                  {isDone ? '✓' : idx + 1}
                </span>
                <span className="truncate">{step.title || step.instruction}</span>
              </div>

              {step.param_name && (
                <span className="text-[10px] text-slate-500 font-mono ml-2 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
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
