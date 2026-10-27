import React, { useRef, useEffect } from 'react';

/**
 * ShadowTracePlayer.
 * Shows old employee's verified run timestamped to the active procedure step.
 */
export default function ShadowTracePlayer({
  traceSteps = [],
  currentStepNo = 1,
  videoUrl,
}) {
  const videoRef = useRef(null);
  const activeTrace = traceSteps.find((t) => t.step_no === currentStepNo) || traceSteps[0];

  useEffect(() => {
    if (videoRef.current && activeTrace && activeTrace.clip_start !== undefined) {
      videoRef.current.currentTime = activeTrace.clip_start;
    }
  }, [activeTrace]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="text-xl" aria-hidden="true">🎬</span>
          <div>
            <h3 className="text-sm font-bold text-white">ShadowTrace™ Reference Player</h3>
            <span className="text-[11px] text-cyan-400">
              Ramesh’s Recorded Gold-Standard Run
            </span>
          </div>
        </div>

        {activeTrace && (
          <span className="text-xs bg-slate-800 text-cyan-300 font-mono px-2.5 py-1 rounded-lg border border-slate-700">
            Clip: {activeTrace.clip_start}s – {activeTrace.clip_end}s
          </span>
        )}
      </div>

      {/* Video Box */}
      <div className="relative rounded-xl overflow-hidden bg-slate-950 aspect-video border border-slate-800 flex items-center justify-center">
        {videoUrl ? (
          <video
            ref={videoRef}
            src={videoUrl}
            controls
            className="w-full h-full object-contain"
          />
        ) : (
          <div className="text-center p-6 space-y-2">
            <span className="text-3xl block" aria-hidden="true">🎥</span>
            <span className="text-xs text-slate-400 block">
              Reference clip for Step {currentStepNo}: Spindle clamp alignment
            </span>
            <span className="text-[11px] text-slate-500 font-mono block">
              Timecode: 00:{activeTrace?.clip_start || 15} – 00:{activeTrace?.clip_end || 35}
            </span>
          </div>
        )}
      </div>

      {/* Components Checked at this Step */}
      {activeTrace && activeTrace.components_checked && (
        <div className="text-xs space-y-1.5 pt-2 border-t border-slate-800">
          <span className="text-slate-400 font-semibold block text-[11px] uppercase tracking-wider">
            Components Ramesh verified in this clip:
          </span>
          <div className="flex flex-wrap gap-2">
            {activeTrace.components_checked.map((c, idx) => (
              <span
                key={idx}
                className="bg-slate-800 px-2 py-0.5 rounded text-slate-200 border border-slate-700 flex items-center space-x-1"
              >
                <span>✓</span>
                <span>{c}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
