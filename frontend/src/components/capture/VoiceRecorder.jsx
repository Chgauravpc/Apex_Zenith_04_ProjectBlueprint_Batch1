import React, { useState } from 'react';
import useRecorder from '../../hooks/useRecorder';
import { captureVoice } from '../../api/capture';
import { useAuthStore } from '../../store/useAuthStore';
import WarningBanner from '../guardian/WarningBanner';
import { t } from '../../utils/i18n';

export default function VoiceRecorder({ onSaved }) {
  const { currentUser, language } = useAuthStore();
  const {
    isRecording,
    duration,
    audioBlob,
    audioUrl,
    error: recorderError,
    startRecording,
    stopRecording,
    resetRecording,
  } = useRecorder();

  const [selectedLanguage, setSelectedLanguage] = useState('hi');
  const [machineId, setMachineId] = useState(1); // VMC-3
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [submitError, setSubmitError] = useState(null);

  const handleSubmit = async () => {
    if (!audioBlob) return;
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const formData = new FormData();
      formData.append('file', audioBlob, 'note.webm');
      formData.append('author_id', currentUser.id.toString());
      formData.append('machine_id', machineId.toString());
      formData.append('language', selectedLanguage);
      formData.append('consent', 'true');

      const data = await captureVoice(formData);
      setResult(data);
      if (onSaved) onSaved(data);
    } catch (err) {
      setSubmitError(err.message || 'Failed to process voice recording.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatSeconds = (sec) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${mins}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-6 shadow-xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-700/60 pb-5">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center space-x-2.5">
            <span aria-hidden="true">🎙️</span>
            <span>Voice Note Capture</span>
          </h2>
          <p className="text-slate-400 text-xs mt-1.5 font-medium">
            Speak naturally in Hindi, Marathi, or English. AI transcribes and extracts shop-floor know-how cards.
          </p>
        </div>

        <div className="flex items-center space-x-2.5 text-xs">
          <label className="flex items-center space-x-1.5 text-slate-300">
            <span className="font-medium text-slate-400">Machine:</span>
            <select
              value={machineId}
              onChange={(e) => setMachineId(Number(e.target.value))}
              className="bg-slate-900 border border-slate-700 text-slate-200 py-1 pl-2 pr-6 rounded-lg font-semibold"
            >
              <option value={1}>VMC-3</option>
              <option value={2}>Lathe-2</option>
            </select>
          </label>

          <label className="flex items-center space-x-1.5 text-slate-300">
            <span className="font-medium text-slate-400">Lang:</span>
            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-slate-200 py-1 pl-2 pr-6 rounded-lg font-semibold"
            >
              <option value="hi">हिन्दी (Hindi)</option>
              <option value="mr">मराठी (Marathi)</option>
              <option value="en">English</option>
            </select>
          </label>
        </div>
      </div>

      {/* Recording Controls */}
      <div className="flex flex-col items-center justify-center py-8 px-4 bg-slate-950/70 rounded-2xl border border-slate-800 shadow-inner relative overflow-hidden">
        <div className="text-4xl font-mono font-extrabold text-white mb-5 tracking-widest bg-slate-900/90 px-6 py-2 rounded-xl border border-slate-800 shadow-inner">
          {formatSeconds(duration)}
        </div>

        <div className="flex items-center space-x-3">
          {!isRecording ? (
            <button
              type="button"
              onClick={startRecording}
              className="btn-touch px-6 py-3 bg-red-600 hover:bg-red-500 active:scale-[0.98] text-white font-extrabold rounded-xl shadow-lg shadow-red-600/30 transition-all flex items-center space-x-2 text-sm"
            >
              <span className="w-2.5 h-2.5 bg-white rounded-full animate-pulse" />
              <span>{t('record', language)}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={stopRecording}
              className="btn-touch px-6 py-3 bg-amber-500 hover:bg-amber-400 active:scale-[0.98] text-slate-950 font-extrabold rounded-xl shadow-lg shadow-amber-500/30 transition-all flex items-center space-x-2 text-sm"
            >
              <span className="w-2.5 h-2.5 bg-slate-950 rounded-sm" />
              <span>{t('stopRecord', language)}</span>
            </button>
          )}

          {audioUrl && !isRecording && (
            <button
              type="button"
              onClick={resetRecording}
              className="btn-touch px-4 py-2.5 bg-slate-800 hover:bg-slate-700 active:scale-[0.98] text-slate-300 hover:text-white font-medium rounded-xl border border-slate-700 transition text-xs"
            >
              Reset
            </button>
          )}
        </div>

        {isRecording && (
          <p className="text-red-400 text-xs font-semibold mt-4 flex items-center space-x-2">
            <span className="animate-ping w-2 h-2 rounded-full bg-red-400" />
            <span>Recording audio... speak into the microphone</span>
          </p>
        )}

        {recorderError && (
          <p className="text-red-400 text-xs mt-3 bg-red-950/60 px-3.5 py-2 rounded-xl border border-red-500/40">
            {recorderError}
          </p>
        )}

        {/* Audio Player */}
        {audioUrl && !isRecording && (
          <div className="mt-5 w-full max-w-md px-2">
            <audio controls src={audioUrl} className="w-full h-10 rounded-xl" />
          </div>
        )}
      </div>

      {/* Submit Button */}
      {audioBlob && !isRecording && (
        <div className="flex justify-end">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleSubmit}
            className="btn-touch px-6 py-2.5 bg-gradient-to-r from-cyan-400 to-cyan-500 hover:from-cyan-300 hover:to-cyan-400 active:scale-[0.98] disabled:opacity-50 text-slate-950 font-extrabold rounded-xl shadow-lg shadow-cyan-500/20 transition-all text-sm flex items-center space-x-2"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                <span>Transcribing & Extracting...</span>
              </>
            ) : (
              <>
                <span>Extract Know-How Cards</span>
                <span>→</span>
              </>
            )}
          </button>
        </div>
      )}

      {submitError && (
        <div className="p-3 bg-red-950/80 border border-red-500/50 rounded-xl text-red-200 text-xs">
          {submitError}
        </div>
      )}

      {/* Extracted Output Result */}
      {result && (
        <div className="space-y-4 pt-4 border-t border-slate-700/60">
          {/* Guardian Warnings */}
          {result.guardian_result && (
            <WarningBanner result={result.guardian_result} />
          )}

          {/* Transcript */}
          {result.transcript && (
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Transcript ({result.mode === 'offline' ? 'Offline Rule Fallback' : 'Whisper Live'}):
              </span>
              <p className="text-sm text-slate-200 italic">
                &ldquo;{result.transcript}&rdquo;
              </p>
            </div>
          )}

          {/* Extracted Cards */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 mb-3 flex items-center space-x-2">
              <span>🗂️</span>
              <span>Extracted Know-How Cards ({result.cards?.length || 0})</span>
            </h3>

            {(!result.cards || result.cards.length === 0) ? (
              <p className="text-slate-400 text-xs italic">
                No actionable know-how identified in this recording.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {result.cards.map((card, idx) => (
                  <div
                    key={card.id || idx}
                    className="bg-slate-900 border border-slate-700/70 rounded-xl p-4 shadow-sm space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-cyan-400">
                        {card.symptom || 'Operational Note'}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
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

                    {card.params && Object.keys(card.params).length > 0 && (
                      <div className="pt-2 border-t border-slate-800 flex flex-wrap gap-2 text-[11px]">
                        {Object.entries(card.params).map(([k, v]) => (
                          <span
                            key={k}
                            className="bg-slate-800 px-2 py-0.5 rounded text-cyan-300 font-mono"
                          >
                            {k}: {v}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
