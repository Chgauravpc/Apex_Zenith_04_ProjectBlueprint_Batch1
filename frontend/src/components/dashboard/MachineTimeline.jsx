import React, { useEffect, useState } from 'react';
import { getMachines, getTimeline } from '../../api/machines';
import useApi from '../../hooks/useApi';
import { useMachineStore } from '../../store/useMachineStore';
import LoadState from '../common/LoadState';

const PAGE = 20;

const KINDS = {
  warning: { label: 'Guardian Warning', badge: 'bg-red-500/20 text-red-400 border-red-500/40', icon: '⛔' },
  note: { label: 'Note Captured', badge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40', icon: '🎙️' },
  anomaly: { label: 'Sensor Anomaly', badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40', icon: '⚡' },
  qc_reject: { label: 'QC Reject', badge: 'bg-orange-500/20 text-orange-300 border-orange-500/40', icon: '✗' },
  maintenance: { label: 'Maintenance', badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40', icon: '🔧' },
  meeting: { label: 'Team Meeting', badge: 'bg-purple-500/20 text-purple-300 border-purple-500/40', icon: '📝' },
  run: { label: 'Guided Run', badge: 'bg-blue-500/20 text-blue-300 border-blue-500/40', icon: '📋' },
  chatter: { label: 'Chatter Check', badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40', icon: '🔊' },
};
const OTHER = { label: 'Event', badge: 'bg-slate-500/20 text-slate-300 border-slate-500/40', icon: '•' };

const formatWhen = (iso) =>
  new Date(iso).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

/**
 * MachineTimeline component.
 * One machine's stream from GET /machines/{id}/timeline: ERP records, sensor anomalies,
 * captured notes, meetings and Guardian warnings, newest first.
 */
export default function MachineTimeline() {
  const { selectedMachineId, setSelectedMachineId } = useMachineStore();
  const machines = useApi((signal) => getMachines(signal), []);
  const [events, setEvents] = useState([]);
  const [total, setTotal] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreError, setMoreError] = useState(null);

  const first = useApi(
    (signal) => (selectedMachineId ? getTimeline(selectedMachineId, { limit: PAGE }, signal) : null),
    [selectedMachineId]
  );

  useEffect(() => {
    setEvents(first.data ? first.data.items : []);
    setTotal(first.data ? first.data.total : 0);
  }, [first.data]);

  const loadMore = async () => {
    setLoadingMore(true);
    setMoreError(null);
    try {
      const page = await getTimeline(selectedMachineId, { limit: PAGE, offset: events.length });
      setEvents((prev) => [...prev, ...page.items]);
      setTotal(page.total);
    } catch (err) {
      setMoreError(err.message);
    } finally {
      setLoadingMore(false);
    }
  };

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
            ERP records, sensor spikes, operator notes, meetings and safety warnings in one stream.
          </p>
        </div>

        <div className="flex items-center space-x-2 text-xs">
          <label htmlFor="timeline-machine" className="text-slate-300">
            Machine:
          </label>
          <select
            id="timeline-machine"
            value={selectedMachineId || ''}
            onChange={(e) => setSelectedMachineId(Number(e.target.value))}
            className="bg-slate-900 border border-slate-700 text-slate-200 py-1 px-2.5 rounded-lg"
          >
            {(machines.data || []).map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <LoadState
        loading={first.loading}
        error={first.error || machines.error}
        onRetry={first.reload}
        label="Loading timeline…"
      />

      {!first.loading && !first.error && events.length === 0 && (
        <div className="text-center text-slate-400 text-xs py-6">Nothing recorded on this machine yet.</div>
      )}

      {/* Timeline Stream */}
      {events.length > 0 && (
        <div className="relative border-l-2 border-slate-700 ml-4 pl-6 space-y-6">
          {events.map((event) => {
            const kind = KINDS[event.kind] || OTHER;
            return (
              <div key={event.id} className="relative group">
                <div className="absolute -left-[35px] top-0.5 w-6 h-6 rounded-full bg-slate-900 border-2 border-slate-600 flex items-center justify-center text-[11px] shadow group-hover:border-cyan-400 transition">
                  {kind.icon}
                </div>

                <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3.5 space-y-1.5 shadow-sm transition hover:border-slate-700">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                    <div className="flex items-center space-x-2">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${kind.badge}`}
                      >
                        {kind.label}
                      </span>
                      <span className="font-bold text-slate-200">{first.data && first.data.machine}</span>
                    </div>
                    <span className="text-slate-500 text-[10px] font-mono">{formatWhen(event.occurred_at)}</span>
                  </div>

                  <p className="text-xs text-slate-200 leading-relaxed font-medium">{event.summary}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {moreError && <div className="text-red-300 text-xs">Could not load more: {moreError}</div>}

      {events.length < total && (
        <div className="flex justify-center">
          <button
            type="button"
            disabled={loadingMore}
            onClick={loadMore}
            className="btn-touch px-4 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700"
          >
            {loadingMore ? 'Loading…' : `Load older events (${total - events.length} more)`}
          </button>
        </div>
      )}
    </div>
  );
}
