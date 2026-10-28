import React, { useState } from 'react';
import EvidenceList from './EvidenceList';

const SEVERITY_CONFIG = {
  stop: {
    container: 'bg-red-950/90 border-red-500/80 text-red-100',
    badge: 'bg-red-600 text-white',
    icon: '⛔',
    label: 'STOP — CRITICAL WARNING',
  },
  caution: {
    container: 'bg-amber-950/90 border-amber-500/80 text-amber-100',
    badge: 'bg-amber-500 text-slate-950',
    icon: '⚠️',
    label: 'CAUTION — RISK DETECTED',
  },
  info: {
    container: 'bg-cyan-950/90 border-cyan-500/80 text-cyan-100',
    badge: 'bg-cyan-600 text-white',
    icon: 'ℹ️',
    label: 'OPERATIONAL NOTE',
  },
};

/**
 * Note Guardian Warning Banner.
 * Renders real-time warnings with severity styling, icon, and cited evidence.
 */
export default function WarningBanner({ result, onDismiss }) {
  const [showEvidence, setShowEvidence] = useState(true);

  if (!result || !result.warnings || result.warnings.length === 0) {
    return null;
  }

  const severity = result.severity || 'info';
  const config = SEVERITY_CONFIG[severity] || SEVERITY_CONFIG.info;
  const primaryWarning = result.warnings[0];

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={`border rounded-xl p-4 shadow-lg transition-all duration-200 ${config.container}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start space-x-3">
          <span className="text-2xl mt-0.5 select-none" aria-hidden="true">
            {config.icon}
          </span>
          <div>
            <div className="flex items-center space-x-2">
              <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider ${config.badge}`}>
                {config.label}
              </span>
              {result.component_id && (
                <span className="text-[11px] text-slate-400 font-medium">
                  Component #{result.component_id}
                </span>
              )}
            </div>

            <p className="mt-1.5 text-sm sm:text-base font-semibold text-slate-100 leading-snug">
              {primaryWarning.message || primaryWarning}
            </p>

            {result.warnings.length > 1 && (
              <ul className="mt-2 space-y-1 text-xs text-slate-300">
                {result.warnings.slice(1).map((w, idx) => (
                  <li key={idx} className="flex items-center space-x-1.5">
                    <span className="text-slate-400">•</span>
                    <span>{w.message || w}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {result.evidence && result.evidence.length > 0 && (
            <button
              type="button"
              onClick={() => setShowEvidence(!showEvidence)}
              className="text-xs px-2.5 py-1 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
              aria-expanded={showEvidence}
            >
              {showEvidence ? 'Hide Evidence' : `View Evidence (${result.evidence.length})`}
            </button>
          )}

          {onDismiss && (
            <button
              type="button"
              onClick={onDismiss}
              className="text-slate-400 hover:text-slate-200 p-1 rounded-lg focus:ring-1 focus:ring-cyan-400"
              aria-label="Dismiss warning"
            >
              <span aria-hidden="true">✕</span>
            </button>
          )}
        </div>
      </div>

      {showEvidence && (
        <EvidenceList
          evidence={result.evidence}
          expertFix={result.expert_fix}
          authorName={result.author_name || 'An old employee'}
        />
      )}
    </div>
  );
}
