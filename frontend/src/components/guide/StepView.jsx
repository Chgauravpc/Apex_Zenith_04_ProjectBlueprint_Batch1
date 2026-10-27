import React, { useState } from 'react';
import WarningBanner from '../guardian/WarningBanner';

/**
 * StepView component.
 * Adapts detail based on skill level and blocks progress if a STOP warning is active.
 */
export default function StepView({
  step,
  stepIndex,
  totalSteps,
  skillLevel = 1,
  onCompleteStep,
  onPreviousStep,
}) {
  const [measuredValue, setMeasuredValue] = useState('');
  const [operatorNotes, setOperatorNotes] = useState('');
  const [warning, setWarning] = useState(null);

  if (!step) return null;

  const handleValueChange = (val) => {
    setMeasuredValue(val);
    const num = parseFloat(val);

    // Live parameter tolerance checking
    if (!isNaN(num) && step.target_value !== undefined && step.tolerance !== undefined) {
      const minVal = step.target_value - step.tolerance;
      const maxVal = step.target_value + step.tolerance;

      if (num < minVal || num > maxVal) {
        setWarning({
          severity: 'stop',
          warnings: [
            {
              message: `Measurement ${num} is out of tolerance [${minVal.toFixed(2)} – ${maxVal.toFixed(2)}]. Stop and re-align clamp before proceeding.`,
            },
          ],
          expert_fix: 'Loosen clamp bolt, wipe jaw surface clean with cloth, and re-torque.',
        });
        return;
      }
    }

    setWarning(null);
  };

  const handleNext = () => {
    if (warning && warning.severity === 'stop') {
      return; // Block progress
    }
    if (onCompleteStep) {
      onCompleteStep({
        step_no: stepIndex + 1,
        value: measuredValue ? parseFloat(measuredValue) : null,
        notes: operatorNotes,
      });
    }
    setMeasuredValue('');
    setOperatorNotes('');
    setWarning(null);
  };

  const isStopActive = warning && warning.severity === 'stop';

  return (
    <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-6 shadow-xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-700/60 pb-4">
        <div className="flex items-center space-x-3">
          <span className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-300 font-bold flex items-center justify-center text-sm border border-cyan-500/30">
            {stepIndex + 1}
          </span>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              Step {stepIndex + 1} of {totalSteps}
            </span>
            <h2 className="text-lg font-bold text-white leading-snug">
              {step.title || step.instruction}
            </h2>
          </div>
        </div>

        {step.component && (
          <span className="text-xs bg-slate-900 px-2.5 py-1 rounded-lg text-slate-300 font-mono border border-slate-700">
            {step.component}
          </span>
        )}
      </div>

      {/* Step Visual or Keyframe */}
      {step.keyframe_url && skillLevel < 3 && (
        <div className="relative rounded-xl overflow-hidden border border-slate-700 bg-slate-950 aspect-video max-h-64 flex items-center justify-center">
          <img
            src={step.keyframe_url}
            alt={`Visual guidance for step ${stepIndex + 1}`}
            className="w-full h-full object-contain"
          />
          {step.clip_start && (
            <div className="absolute bottom-2 left-2 bg-slate-900/90 text-cyan-300 px-2 py-1 rounded text-[11px] font-mono border border-slate-700">
              Reference Clip: {step.clip_start}s – {step.clip_end}s
            </div>
          )}
        </div>
      )}

      {/* Instructions */}
      <div className="space-y-3">
        <div className="text-sm text-slate-200 leading-relaxed font-medium">
          {step.instruction || step.description}
        </div>

        {/* Ramesh's Secret / Old Employee Tip */}
        {step.expert_tip && skillLevel <= 2 && (
          <div className="bg-slate-900/90 border border-cyan-500/30 rounded-xl p-3.5 space-y-1 text-xs">
            <div className="font-bold text-cyan-300 flex items-center space-x-1.5">
              <span>💡</span>
              <span>Ramesh’s Shop-Floor Tip:</span>
            </div>
            <p className="text-slate-300 leading-relaxed">{step.expert_tip}</p>
          </div>
        )}
      </div>

      {/* Parameter Entry & Tolerance Checking */}
      {step.param_name && (
        <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <label htmlFor="param-input" className="text-xs font-semibold text-slate-300">
              Enter Measured {step.param_name} ({step.param_unit || 'mm'}):
            </label>
            <span className="text-xs text-slate-400 font-mono">
              Target: <strong className="text-cyan-300">{step.target_value}</strong> ±{step.tolerance}
            </span>
          </div>

          <input
            id="param-input"
            type="number"
            step="0.001"
            value={measuredValue}
            onChange={(e) => handleValueChange(e.target.value)}
            placeholder={`Target ${step.target_value} ±${step.tolerance}`}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-sm text-slate-100 font-mono focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
          />
        </div>
      )}

      {/* Live Warning Banner (Guardian) */}
      {warning && (
        <WarningBanner result={warning} />
      )}

      {/* Action Navigation */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-700/60">
        <button
          type="button"
          disabled={stepIndex === 0}
          onClick={onPreviousStep}
          className="btn-touch px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-300 font-semibold rounded-xl text-xs transition"
        >
          ← Previous
        </button>

        <button
          type="button"
          disabled={isStopActive}
          onClick={handleNext}
          className={`btn-touch px-6 py-2.5 rounded-xl font-bold text-sm shadow transition flex items-center space-x-2 ${
            isStopActive
              ? 'bg-red-950 text-red-400 border border-red-500/50 cursor-not-allowed'
              : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950'
          }`}
        >
          <span>{isStopActive ? 'Blocked by STOP Warning' : stepIndex + 1 === totalSteps ? 'Complete Run ✓' : 'Complete Step & Next →'}</span>
        </button>
      </div>
    </div>
  );
}
