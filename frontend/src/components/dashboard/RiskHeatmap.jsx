import React, { useState } from 'react';
import { getRisk } from '../../api/transfer';
import useApi from '../../hooks/useApi';
import LoadState from '../common/LoadState';
import { MapPinIcon, SearchIcon } from '../common/Icons';

const STATUS = {
  critical: { label: 'Critical Risk', color: 'bg-rose-50 text-rose-950 border-rose-200 hover:border-rose-300' },
  at_risk: { label: 'Moderate Risk', color: 'bg-amber-50 text-amber-950 border-amber-200 hover:border-amber-300' },
  ok: { label: 'Safe', color: 'bg-emerald-50 text-emerald-950 border-emerald-200 hover:border-emerald-300' },
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
    <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <span className="text-[10px] uppercase font-bold text-maroon-700 tracking-wider">
            Shop-Floor Knowledge Risk Matrix
          </span>
          <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2 mt-0.5">
            <MapPinIcon className="w-5 h-5 text-maroon-700" />
            <span>Bus Factor Heatmap (Machines × Components)</span>
          </h2>
          <p className="text-slate-600 text-xs mt-1">
            Bus factor = people who know the part and are still here after planned exits. Red cells lose
            their know-how when the expert leaves.
          </p>
        </div>

        <div className="flex items-center space-x-3 text-[11px]">
          <span className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
            <span className="text-slate-700 font-medium">BF = 0 (Critical)</span>
          </span>
          <span className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span className="text-slate-700 font-medium">BF = 1 (Medium)</span>
          </span>
          <span className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span className="text-slate-700 font-medium">BF ≥ 2 (Safe)</span>
          </span>
        </div>
      </div>

      <LoadState loading={risk.loading} error={risk.error} onRetry={risk.reload} label="Loading knowledge risk…" />

      {/* Heatmap Grid */}
      <div className="space-y-5">
        {heatmapData.map((row) => (
          <div key={row.machine} className="space-y-2">
            <div className="flex items-center space-x-2">
              <span className="font-bold text-slate-900 text-xs bg-slate-100 border border-slate-200/80 px-2.5 py-0.5 rounded-md">
                Machine: {row.machine}
              </span>
              <span className="text-[11px] text-slate-500">
                {row.summary.coverage}% of parts covered • {row.summary.cards} verified cards
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {row.components.map((c) => (
                <button
                  key={c.component_id}
                  type="button"
                  onClick={() => handleCellClick(c, row.machine)}
                  className={`text-left p-3.5 rounded-xl border transition shadow-xs hover:shadow-sm hover:scale-[1.01] flex flex-col justify-between space-y-2 ${c.color}`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-bold text-xs truncate text-slate-900">
                      {c.part}
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/80 border border-slate-200/60 font-semibold text-slate-800 shrink-0">
                      BF: {c.bus}
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-600">
                    <div>
                      <strong className="text-slate-900">{c.cards}</strong> {c.cards === 1 ? 'card' : 'cards'} • {c.holders}{' '}
                      {c.holders === 1 ? 'person' : 'people'}
                    </div>
                    <div className="text-[10px] text-slate-500 truncate">
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
        <div className="bg-slate-50/90 border border-maroon-200 rounded-xl p-4 space-y-3 pt-3 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <div className="flex items-center space-x-2 flex-wrap gap-1">
              <SearchIcon className="w-4 h-4 text-maroon-700" />
              <span className="text-sm font-bold text-slate-900">
                {selectedCell.machine} • {selectedCell.part}
              </span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${selectedCell.color}`}>
                {selectedCell.label}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setSelectedCell(null)}
              className="text-slate-500 hover:text-slate-800 text-xs font-bold px-2 py-1 rounded hover:bg-slate-200 transition"
            >
              ✕ Close
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-slate-600 block font-semibold mb-1">Identified Knowledge Gap:</span>
              <p className="text-slate-800 bg-white p-2.5 rounded-lg border border-slate-200 leading-relaxed shadow-xs">
                {gapText(selectedCell)}
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-slate-600 block font-semibold mb-1">Knowledge Custody:</span>
              <p className="text-slate-700">
                Primary Expert: <strong className="text-maroon-800">{selectedCell.expert || 'nobody yet'}</strong>
                {selectedCell.expert_leaving_on && ` (leaves ${selectedCell.expert_leaving_on})`}
              </p>
              <p className="text-slate-700">
                Verified Cards in Index: <strong className="text-slate-900">{selectedCell.cards}</strong>
              </p>
              <p className="text-slate-500 text-[11px] pt-1">
                Recommendation: Trigger targeted AI interview questions to close this gap before exit.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
