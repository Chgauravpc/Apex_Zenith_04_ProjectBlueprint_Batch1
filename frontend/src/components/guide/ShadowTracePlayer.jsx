import React, { useRef, useEffect } from 'react';

/**
 * ShadowTracePlayer.
 * Shows old employee's verified run timestamped to the active procedure step.
 */
export default function ShadowTracePlayer({
  traceSteps = [],
  currentStepNo = 1,
  videoUrl,
  author,
}) {
  const who = author ? author.split(' ')[0] : 'The old employee';
  const videoRef = useRef(null);
  const activeTrace = traceSteps.find((t) => t.step_no === currentStepNo) || traceSteps[0];

  useEffect(() => {
    if (videoRef.current && activeTrace && activeTrace.clip_start != null) {
      videoRef.current.currentTime = activeTrace.clip_start;
    }
  }, [activeTrace]);

  return (
    <div className="bg-white border border-[#DADCE0] rounded-2xl p-5 space-y-4 shadow-card hover:border-slate-300 transition-all">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center space-x-2">
          <span className="w-8 h-8 rounded-xl bg-maroon-50 text-maroon-700 flex items-center justify-center border border-maroon-100 text-sm" aria-hidden="true">🎬</span>
          <div>
            <h3 className="text-sm font-bold text-slate-900">ShadowTrace™ Reference Player</h3>
            <span className="text-[11px] text-maroon-700 font-semibold">
              {author ? `${author}’s` : 'Recorded'} Gold-Standard Run
            </span>
          </div>
        </div>

        {activeTrace && activeTrace.clip_start != null && (
          <span className="text-xs bg-[#F8F9FA] text-slate-700 font-mono px-2.5 py-1 rounded-lg border border-slate-200 shadow-xs">
            Clip: {activeTrace.clip_start}s – {activeTrace.clip_end}s
          </span>
        )}
      </div>

      {/* Video Box */}
      <div className="relative rounded-xl overflow-hidden bg-black aspect-video border border-slate-200 flex items-center justify-center shadow-xs">
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
            <span className="text-xs text-slate-600 font-medium block">
              Step {currentStepNo}: {activeTrace ? activeTrace.instruction : 'no recorded run'}
            </span>
            <span className="text-[11px] text-slate-400 block">
              No setup video is linked to this procedure yet.
            </span>
          </div>
        )}
      </div>

      {/* Components Checked at this Step */}
      {activeTrace && activeTrace.components_checked && activeTrace.components_checked.length > 0 && (
        <div className="text-xs space-y-1.5 pt-2 border-t border-slate-100">
          <span className="text-slate-500 font-semibold block text-[11px] uppercase tracking-wider">
            Components {who} checked at this step:
          </span>
          <div className="flex flex-wrap gap-2">
            {activeTrace.components_checked.map((c, idx) => (
              <span
                key={idx}
                className="bg-[#F8F9FA] px-2.5 py-1 rounded-lg text-slate-700 border border-slate-200 flex items-center space-x-1.5 shadow-xs"
              >
                <span className="text-emerald-700 font-bold">✓</span>
                <span>{c}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
