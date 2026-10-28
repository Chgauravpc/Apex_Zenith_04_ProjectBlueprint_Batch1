import React, { useState } from 'react';
import { getRisk } from '../../api/transfer';
import useApi from '../../hooks/useApi';
import LoadState from '../common/LoadState';

const STATUS = {
  critical: { label: 'Critical Risk', color: 'bg-red-950/80 text-red-300 border-red-500/60' },
  at_risk: { label: 'Moderate Risk', color: 'bg-amber-950/80 text-amber-300 border-amber-500/60' },
  ok: { label: 'Safe', color: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/60' },
};

const partName = (cell) => cell.name.split(' · ').slice(1).join(' · ') || cell.name;

const gapText = (cell) => {
  if (cell.cards === 0) return 'Nothing recorded about this part yet.';
  if (cell.bus === 0 && cell.expert_leaving_on)
    return `Only ${cell.expert} has recorded know-how here, and leaves on ${cell.expert_leaving_on}.`;
  if (cell.bus === 0) return 'Nobody who recorded know-how here is still on the shop floor.';
  if (cell.bus === 1) return `Only one person still here knows this part (${cell.expert}).`;
  return `${cell.bus} people still here have recorded know-how on this part.`;
};

/**
 * RiskHeatmap component.
 * Bus factor per machine part from GET /transfer/risk: how many people who know it stay
 * after planned exits. Reference: PRD.md §5.7 and TASKS.md T24.
 */
export default function RiskHeatmap({ onSelectCell }) {
  const [selectedCell, setSelectedCell] = useState(null);
  const risk = useApi((signal) => getRisk(signal), []);

  const heatmapData = (risk.data || [])
    .filter((c) => c.component_id === null)
    .map((machine) => ({
      machine: machine.name,
      summary: machine,
      components: risk.data
        .filter((c) => c.machine_id === machine.machine_id && c.component_id !== null)
        .map((c) => ({ ...c, part: partName(c), ...STATUS[c.status] })),
    }));

  const handleCellClick = (cell, machine) => {
    const fullCell = { ...cell, machine };
    setSelectedCell(fullCell);
    if (onSelectCell) onSelectCell(fullCell);
  };

  return (
    <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-6 shadow-xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-700/60 pb-4">
        <div>
          <span className="text-[10px] uppercase font-bold text-cyan-400 tracking-wider">
            Shop-Floor Knowledge Risk Matrix
          </span>
          <h2 className="text-lg font-bold text-white flex items-center space-x-2 mt-0.5">
            <span>🗺️</span>
            <span>Bus Factor Heatmap (Machines × Components)</span>
          </h2>
          <p className="text-slate-400 text-xs mt-1">
            Bus factor = people who know the part and are still here after planned exits. Red cells lose
            their know-how when the expert leaves.
          </p>
        </div>

        <div className="flex items-center space-x-3 text-[11px]">
          <span className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
            <span className="text-slate-300">BF = 0 (Critical)</span>
          </span>
          <span className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span className="text-slate-300">BF = 1 (Medium)</span>
          </span>
          <span className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span className="text-slate-300">BF ≥ 2 (Safe)</span>
          </span>
        </div>
      </div>

      <LoadState loading={risk.loading} error={risk.error} onRetry={risk.reload} label="Loading knowledge risk…" />

      {/* Heatmap Grid */}
      <div className="space-y-5">
        {heatmapData.map((row) => (
          <div key={row.machine} className="space-y-2">
            <div className="flex items-center space-x-2">
              <span className="font-bold text-white text-xs bg-slate-900 border border-slate-700 px-2 py-0.5 rounded">
                Machine: {row.machine}
              </span>
              <span className="text-[11px] text-slate-400">
                {row.summary.coverage}% of parts covered • {row.summary.cards} verified cards
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {row.components.map((c) => (
                <button
                  key={c.component_id}
                  type="button"
                  onClick={() => handleCellClick(c, row.machine)}
                  className={`text-left p-3.5 rounded-xl border transition shadow-sm hover:scale-[1.02] flex flex-col justify-between space-y-2 ${c.color}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs truncate text-slate-100">
                      {c.part}
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/40">
                      BF: {c.bus}
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-300">
                    <div>
                      <strong>{c.cards}</strong> {c.cards === 1 ? 'card' : 'cards'} • {c.holders}{' '}
                      {c.holders === 1 ? 'person' : 'people'}
                    </div>
                    <div className="text-[10px] text-slate-400 truncate">
                      Expert: {c.expert || 'nobody yet'}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Selected Cell Modal/Drawer */}
      {selectedCell && (
        <div className="bg-slate-900/90 border border-cyan-500/40 rounded-xl p-4 space-y-3 pt-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center space-x-2">
              <span className="text-base" aria-hidden="true">🔍</span>
              <span className="text-sm font-bold text-white">
                {selectedCell.machine} • {selectedCell.part}
              </span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${selectedCell.color}`}>
                {selectedCell.label}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setSelectedCell(null)}
              className="text-slate-400 hover:text-slate-200 text-xs font-bold"
            >
              ✕ Close
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-slate-400 block font-semibold mb-1">Identified Knowledge Gap:</span>
              <p className="text-slate-200 bg-slate-950 p-2.5 rounded-lg border border-slate-800 leading-relaxed">
                {gapText(selectedCell)}
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-slate-400 block font-semibold mb-1">Knowledge Custody:</span>
              <p className="text-slate-200">
                Primary Expert: <strong className="text-cyan-300">{selectedCell.expert || 'nobody yet'}</strong>
                {selectedCell.expert_leaving_on && ` (leaves ${selectedCell.expert_leaving_on})`}
              </p>
              <p className="text-slate-300">
                Verified Cards in Index: <strong>{selectedCell.cards}</strong>
              </p>
              <p className="text-slate-400 text-[11px] pt-1">
                Recommendation: Trigger targeted AI interview questions to close this gap before exit.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
