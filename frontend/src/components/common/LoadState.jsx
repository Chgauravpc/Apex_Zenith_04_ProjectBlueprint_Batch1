import React from 'react';

/** Loading / error placeholder shown while a panel's data comes from the API. */
export default function LoadState({ loading, error, onRetry, label = 'Loading…' }) {
  if (error) {
    return (
      <div
        role="alert"
        className="p-4 bg-red-950/80 border border-red-500/50 rounded-xl text-red-200 text-xs flex items-center justify-between"
      >
        <span>Could not load: {error}</span>
        {onRetry && (
          <button type="button" onClick={onRetry} className="font-bold text-red-300 hover:underline">
            Retry
          </button>
        )}
      </div>
    );
  }
  if (loading) {
    return (
      <div className="p-6 text-center text-slate-400 text-xs bg-slate-800/60 border border-slate-800 rounded-2xl">
        {label}
      </div>
    );
  }
  return null;
}
