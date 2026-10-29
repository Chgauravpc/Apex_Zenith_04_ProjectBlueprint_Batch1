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
    <div className="mt-3 pt-3 border-t border-slate-200 text-xs text-slate-700 space-y-2.5">
      {/* Old Employee Advice */}
      {expertFix && (
        <div className="bg-teal-50/80 border border-teal-200 rounded-lg p-2.5 flex items-start space-x-2">
          <span className="text-teal-600 text-sm mt-0.5" aria-hidden="true">
            💡
          </span>
          <div>
            <div className="font-semibold text-teal-900">
              {authorName}’s Recommended Action:
            </div>
            <p className="text-slate-800 mt-0.5 leading-relaxed">{expertFix}</p>
          </div>
        </div>
      )}

      {/* Cited Historical Evidence */}
      {evidence.length > 0 && (
        <div>
          <div className="font-semibold text-slate-600 uppercase tracking-wider text-[11px] mb-1.5 flex items-center space-x-1.5">
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
                  className="bg-white border border-slate-200 rounded-md p-2 transition shadow-2xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-slate-800">
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
                        className="text-[11px] text-teal-700 hover:underline font-medium"
                      >
                        {isExpanded ? 'Hide details' : 'Show details'}
                      </button>
                      {isExpanded && (
                        <p className="mt-1 text-slate-700 text-xs bg-slate-50 p-2 rounded border border-slate-200 leading-normal">
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
