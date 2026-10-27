import React from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { t } from '../utils/i18n';

export default function MachineMap() {
  const { language } = useAuthStore();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-700/60 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center space-x-2.5">
            <span aria-hidden="true">⚙️</span>
            <span>{t('navMap', language)}</span>
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-1.5 font-medium leading-relaxed">
            3D Machine Knowledge Map with component pins, risk heatmaps, and failure incidents.
          </p>
        </div>
      </div>

      <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-10 text-center shadow-xl space-y-4 relative overflow-hidden">
        <div className="absolute top-0 right-1/2 translate-x-1/2 w-72 h-36 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="w-16 h-16 mx-auto bg-slate-900 border border-cyan-500/30 text-cyan-400 rounded-2xl flex items-center justify-center text-3xl shadow-inner ring-1 ring-cyan-400/20">
          <span aria-hidden="true">⚙️</span>
        </div>
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">3D Knowledge Map</h2>
          <p className="text-slate-400 text-xs sm:text-sm max-w-md mx-auto mt-1.5 leading-relaxed">
            3D viewer with ComponentMesh, PinMarker, and ComponentPanel (owned by 3D track teammate, T21).
          </p>
        </div>
      </div>
    </div>
  );
}
