import React, { useState } from 'react';

/**
 * TroubleshootTree component.
 * Fast diagnostic decision tree built from historical incident frequencies.
 */
export default function TroubleshootTree({
  treeData = null,
  onApplyFix,
}) {
  // treeData: [{ symptom, causes: [{ cause, frequency, fix, fix_author }] }] from GET /guide/troubleshoot.
  const [selectedSymptom, setSelectedSymptom] = useState(null);

  const data = treeData || [];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
      <div className="flex items-center space-x-2">
        <span className="text-xl" aria-hidden="true">🌳</span>
        <div>
          <h3 className="text-sm font-bold text-white">Diagnostic Decision Tree</h3>
          <span className="text-[11px] text-slate-400">
            Ranked by historical failure frequency on shop floor
          </span>
        </div>
      </div>

      <div className="space-y-3">
        {data.map((item, idx) => {
          const isSelected = selectedSymptom === idx;

          return (
            <div
              key={idx}
              className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/60 transition"
            >
              <button
                type="button"
                onClick={() => setSelectedSymptom(isSelected ? null : idx)}
                className="w-full text-left p-3.5 flex items-center justify-between text-xs font-semibold text-slate-200 hover:bg-slate-850"
              >
                <div className="flex items-center space-x-2">
                  <span className="text-red-400 font-bold">⚠️</span>
                  <span>{item.symptom}</span>
                </div>
                <span className="text-[11px] text-cyan-400 font-mono">
                  {isSelected ? '▲ Hide' : '▼ Causes'}
                </span>
              </button>

              {isSelected && (
                <div className="p-4 pt-1 space-y-3 border-t border-slate-800/80 bg-slate-900/40">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Probable Causes (Ranked by Machine History):
                  </span>

                  <div className="space-y-2">
                    {item.causes.map((c, cIdx) => (
                      <div
                        key={cIdx}
                        className="bg-slate-900 border border-slate-800 rounded-lg p-3 text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-200">{c.cause}</span>
                          <span className="px-2 py-0.5 rounded text-[10px] bg-red-500/15 text-red-400 font-semibold">
                            {c.frequency}
                          </span>
                        </div>
                        {c.fix ? (
                          <p className="text-cyan-300 font-medium">
                            <strong>Fix: </strong>
                            {c.fix}
                            {c.fix_author && (
                              <span className="text-slate-400 font-normal"> — {c.fix_author}</span>
                            )}
                          </p>
                        ) : (
                          <p className="text-slate-400">No fix recorded yet. Ask your knowledge buddy.</p>
                        )}
                        {onApplyFix && (
                          <div className="pt-2 flex justify-end">
                            <button
                              type="button"
                              onClick={() => onApplyFix(c)}
                              className="text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1 rounded"
                            >
                              Apply to Current Run →
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
