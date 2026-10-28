import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { getKnowledgeCounts } from '../../api/map3d';

/**
 * Slide-out / Side Panel displaying detailed component-specific know-how:
 * - Knowledge counts summary (expert tips, past incidents, troubleshooting)
 * - Associated expert tips authored by Ramesh (Old Employee)
 * - Historical failure incidents with root cause and resolutions
 * - Component-specific troubleshooting guidance with step-by-step diagnostic checks
 * - Engineering specifications and quick action links
 *
 * Reference: PRD.md §9.4 and TASKS.md T21.
 */
export default function ComponentPanel({
  component,
  activeDemoIncident,
  onClose,
  onResetSelection,
  onOpenPinForm,
  onFocusComponent,
  onSelectComponent,
}) {
  const [activeTroubleshootTab, setActiveTroubleshootTab] = useState(null);

  // Empty / Reset state when no component is selected
  if (!component) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-6 text-center text-slate-600 dark:text-slate-300 shadow-card space-y-4">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-maroon-50 dark:bg-maroon-950/60 border border-maroon-200 dark:border-maroon-800 flex items-center justify-center text-3xl text-maroon-700 dark:text-rose-300 shadow-inner">
          ⚙️
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
            3D Machine Knowledge Explorer
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1.5 max-w-xs mx-auto leading-relaxed">
            Click on any part of the 3D VMC model to inspect its engineering specifications, historical failure incidents, troubleshooting guidance, and Ramesh&apos;s tacit know-how.
          </p>
        </div>

        {/* Quick Component Selection Shortcuts */}
        <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
          <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2.5">
            Clickable Machine Assemblies:
          </div>
          <div className="grid grid-cols-2 gap-2 text-left">
            {[
              { id: 'spindle', label: 'Spindle Assembly', icon: '⚙️', risk: 'high' },
              { id: 'tool_holder', label: 'Tool Holder & ATC', icon: '🔧', risk: 'medium' },
              { id: 'worktable', label: 'T-Slot Worktable', icon: '📐', risk: 'low' },
              { id: 'vise', label: 'Precision Vise', icon: '🗜️', risk: 'low' },
              { id: 'control_panel', label: 'Control Pendant', icon: '🖥️', risk: 'low' },
              { id: 'doors', label: 'Enclosure Doors', icon: '🚪', risk: 'low' },
            ].map((part) => (
              <button
                key={part.id}
                type="button"
                onClick={() => onSelectComponent && onSelectComponent(part.id)}
                className="px-2.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 hover:bg-maroon-50 dark:hover:bg-maroon-950/50 border border-slate-200 dark:border-slate-700 hover:border-maroon-200 dark:hover:border-maroon-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-maroon-800 dark:hover:text-rose-300 transition flex items-center space-x-1.5 shadow-xs"
              >
                <span>{part.icon}</span>
                <span className="truncate">{part.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const counts = getKnowledgeCounts(component);
  const expertTips = component.expert_tips || component.expert_notes || [];
  const incidents = component.past_incidents || [];
  const troubleshootingList = component.troubleshooting || [];
  const procedures = component.procedures || [];

  const getRiskBadge = (risk) => {
    switch (risk) {
      case 'high':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse" />
            <span>High Risk ({component.incident_count || 0} incidents)</span>
          </span>
        );
      case 'medium':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
            <span>Medium Caution ({component.incident_count || 0} incidents)</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
            <span>Optimal / Normal</span>
          </span>
        );
    }
  };

  const handleReset = onResetSelection || onClose;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 shadow-card flex flex-col space-y-4 max-h-[85vh] overflow-y-auto text-slate-800 dark:text-slate-100">
      {/* Panel Header */}
      <div className="flex items-start justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
        <div>
          <div className="flex items-center space-x-2 flex-wrap gap-y-1">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
              {component.display_name}
            </h2>
            {getRiskBadge(component.risk)}
          </div>
          <div className="flex items-center space-x-2 mt-1 flex-wrap gap-1 text-xs text-slate-500 dark:text-slate-400">
            <span>{component.category}</span>
            <span>•</span>
            <span>Mesh: <code className="text-maroon-700 dark:text-rose-400 font-mono font-semibold">{component.mesh_name}</code></span>
            <span>•</span>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-maroon-50 dark:bg-maroon-950/60 text-maroon-800 dark:text-rose-300 border border-maroon-200 dark:border-maroon-800">
              Knowledge Count: {counts.total} items
            </span>
          </div>
        </div>

        {/* Reset Selection Button */}
        <button
          type="button"
          onClick={handleReset}
          className="btn-touch px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-maroon-800 dark:hover:text-white bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 rounded-xl border border-slate-200 dark:border-slate-700 transition flex items-center space-x-1 shadow-xs"
          title="Reset Selection"
        >
          <span>↺</span>
          <span className="hidden sm:inline">Reset</span>
        </button>
      </div>

      {/* Knowledge Count Metric Counters */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 rounded-xl p-3 shadow-xs">
          <div className="text-lg font-black text-maroon-700 dark:text-rose-400">{counts.tips}</div>
          <div className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider mt-0.5">Expert Tips</div>
        </div>
        <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 rounded-xl p-3 shadow-xs">
          <div className="text-lg font-black text-amber-700 dark:text-amber-400">{counts.troubleshooting}</div>
          <div className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider mt-0.5">Guides</div>
        </div>
        <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 rounded-xl p-3 shadow-xs">
          <div className="text-lg font-black text-rose-700 dark:text-rose-400">{counts.incidents}</div>
          <div className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider mt-0.5">Incidents</div>
        </div>
      </div>

      {/* Active Note Guardian Warning Demonstration Alert */}
      {activeDemoIncident && activeDemoIncident.component_id === component.mesh_name && (
        <div
          role="alert"
          aria-live="assertive"
          className="bg-rose-50 dark:bg-rose-950/40 border-2 border-rose-500 dark:border-rose-700 rounded-xl p-4 shadow-sm space-y-3 text-rose-950 dark:text-rose-100"
        >
          <div className="flex items-start space-x-2.5">
            <span className="text-2xl select-none shrink-0 animate-bounce">⛔</span>
            <div className="flex-1">
              <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded tracking-wider bg-rose-900 text-white border border-rose-600">
                  {activeDemoIncident.label}
                </span>
                <span className="text-xs font-black text-rose-800 dark:text-rose-300">
                  {activeDemoIncident.severity_label}
                </span>
              </div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white mt-1">
                {activeDemoIncident.title}
              </h4>
              <p className="text-xs text-rose-900/90 dark:text-rose-200 mt-0.5 leading-relaxed">
                {activeDemoIncident.symptom}
              </p>
            </div>
          </div>

          {/* Telemetry metrics */}
          <div className="bg-white dark:bg-slate-800/80 border border-rose-200 dark:border-rose-900/60 rounded-lg p-2.5 text-xs space-y-1 shadow-xs">
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-500 dark:text-slate-400">Peak Chatter:</span>
              <span className="font-mono font-bold text-rose-700 dark:text-rose-400">
                {activeDemoIncident.details.acoustic_peak}
              </span>
            </div>
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-500 dark:text-slate-400">Vibration Velocity:</span>
              <span className="font-mono font-bold text-amber-700 dark:text-amber-400">
                {activeDemoIncident.details.vibration_velocity}
              </span>
            </div>
            <div className="text-[11px] text-rose-800 dark:text-rose-300 pt-1 border-t border-rose-200 dark:border-rose-900/50">
              <span className="font-bold">Risk:</span> {activeDemoIncident.details.risk_assessment}
            </div>
          </div>

          {/* Historical Evidence */}
          <div className="space-y-1.5">
            <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Cited Historical Evidence:
            </div>
            {activeDemoIncident.historical_evidence?.map((ev) => (
              <div
                key={ev.id}
                className="bg-white dark:bg-slate-800/70 border border-rose-200/80 dark:border-rose-900/50 rounded p-2 text-[11px] shadow-xs"
              >
                <div className="flex justify-between font-mono text-maroon-700 dark:text-rose-400 font-bold">
                  <span>{ev.id} ({ev.date})</span>
                  <span className="text-emerald-700 dark:text-emerald-400 text-[10px] font-semibold">{ev.similarity}</span>
                </div>
                <div className="text-slate-900 dark:text-slate-200 font-medium">{ev.type}</div>
                <div className="text-slate-600 dark:text-slate-400 text-[10px]">{ev.summary}</div>
              </div>
            ))}
          </div>

          {/* Ramesh Expert Guidance */}
          <div className="bg-maroon-50/70 dark:bg-maroon-950/40 border border-maroon-200 dark:border-maroon-800 rounded-lg p-3 space-y-2 text-maroon-950 dark:text-rose-200">
            <div className="flex justify-between items-center text-xs font-bold text-maroon-800 dark:text-rose-300">
              <span>💡 Expert Guidance ({activeDemoIncident.expert_guidance.author})</span>
              <span className="text-[10px] text-maroon-700 dark:text-rose-400 font-semibold">Verified Standard</span>
            </div>
            <ul className="space-y-1 text-xs text-slate-700 dark:text-slate-300">
              {activeDemoIncident.expert_guidance.immediate_actions?.map((act, i) => (
                <li key={i} className="flex items-start space-x-1.5">
                  <span className="text-maroon-700 dark:text-rose-400 font-bold">›</span>
                  <span>{act}</span>
                </li>
              ))}
            </ul>
            <div className="text-[11px] text-maroon-900 dark:text-rose-200 italic pt-1 border-t border-maroon-200 dark:border-maroon-800 font-medium">
              {activeDemoIncident.expert_guidance.ramesh_golden_rule}
            </div>
          </div>

          {/* Demo Disclaimer */}
          <div className="text-[10px] text-amber-900 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 p-2 rounded text-center font-medium">
            ⚠️ {activeDemoIncident.disclaimer}
          </div>
        </div>
      )}

      {/* Component Short Description */}
      <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 rounded-xl p-3.5 shadow-xs">
        <h3 className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
          Component Description
        </h3>
        <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed">
          {component.description || 'Precision CNC machining sub-assembly.'}
        </p>
      </div>

      {/* Placeholder / Action for Expert Knowledge */}
      <div className="bg-maroon-50/50 dark:bg-maroon-950/30 border border-maroon-200 dark:border-maroon-800 rounded-xl p-4 shadow-xs">
        <div className="flex items-start space-x-3">
          <div className="w-8 h-8 rounded-lg bg-maroon-100 dark:bg-maroon-900/60 border border-maroon-200 dark:border-maroon-700 flex items-center justify-center text-lg text-maroon-700 dark:text-rose-300 shrink-0">
            💡
          </div>
          <div className="flex-1">
            <h3 className="text-xs font-bold text-maroon-900 dark:text-rose-200 uppercase tracking-wider">
              Expert Knowledge & Tacit Know-How
            </h3>
            <p className="text-xs text-slate-700 dark:text-slate-300 mt-1 leading-relaxed">
              Unwritten machinist tips, vibration audio cues, and setup secrets captured from old employee Ramesh (Master Machinist, 18 yrs exp).
            </p>
            <button
              type="button"
              onClick={() => onOpenPinForm(component)}
              className="mt-2.5 text-xs font-semibold px-3.5 py-2 rounded-xl bg-maroon-700 hover:bg-maroon-800 text-white transition flex items-center space-x-1.5 shadow-xs"
            >
              <span>➕ Attach Expert Knowledge / Pin New Know-How Card</span>
            </button>
          </div>
        </div>
      </div>

      {/* Action Toolbar */}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => onFocusComponent(component.mesh_name)}
          className="btn-touch px-3 py-2 text-xs font-medium rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 hover:text-maroon-800 dark:hover:text-white border border-slate-200 dark:border-slate-700 hover:border-maroon-200 dark:hover:border-maroon-600 shadow-xs transition flex items-center justify-center space-x-1.5"
        >
          <span>🎯 Focus View</span>
        </button>

        <button
          type="button"
          onClick={handleReset}
          className="btn-touch px-3 py-2 text-xs font-medium rounded-xl bg-amber-50/50 dark:bg-amber-950/40 hover:bg-amber-100/50 dark:hover:bg-amber-900/50 text-amber-900 dark:text-amber-200 border border-amber-200 dark:border-amber-800 shadow-xs transition flex items-center justify-center space-x-1.5"
        >
          <span>↺ Reset Selection</span>
        </button>

        <NavLink
          to={`/ask?component=${component.mesh_name}`}
          className="btn-touch px-3 py-2 text-xs font-medium rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 hover:text-maroon-800 dark:hover:text-white border border-slate-200 dark:border-slate-700 hover:border-maroon-200 dark:hover:border-maroon-600 shadow-xs transition flex items-center justify-center space-x-1.5"
        >
          <span>💡 Ask Assistant</span>
        </NavLink>

        <NavLink
          to={`/guide?machineId=1&component=${component.mesh_name}`}
          className="btn-touch px-3 py-2 text-xs font-medium rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 hover:text-maroon-800 dark:hover:text-white border border-slate-200 dark:border-slate-700 hover:border-maroon-200 dark:hover:border-maroon-600 shadow-xs transition flex items-center justify-center space-x-1.5"
        >
          <span>📋 Guided SOP</span>
        </NavLink>
      </div>

      {/* SECTION 1: Associated Expert Tips (Authored by Ramesh) */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center space-x-1.5">
            <span>Expert Tips (Ramesh)</span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-maroon-50 dark:bg-maroon-950/60 text-maroon-800 dark:text-rose-300 border border-maroon-200 dark:border-maroon-800">
              Verified Advice
            </span>
          </h3>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono font-medium">
            {expertTips.length} tips
          </span>
        </div>

        <div className="space-y-2.5">
          {expertTips.length > 0 ? (
            expertTips.map((note) => (
              <div
                key={note.id || note.title}
                className="bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 rounded-xl p-3 shadow-xs hover:border-slate-300 dark:hover:border-slate-600 transition"
              >
                <div className="flex items-start justify-between gap-2">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                    {note.title}
                  </h4>
                  {note.severity === 'stop' && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                      STOP
                    </span>
                  )}
                  {note.severity === 'watch' && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                      WATCH
                    </span>
                  )}
                  {note.severity === 'info' && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                      INFO
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-700 dark:text-slate-300 mt-1.5 leading-relaxed">
                  {note.text}
                </p>

                {note.cue && (
                  <div className="mt-2 text-[11px] bg-amber-50 dark:bg-amber-950/40 text-amber-950 dark:text-amber-200 px-2 py-1 rounded border border-amber-200 dark:border-amber-800">
                    <span className="font-semibold text-amber-900 dark:text-amber-300">Sensory Cue:</span> {note.cue}
                  </div>
                )}

                <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-2.5 pt-2 border-t border-slate-200 dark:border-slate-700">
                  <span className="font-semibold text-maroon-700 dark:text-rose-400">
                    👤 {note.author}
                  </span>
                  <span>{note.date}</span>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400">
              No expert tips pinned yet for this component.
            </div>
          )}
        </div>
      </div>

      {/* SECTION 2: Troubleshooting Guidance (Ramesh's Diagnostic Checklist) */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center space-x-1.5">
            <span>Troubleshooting Guidance</span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
              Diagnostic Guide
            </span>
          </h3>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono font-medium">
            {troubleshootingList.length} guides
          </span>
        </div>

        <div className="space-y-2.5">
          {troubleshootingList.length > 0 ? (
            troubleshootingList.map((tb, idx) => {
              const isExpanded = activeTroubleshootTab === tb.id || (activeTroubleshootTab === null && idx === 0);
              return (
                <div
                  key={tb.id || idx}
                  className="bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 rounded-xl overflow-hidden shadow-xs"
                >
                  <button
                    type="button"
                    onClick={() => setActiveTroubleshootTab(isExpanded ? false : tb.id)}
                    className="w-full text-left p-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-750 transition"
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center space-x-1.5">
                        <span>🛠️</span>
                        <span>{tb.title}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                        Symptom: {tb.symptom}
                      </div>
                    </div>
                    <span className="text-slate-400 dark:text-slate-500 text-xs font-mono">
                      {isExpanded ? '▲' : '▼'}
                    </span>
                  </button>

                  {isExpanded && (
                    <div className="p-3 pt-0 border-t border-slate-200 dark:border-slate-700 space-y-2.5 text-xs">
                      <div className="mt-2.5">
                        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          Probable Cause:
                        </span>
                        <p className="text-slate-800 dark:text-slate-200 mt-0.5">{tb.probable_cause}</p>
                      </div>

                      <div>
                        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          Step-by-Step Diagnostic Checks:
                        </span>
                        <ul className="mt-1 space-y-1 pl-1">
                          {tb.steps?.map((step, sIdx) => (
                            <li key={sIdx} className="text-slate-700 dark:text-slate-300 flex items-start space-x-1.5">
                              <span className="text-maroon-700 dark:text-rose-400 font-bold shrink-0">›</span>
                              <span>{step}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {tb.ramesh_tip && (
                        <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg p-2.5 text-amber-950 dark:text-amber-200 text-xs italic">
                          {tb.ramesh_tip}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="text-center py-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400">
              No troubleshooting checklist documented yet.
            </div>
          )}
        </div>
      </div>

      {/* SECTION 3: Operating Procedures (SOPs) */}
      {procedures.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center space-x-1.5">
              <span>Operating Procedures (SOPs)</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                Attached SOP
              </span>
            </h3>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono font-medium">
              {procedures.length} procedures
            </span>
          </div>

          <div className="space-y-2">
            {procedures.map((proc) => (
              <div
                key={proc.id || proc.title}
                className="bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-900/60 rounded-xl p-3 text-xs space-y-1.5 shadow-xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <h4 className="text-xs font-bold text-emerald-950 dark:text-emerald-200 leading-tight">
                    📋 {proc.title}
                  </h4>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">{proc.date}</span>
                </div>
                <p className="text-slate-700 dark:text-slate-300 text-xs leading-relaxed">
                  {proc.description || proc.text}
                </p>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 pt-1 border-t border-emerald-200/60 dark:border-emerald-900/40 flex justify-between items-center">
                  <span className="font-semibold text-maroon-700 dark:text-rose-400">👤 {proc.author}</span>
                  <span className="text-[10px] font-mono text-emerald-800 dark:text-emerald-400 font-medium">Attached SOP</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 4: Past Failure Incidents */}
      {incidents.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center space-x-1.5">
              <span>Past Incidents</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                ERP Log
              </span>
            </h3>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono font-medium">
              {incidents.length} logs
            </span>
          </div>

          <div className="space-y-2">
            {incidents.map((inc) => (
              <div
                key={inc.id}
                className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 rounded-lg p-2.5 text-xs shadow-xs"
              >
                <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                  <span className="font-mono text-maroon-700 dark:text-rose-400 font-bold">{inc.id}</span>
                  <span>{inc.date}</span>
                </div>
                <div className="font-semibold text-slate-900 dark:text-white text-xs">{inc.type}</div>
                <p className="text-slate-700 dark:text-slate-300 text-[11px] mt-0.5 leading-snug">{inc.summary}</p>
                {inc.root_cause && (
                  <div className="mt-1 text-[11px] text-slate-600 dark:text-slate-400">
                    <span className="text-slate-500 dark:text-slate-500">Root Cause:</span> {inc.root_cause}
                  </div>
                )}
                {inc.resolution && (
                  <div className="mt-0.5 text-[11px] text-emerald-800 dark:text-emerald-400 font-medium">
                    <span className="text-slate-500 dark:text-slate-500">Resolution:</span> {inc.resolution}
                  </div>
                )}
                {inc.downtime && (
                  <div className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                    Downtime: {inc.downtime}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 5: Engineering Specifications */}
      {component.specs && Object.keys(component.specs).length > 0 && (
        <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-3 border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
          <h3 className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">
            Engineering Parameters
          </h3>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
            {Object.entries(component.specs).map(([key, val]) => (
              <div key={key} className="flex justify-between border-b border-slate-200/80 dark:border-slate-700/80 pb-1">
                <dt className="text-slate-600 dark:text-slate-400">{key}:</dt>
                <dd className="font-mono font-medium text-slate-900 dark:text-white text-right">{val}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </div>
  );
}
