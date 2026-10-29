import React from 'react';

/**
 * Renders an individual grounded source card citing an old employee's record.
 * Per PRD §5.3 / Rule 6: Answers cite only retrieved sources.
 */
export default function SourceCard({ source }) {
  if (!source) return null;

  return (
    <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-3.5 shadow-2xs space-y-2 hover:border-copper/40 transition">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center space-x-2">
          <span className="font-bold text-copper">
            #{source.id} {source.kind || 'Know-How'}
          </span>
          {source.verified && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center space-x-1">
              <span>✓</span>
              <span>Verified</span>
            </span>
          )}
        </div>

        {source.author && (
          <span className="text-slate-500 text-[11px]">
            By: <strong className="text-slate-700 font-semibold">{source.author}</strong>
          </span>
        )}
      </div>

      {/* Snippet Quote */}
      <p className="text-xs text-slate-700 leading-relaxed italic border-l-2 border-copper/50 pl-2 py-0.5">
        &ldquo;{source.snippet || source.action || source.text}&rdquo;
      </p>

      {/* Media Attachment (Photo or Audio or Video) */}
      {source.media_url && (
        <div className="pt-2 border-t border-slate-200">
          {source.media_url.endsWith('.jpg') || source.media_url.endsWith('.png') ? (
            <img
              src={source.media_url}
              alt="Source observation"
              className="max-h-36 rounded-lg object-cover border border-slate-200"
            />
          ) : source.media_url.endsWith('.mp3') || source.media_url.endsWith('.webm') ? (
            <div className="flex items-center space-x-2 text-xs">
              <audio
                controls
                src={source.media_url}
                className="w-full h-8"
              />
            </div>
          ) : (
            <a
              href={source.media_url}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-copper hover:underline font-medium inline-flex items-center space-x-1"
            >
              <span>🔗</span>
              <span>View Source Clip {source.timestamp ? `@ ${source.timestamp}s` : ''}</span>
            </a>
          )}
        </div>
      )}

      {/* Machine & Component metadata */}
      {(source.machine || source.component) && (
        <div className="flex items-center space-x-2 text-[10px] text-slate-500 pt-1">
          {source.machine && (
            <span className="bg-white border border-slate-200 px-2 py-0.5 rounded font-mono text-slate-600">
              {source.machine}
            </span>
          )}
          {source.component && (
            <span className="bg-white border border-slate-200 px-2 py-0.5 rounded font-mono text-slate-600">
              {source.component}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
