import React, { useState } from 'react';
import MachineOptions from '../common/MachineOptions';
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
    <div className="bg-white border border-[#DADCE0] rounded-2xl p-6 shadow-card hover:border-slate-300 transition-all space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2.5">
            <span className="w-8 h-8 rounded-xl bg-maroon-50 text-maroon-700 flex items-center justify-center border border-maroon-100 text-sm">🎙️</span>
            <span>Voice Note Capture</span>
          </h2>
          <p className="text-slate-500 text-xs mt-1.5 font-medium">
            Speak naturally in Hindi, Marathi, or English. AI transcribes and extracts shop-floor know-how cards.
          </p>
        </div>

        <div className="flex items-center space-x-2.5 text-xs">
          <label className="flex items-center space-x-1.5 text-slate-600">
            <span className="font-medium text-slate-500">Machine:</span>
            <select
              value={machineId}
              onChange={(e) => setMachineId(Number(e.target.value))}
              className="bg-white border border-slate-300 text-slate-800 py-1.5 pl-2.5 pr-7 rounded-lg font-semibold focus:outline-none focus:ring-2 focus:ring-maroon-500/20 focus:border-maroon-600 shadow-xs"
            >
              <MachineOptions />
            </select>
          </label>

          <label className="flex items-center space-x-1.5 text-slate-600">
            <span className="font-medium text-slate-500">Lang:</span>
            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className="bg-white border border-slate-300 text-slate-800 py-1.5 pl-2.5 pr-7 rounded-lg font-semibold focus:outline-none focus:ring-2 focus:ring-maroon-500/20 focus:border-maroon-600 shadow-xs"
            >
              <option value="hi">हिन्दी (Hindi)</option>
              <option value="mr">मराठी (Marathi)</option>
              <option value="en">English</option>
            </select>
          </label>
        </div>
      </div>

      {/* Recording Controls */}
      <div className="flex flex-col items-center justify-center py-8 px-4 bg-[#F8F9FA] rounded-2xl border border-[#DADCE0] shadow-xs relative overflow-hidden">
        <div className="text-4xl font-mono font-extrabold text-slate-900 mb-5 tracking-widest bg-white px-6 py-2 rounded-xl border border-slate-200 shadow-xs">
          {formatSeconds(duration)}
        </div>

        <div className="flex items-center space-x-3">
          {!isRecording ? (
            <button
              type="button"
              onClick={startRecording}
              className="btn-touch px-6 py-3 bg-maroon-700 hover:bg-maroon-800 active:scale-[0.98] text-white font-extrabold rounded-xl shadow-sm transition-all flex items-center space-x-2 text-sm"
            >
              <span className="w-2.5 h-2.5 bg-white rounded-full animate-pulse" />
              <span>{t('record', language)}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={stopRecording}
              className="btn-touch px-6 py-3 bg-amber-600 hover:bg-amber-700 active:scale-[0.98] text-white font-extrabold rounded-xl shadow-sm transition-all flex items-center space-x-2 text-sm"
            >
              <span className="w-2.5 h-2.5 bg-white rounded-sm" />
              <span>{t('stopRecord', language)}</span>
            </button>
          )}

          {audioUrl && !isRecording && (
            <button
              type="button"
              onClick={resetRecording}
              className="btn-touch px-4 py-2.5 bg-white hover:bg-slate-50 active:scale-[0.98] text-slate-700 font-medium rounded-xl border border-slate-300 transition text-xs shadow-xs"
            >
              Reset
            </button>
          )}
        </div>

        {isRecording && (
          <p className="text-maroon-700 text-xs font-semibold mt-4 flex items-center space-x-2">
            <span className="animate-ping w-2 h-2 rounded-full bg-maroon-600" />
            <span>Recording audio... speak into the microphone</span>
          </p>
        )}

        {recorderError && (
          <p className="text-rose-700 text-xs mt-3 bg-rose-50 px-3.5 py-2 rounded-xl border border-rose-200">
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
            className="btn-touch px-6 py-2.5 bg-maroon-700 hover:bg-maroon-800 active:scale-[0.98] disabled:opacity-50 text-white font-bold rounded-xl shadow-sm transition-all text-sm flex items-center space-x-2"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
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
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-medium">
          {submitError}
        </div>
      )}

      {/* Extracted Output Result */}
      {result && (
        <div className="space-y-4 pt-4 border-t border-slate-200">
          {/* Guardian Warnings */}
          {result.guardian_result && (
            <WarningBanner result={result.guardian_result} />
          )}

          {/* Transcript */}
          {result.transcript && (
            <div className="bg-[#F8F9FA] border border-slate-200 rounded-xl p-4">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                Transcript ({result.mode === 'offline' ? 'Offline Rule Fallback' : 'Whisper Live'}):
              </span>
              <p className="text-sm text-slate-800 italic">
                &ldquo;{result.transcript}&rdquo;
              </p>
            </div>
          )}

          {/* Extracted Cards */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 mb-3 flex items-center space-x-2">
              <span>🗂️</span>
              <span>Extracted Know-How Cards ({result.cards?.length || 0})</span>
            </h3>

            {(!result.cards || result.cards.length === 0) ? (
              <p className="text-slate-500 text-xs italic">
                {result.message || 'No actionable know-how identified in this recording.'}
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {result.cards.map((card, idx) => (
                  <div
                    key={card.id || idx}
                    className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-2 hover:border-slate-300 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-maroon-800">
                        {card.symptom || 'Operational Note'}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                        Confidence {Math.round((card.confidence || 0.9) * 100)}%
                      </span>
                    </div>

                    <div className="text-xs text-slate-800 font-medium">
                      <strong className="text-slate-500 font-normal">Action: </strong>
                      {card.action}
                    </div>

                    {card.why && (
                      <div className="text-xs text-slate-600">
                        <strong className="text-slate-500 font-normal">Why: </strong>
                        {card.why}
                      </div>
                    )}

                    {card.params && Object.keys(card.params).length > 0 && (
                      <div className="pt-2 border-t border-slate-100 flex flex-wrap gap-2 text-[11px]">
                        {Object.entries(card.params).map(([k, v]) => (
                          <span
                            key={k}
                            className="bg-slate-100 px-2 py-0.5 rounded text-slate-800 font-mono border border-slate-200"
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
