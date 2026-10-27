import React from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';

export default function Home() {
  const { currentUser } = useAuthStore();

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-800/90 via-slate-850 to-slate-900 border border-slate-700/80 rounded-2xl p-6 sm:p-7 shadow-xl shadow-black/20">
        <div className="absolute top-0 right-0 w-80 h-40 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-300 text-xs font-semibold mb-3 border border-cyan-500/30 font-mono shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" aria-hidden="true" />
              <span>Active Shift</span>
              <span className="text-cyan-600">•</span>
              <span>Machine: {currentUser.machine}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Welcome back, {currentUser.name}
            </h1>
            <p className="text-slate-400 text-sm mt-1.5 font-medium">
              {currentUser.roleLabel} • {currentUser.experience} on shop floor
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/capture"
              className="btn-touch px-5 py-2.5 bg-gradient-to-r from-cyan-400 to-cyan-500 hover:from-cyan-300 hover:to-cyan-400 text-slate-950 font-extrabold rounded-xl shadow-lg shadow-cyan-500/20 hover:shadow-cyan-400/30 transition-all flex items-center space-x-2 text-sm active:scale-[0.98]"
            >
              <span>🎙️</span>
              <span>Record Know-How</span>
            </Link>
            <Link
              to="/ask"
              className="btn-touch px-5 py-2.5 bg-slate-900/80 hover:bg-slate-800 border border-slate-700 hover:border-slate-600 text-slate-200 hover:text-white font-semibold rounded-xl transition-all flex items-center space-x-2 text-sm active:scale-[0.98]"
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
            <div className="group bg-slate-800/90 hover:bg-slate-800 border border-slate-700/80 hover:border-slate-600 rounded-2xl p-6 shadow-md transition-all flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-slate-900/80 border border-slate-700/70 flex items-center justify-center text-xl mb-3 group-hover:scale-105 transition-transform">
                  <span aria-hidden="true">📋</span>
                </div>
                <h2 className="text-base font-bold text-white group-hover:text-cyan-300 transition-colors">Daily Briefing</h2>
                <p className="text-slate-400 text-xs sm:text-sm mt-1.5 leading-relaxed">
                  3 critical tips recorded by Ramesh for VMC-3 operation today.
                </p>
              </div>
              <Link
                to="/guide"
                className="inline-flex items-center mt-5 text-xs font-semibold text-cyan-400 hover:text-cyan-300 group-hover:translate-x-1 transition-transform"
              >
                Start Guided Job →
              </Link>
            </div>
            <div className="group bg-slate-800/90 hover:bg-slate-800 border border-slate-700/80 hover:border-slate-600 rounded-2xl p-6 shadow-md transition-all flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-slate-900/80 border border-slate-700/70 flex items-center justify-center text-xl mb-3 group-hover:scale-105 transition-transform">
                  <span aria-hidden="true">🛡️</span>
                </div>
                <h2 className="text-base font-bold text-white group-hover:text-cyan-300 transition-colors">Active Guardrails</h2>
                <p className="text-slate-400 text-xs sm:text-sm mt-1.5 leading-relaxed">
                  Note Guardian is monitoring spindle feed limits and chatter precursors.
                </p>
              </div>
              <Link
                to="/capture"
                className="inline-flex items-center mt-5 text-xs font-semibold text-cyan-400 hover:text-cyan-300 group-hover:translate-x-1 transition-transform"
              >
                Log Shift Note →
              </Link>
            </div>
            <div className="group bg-slate-800/90 hover:bg-slate-800 border border-slate-700/80 hover:border-slate-600 rounded-2xl p-6 shadow-md transition-all flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-slate-900/80 border border-slate-700/70 flex items-center justify-center text-xl mb-3 group-hover:scale-105 transition-transform">
                  <span aria-hidden="true">🔍</span>
                </div>
                <h2 className="text-base font-bold text-white group-hover:text-cyan-300 transition-colors">Chatter & Chips</h2>
                <p className="text-slate-400 text-xs sm:text-sm mt-1.5 leading-relaxed">
                  Record sound or photo to find stable RPM sweet spots or chip overheat.
                </p>
              </div>
              <Link
                to="/ask"
                className="inline-flex items-center mt-5 text-xs font-semibold text-cyan-400 hover:text-cyan-300 group-hover:translate-x-1 transition-transform"
              >
                Diagnose Issue →
              </Link>
            </div>
          </>
        )}

        {currentUser.role === 'old_employee' && (
          <>
            <div className="group bg-slate-800/90 hover:bg-slate-800 border border-slate-700/80 hover:border-slate-600 rounded-2xl p-6 shadow-md transition-all flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-slate-900/80 border border-slate-700/70 flex items-center justify-center text-xl mb-3 group-hover:scale-105 transition-transform">
                  <span aria-hidden="true">🤝</span>
                </div>
                <h2 className="text-base font-bold text-white group-hover:text-cyan-300 transition-colors">Handover Plan</h2>
                <p className="text-slate-400 text-xs sm:text-sm mt-1.5 leading-relaxed">
                  Exit in 7 months: 4 uncovered VMC-3 components require knowledge capture.
                </p>
              </div>
              <Link
                to="/handover"
                className="inline-flex items-center mt-5 text-xs font-semibold text-cyan-400 hover:text-cyan-300 group-hover:translate-x-1 transition-transform"
              >
                View Handover Plan →
              </Link>
            </div>
            <div className="group bg-slate-800/90 hover:bg-slate-800 border border-slate-700/80 hover:border-slate-600 rounded-2xl p-6 shadow-md transition-all flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-slate-900/80 border border-slate-700/70 flex items-center justify-center text-xl mb-3 group-hover:scale-105 transition-transform">
                  <span aria-hidden="true">✅</span>
                </div>
                <h2 className="text-base font-bold text-white group-hover:text-cyan-300 transition-colors">Verification Queue</h2>
                <p className="text-slate-400 text-xs sm:text-sm mt-1.5 leading-relaxed">
                  2 new AI-extracted procedure drafts await your review and sign-off.
                </p>
              </div>
              <Link
                to="/review"
                className="inline-flex items-center mt-5 text-xs font-semibold text-cyan-400 hover:text-cyan-300 group-hover:translate-x-1 transition-transform"
              >
                Open Review Queue →
              </Link>
            </div>
            <div className="group bg-slate-800/90 hover:bg-slate-800 border border-slate-700/80 hover:border-slate-600 rounded-2xl p-6 shadow-md transition-all flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-slate-900/80 border border-slate-700/70 flex items-center justify-center text-xl mb-3 group-hover:scale-105 transition-transform">
                  <span aria-hidden="true">❓</span>
                </div>
                <h2 className="text-base font-bold text-white group-hover:text-cyan-300 transition-colors">Questions for You</h2>
                <p className="text-slate-400 text-xs sm:text-sm mt-1.5 leading-relaxed">
                  Priya asked about chatter on SS304 roughing. Leave a quick voice reply.
                </p>
              </div>
              <Link
                to="/handover"
                className="inline-flex items-center mt-5 text-xs font-semibold text-cyan-400 hover:text-cyan-300 group-hover:translate-x-1 transition-transform"
              >
                Answer by Voice →
              </Link>
            </div>
          </>
        )}

        {currentUser.role === 'supervisor' && (
          <>
            <div className="group bg-slate-800/90 hover:bg-slate-800 border border-slate-700/80 hover:border-slate-600 rounded-2xl p-6 shadow-md transition-all flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-slate-900/80 border border-slate-700/70 flex items-center justify-center text-xl mb-3 group-hover:scale-105 transition-transform">
                  <span aria-hidden="true">📊</span>
                </div>
                <h2 className="text-base font-bold text-white group-hover:text-cyan-300 transition-colors">Knowledge-at-Risk</h2>
                <p className="text-slate-400 text-xs sm:text-sm mt-1.5 leading-relaxed">
                  Heatmap shows bus factor = 1 on VMC-3 Spindle and Lathe-2 Turret.
                </p>
              </div>
              <Link
                to="/dashboard"
                className="inline-flex items-center mt-5 text-xs font-semibold text-cyan-400 hover:text-cyan-300 group-hover:translate-x-1 transition-transform"
              >
                View Risk Heatmap →
              </Link>
            </div>
            <div className="group bg-slate-800/90 hover:bg-slate-800 border border-slate-700/80 hover:border-slate-600 rounded-2xl p-6 shadow-md transition-all flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-slate-900/80 border border-slate-700/70 flex items-center justify-center text-xl mb-3 group-hover:scale-105 transition-transform">
                  <span aria-hidden="true">⚙️</span>
                </div>
                <h2 className="text-base font-bold text-white group-hover:text-cyan-300 transition-colors">Machine Health Map</h2>
                <p className="text-slate-400 text-xs sm:text-sm mt-1.5 leading-relaxed">
                  Interactive 3D model with incident heatmaps and pinned tips.
                </p>
              </div>
              <Link
                to="/map"
                className="inline-flex items-center mt-5 text-xs font-semibold text-cyan-400 hover:text-cyan-300 group-hover:translate-x-1 transition-transform"
              >
                Explore 3D Map →
              </Link>
            </div>
            <div className="group bg-slate-800/90 hover:bg-slate-800 border border-slate-700/80 hover:border-slate-600 rounded-2xl p-6 shadow-md transition-all flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-slate-900/80 border border-slate-700/70 flex items-center justify-center text-xl mb-3 group-hover:scale-105 transition-transform">
                  <span aria-hidden="true">📈</span>
                </div>
                <h2 className="text-base font-bold text-white group-hover:text-cyan-300 transition-colors">Transfer Metrics</h2>
                <p className="text-slate-400 text-xs sm:text-sm mt-1.5 leading-relaxed">
                  Track time-to-independence and reject rates as handover progresses.
                </p>
              </div>
              <Link
                to="/dashboard"
                className="inline-flex items-center mt-5 text-xs font-semibold text-cyan-400 hover:text-cyan-300 group-hover:translate-x-1 transition-transform"
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
