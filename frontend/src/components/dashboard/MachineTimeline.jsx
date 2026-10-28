import React, { useEffect, useState } from 'react';
import { getMachines, getTimeline } from '../../api/machines';
import useApi from '../../hooks/useApi';
import { useMachineStore } from '../../store/useMachineStore';
import LoadState from '../common/LoadState';
import {
  ClockIcon,
  MicIcon,
  VolumeIcon,
  UsersIcon,
  PlayIcon,
  FileTextIcon,
  AlertTriangleIcon,
  XIcon,
} from '../common/Icons';

const PAGE = 20;

const WrenchIcon = ({ className = 'w-3 h-3' }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
  </svg>
);

const BoltIcon = ({ className = 'w-3 h-3' }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
  </svg>
);

const KINDS = {
  warning: { label: 'Guardian Warning', badge: 'bg-rose-50 text-rose-800 border-rose-200', icon: <AlertTriangleIcon className="w-3 h-3 text-rose-700" /> },
  note: { label: 'Note Captured', badge: 'bg-maroon-50 text-maroon-800 border-maroon-200', icon: <MicIcon className="w-3 h-3 text-maroon-700" /> },
  anomaly: { label: 'Sensor Anomaly', badge: 'bg-amber-50 text-amber-800 border-amber-200', icon: <BoltIcon className="w-3 h-3 text-amber-700" /> },
  qc_reject: { label: 'QC Reject', badge: 'bg-orange-50 text-orange-800 border-orange-200', icon: <XIcon className="w-3 h-3 text-orange-700" /> },
  maintenance: { label: 'Maintenance', badge: 'bg-emerald-50 text-emerald-800 border-emerald-200', icon: <WrenchIcon className="w-3 h-3 text-emerald-700" /> },
  meeting: { label: 'Team Meeting', badge: 'bg-purple-50 text-purple-800 border-purple-200', icon: <UsersIcon className="w-3 h-3 text-purple-700" /> },
  run: { label: 'Guided Run', badge: 'bg-blue-50 text-blue-800 border-blue-200', icon: <PlayIcon className="w-3 h-3 text-blue-700" /> },
  chatter_check: { label: 'Chatter Check', badge: 'bg-amber-50 text-amber-800 border-amber-200', icon: <VolumeIcon className="w-3 h-3 text-amber-700" /> },
};
const OTHER = { label: 'Event', badge: 'bg-slate-100 text-slate-800 border-slate-200', icon: <FileTextIcon className="w-3 h-3 text-slate-700" /> };

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
    <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <span className="text-[10px] uppercase font-bold text-maroon-700 tracking-wider">
            Shop-Floor Activity Stream
          </span>
          <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2 mt-0.5">
            <ClockIcon className="w-5 h-5 text-maroon-700" />
            <span>Machine Event Timeline</span>
          </h2>
          <p className="text-slate-600 text-xs mt-1">
            ERP records, sensor spikes, operator notes, meetings and safety warnings in one stream.
          </p>
        </div>

        <div className="flex items-center space-x-2 text-xs">
          <label htmlFor="timeline-machine" className="text-slate-700 font-medium">
            Machine:
          </label>
          <select
            id="timeline-machine"
            value={selectedMachineId || ''}
            onChange={(e) => setSelectedMachineId(Number(e.target.value))}
            className="bg-white border border-slate-200 text-slate-800 py-1.5 px-3 rounded-xl font-semibold focus:border-maroon-700 focus:ring-1 focus:ring-maroon-700 text-xs shadow-xs outline-none"
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
        <div className="text-center text-slate-500 text-xs py-6">Nothing recorded on this machine yet.</div>
      )}

      {/* Timeline Stream */}
      {events.length > 0 && (
        <div className="relative border-l-2 border-slate-200 ml-4 pl-6 space-y-6">
          {events.map((event) => {
            const kind = KINDS[event.kind] || OTHER;
            return (
              <div key={event.id} className="relative group">
                <div className="absolute -left-[35px] top-0.5 w-6 h-6 rounded-full bg-white border-2 border-slate-300 flex items-center justify-center text-[11px] shadow-xs group-hover:border-maroon-700 group-hover:shadow-sm transition">
                  {kind.icon}
                </div>

                <div className="bg-white border border-slate-200/90 rounded-xl p-3.5 space-y-1.5 shadow-xs transition hover:border-slate-300 hover:shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                    <div className="flex items-center space-x-2">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${kind.badge}`}
                      >
                        {kind.label}
                      </span>
                      <span className="font-bold text-slate-900">{first.data && first.data.machine}</span>
                    </div>
                    <span className="text-slate-500 text-[10px] font-mono">{formatWhen(event.occurred_at)}</span>
                  </div>

                  <p className="text-xs text-slate-800 leading-relaxed font-medium">{event.summary}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {moreError && <div className="text-rose-600 text-xs">Could not load more: {moreError}</div>}

      {events.length < total && (
        <div className="flex justify-center">
          <button
            type="button"
            disabled={loadingMore}
            onClick={loadMore}
            className="btn-touch px-4 py-2 bg-white hover:bg-slate-50 disabled:opacity-50 text-slate-800 hover:text-maroon-800 text-xs font-semibold rounded-xl border border-slate-200 shadow-xs transition"
          >
            {loadingMore ? 'Loading…' : `Load older events (${total - events.length} more)`}
          </button>
        </div>
      )}
    </div>
  );
}
