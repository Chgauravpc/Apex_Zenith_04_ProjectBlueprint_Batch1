import React, { useState } from 'react';
import { GUARDIAN_DEMO_INCIDENT } from '../../data/guardianDemoIncident';

/**
 * Note Guardian Warning Demonstration Banner.
 * Interactive demonstration scenario displaying abnormal chatter on VMC-3 spindle.
 * Allows user to trigger/select the demo incident, automatically highlighting
 * the spindle in the 3D canvas with full details, severity, evidence, and Ramesh's guidance.
 *
 * NOTE: Clearly labeled as simulated demo data.
 */
export default function GuardianDemoBanner({
  isActive,
  onSelectIncident,
  onDismissIncident,
}) {
  const [expanded, setExpanded] = useState(false);
  const incident = GUARDIAN_DEMO_INCIDENT;

  const handleSelect = () => {
    setExpanded(true);
    if (onSelectIncident) {
      onSelectIncident(incident);
    }
  };

  const handleDismiss = () => {
    setExpanded(false);
    if (onDismissIncident) {
      onDismissIncident();
    }
  };

  return (
    <div
      role="region"
      aria-label="Note Guardian Warning Demonstration"
      className={`rounded-2xl border transition-all duration-300 shadow-xl overflow-hidden ${
        isActive
          ? 'bg-gradient-to-r from-red-950/95 via-slate-900 to-slate-950 border-red-500/80 ring-2 ring-red-500/30'
          : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
      }`}
    >
      {/* Top Banner Bar */}
      <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-start space-x-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 ${
              isActive
                ? 'bg-red-500/20 border border-red-500/50 text-red-400 animate-pulse'
                : 'bg-amber-500/20 border border-amber-500/40 text-amber-400'
            }`}
          >
            {isActive ? '⛔' : '🛡️'}
          </div>

          <div>
            <div className="flex items-center space-x-2 flex-wrap gap-y-1">
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded tracking-wider bg-rose-950 text-rose-300 border border-rose-500/40">
                {incident.label}
              </span>
              <span className="text-xs font-bold text-red-400">
                {incident.severity_label}
              </span>
              <span className="text-[11px] text-slate-400 font-mono">
                {incident.machine_name} • {incident.component_name}
              </span>
            </div>

            <h3 className="text-sm font-bold text-white mt-1">
              {incident.title}
            </h3>

            <p className="text-xs text-slate-300 mt-0.5">
              {incident.symptom}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2 shrink-0 self-end md:self-center">
          {!isActive ? (
            <button
              type="button"
              onClick={handleSelect}
              className="btn-touch px-3.5 py-2 text-xs font-bold rounded-xl bg-red-600 hover:bg-red-500 text-white shadow-lg transition flex items-center space-x-1.5"
            >
              <span>🚨 Inspect Incident in 3D</span>
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setExpanded(!expanded)}
                className="btn-touch px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition flex items-center space-x-1"
              >
                <span>{expanded ? 'Hide Details ▲' : 'Show Details ▼'}</span>
              </button>

              <button
                type="button"
                onClick={handleDismiss}
                className="btn-touch px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/40 transition flex items-center space-x-1"
              >
                <span>↺ Clear Demo</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Expanded Incident Breakdown View */}
      {isActive && expanded && (
        <div className="p-4 pt-0 border-t border-red-500/30 space-y-4 text-xs mt-3">
          {/* Demo Disclaimer Box */}
          <div className="bg-slate-950/80 border border-amber-500/40 rounded-xl p-3 text-amber-300 text-[11px] flex items-start space-x-2">
            <span className="text-base select-none shrink-0">⚠️</span>
            <div>
              <span className="font-bold uppercase tracking-wider">Demo Data Notice:</span>{' '}
              {incident.disclaimer}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Left: Incident Details & Acoustic Telemetry */}
            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 space-y-2">
              <h4 className="text-[11px] font-bold text-red-400 uppercase tracking-wider flex items-center space-x-1.5">
                <span>📊 Simulated Incident Telemetry</span>
              </h4>

              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between border-b border-slate-800/80 pb-1">
                  <span className="text-slate-400">Acoustic Peak:</span>
                  <span className="font-mono font-bold text-red-400">{incident.details.acoustic_peak}</span>
                </div>
                <div className="flex justify-between border-b border-slate-800/80 pb-1">
                  <span className="text-slate-400">Vibration Velocity:</span>
                  <span className="font-mono font-bold text-amber-400">{incident.details.vibration_velocity}</span>
                </div>
                <div className="flex justify-between border-b border-slate-800/80 pb-1">
                  <span className="text-slate-400">Workpiece Material:</span>
                  <span className="font-medium text-slate-200">{incident.details.material}</span>
                </div>
                <div className="flex justify-between border-b border-slate-800/80 pb-1">
                  <span className="text-slate-400">Cutting Tool:</span>
                  <span className="font-medium text-slate-200">{incident.details.tool}</span>
                </div>
              </div>

              <div className="mt-2 bg-red-950/40 border border-red-500/30 rounded-lg p-2 text-red-200 text-[11px]">
                <span className="font-bold">Risk Assessment:</span> {incident.details.risk_assessment}
              </div>
            </div>

            {/* Right: Available Expert Guidance (Ramesh) */}
            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider flex items-center space-x-1.5">
                  <span>💡 Available Expert Guidance</span>
                </h4>
                <span className="text-[10px] text-cyan-300 font-medium">
                  {incident.expert_guidance.author}
                </span>
              </div>

              <ul className="space-y-1 text-slate-300 text-xs">
                {incident.expert_guidance.immediate_actions.map((act, idx) => (
                  <li key={idx} className="flex items-start space-x-1.5">
                    <span className="text-cyan-400 font-bold shrink-0">›</span>
                    <span>{act}</span>
                  </li>
                ))}
              </ul>

              <div className="bg-cyan-950/40 border border-cyan-500/30 rounded-lg p-2 text-cyan-200 text-[11px] italic mt-2">
                {incident.expert_guidance.ramesh_golden_rule}
              </div>
            </div>
          </div>

          {/* Historical Evidence Citations */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5">
            <h4 className="text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
              <span>📚 Historical Cited Evidence (Guardian Memory)</span>
              <span className="text-[10px] text-slate-500 font-normal">
                Matched 3 historical incidents on VMC-3
              </span>
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              {incident.historical_evidence.map((ev) => (
                <div
                  key={ev.id}
                  className="bg-slate-900/90 border border-slate-800 rounded-lg p-2.5 text-xs flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                      <span className="font-mono text-cyan-300 font-bold">{ev.id}</span>
                      <span className="text-[10px] text-slate-500">{ev.date}</span>
                    </div>
                    <div className="font-semibold text-slate-200 text-xs">{ev.type}</div>
                    <p className="text-slate-300 text-[11px] mt-1 leading-snug">{ev.summary}</p>
                  </div>
                  <div className="mt-2 pt-1.5 border-t border-slate-800 text-[10px] text-emerald-400 font-medium">
                    ✓ {ev.similarity}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
