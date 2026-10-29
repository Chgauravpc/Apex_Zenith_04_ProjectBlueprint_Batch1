import React, { useEffect, useState } from 'react';
import WarningBanner from '../guardian/WarningBanner';
import { LightbulbIcon } from '../common/Icons';

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
  serverResult = null,
}) {
  const [measuredValue, setMeasuredValue] = useState('');
  const [operatorNotes, setOperatorNotes] = useState('');
  const [warning, setWarning] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  // Machine settings actually used at this step, prefilled with the procedure's values.
  const [settings, setSettings] = useState({});

  useEffect(() => {
    setSettings(
      Object.fromEntries(Object.entries(step?.params || {}).map(([k, v]) => [k, String(v)]))
    );
  }, [step]);

  if (!step) return null;

  // Allowed range: explicit min/max, else target ± tolerance; none when the step has no check.
  const hasTarget = step.target_value != null && step.tolerance != null;
  const minVal =
    step.tolerance_min != null ? step.tolerance_min : hasTarget ? step.target_value - step.tolerance : null;
  const maxVal =
    step.tolerance_max != null ? step.tolerance_max : hasTarget ? step.target_value + step.tolerance : null;

  const handleValueChange = (val) => {
    setMeasuredValue(val);
    const num = parseFloat(val);

    // A measured value outside its tolerance blocks the step at once (safer than the backend,
    // which only cautions when the value is just outside); the backend check still runs on save.
    if (!isNaN(num) && minVal != null && maxVal != null) {
      if (num < minVal || num > maxVal) {
        setWarning({
          severity: 'stop',
          warnings: [
            {
              message: `Measurement ${num} is out of tolerance [${minVal.toFixed(2)} – ${maxVal.toFixed(2)}]. Measure again; do not continue until it is within limits.`,
            },
          ],
        });
        return;
      }
    }

    setWarning(null);
  };

  const handleNext = async () => {
    if (warning && warning.severity === 'stop') {
      return; // Block progress
    }
    if (onCompleteStep) {
      setIsSaving(true);
      const ok = await onCompleteStep({
        step_no: step.step_no != null ? step.step_no : stepIndex + 1,
        value: measuredValue ? parseFloat(measuredValue) : null,
        values: Object.fromEntries(
          Object.entries(settings)
            .filter(([, v]) => v !== '' && !isNaN(parseFloat(v)))
            .map(([k, v]) => [k, parseFloat(v)])
        ),
        notes: operatorNotes,
      });
      setIsSaving(false);
      if (ok === false) return; // the backend stopped this step: keep the values to correct
    }
    setMeasuredValue('');
    setOperatorNotes('');
    setWarning(null);
  };

  const isStopActive = warning && warning.severity === 'stop';

  return (
    <div className="bg-white border border-[#DADCE0] rounded-2xl p-6 shadow-card hover:border-slate-300 transition-all space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-5">
        <div className="flex items-center space-x-3.5">
          <span className="w-9 h-9 rounded-xl bg-maroon-50 text-maroon-800 font-extrabold flex items-center justify-center text-sm border border-maroon-200 font-mono shadow-xs">
            {stepIndex + 1}
          </span>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider font-mono">
              Step {stepIndex + 1} of {totalSteps}
            </span>
            <h2 className="text-lg font-bold text-slate-900 leading-snug">
              {step.title || step.instruction}
            </h2>
          </div>
        </div>

        {step.component && (
          <span className="text-xs bg-slate-100 px-3 py-1 rounded-lg text-slate-700 font-mono border border-slate-200">
            {step.component}
          </span>
        )}
      </div>

      {/* Step Visual or Keyframe */}
      {step.keyframe_url && skillLevel < 3 && (
        <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-black aspect-video max-h-64 flex items-center justify-center">
          <img
            src={step.keyframe_url}
            alt={`Visual guidance for step ${stepIndex + 1}`}
            className="w-full h-full object-contain"
          />
          {step.clip_start && (
            <div className="absolute bottom-2 left-2 bg-white/95 text-slate-800 px-2.5 py-1 rounded-lg text-[11px] font-mono border border-slate-200 shadow-xs">
              Reference Clip: {step.clip_start}s – {step.clip_end}s
            </div>
          )}
        </div>
      )}

      {/* Instructions */}
      <div className="space-y-3.5">
        <div className="text-sm text-slate-800 leading-relaxed font-medium">
          {step.instruction || step.description}
        </div>

        {/* Ramesh's Secret / Old Employee Tip */}
        {step.expert_tip && skillLevel <= 2 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-1.5 text-xs shadow-xs">
            <div className="font-bold text-amber-900 flex items-center space-x-1.5">
              <LightbulbIcon className="w-4 h-4 text-amber-700" />
              <span>{step.expert_tip_author || 'Old employee'}’s Shop-Floor Tip:</span>
            </div>
            <p className="text-amber-950 leading-relaxed">{step.expert_tip}</p>
          </div>
        )}
      </div>

      {/* Parameter Entry & Tolerance Checking */}
      {step.param_name && (
        <div className="bg-[#F8F9FA] p-4 sm:p-5 rounded-2xl border border-slate-200 space-y-3 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <label htmlFor="param-input" className="text-xs font-semibold text-slate-700">
              Enter Measured {step.param_name} ({step.param_unit || 'mm'}):
            </label>
            <span className="text-xs text-slate-500 font-mono">
              {hasTarget ? (
                <>
                  Target: <strong className="text-maroon-800 font-semibold">{step.target_value}</strong> ±{step.tolerance}
                </>
              ) : minVal != null && maxVal != null ? (
                <>
                  Allowed: <strong className="text-maroon-800 font-semibold">{minVal} – {maxVal}</strong>
                </>
              ) : null}
            </span>
          </div>

          <input
            id="param-input"
            type="number"
            step="0.001"
            value={measuredValue}
            onChange={(e) => handleValueChange(e.target.value)}
            placeholder={hasTarget ? `Target ${step.target_value} ±${step.tolerance}` : 'Measured value'}
            className="w-full bg-white border border-slate-300 rounded-xl p-3 text-sm text-slate-900 font-mono focus:border-maroon-600 focus:ring-2 focus:ring-maroon-500/20 outline-none shadow-xs"
          />
        </div>
      )}

      {/* Settings used at this step: checked against the machine's approved limits */}
      {Object.keys(settings).length > 0 && (
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
          <span className="text-xs font-semibold text-slate-700 block">
            Machine settings used at this step (change them if you used different values):
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {Object.entries(settings).map(([name, val]) => (
              <label key={name} className="text-[11px] text-slate-600 space-y-1">
                <span className="capitalize">{name.replace('_', ' ')}</span>
                <input
                  type="number"
                  step="any"
                  value={val}
                  aria-label={`Setting ${name}`}
                  onChange={(e) => setSettings((prev) => ({ ...prev, [name]: e.target.value }))}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-900 font-mono focus:border-maroon-600 outline-none"
                />
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Live Warning Banner (Guardian) */}
      {warning && (
        <WarningBanner result={warning} />
      )}
      {!warning && serverResult && <WarningBanner result={serverResult} />}

      {/* Action Navigation */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-200">
        <button
          type="button"
          disabled={stepIndex === 0}
          onClick={onPreviousStep}
          className="btn-touch px-4 py-2 bg-white hover:bg-slate-50 active:scale-[0.98] disabled:opacity-30 text-slate-700 font-semibold rounded-xl text-xs border border-slate-300 transition shadow-xs"
        >
          ← Previous
        </button>

        <button
          type="button"
          disabled={isStopActive || isSaving}
          onClick={handleNext}
          className={`btn-touch px-6 py-2.5 rounded-xl font-extrabold text-sm shadow-sm transition flex items-center space-x-2 active:scale-[0.98] ${
            isStopActive
              ? 'bg-rose-50 text-rose-700 border border-rose-300 cursor-not-allowed shadow-none'
              : 'bg-maroon-700 hover:bg-maroon-800 text-white shadow-sm'
          }`}
        >
          <span>{isStopActive ? 'Blocked by STOP Warning' : stepIndex + 1 === totalSteps ? 'Complete Run' : 'Complete Step & Next →'}</span>
        </button>
      </div>
    </div>
  );
}
