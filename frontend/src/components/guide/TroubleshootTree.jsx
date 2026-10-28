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
    <div className="bg-white border border-[#DADCE0] rounded-2xl p-5 space-y-4 shadow-card hover:border-slate-300 transition-all">
      <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
        <span className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-200 text-sm" aria-hidden="true">🌳</span>
        <div>
          <h3 className="text-sm font-bold text-slate-900">Diagnostic Decision Tree</h3>
          <span className="text-[11px] text-slate-500">
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
              className="border border-slate-200 rounded-xl overflow-hidden bg-[#F8F9FA] transition hover:border-slate-300 shadow-xs"
            >
              <button
                type="button"
                onClick={() => setSelectedSymptom(isSelected ? null : idx)}
                className="w-full text-left p-3.5 flex items-center justify-between text-xs font-semibold text-slate-800 hover:bg-slate-100/80 transition-colors"
              >
                <div className="flex items-center space-x-2">
                  <span className="text-amber-600 font-bold">⚠️</span>
                  <span>{item.symptom}</span>
                </div>
                <span className="text-[11px] text-maroon-700 font-mono font-bold">
                  {isSelected ? '▲ Hide' : '▼ Causes'}
                </span>
              </button>

              {isSelected && (
                <div className="p-4 pt-1 space-y-3 border-t border-slate-200 bg-white">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                    Probable Causes (Ranked by Machine History):
                  </span>

                  <div className="space-y-2">
                    {item.causes.map((c, cIdx) => (
                      <div
                        key={cIdx}
                        className="bg-[#F8F9FA] border border-slate-200 rounded-lg p-3 text-xs space-y-1 shadow-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900">{c.cause}</span>
                          <span className="px-2 py-0.5 rounded text-[10px] bg-rose-50 text-rose-800 font-semibold border border-rose-200">
                            {c.frequency}
                          </span>
                        </div>
                        {c.fix ? (
                          <p className="text-slate-800 font-medium">
                            <strong className="text-maroon-800 font-bold">Fix: </strong>
                            {c.fix}
                            {c.fix_author && (
                              <span className="text-slate-500 font-normal"> — {c.fix_author}</span>
                            )}
                          </p>
                        ) : (
                          <p className="text-slate-500">No fix recorded yet. Ask your knowledge buddy.</p>
                        )}
                        {onApplyFix && (
                          <div className="pt-2 flex justify-end">
                            <button
                              type="button"
                              onClick={() => onApplyFix(c)}
                              className="text-[11px] bg-white hover:bg-slate-50 text-slate-700 font-medium px-2.5 py-1 rounded-lg border border-slate-300 shadow-xs"
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
