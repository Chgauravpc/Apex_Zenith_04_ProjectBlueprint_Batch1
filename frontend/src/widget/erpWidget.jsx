import React, { useState } from 'react';
import WarningBanner from '../components/guardian/WarningBanner';
import useApi from '../hooks/useApi';
import { getWarnings } from '../api/guardian';
import { getBriefing } from '../api/guide';

const SEVERITY_RANK = { info: 0, caution: 1, stop: 2 };
const MAX_TIPS = 3;

/**
 * Embeddable ERP Widget for shop-floor MES/ERP work order screens.
 * Reference: PRD.md §9.7 and TASKS.md T25.
 *
 * The host ERP passes the work order; the Guardian warnings (GET /guardian/warnings) and the
 * things to know (GET /guide/briefing/{employee}) come from Blueprint for that machine/operator.
 */
export default function ErpWidget({
  workOrder = {
    id: 'WO-8842',
    part: 'SS304 Precision Flange',
    machine: 'VMC-3',
    machineId: 1,
    quantity: 50,
    operator: 'Priya Shinde',
    operatorId: 2,
  },
  onLaunchGuide,
  onLaunchAsk,
}) {
  const [activeTab, setActiveTab] = useState('context');
  const warnings = useApi((signal) => getWarnings(workOrder.machineId, signal), [workOrder.machineId]);
  const briefing = useApi(
    (signal) => (workOrder.operatorId ? getBriefing(workOrder.operatorId, signal) : Promise.resolve(null)),
    [workOrder.operatorId]
  );

  // The most serious open warning on this machine, shown before the job starts.
  const open = (warnings.data?.items || []).filter((w) => w.status === 'open');
  const worst = open.reduce(
    (top, w) => (!top || SEVERITY_RANK[w.severity] > SEVERITY_RANK[top.severity] ? w : top),
    null
  );
  const guardianCheck = worst && {
    severity: worst.severity,
    warnings: [{ message: worst.message }, ...(open.length > 1 ? [{ message: `${open.length - 1} more open warning(s) on this machine.` }] : [])],
    evidence: worst.evidence || [],
  };
  const thingsToKnow = (briefing.data?.known_issues || []).slice(0, MAX_TIPS);

  return (
    <div className="bg-slate-900 border border-slate-700/80 rounded-2xl p-5 shadow-2xl text-slate-100 max-w-xl mx-auto space-y-4 font-sans">
      {/* Widget Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center space-x-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center font-bold text-slate-950 text-xs shadow-sm">
            BP
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-cyan-400 tracking-wider block">
              Blueprint Machine Companion
            </span>
            <h2 className="text-sm font-bold text-white leading-tight">
              {workOrder.id}: {workOrder.part}
            </h2>
          </div>
        </div>

        <span className="text-[11px] bg-slate-800 border border-slate-700 text-slate-300 font-mono px-2 py-0.5 rounded">
          {workOrder.machine}
        </span>
      </div>

      {/* Pre-Job Guardian Warning */}
      {warnings.error && (
        <p className="text-xs text-amber-300">Guardian warnings not loaded: {warnings.error}</p>
      )}
      {guardianCheck ? (
        <WarningBanner result={guardianCheck} />
      ) : (
        !warnings.loading &&
        !warnings.error && <p className="text-xs text-emerald-300">No open Guardian warnings on this machine.</p>
      )}

      {/* Tab Controls */}
      <div className="flex space-x-2 border-b border-slate-800 pb-1">
        <button
          type="button"
          onClick={() => setActiveTab('context')}
          className={`px-3 py-1 text-xs font-semibold rounded-lg transition ${
            activeTab === 'context'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Things to Know Before Job
        </button>
      </div>

      {/* Things to Know Cards */}
      {activeTab === 'context' && (
        <div className="space-y-2.5">
          {briefing.loading && <p className="text-xs text-slate-400">Loading…</p>}
          {briefing.error && (
            <p className="text-xs text-amber-300">Briefing not loaded: {briefing.error}</p>
          )}
          {!briefing.loading && !briefing.error && thingsToKnow.length === 0 && (
            <p className="text-xs text-slate-400">Nothing recorded for this job yet.</p>
          )}
          {thingsToKnow.map((tip) => (
            <div
              key={tip}
              className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 text-xs text-slate-300 leading-relaxed"
            >
              💡 {tip}
            </div>
          ))}
        </div>
      )}

      {/* Action Launch Buttons */}
      <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800">
        <button
          type="button"
          onClick={() => {
            if (onLaunchGuide) onLaunchGuide(workOrder);
            else window.location.href = '/guide';
          }}
          className="btn-touch px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-xl shadow flex items-center justify-center space-x-1.5 transition"
        >
          <span>📋</span>
          <span>Start Guided Run</span>
        </button>

        <button
          type="button"
          onClick={() => {
            if (onLaunchAsk) onLaunchAsk(workOrder);
            else window.location.href = '/ask';
          }}
          className="btn-touch px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-xl border border-slate-700 flex items-center justify-center space-x-1.5 transition"
        >
          <span>💡</span>
          <span>Ask Question</span>
        </button>
      </div>
    </div>
  );
}
