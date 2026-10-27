import React from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';

export default function Home() {
  const { currentUser } = useAuthStore();

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 border border-slate-700/70 rounded-2xl p-6 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-2 px-2.5 py-1 rounded-full bg-cyan-500/15 text-cyan-400 text-xs font-semibold mb-2 border border-cyan-500/30">
              <span>● Active Shift</span>
              <span>•</span>
              <span>Machine: {currentUser.machine}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Welcome back, {currentUser.name}
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              {currentUser.roleLabel} • {currentUser.experience} on shop floor
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              to="/capture"
              className="btn-touch px-4 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl shadow-md transition flex items-center space-x-2 text-sm"
            >
              <span>🎙️</span>
              <span>Record Know-How</span>
            </Link>
            <Link
              to="/ask"
              className="btn-touch px-4 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 font-semibold rounded-xl transition flex items-center space-x-2 text-sm"
            >
              <span>💡</span>
              <span>Ask Experience</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Role-Adaptive Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {currentUser.role === 'new_employee' && (
          <>
            <div className="bg-slate-800/90 border border-slate-700/80 rounded-xl p-5 shadow">
              <span className="text-2xl" aria-hidden="true">📋</span>
              <h2 className="text-lg font-bold text-white mt-2">Daily Briefing</h2>
              <p className="text-slate-400 text-xs mt-1">
                3 critical tips recorded by Ramesh for VMC-3 operation today.
              </p>
              <Link
                to="/guide"
                className="inline-block mt-4 text-xs font-semibold text-cyan-400 hover:underline"
              >
                Start Guided Job →
              </Link>
            </div>
            <div className="bg-slate-800/90 border border-slate-700/80 rounded-xl p-5 shadow">
              <span className="text-2xl" aria-hidden="true">🛡️</span>
              <h2 className="text-lg font-bold text-white mt-2">Active Guardrails</h2>
              <p className="text-slate-400 text-xs mt-1">
                Note Guardian is monitoring spindle feed limits and chatter precursors.
              </p>
              <Link
                to="/capture"
                className="inline-block mt-4 text-xs font-semibold text-cyan-400 hover:underline"
              >
                Log Shift Note →
              </Link>
            </div>
            <div className="bg-slate-800/90 border border-slate-700/80 rounded-xl p-5 shadow">
              <span className="text-2xl" aria-hidden="true">🔍</span>
              <h2 className="text-lg font-bold text-white mt-2">Chatter & Chips</h2>
              <p className="text-slate-400 text-xs mt-1">
                Record sound or photo to find stable RPM sweet spots or chip overheat.
              </p>
              <Link
                to="/ask"
                className="inline-block mt-4 text-xs font-semibold text-cyan-400 hover:underline"
              >
                Diagnose Issue →
              </Link>
            </div>
          </>
        )}

        {currentUser.role === 'old_employee' && (
          <>
            <div className="bg-slate-800/90 border border-slate-700/80 rounded-xl p-5 shadow">
              <span className="text-2xl" aria-hidden="true">🤝</span>
              <h2 className="text-lg font-bold text-white mt-2">Handover Plan</h2>
              <p className="text-slate-400 text-xs mt-1">
                Exit in 7 months: 4 uncovered VMC-3 components require knowledge capture.
              </p>
              <Link
                to="/handover"
                className="inline-block mt-4 text-xs font-semibold text-cyan-400 hover:underline"
              >
                View Handover Plan →
              </Link>
            </div>
            <div className="bg-slate-800/90 border border-slate-700/80 rounded-xl p-5 shadow">
              <span className="text-2xl" aria-hidden="true">✅</span>
              <h2 className="text-lg font-bold text-white mt-2">Verification Queue</h2>
              <p className="text-slate-400 text-xs mt-1">
                2 new AI-extracted procedure drafts await your review and sign-off.
              </p>
              <Link
                to="/review"
                className="inline-block mt-4 text-xs font-semibold text-cyan-400 hover:underline"
              >
                Open Review Queue →
              </Link>
            </div>
            <div className="bg-slate-800/90 border border-slate-700/80 rounded-xl p-5 shadow">
              <span className="text-2xl" aria-hidden="true">❓</span>
              <h2 className="text-lg font-bold text-white mt-2">Questions for You</h2>
              <p className="text-slate-400 text-xs mt-1">
                Priya asked about chatter on SS304 roughing. Leave a quick voice reply.
              </p>
              <Link
                to="/handover"
                className="inline-block mt-4 text-xs font-semibold text-cyan-400 hover:underline"
              >
                Answer by Voice →
              </Link>
            </div>
          </>
        )}

        {currentUser.role === 'supervisor' && (
          <>
            <div className="bg-slate-800/90 border border-slate-700/80 rounded-xl p-5 shadow">
              <span className="text-2xl" aria-hidden="true">📊</span>
              <h2 className="text-lg font-bold text-white mt-2">Knowledge-at-Risk</h2>
              <p className="text-slate-400 text-xs mt-1">
                Heatmap shows bus factor = 1 on VMC-3 Spindle and Lathe-2 Turret.
              </p>
              <Link
                to="/dashboard"
                className="inline-block mt-4 text-xs font-semibold text-cyan-400 hover:underline"
              >
                View Risk Heatmap →
              </Link>
            </div>
            <div className="bg-slate-800/90 border border-slate-700/80 rounded-xl p-5 shadow">
              <span className="text-2xl" aria-hidden="true">⚙️</span>
              <h2 className="text-lg font-bold text-white mt-2">Machine Health Map</h2>
              <p className="text-slate-400 text-xs mt-1">
                Interactive 3D model with incident heatmaps and pinned tips.
              </p>
              <Link
                to="/map"
                className="inline-block mt-4 text-xs font-semibold text-cyan-400 hover:underline"
              >
                Explore 3D Map →
              </Link>
            </div>
            <div className="bg-slate-800/90 border border-slate-700/80 rounded-xl p-5 shadow">
              <span className="text-2xl" aria-hidden="true">📈</span>
              <h2 className="text-lg font-bold text-white mt-2">Transfer Metrics</h2>
              <p className="text-slate-400 text-xs mt-1">
                Track time-to-independence and reject rates as handover progresses.
              </p>
              <Link
                to="/dashboard"
                className="inline-block mt-4 text-xs font-semibold text-cyan-400 hover:underline"
              >
                See Metrics →
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
