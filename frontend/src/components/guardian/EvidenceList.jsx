import React, { useState } from 'react';

/**
 * Renders verified evidence citations and old employee advice.
 * Enforces Rule 6: Every warning must cite real historical evidence.
 */
export default function EvidenceList({ evidence = [], expertFix, authorName = 'Old Employee' }) {
  const [expandedId, setExpandedId] = useState(null);

  if ((!evidence || evidence.length === 0) && !expertFix) {
    return null;
  }

  return (
    <div className="mt-3 pt-3 border-t border-slate-700/60 text-xs text-slate-300 space-y-2.5">
      {/* Old Employee Advice */}
      {expertFix && (
        <div className="bg-slate-900/80 border border-cyan-500/30 rounded-lg p-2.5 flex items-start space-x-2">
          <span className="text-cyan-400 text-sm mt-0.5" aria-hidden="true">
            💡
          </span>
          <div>
            <div className="font-semibold text-cyan-300">
              {authorName}’s Recommended Action:
            </div>
            <p className="text-slate-200 mt-0.5 leading-relaxed">{expertFix}</p>
          </div>
        </div>
      )}

      {/* Cited Historical Evidence */}
      {evidence.length > 0 && (
        <div>
          <div className="font-semibold text-slate-400 uppercase tracking-wider text-[11px] mb-1.5 flex items-center space-x-1.5">
            <span>📚</span>
            <span>Cited Evidence ({evidence.length} record{evidence.length > 1 ? 's' : ''}):</span>
          </div>
          <ul className="space-y-1.5">
            {evidence.map((item, idx) => {
              const itemId = `${item.type || 'record'}-${item.id ?? idx}`;
              const isExpanded = expandedId === itemId;
              return (
                <li
                  key={itemId}
                  className="bg-slate-900/60 border border-slate-800 rounded-md p-2 transition"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-slate-200">
                      #{item.id || idx + 1} — {item.kind || 'Incident'}: {item.title || item.summary || 'Historical Record'}
                    </span>
                    {item.date && (
                      <span className="text-slate-500 text-[10px] whitespace-nowrap">
                        {item.date}
                      </span>
                    )}
                  </div>
                  {item.detail && (
                    <div className="mt-1">
                      <button
                        type="button"
                        onClick={() => setExpandedId(isExpanded ? null : itemId)}
                        className="text-[11px] text-cyan-400 hover:underline font-medium"
                      >
                        {isExpanded ? 'Hide details' : 'Show details'}
                      </button>
                      {isExpanded && (
                        <p className="mt-1 text-slate-300 text-xs bg-slate-950 p-2 rounded border border-slate-800 leading-normal">
                          {item.detail}
                        </p>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
