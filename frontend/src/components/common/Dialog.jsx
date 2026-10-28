import React, { useEffect, useRef } from 'react';

/**
 * Google-inspired clean white Dialog/Modal primitive.
 * Accessible with escape key handling, backdrop dismiss, and focus retention.
 */
export function Dialog({
  isOpen,
  onClose,
  title,
  description,
  children,
  maxWidth = 'max-w-lg',
  className = '',
}) {
  const dialogRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && onClose) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'dialog-title' : undefined}
      aria-describedby={description ? 'dialog-description' : undefined}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto animate-fade-in"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Surface */}
      <div
        ref={dialogRef}
        className={`relative bg-white rounded-2xl border border-[#DADCE0] shadow-md w-full ${maxWidth} p-6 overflow-hidden z-10 transition-all ${className}`}
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            {title && (
              <h2
                id="dialog-title"
                className="text-lg font-semibold text-slate-900 tracking-tight"
              >
                {title}
              </h2>
            )}
            {description && (
              <p
                id="dialog-description"
                className="text-sm text-slate-500 mt-1"
              >
                {description}
              </p>
            )}
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close dialog"
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-maroon-700 -mr-1 -mt-1"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
        </div>

        <div className="mt-2">{children}</div>
      </div>
    </div>
  );
}

export default Dialog;
