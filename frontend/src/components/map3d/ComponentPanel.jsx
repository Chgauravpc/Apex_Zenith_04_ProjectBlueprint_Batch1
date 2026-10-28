import React from 'react';
import { NavLink } from 'react-router-dom';

/**
 * Slide-out / Side Panel displaying detailed know-how, verified old employee notes,
 * short description, expert knowledge placeholder, specs, and past failure incidents.
 * Reference: PRD.md §9.4 and TASKS.md T21.
 */
export default function ComponentPanel({
  component,
  onClose,
  onResetSelection,
  onOpenPinForm,
  onFocusComponent,
  onSelectComponent,
}) {
  // Empty / Reset state when no component is selected
  if (!component) {
    return (
      <div className="bg-slate-900/95 border border-slate-800 rounded-2xl p-6 text-center text-slate-400 shadow-2xl space-y-4">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-3xl text-cyan-400 shadow-inner">
          ⚙️
        </div>
        <div>
          <h3 className="text-base font-bold text-white tracking-tight">
            3D Machine Knowledge Explorer
          </h3>
          <p className="text-xs text-slate-400 mt-1.5 max-w-xs mx-auto leading-relaxed">
            Click on any part of the 3D VMC model to inspect its engineering specifications, historical failure incidents, and expert tacit know-how.
          </p>
        </div>

        {/* Quick Component Selection Shortcuts */}
        <div className="pt-2 border-t border-slate-800/80">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2.5">
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
                className="px-2.5 py-2 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/80 text-xs font-semibold text-slate-200 hover:text-white transition flex items-center space-x-1.5"
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

  const getRiskBadge = (risk) => {
    switch (risk) {
      case 'high':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-500/15 text-red-400 border border-red-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            <span>High Risk ({component.incident_count || 0} incidents)</span>
          </span>
        );
      case 'medium':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            <span>Medium Caution ({component.incident_count || 0} incidents)</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>Optimal / Normal</span>
          </span>
        );
    }
  };

  const handleReset = onResetSelection || onClose;

  return (
    <div className="bg-slate-900/95 border border-slate-800 rounded-2xl p-5 shadow-2xl flex flex-col space-y-4">
      {/* Panel Header */}
      <div className="flex items-start justify-between border-b border-slate-800 pb-3">
        <div>
          <div className="flex items-center space-x-2 flex-wrap gap-y-1">
            <h2 className="text-xl font-bold text-white tracking-tight">
              {component.display_name}
            </h2>
            {getRiskBadge(component.risk)}
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            {component.category} • Mesh ID: <code className="text-cyan-400 font-mono">{component.mesh_name}</code>
          </p>
        </div>

        {/* Reset Selection Button */}
        <button
          type="button"
          onClick={handleReset}
          className="btn-touch px-2.5 py-1 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition flex items-center space-x-1"
          title="Reset Selection"
        >
          <span>↺</span>
          <span className="hidden sm:inline">Reset</span>
        </button>
      </div>

      {/* Component Short Description */}
      <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3.5">
        <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
          Component Description
        </h3>
        <p className="text-xs text-slate-200 leading-relaxed">
          {component.description || 'Precision CNC machining sub-assembly.'}
        </p>
      </div>

      {/* Placeholder for Expert Knowledge */}
      <div className="bg-gradient-to-br from-indigo-950/40 via-slate-900 to-slate-950 border border-indigo-500/30 rounded-xl p-4 shadow-sm">
        <div className="flex items-start space-x-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-lg text-indigo-300 shrink-0">
            💡
          </div>
          <div className="flex-1">
            <h3 className="text-xs font-bold text-indigo-200 uppercase tracking-wider">
              Expert Knowledge & Tacit Know-How
            </h3>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              Unwritten machinist tips, vibration audio cues, and setup secrets captured from senior machinists (Ramesh & Suresh).
            </p>
            <button
              type="button"
              onClick={() => onOpenPinForm(component)}
              className="mt-2.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition flex items-center space-x-1.5 shadow"
            >
              <span>📌 Pin New Know-How Card</span>
            </button>
          </div>
        </div>
      </div>

      {/* Action Toolbar */}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => onFocusComponent(component.mesh_name)}
          className="btn-touch px-3 py-2 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition flex items-center justify-center space-x-1.5"
        >
          <span>🎯 Focus View</span>
        </button>

        <button
          type="button"
          onClick={handleReset}
          className="btn-touch px-3 py-2 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 transition flex items-center justify-center space-x-1.5"
        >
          <span>↺ Reset Selection</span>
        </button>

        <NavLink
          to={`/ask?component=${component.mesh_name}`}
          className="btn-touch px-3 py-2 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition flex items-center justify-center space-x-1.5"
        >
          <span>💡 Ask Assistant</span>
        </NavLink>

        <NavLink
          to={`/guide?machineId=1&component=${component.mesh_name}`}
          className="btn-touch px-3 py-2 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition flex items-center justify-center space-x-1.5"
        >
          <span>📋 Guided SOP</span>
        </NavLink>
      </div>

      {/* Specifications Grid */}
      {component.specs && Object.keys(component.specs).length > 0 && (
        <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800/80">
          <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
            Engineering Parameters
          </h3>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
            {Object.entries(component.specs).map(([key, val]) => (
              <div key={key} className="flex justify-between border-b border-slate-800/50 pb-1">
                <dt className="text-slate-400">{key}:</dt>
                <dd className="font-mono font-medium text-slate-200 text-right">{val}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      {/* Old Employee Verified Know-How Section */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider flex items-center space-x-1.5">
            <span>Verified Knowledge Cards</span>
            <span className="px-1.5 py-0.2 rounded text-[10px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              Old Employee Advice
            </span>
          </h3>
          <span className="text-[11px] text-slate-500">
            {component.expert_notes?.length || 0} cards
          </span>
        </div>

        <div className="space-y-2.5 max-h-52 overflow-y-auto pr-1">
          {component.expert_notes && component.expert_notes.length > 0 ? (
            component.expert_notes.map((note) => (
              <div
                key={note.id || note.title}
                className="bg-slate-800/70 border border-slate-700/80 rounded-xl p-3 shadow-sm hover:border-slate-600 transition"
              >
                <div className="flex items-start justify-between gap-2">
                  <h4 className="text-xs font-bold text-white leading-tight">
                    {note.title}
                  </h4>
                  {note.severity === 'stop' && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-500/20 text-red-300 border border-red-500/40">
                      STOP
                    </span>
                  )}
                  {note.severity === 'watch' && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                      WATCH
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                  {note.text}
                </p>

                <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2.5 pt-2 border-t border-slate-700/50">
                  <span className="font-medium text-cyan-400">
                    👤 {note.author}
                  </span>
                  <span>{note.date}</span>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-4 bg-slate-950/40 rounded-xl border border-dashed border-slate-800 text-xs text-slate-500">
              No verified cards pinned yet. Click &quot;Pin New Know-How Card&quot; to add one.
            </div>
          )}
        </div>
      </div>

      {/* Past Failure Incidents Section */}
      {component.past_incidents && component.past_incidents.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
            <span>Historical Incidents</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
              ERP / QC Log
            </span>
          </h3>

          <div className="space-y-2">
            {component.past_incidents.map((inc) => (
              <div
                key={inc.id}
                className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-2.5 text-xs"
              >
                <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                  <span className="font-mono text-cyan-300 font-semibold">{inc.id}</span>
                  <span>{inc.date}</span>
                </div>
                <p className="text-slate-300 text-[11px] leading-tight">{inc.summary}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
