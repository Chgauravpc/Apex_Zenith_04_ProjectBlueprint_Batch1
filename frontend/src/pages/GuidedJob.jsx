import React, { useState } from 'react';
import StepView from '../components/guide/StepView';
import StepList from '../components/guide/StepList';
import SkillBadge from '../components/guide/SkillBadge';
import ShadowTracePlayer from '../components/guide/ShadowTracePlayer';
import TroubleshootTree from '../components/guide/TroubleshootTree';
import LoadState from '../components/common/LoadState';
import { getProcedures, getShadowTrace, getTroubleshoot, recordStep, startRun } from '../api/guide';
import useApi from '../hooks/useApi';
import { useAuthStore } from '../store/useAuthStore';
import { useMachineStore } from '../store/useMachineStore';
import { t } from '../utils/i18n';
import { ClipboardIcon, PlayIcon, BranchIcon } from '../components/common/Icons';

const SEVERITY_RANK = { info: 0, caution: 1, stop: 2 };

/** Backend findings → the shape WarningBanner shows (worst severity first). */
const toBannerResult = (findings) => ({
  severity: findings.reduce(
    (worst, f) => (SEVERITY_RANK[f.severity] > SEVERITY_RANK[worst] ? f.severity : worst),
    'info'
  ),
  warnings: findings,
  evidence: findings.flatMap((f) => f.evidence || []), // the records behind each warning
});

export default function GuidedJob() {
  const { currentUser, language } = useAuthStore();
  const { selectedMachineId, setActiveRunId } = useMachineStore();
  const procedures = useApi(
    (signal) => getProcedures({ machine_id: selectedMachineId, status: 'approved' }, signal),
    [selectedMachineId]
  );

  const [procedureId, setProcedureId] = useState(null);
  const [run, setRun] = useState(null);
  const [isStarting, setIsStarting] = useState(false);
  const [startError, setStartError] = useState(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [completedSteps, setCompletedSteps] = useState([]);
  const [stepResult, setStepResult] = useState(null);
  const [warningCount, setWarningCount] = useState(0);
  const [showShadowTrace, setShowShadowTrace] = useState(false);
  const [showTroubleshoot, setShowTroubleshoot] = useState(false);
  const [isFinished, setIsFinished] = useState(false);

  const procedure = run ? run.procedure : null;
  const steps = procedure ? procedure.steps : [];
  const currentStep = steps[currentStepIndex];
  const chosenId = procedureId || (procedures.data && procedures.data[0] && procedures.data[0].id);

  const trace = useApi(
    (signal) => (showShadowTrace && procedure ? getShadowTrace(procedure.id, signal) : null),
    [showShadowTrace, procedure && procedure.id]
  );
  const tree = useApi(
    (signal) =>
      showTroubleshoot && procedure && procedure.machine_id
        ? getTroubleshoot(procedure.machine_id, signal)
        : null,
    [showTroubleshoot, procedure && procedure.machine_id]
  );

  const handleStart = async () => {
    setIsStarting(true);
    setStartError(null);
    try {
      const started = await startRun({ employee_id: currentUser.id, procedure_id: chosenId });
      setRun(started);
      setActiveRunId(started.run_id);
      setCurrentStepIndex(0);
      setCompletedSteps([]);
      setStepResult(null);
      setWarningCount(0);
      setIsFinished(false);
    } catch (err) {
      setStartError(err.message || 'Could not start the guided run.');
    } finally {
      setIsStarting(false);
    }
  };

  // Every step is checked by the backend (Note Guardian rules); a stop keeps you on the step.
  const handleCompleteStep = async (stepData) => {
    let res;
    try {
      res = await recordStep(run.run_id, {
        step_no: currentStep.step_no,
        value: stepData.value,
        values: stepData.values || {},
        notes: stepData.notes || null,
      });
    } catch (err) {
      setStepResult({ severity: 'caution', warnings: [{ message: `Step not saved: ${err.message}` }] });
      return false;
    }
    setWarningCount((n) => n + res.warnings.length);
    if (!res.can_continue) {
      setStepResult(toBannerResult(res.warnings));
      return false;
    }
    setStepResult(res.warnings.length ? toBannerResult(res.warnings) : null);
    if (!completedSteps.includes(currentStepIndex)) {
      setCompletedSteps([...completedSteps, currentStepIndex]);
    }
    if (res.run_status === 'done' || res.next_step_no === null) {
      setIsFinished(true);
    } else {
      const next = steps.findIndex((s) => s.step_no === res.next_step_no);
      setCurrentStepIndex(next >= 0 ? next : currentStepIndex + 1);
    }
    return true;
  };

  const handlePrevious = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
      setStepResult(null);
    }
  };

  const handleRestart = () => {
    setRun(null);
    setActiveRunId(null);
    setIsFinished(false);
  };

  const treeData = (tree.data || []).map((node) => ({
    symptom: `${node.label} (${node.incidents} past incidents)`,
    causes: node.causes,
  }));

  return (
    <div className="space-y-6">
      {/* Header with Skill Badge & Toggles */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span className="w-9 h-9 rounded-xl bg-maroon-50 text-maroon-700 flex items-center justify-center border border-maroon-100 shadow-xs">
              <ClipboardIcon className="w-5 h-5 text-maroon-700" />
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">{t('navGuide', language)}</h1>
            {run && (
              <>
                <span className="text-slate-300">•</span>
                <SkillBadge level={run.skill_level} showDetails />
              </>
            )}
          </div>
          <p className="text-slate-500 text-xs sm:text-sm">
            {procedure
              ? `${procedure.title} (v${procedure.version}) on ${procedure.machine}`
              : 'Pick an approved procedure and start a guided run.'}
          </p>
        </div>

        {run && (
          <div className="flex items-center space-x-2.5">
            <button
              type="button"
              onClick={() => setShowShadowTrace(!showShadowTrace)}
              className={`btn-touch px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-all flex items-center space-x-1.5 active:scale-[0.98] ${
                showShadowTrace
                  ? 'bg-maroon-50 text-maroon-800 border-maroon-200 shadow-xs'
                  : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300 shadow-xs'
              }`}
            >
              <PlayIcon className={`w-4 h-4 ${showShadowTrace ? 'text-maroon-700' : 'text-slate-500'}`} />
              <span>ShadowTrace™</span>
            </button>

            <button
              type="button"
              onClick={() => setShowTroubleshoot(!showTroubleshoot)}
              className={`btn-touch px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-all flex items-center space-x-1.5 active:scale-[0.98] ${
                showTroubleshoot
                  ? 'bg-amber-50 text-amber-800 border-amber-200 shadow-xs'
                  : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300 shadow-xs'
              }`}
            >
              <BranchIcon className={`w-4 h-4 ${showTroubleshoot ? 'text-amber-700' : 'text-slate-500'}`} />
              <span>Troubleshoot</span>
            </button>
          </div>
        )}
      </div>

      {!run && (
        <div className="bg-white border border-[#DADCE0] rounded-2xl p-6 shadow-card hover:border-slate-300 transition-all space-y-4">
          <LoadState
            loading={procedures.loading}
            error={procedures.error}
            onRetry={procedures.reload}
            label="Loading procedures…"
          />
          {procedures.data && procedures.data.length === 0 && (
            <p className="text-xs text-slate-500">
              No approved procedure for this machine yet. Record a setup video on Capture.
            </p>
          )}
          {procedures.data && procedures.data.length > 0 && (
            <>
              <label htmlFor="procedure-select" className="block text-xs font-semibold text-slate-700">
                Procedure:
              </label>
              <select
                id="procedure-select"
                value={chosenId || ''}
                onChange={(e) => setProcedureId(Number(e.target.value))}
                className="w-full bg-white border border-slate-300 text-slate-800 py-2 px-3 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-maroon-500/20 focus:border-maroon-600 shadow-xs"
              >
                {procedures.data.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title} (v{p.version}, {p.steps_count} steps, by {p.author || 'unknown'})
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={isStarting || !chosenId}
                onClick={handleStart}
                className="btn-touch px-6 py-2.5 bg-maroon-700 hover:bg-maroon-800 disabled:opacity-50 text-white font-bold rounded-xl text-sm shadow-sm transition-all"
              >
                {isStarting ? 'Starting…' : 'Start Guided Run →'}
              </button>
            </>
          )}
          {startError && (
            <div role="alert" className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-medium">
              {startError}
            </div>
          )}
        </div>
      )}

      {/* Completion Banner */}
      {run && isFinished && (
        <div className="bg-white border border-emerald-200 rounded-2xl p-8 text-center space-y-4 shadow-card">
          <div className="w-16 h-16 bg-emerald-50 text-emerald-700 rounded-full flex items-center justify-center text-3xl mx-auto border border-emerald-200 shadow-xs font-bold">
            ✓
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900">Setup Run Completed Successfully!</h2>
          <p className="text-slate-600 text-sm max-w-lg mx-auto">
            All {steps.length} steps of {procedure.title} are recorded.{' '}
            {warningCount === 0
              ? `Zero Guardian warnings raised. Great run, ${currentUser.name}!`
              : `${warningCount} Guardian warning(s) were raised; go through them with your knowledge buddy.`}
          </p>
          <div className="pt-2">
            <button
              type="button"
              onClick={handleRestart}
              className="btn-touch px-6 py-2.5 bg-maroon-700 hover:bg-maroon-800 text-white font-bold rounded-xl text-sm shadow-sm transition-all"
            >
              Start New Run
            </button>
          </div>
        </div>
      )}

      {/* Main Layout */}
      {run && !isFinished && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Step List */}
          <div className="space-y-4">
            <StepList
              steps={steps}
              currentStepIndex={currentStepIndex}
              completedStepIndices={completedSteps}
              onSelectStep={(idx) => {
                setCurrentStepIndex(idx);
                setStepResult(null);
              }}
              isChecklistMode={run.view === 'checklist'}
            />

            {showShadowTrace && (
              <>
                <LoadState loading={trace.loading} error={trace.error} label="Loading recorded run…" />
                {trace.data && (
                  <ShadowTracePlayer
                    traceSteps={trace.data.steps}
                    currentStepNo={currentStep ? currentStep.step_no : 1}
                    videoUrl={trace.data.video_url}
                    author={trace.data.author}
                  />
                )}
              </>
            )}
          </div>

          {/* Center & Right Column: Step View or Troubleshoot Tree */}
          <div className="lg:col-span-2 space-y-6">
            <StepView
              key={currentStep ? currentStep.id : 'none'}
              step={currentStep}
              stepIndex={currentStepIndex}
              totalSteps={steps.length}
              skillLevel={run.skill_level}
              onCompleteStep={handleCompleteStep}
              onPreviousStep={handlePrevious}
              serverResult={stepResult}
            />

            {showTroubleshoot && (
              <>
                <LoadState loading={tree.loading} error={tree.error} label="Loading troubleshooting tree…" />
                {tree.data &&
                  (treeData.length ? (
                    <TroubleshootTree treeData={treeData} />
                  ) : (
                    <p className="text-xs text-slate-400">No past incidents recorded for this machine yet.</p>
                  ))}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
