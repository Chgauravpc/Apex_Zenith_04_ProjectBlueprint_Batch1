import React from 'react';

/**
 * Google-inspired Loading / error placeholder shown while a panel's data loads.
 * Maintains contract: role="alert", "Could not load: ...", "Retry", and label.
 */
export default function LoadState({ loading, error, onRetry, label = 'Loading…' }) {
  if (error) {
    return (
      <div
        role="alert"
        className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 text-sm flex items-center justify-between shadow-xs"
      >
        <div className="flex items-center gap-2">
          <span className="text-base" aria-hidden="true">⚠️</span>
          <span className="font-medium">Could not load: {error?.message || String(error)}</span>
        </div>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-900 rounded-lg font-semibold text-xs transition-colors"
          >
            Retry
          </button>
        )}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-600 text-sm bg-white border border-[#DADCE0] rounded-xl shadow-xs flex flex-col items-center justify-center gap-3">
        <svg
          className="animate-spin h-6 w-6 text-maroon-700"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
        <span className="font-medium text-slate-500">{label}</span>
      </div>
    );
  }

  return null;
}
