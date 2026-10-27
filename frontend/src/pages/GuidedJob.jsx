import React, { useState } from 'react';
import StepView from '../components/guide/StepView';
import StepList from '../components/guide/StepList';
import SkillBadge from '../components/guide/SkillBadge';
import ShadowTracePlayer from '../components/guide/ShadowTracePlayer';
import TroubleshootTree from '../components/guide/TroubleshootTree';
import { useAuthStore } from '../store/useAuthStore';
import { t } from '../utils/i18n';

const DEMO_PROCEDURE = {
  id: 1,
  title: 'VMC-3 SS304 Flange Face & Bore Setup',
  machine: 'VMC-3',
  version: 2,
  steps: [
    {
      id: 101,
      title: 'Wipe vise jaws and set work stop',
      instruction: 'Thoroughly wipe machine vise jaws with a clean rag. Verify no chips are trapped beneath parallel bars. Set work stop at 45.0 mm.',
      param_name: 'Work Stop Distance',
      param_unit: 'mm',
      target_value: 45.0,
      tolerance: 0.2,
      expert_tip: 'Trapped chips under the parallel bar cause a 0.08 mm tilt that will ruin flange perpendicularity. Always feel the underside by hand.',
      keyframe_url: null,
      clip_start: 5,
      clip_end: 25,
      component: 'Machine Vise',
    },
    {
      id: 102,
      title: 'Clamp workpiece and verify torque',
      instruction: 'Place SS304 raw billet into jaws against the work stop. Tighten vise with torque handle to 85 Nm.',
      param_name: 'Vise Torque',
      param_unit: 'Nm',
      target_value: 85.0,
      tolerance: 5.0,
      expert_tip: 'Never hammer the vise handle with a steel mallet; use brass only to prevent lead-screw backlash.',
      clip_start: 26,
      clip_end: 50,
      component: 'Hydraulic Vise Handle',
    },
    {
      id: 103,
      title: 'Check tool stick-out on 12mm endmill',
      instruction: 'Verify gauge length of Tool #4 (12mm 4-flute rougher) in ER32 holder is less than 35 mm stick-out.',
      param_name: 'Tool Overhang',
      param_unit: 'mm',
      target_value: 32.0,
      tolerance: 3.0,
      expert_tip: 'Any overhang above 36 mm creates severe chatter at 3200 RPM. Choke it up as tight as the fixture allows.',
      clip_start: 51,
      clip_end: 80,
      component: 'Spindle Toolholder',
    },
    {
      id: 104,
      title: 'Zero Z-axis with 2.0 mm touch probe',
      instruction: 'Jog Z-axis carefully towards top face of raw material with 2.0 mm reference block until slide drag is felt. Set G54 Z0.0.',
      param_name: 'Touch Block Height',
      param_unit: 'mm',
      target_value: 2.0,
      tolerance: 0.005,
      expert_tip: 'Wipe the touch block with solvent before probing. A film of oil gives a +0.02 mm false zero.',
      clip_start: 81,
      clip_end: 110,
      component: 'Z-Axis Way',
    },
  ],
};

const DEMO_TRACE = [
  { step_no: 1, clip_start: 5, clip_end: 25, components_checked: ['Parallel Bars', 'Vise Bed'] },
  { step_no: 2, clip_start: 26, clip_end: 50, components_checked: ['Vise Jaw Lead Screw'] },
  { step_no: 3, clip_start: 51, clip_end: 80, components_checked: ['ER32 Collet Nut', '12mm Endmill'] },
  { step_no: 4, clip_start: 81, clip_end: 110, components_checked: ['Z Touch Block', 'Billet Top Face'] },
];

export default function GuidedJob() {
  const { currentUser, language } = useAuthStore();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [completedSteps, setCompletedSteps] = useState([]);
  const [showShadowTrace, setShowShadowTrace] = useState(false);
  const [showTroubleshoot, setShowTroubleshoot] = useState(false);
  const [isFinished, setIsFinished] = useState(false);

  // Skill level: Priya = L1, Ramesh = L4, Suresh = L3
  const skillLevel = currentUser.role === 'old_employee' ? 4 : currentUser.role === 'supervisor' ? 3 : 1;
  const isChecklistMode = skillLevel >= 3;

  const currentStep = DEMO_PROCEDURE.steps[currentStepIndex];

  const handleCompleteStep = (_stepData) => {
    if (!completedSteps.includes(currentStepIndex)) {
      setCompletedSteps([...completedSteps, currentStepIndex]);
    }

    if (currentStepIndex + 1 < DEMO_PROCEDURE.steps.length) {
      setCurrentStepIndex(currentStepIndex + 1);
    } else {
      setIsFinished(true);
    }
  };

  const handlePrevious = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };

  const handleRestart = () => {
    setCurrentStepIndex(0);
    setCompletedSteps([]);
    setIsFinished(false);
  };

  return (
    <div className="space-y-6">
      {/* Header with Skill Badge & Toggles */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <span className="text-xl" aria-hidden="true">📋</span>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">
              {t('navGuide', language)}
            </h1>
            <span className="text-slate-500">•</span>
            <SkillBadge level={skillLevel} showDetails />
          </div>
          <p className="text-slate-400 text-xs sm:text-sm">
            {DEMO_PROCEDURE.title} (v{DEMO_PROCEDURE.version}) on {DEMO_PROCEDURE.machine}
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => setShowShadowTrace(!showShadowTrace)}
            className={`btn-touch px-3 py-1.5 rounded-xl text-xs font-semibold border transition flex items-center space-x-1.5 ${
              showShadowTrace
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
            }`}
          >
            <span>🎬</span>
            <span>ShadowTrace™</span>
          </button>

          <button
            type="button"
            onClick={() => setShowTroubleshoot(!showTroubleshoot)}
            className={`btn-touch px-3 py-1.5 rounded-xl text-xs font-semibold border transition flex items-center space-x-1.5 ${
              showTroubleshoot
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
            }`}
          >
            <span>🌳</span>
            <span>Troubleshoot</span>
          </button>
        </div>
      </div>

      {/* Completion Banner */}
      {isFinished ? (
        <div className="bg-slate-800 border border-emerald-500/40 rounded-2xl p-8 text-center space-y-4 shadow-xl">
          <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center text-3xl mx-auto border border-emerald-500/30">
            ✓
          </div>
          <h2 className="text-2xl font-extrabold text-white">
            Setup Run Completed Successfully!
          </h2>
          <p className="text-slate-300 text-sm max-w-lg mx-auto">
            All 4 setup steps for {DEMO_PROCEDURE.title} have been verified within tolerance.
            Zero Guardian warnings raised. Great run, {currentUser.name}!
          </p>
          <div className="pt-2">
            <button
              type="button"
              onClick={handleRestart}
              className="btn-touch px-6 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl text-sm shadow"
            >
              Start New Run
            </button>
          </div>
        </div>
      ) : (
        /* Main Layout */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Step List */}
          <div className="space-y-4">
            <StepList
              steps={DEMO_PROCEDURE.steps}
              currentStepIndex={currentStepIndex}
              completedStepIndices={completedSteps}
              onSelectStep={(idx) => setCurrentStepIndex(idx)}
              isChecklistMode={isChecklistMode}
            />

            {/* Optional ShadowTrace Player */}
            {showShadowTrace && (
              <ShadowTracePlayer
                traceSteps={DEMO_TRACE}
                currentStepNo={currentStepIndex + 1}
              />
            )}
          </div>

          {/* Center & Right Column: Step View or Troubleshoot Tree */}
          <div className="lg:col-span-2 space-y-6">
            <StepView
              step={currentStep}
              stepIndex={currentStepIndex}
              totalSteps={DEMO_PROCEDURE.steps.length}
              skillLevel={skillLevel}
              onCompleteStep={handleCompleteStep}
              onPreviousStep={handlePrevious}
            />

            {showTroubleshoot && (
              <TroubleshootTree />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
