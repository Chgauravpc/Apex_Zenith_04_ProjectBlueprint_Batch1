import React, { useState } from 'react';

/**
 * MachineTimeline component.
 * Unified stream of machine jobs, sensor anomalies, cards captured, and Guardian halts.
 */
export default function MachineTimeline() {
  const [machineFilter, setMachineFilter] = useState('all');

  const events = [
    {
      id: 1,
      ts: '11:42 AM Today',
      machine: 'VMC-3',
      kind: 'warning',
      kindLabel: 'Guardian Warning',
      badgeClass: 'bg-red-500/20 text-red-400 border-red-500/40',
      icon: '⛔',
      summary: 'Spindle feed rate 0.35 mm/rev exceeded limit (0.25). Operation halted.',
      actor: 'Note Guardian',
    },
    {
      id: 2,
      ts: '10:15 AM Today',
      machine: 'VMC-3',
      kind: 'card',
      kindLabel: 'Card Captured',
      badgeClass: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
      icon: '🎙️',
      summary: 'Ramesh added voice tip: SS304 roughing feed reduction to 0.20 mm/rev.',
      actor: 'Ramesh Sharma',
    },
    {
      id: 3,
      ts: '09:05 AM Today',
      machine: 'VMC-3',
      kind: 'sensor',
      kindLabel: 'Sensor Anomaly',
      badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      icon: '⚡',
      summary: 'Spindle vibration spike: 3.8 mm/s (z = +3.4 above normal baseline).',
      actor: 'Sensor Sim Gateway',
    },
    {
      id: 4,
      ts: 'Yesterday, 04:30 PM',
      machine: 'Lathe-2',
      kind: 'job',
      kindLabel: 'Work Order Completed',
      badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      icon: '✓',
      summary: 'Priya completed 20 Flange Shafts on Lathe-2 with zero QC rejects.',
      actor: 'Priya Patel',
    },
    {
      id: 5,
      ts: 'Yesterday, 02:00 PM',
      machine: 'VMC-3',
      kind: 'procedure',
      kindLabel: 'Procedure Drafted',
      badgeClass: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
      icon: '🎥',
      summary: 'Video Drafter extracted 4 setup steps from Ramesh’s setup recording.',
      actor: 'Video Drafter',
    },
  ];

  const filteredEvents =
    machineFilter === 'all'
      ? events
      : events.filter((e) => e.machine === machineFilter);

  return (
    <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-6 shadow-xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-700/60 pb-4">
        <div>
          <span className="text-[10px] uppercase font-bold text-cyan-400 tracking-wider">
            Shop-Floor Activity Stream
          </span>
          <h2 className="text-lg font-bold text-white flex items-center space-x-2 mt-0.5">
            <span>⏱️</span>
            <span>Machine Event Timeline</span>
          </h2>
          <p className="text-slate-400 text-xs mt-1">
            Real-time feed combining work orders, sensor spikes, operator voice logs, and safety guardrails.
          </p>
        </div>

        <div className="flex items-center space-x-2 text-xs">
          <label className="text-slate-300">Filter Machine:</label>
          <select
            value={machineFilter}
            onChange={(e) => setMachineFilter(e.target.value)}
            className="bg-slate-900 border border-slate-700 text-slate-200 py-1 px-2.5 rounded-lg"
          >
            <option value="all">All Machines</option>
            <option value="VMC-3">VMC-3</option>
            <option value="Lathe-2">Lathe-2</option>
          </select>
        </div>
      </div>

      {/* Timeline Stream */}
      <div className="relative border-l-2 border-slate-700 ml-4 pl-6 space-y-6">
        {filteredEvents.map((event) => (
          <div key={event.id} className="relative group">
            {/* Timeline node icon */}
            <div className="absolute -left-[35px] top-0.5 w-6 h-6 rounded-full bg-slate-900 border-2 border-slate-600 flex items-center justify-center text-[11px] shadow group-hover:border-cyan-400 transition">
              {event.icon}
            </div>

            <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3.5 space-y-1.5 shadow-sm transition hover:border-slate-700">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                <div className="flex items-center space-x-2">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${event.badgeClass}`}
                  >
                    {event.kindLabel}
                  </span>
                  <span className="font-bold text-slate-200">
                    {event.machine}
                  </span>
                </div>
                <span className="text-slate-500 text-[10px] font-mono">{event.ts}</span>
              </div>

              <p className="text-xs text-slate-200 leading-relaxed font-medium">
                {event.summary}
              </p>

              <div className="text-[10px] text-slate-400 flex items-center space-x-1 pt-1">
                <span>Logged by:</span>
                <span className="text-cyan-300 font-semibold">{event.actor}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
