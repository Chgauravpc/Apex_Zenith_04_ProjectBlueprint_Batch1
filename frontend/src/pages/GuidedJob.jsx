import React, { useState } from 'react';
import StepView from '../components/guide/StepView';
import StepList from '../components/guide/StepList';
import SkillBadge from '../components/guide/SkillBadge';
import ShadowTracePlayer from '../components/guide/ShadowTracePlayer';
import TroubleshootTree from '../components/guide/TroubleshootTree';
import LoadState from '../components/common/LoadState';
import PlaybookLink from '../components/common/PlaybookLink';
import { getProcedures, getShadowTrace, getTroubleshoot, recordStep, startRun } from '../api/guide';
import useApi from '../hooks/useApi';
import { useAuthStore } from '../store/useAuthStore';
import { useMachineStore } from '../store/useMachineStore';
import { PageHead, Reveal } from '../components/common';
import { Play, Film, GitFork } from 'lucide-react';

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
  const { currentUser } = useAuthStore();
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
    setCurrentStepIndex(0);
    setCompletedSteps([]);
    setStepResult(null);
    setWarningCount(0);
    setIsFinished(false);
  };

  const treeData = (tree.data || []).map((node) => ({
    symptom: node.symptom && String(node.symptom).includes('incident')
      ? node.symptom
      : `${node.symptom || node.label} (${node.incidents_count ?? node.incidents ?? 0} past incidents)`,
    causes: node.causes,
  }));

  return (
    <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
      <PageHead
        eyebrow="Lane 03 · Step-by-step guidance"
        title="The job, told at your level."
        sub="Same procedure, different depth — L0 gets the story and the safety talk, L4 gets the checklist."
      />

      {/* Run Header / Setup Info */}
      {run && (
        <Reveal delay={0.05}>
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-display text-lg font-bold text-ink">
                {procedure.title} (v{procedure.version || 1}) on {procedure.machine || 'VMC-3'}
              </span>
              <SkillBadge level={run.skill_level} role={currentUser.role} />
              <span className="rounded-full bg-subtle px-3 py-1 font-mono text-xs text-slate-500">
                Run #{run.run_id}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setShowShadowTrace((v) => !v)}
                className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition-all duration-200 ${
                  showShadowTrace
                    ? 'border border-maroon-300 bg-white text-maroon-800 font-bold shadow-xs'
                    : 'border border-slate-300 bg-white text-slate-700 hover:border-slate-400'
                }`}
              >
                <Film size={14} className={showShadowTrace ? 'text-maroon-700' : 'text-slate-400'} />
                <span>ShadowTrace™</span>
              </button>

              <button
                type="button"
                onClick={() => setShowTroubleshoot((v) => !v)}
                className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition-all duration-200 ${
                  showTroubleshoot
                    ? 'border border-maroon-300 bg-white text-maroon-800 font-bold shadow-xs'
                    : 'border border-slate-300 bg-white text-slate-700 hover:border-slate-400'
                }`}
              >
                <GitFork size={14} className={showTroubleshoot ? 'text-maroon-700' : 'text-slate-400'} />
                <span>Troubleshoot</span>
              </button>

              <PlaybookLink machineId={procedure.machine_id} />
            </div>
          </div>
        </Reveal>
      )}

      {/* Procedure Selector & Start Run */}
      {!run && (
        <Reveal delay={0.08}>
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <LoadState loading={procedures.loading} error={procedures.error} label="Loading setup procedures…" />

            {procedures.data && (
              <div className="space-y-4">
                <label htmlFor="procedure-select" className="block font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Select Procedure:
                </label>
                <select
                  id="procedure-select"
                  data-testid="guided-job-selector"
                  value={chosenId || ''}
                  onChange={(e) => setProcedureId(Number(e.target.value))}
                  className="w-full rounded-2xl border border-slate-200 bg-canvas px-4 py-3 text-sm font-medium text-ink outline-none focus:border-copper"
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
                  className="inline-flex items-center gap-2 rounded-full bg-copper hover:bg-copper/90 px-7 py-3.5 text-sm font-semibold text-white transition-colors duration-300 shadow-xs disabled:opacity-50"
                >
                  <Play size={16} />
                  <span>{isStarting ? 'Starting…' : 'Start Guided Run →'}</span>
                </button>
              </div>
            )}
            {startError && (
              <div role="alert" className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-medium text-red-800">
                {startError}
              </div>
            )}
          </div>
        </Reveal>
      )}

      {/* Completion Banner */}
      {run && isFinished && (
        <div className="rounded-3xl border border-teal/30 bg-teal-light p-10 text-center shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-teal text-2xl font-bold text-white shadow-sm">
            ✓
          </div>
          <h2 className="mt-4 font-display text-2xl font-extrabold text-ink">Setup Run Completed Successfully!</h2>
          <p className="mx-auto mt-2 max-w-lg text-sm text-slate-600">
            All {steps.length} steps of {procedure.title} are recorded.{' '}
            {warningCount === 0
              ? `Zero Guardian warnings raised. Great run, ${currentUser.name}!`
              : `${warningCount} Guardian warning(s) were raised; go through them with your knowledge buddy.`}
          </p>
          <div className="mt-6">
            <button
              type="button"
              onClick={handleRestart}
              className="inline-flex items-center gap-2 rounded-full bg-copper hover:bg-copper/90 px-7 py-3 text-sm font-semibold text-white transition-colors duration-300 shadow-xs"
            >
              Start New Run
            </button>
          </div>
        </div>
      )}

      {/* Main Layout */}
      {run && !isFinished && (
        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
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
          <div className="space-y-6 lg:col-span-2">
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
