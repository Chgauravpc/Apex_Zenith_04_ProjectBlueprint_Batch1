import React, { useState } from 'react';
import MachineOptions from '../common/MachineOptions';
import useRecorder from '../../hooks/useRecorder';
import { askChatter } from '../../api/ask';
import { toWav } from '../../utils/audio';
import { formatBytes } from '../../utils/format';

export default function ChatterDoctor() {
  const [machineId, setMachineId] = useState(1);
  const [teeth, setTeeth] = useState(2); // Endmill flutes
  const [currentRpm, setCurrentRpm] = useState(3200);
  const [file, setFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const {
    isRecording,
    duration,
    audioBlob,
    audioUrl,
    startRecording,
    stopRecording,
    resetRecording,
  } = useRecorder();

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      resetRecording();
    }
  };

  const handleDiagnose = async () => {
    const audioToUpload = audioBlob || file;
    if (!audioToUpload) {
      setError('Please record or upload a cutting sound sample first.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // A recorded clip is WebM/MP4: convert it to a real WAV; an uploaded file goes as-is.
      const upload = audioBlob ? await toWav(audioBlob) : file;
      const formData = new FormData();
      formData.append('file', upload, audioBlob ? 'chatter_sample.wav' : file.name);
      formData.append('machine_id', machineId.toString());
      formData.append('teeth', teeth.toString());
      formData.append('current_rpm', currentRpm.toString());

      const data = await askChatter(formData);
      setResult(data);
    } catch (err) {
      setError(err.message || 'Chatter frequency FFT analysis failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm space-y-6 text-slate-800">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/90 pb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
            <span>🔊</span>
            <span>Chatter Doctor — Acoustic RPM Sweet-Spot Finder</span>
          </h2>
          <p className="text-slate-500 text-xs mt-1">
            Listen to machining vibration, run FFT frequency analysis, and calculate chatter-free stable lobe RPMs.
          </p>
        </div>

        <div className="flex items-center space-x-3 text-xs">
          <label className="text-slate-600 flex items-center space-x-1">
            <span>Machine:</span>
            <select
              value={machineId}
              onChange={(e) => setMachineId(Number(e.target.value))}
              className="bg-white border border-slate-200/90 text-slate-800 py-1 px-2.5 rounded-lg text-xs focus:outline-hidden focus:ring-2 focus:ring-maroon-500/20"
            >
              <MachineOptions withRpm />
            </select>
          </label>
        </div>
      </div>

      {/* Tool & Cut Parameters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200/80 text-xs">
        <div>
          <label htmlFor="tool-teeth" className="block text-slate-700 font-semibold mb-1">
            Tool Flutes / Teeth (N):
          </label>
          <input
            id="tool-teeth"
            type="number"
            min={1}
            max={12}
            value={teeth}
            onChange={(e) => setTeeth(Number(e.target.value))}
            className="w-full bg-white border border-slate-200/90 rounded-lg p-2 text-slate-900 font-mono focus:outline-hidden focus:ring-2 focus:ring-maroon-500/20"
          />
        </div>

        <div>
          <label htmlFor="current-rpm" className="block text-slate-700 font-semibold mb-1">
            Current Spindle RPM:
          </label>
          <input
            id="current-rpm"
            type="number"
            value={currentRpm}
            onChange={(e) => setCurrentRpm(Number(e.target.value))}
            className="w-full bg-white border border-slate-200/90 rounded-lg p-2 text-slate-900 font-mono focus:outline-hidden focus:ring-2 focus:ring-maroon-500/20"
          />
        </div>
      </div>

      {/* Audio Capture or Upload */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Record Live */}
        <div className="border border-slate-200/90 bg-slate-50/70 rounded-xl p-5 text-center flex flex-col items-center justify-center space-y-3">
          <span className="text-3xl" aria-hidden="true">🎙️</span>
          <span className="text-xs font-semibold text-slate-700">Record Live Cutting Sound</span>

          <div className="flex items-center space-x-2">
            {!isRecording ? (
              <button
                type="button"
                onClick={startRecording}
                className="btn-touch px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-medium rounded-xl text-xs flex items-center space-x-1.5 shadow-xs"
              >
                <span>Record 5s Sample</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={stopRecording}
                className="btn-touch px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs flex items-center space-x-1.5 shadow-xs"
              >
                <span>Stop ({duration}s)</span>
              </button>
            )}

            {audioUrl && !isRecording && (
              <button
                type="button"
                onClick={resetRecording}
                className="btn-touch px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/90 text-xs rounded-lg shadow-xs"
              >
                Clear
              </button>
            )}
          </div>

          {audioUrl && (
            <audio controls src={audioUrl} className="w-full h-8 mt-2" />
          )}
        </div>

        {/* Upload File */}
        <div className="border border-slate-200/90 bg-slate-50/70 rounded-xl p-5 text-center flex flex-col items-center justify-center space-y-2">
          <span className="text-3xl" aria-hidden="true">📁</span>
          <label
            htmlFor="audio-upload"
            className="cursor-pointer text-xs font-semibold text-maroon-800 hover:text-maroon-900 hover:underline"
          >
            Or Upload Audio File (.wav, .mp3, .m4a)
          </label>
          <input
            id="audio-upload"
            type="file"
            accept="audio/*"
            onChange={handleFileChange}
            className="hidden"
          />
          {file && (
            <div className="text-[11px] text-slate-600">
              {file.name} ({formatBytes(file.size)})
            </div>
          )}
        </div>
      </div>

      {/* Action Button */}
      <div className="flex justify-end">
        <button
          type="button"
          disabled={isSubmitting || (!audioBlob && !file)}
          onClick={handleDiagnose}
          className="btn-touch px-6 py-2.5 bg-maroon-700 hover:bg-maroon-800 disabled:opacity-50 text-white font-medium rounded-xl shadow-xs text-sm flex items-center space-x-2 transition"
        >
          {isSubmitting ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Analyzing Harmonics (FFT)...</span>
            </>
          ) : (
            <span>Diagnose Chatter & Calculate Sweet Spots →</span>
          )}
        </button>
      </div>

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs">
          {error}
        </div>
      )}

      {/* Chatter Result */}
      {result && (
        <div className="space-y-4 pt-4 border-t border-slate-200/90">
          <div className="bg-white border border-slate-200/90 rounded-xl p-5 space-y-4 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/90 pb-3">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                  Acoustic Analysis
                </span>
                <div className="text-lg font-bold text-slate-900">
                  Dominant Frequency: {Math.round(result.fc)} Hz
                </div>
              </div>

              <div className="text-xs text-slate-600">
                Current Speed:{' '}
                <span className={`font-mono font-bold ${result.clear_chatter ? 'text-rose-600' : 'text-slate-700'}`}>
                  {currentRpm} RPM {result.clear_chatter ? '(chatter heard)' : '(no clear chatter)'}
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">{result.explanation}</p>

            {/* Candidate Stable RPMs */}
            <div>
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">
                🎯 Recommended Stable RPM Lobes (Machining Sweet Spots):
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {result.candidate_rpms.length === 0 && (
                  <p className="col-span-full text-xs text-slate-400">
                    No stable speed fits this machine’s RPM range ({result.rpm_min}–{result.rpm_max}).
                  </p>
                )}
                {result.candidate_rpms.map((rpmVal, idx) => (
                  <div
                    key={rpmVal}
                    className={`bg-slate-50 border rounded-xl p-3 text-center shadow-xs ${
                      rpmVal === result.nearest_rpm ? 'border-emerald-500' : 'border-slate-200/90'
                    }`}
                  >
                    <span className="text-[10px] text-slate-500 block">Lobe #{idx + 1}</span>
                    <span className="text-base font-extrabold text-maroon-800 font-mono">
                      {rpmVal}
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      {rpmVal === result.nearest_rpm ? 'RPM · closest to now' : 'RPM'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Old Employee Advice */}
            {result.expert_card && (
              <div className="bg-amber-50/70 border border-amber-200/90 rounded-xl p-3.5 space-y-1 text-xs text-amber-950">
                <div className="font-bold text-amber-900 flex items-center space-x-1.5">
                  <span>💡</span>
                  <span>
                    {result.expert_card.author ? `${result.expert_card.author}’s` : 'Recorded'} fix:{' '}
                    {result.expert_card.title}
                  </span>
                </div>
                <p className="text-slate-800">{result.expert_card.action}</p>
                {result.expert_card.why && (
                  <p className="text-slate-600 italic">{result.expert_card.why}</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
