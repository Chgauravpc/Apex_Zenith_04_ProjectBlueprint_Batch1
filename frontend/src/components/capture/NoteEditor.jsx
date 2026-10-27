import React, { useState } from 'react';
import { captureText } from '../../api/capture';
import { useAuthStore } from '../../store/useAuthStore';
import WarningBanner from '../guardian/WarningBanner';

export default function NoteEditor({ onSaved }) {
  const { currentUser } = useAuthStore();
  const [text, setText] = useState('');
  const [machineId, setMachineId] = useState(1);
  const [rpm, setRpm] = useState('');
  const [feed, setFeed] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;

    setIsSubmitting(true);
    setError(null);

    const params = {};
    if (rpm) params.rpm = parseFloat(rpm);
    if (feed) params.feed = parseFloat(feed);

    try {
      const data = await captureText({
        text,
        author_id: currentUser.id,
        machine_id: machineId,
        params: Object.keys(params).length > 0 ? params : undefined,
      });

      setResult(data);
      if (onSaved) onSaved(data);
    } catch (err) {
      setError(err.message || 'Failed to analyze text note.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-6 shadow-xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-700/60 pb-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center space-x-2">
            <span>✍️</span>
            <span>Text Note & Parameter Capture</span>
          </h2>
          <p className="text-slate-400 text-xs mt-1">
            Type shift notes, parameter tweaks, or observations. Note Guardian will check limits instantly.
          </p>
        </div>

        <div className="flex items-center space-x-2 text-xs">
          <label className="text-slate-300">Machine:</label>
          <select
            value={machineId}
            onChange={(e) => setMachineId(Number(e.target.value))}
            className="bg-slate-900 border border-slate-700 text-slate-200 py-1 px-2.5 rounded-lg"
          >
            <option value={1}>VMC-3</option>
            <option value={2}>Lathe-2</option>
          </select>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="note-text" className="block text-xs font-semibold text-slate-300 mb-1.5">
            Observation / Know-How Note
          </label>
          <textarea
            id="note-text"
            rows={4}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="e.g. VMC-3 pe roughing karte waqt vibration thi, feed 0.28 se kam karke 0.20 kiya to cut smooth hua..."
            className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-slate-100 text-sm focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 placeholder-slate-500"
            required
          />
        </div>

        {/* Optional Parameters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
          <div>
            <label htmlFor="param-rpm" className="block text-xs font-medium text-slate-400 mb-1">
              Spindle Speed (RPM)
            </label>
            <input
              id="param-rpm"
              type="number"
              value={rpm}
              onChange={(e) => setRpm(e.target.value)}
              placeholder="e.g. 1800"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg py-1.5 px-3 text-xs text-slate-200 font-mono"
            />
          </div>

          <div>
            <label htmlFor="param-feed" className="block text-xs font-medium text-slate-400 mb-1">
              Feed Rate (mm/rev or mm/min)
            </label>
            <input
              id="param-feed"
              type="number"
              step="0.01"
              value={feed}
              onChange={(e) => setFeed(e.target.value)}
              placeholder="e.g. 0.22"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg py-1.5 px-3 text-xs text-slate-200 font-mono"
            />
          </div>
        </div>

        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={() => {
              setText('');
              setRpm('');
              setFeed('');
              setResult(null);
              setError(null);
            }}
            className="btn-touch px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-xl border border-slate-700 text-xs transition"
          >
            Clear
          </button>

          <button
            type="submit"
            disabled={isSubmitting || !text.trim()}
            className="btn-touch px-6 py-2 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-bold rounded-xl shadow transition text-sm flex items-center space-x-2"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                <span>Checking Guardian & Extracting...</span>
              </>
            ) : (
              <span>Save & Check Note</span>
            )}
          </button>
        </div>
      </form>

      {error && (
        <div className="p-3 bg-red-950/80 border border-red-500/50 rounded-xl text-red-200 text-xs">
          {error}
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-4 pt-4 border-t border-slate-700/60">
          {result.guardian_result && (
            <WarningBanner result={result.guardian_result} />
          )}

          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 mb-3 flex items-center space-x-2">
              <span>🗂️</span>
              <span>Extracted Know-How Cards ({result.cards?.length || 0})</span>
            </h3>

            {result.cards?.map((card, idx) => (
              <div
                key={card.id || idx}
                className="bg-slate-900 border border-slate-700/70 rounded-xl p-4 shadow-sm space-y-2 mb-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-cyan-400">
                    {card.symptom || 'General Tip'}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                    Confidence {Math.round((card.confidence || 0.9) * 100)}%
                  </span>
                </div>
                <div className="text-xs text-slate-200 font-medium">
                  <strong className="text-slate-400 font-normal">Action: </strong>
                  {card.action}
                </div>
                {card.why && (
                  <div className="text-xs text-slate-300">
                    <strong className="text-slate-400 font-normal">Why: </strong>
                    {card.why}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
