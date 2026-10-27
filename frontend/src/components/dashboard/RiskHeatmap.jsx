import React, { useState } from 'react';

/**
 * RiskHeatmap component.
 * Displays bus-factor knowledge risks across machines and components.
 * Reference: PRD.md §5.7 and TASKS.md T24.
 */
export default function RiskHeatmap({ onSelectCell }) {
  const [selectedCell, setSelectedCell] = useState(null);

  const heatmapData = [
    {
      machine: 'VMC-3',
      components: [
        {
          name: 'Spindle & Bearings',
          busFactor: 1,
          expert: 'Ramesh Sharma',
          coverage: '65%',
          cardsCount: 14,
          status: 'Critical Risk',
          statusColor: 'bg-red-950/80 text-red-300 border-red-500/60',
          gap: 'High-speed bearing thermal expansion and preload tuning undocumented.',
        },
        {
          name: 'Tool Changer Arm',
          busFactor: 1,
          expert: 'Ramesh Sharma',
          coverage: '45%',
          cardsCount: 7,
          status: 'Critical Risk',
          statusColor: 'bg-red-950/80 text-red-300 border-red-500/60',
          gap: 'Pneumatic unclamp sensor stroke timing adjustment uncaptured.',
        },
        {
          name: 'Coolant Delivery Manifold',
          busFactor: 2,
          expert: 'Ramesh, Suresh',
          coverage: '82%',
          cardsCount: 18,
          status: 'Moderate Risk',
          statusColor: 'bg-amber-950/80 text-amber-300 border-amber-500/60',
          gap: 'Filter bleeding sequence known by supervisor.',
        },
        {
          name: 'X/Y Linear Guideways',
          busFactor: 3,
          expert: 'Ramesh, Suresh, Priya',
          coverage: '95%',
          cardsCount: 22,
          status: 'Safe',
          statusColor: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/60',
          gap: 'Full daily lubrication routine documented and verified.',
        },
      ],
    },
    {
      machine: 'Lathe-2',
      components: [
        {
          name: 'Turret Index Cam',
          busFactor: 1,
          expert: 'Ramesh Sharma',
          coverage: '50%',
          cardsCount: 6,
          status: 'Critical Risk',
          statusColor: 'bg-red-950/80 text-red-300 border-red-500/60',
          gap: 'Backlash compensation tuning by auditory feedback.',
        },
        {
          name: 'Hydraulic Chuck & Collet',
          busFactor: 2,
          expert: 'Ramesh, Suresh',
          coverage: '75%',
          cardsCount: 12,
          status: 'Moderate Risk',
          statusColor: 'bg-amber-950/80 text-amber-300 border-amber-500/60',
          gap: 'Pressure relief valve adjustment for thin-wall sleeves.',
        },
        {
          name: 'Tailstock Quill',
          busFactor: 3,
          expert: 'Ramesh, Priya, Suresh',
          coverage: '90%',
          cardsCount: 15,
          status: 'Safe',
          statusColor: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/60',
          gap: 'Dead-center alignment procedure verified by all operators.',
        },
      ],
    },
  ];

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
            Red cells indicate knowledge residing exclusively in 1 retiring employee (Bus Factor = 1).
          </p>
        </div>

        <div className="flex items-center space-x-3 text-[11px]">
          <span className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
            <span className="text-slate-300">BF = 1 (Critical)</span>
          </span>
          <span className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span className="text-slate-300">BF = 2 (Medium)</span>
          </span>
          <span className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span className="text-slate-300">BF ≥ 3 (Safe)</span>
          </span>
        </div>
      </div>

      {/* Heatmap Grid */}
      <div className="space-y-5">
        {heatmapData.map((row) => (
          <div key={row.machine} className="space-y-2">
            <div className="flex items-center space-x-2">
              <span className="font-bold text-white text-xs bg-slate-900 border border-slate-700 px-2 py-0.5 rounded">
                Machine: {row.machine}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {row.components.map((c) => (
                <button
                  key={c.name}
                  type="button"
                  onClick={() => handleCellClick(c, row.machine)}
                  className={`text-left p-3.5 rounded-xl border transition shadow-sm hover:scale-[1.02] flex flex-col justify-between space-y-2 ${c.statusColor}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs truncate text-slate-100">
                      {c.name}
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/40">
                      BF: {c.busFactor}
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-300">
                    <div>Coverage: <strong>{c.coverage}</strong> ({c.cardsCount} cards)</div>
                    <div className="text-[10px] text-slate-400 truncate">
                      Expert: {c.expert}
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
                {selectedCell.machine} • {selectedCell.name}
              </span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${selectedCell.statusColor}`}>
                {selectedCell.status}
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
                {selectedCell.gap}
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-slate-400 block font-semibold mb-1">Knowledge Custody:</span>
              <p className="text-slate-200">
                Primary Expert: <strong className="text-cyan-300">{selectedCell.expert}</strong>
              </p>
              <p className="text-slate-300">
                Verified Cards in Index: <strong>{selectedCell.cardsCount}</strong>
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
