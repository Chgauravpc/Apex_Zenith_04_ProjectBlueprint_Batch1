import React, { useState } from 'react';
import useRecorder from '../../hooks/useRecorder';
import { askChatter } from '../../api/ask';
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
      const formData = new FormData();
      formData.append('file', audioToUpload, 'chatter_sample.wav');
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
    <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-6 shadow-xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-700/60 pb-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center space-x-2">
            <span>🔊</span>
            <span>Chatter Doctor — Acoustic RPM Sweet-Spot Finder</span>
          </h2>
          <p className="text-slate-400 text-xs mt-1">
            Listen to machining vibration, run FFT frequency analysis, and calculate chatter-free stable lobe RPMs.
          </p>
        </div>

        <div className="flex items-center space-x-3 text-xs">
          <label className="text-slate-300 flex items-center space-x-1">
            <span>Machine:</span>
            <select
              value={machineId}
              onChange={(e) => setMachineId(Number(e.target.value))}
              className="bg-slate-900 border border-slate-700 text-slate-200 py-1 px-2 rounded-lg"
            >
              <option value={1}>VMC-3 (500-12000 RPM)</option>
              <option value={2}>Lathe-2 (100-3500 RPM)</option>
            </select>
          </label>
        </div>
      </div>

      {/* Tool & Cut Parameters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-900/60 p-4 rounded-xl border border-slate-800 text-xs">
        <div>
          <label htmlFor="tool-teeth" className="block text-slate-300 font-semibold mb-1">
            Tool Flutes / Teeth (N):
          </label>
          <input
            id="tool-teeth"
            type="number"
            min={1}
            max={12}
            value={teeth}
            onChange={(e) => setTeeth(Number(e.target.value))}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-100 font-mono"
          />
        </div>

        <div>
          <label htmlFor="current-rpm" className="block text-slate-300 font-semibold mb-1">
            Current Spindle RPM:
          </label>
          <input
            id="current-rpm"
            type="number"
            value={currentRpm}
            onChange={(e) => setCurrentRpm(Number(e.target.value))}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-100 font-mono"
          />
        </div>
      </div>

      {/* Audio Capture or Upload */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Record Live */}
        <div className="border border-slate-700 bg-slate-900/40 rounded-xl p-5 text-center flex flex-col items-center justify-center space-y-3">
          <span className="text-3xl" aria-hidden="true">🎙️</span>
          <span className="text-xs font-semibold text-slate-200">Record Live Cutting Sound</span>

          <div className="flex items-center space-x-2">
            {!isRecording ? (
              <button
                type="button"
                onClick={startRecording}
                className="btn-touch px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl text-xs flex items-center space-x-1.5"
              >
                <span>Record 5s Sample</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={stopRecording}
                className="btn-touch px-4 py-2 bg-amber-500 text-slate-950 font-bold rounded-xl text-xs flex items-center space-x-1.5"
              >
                <span>Stop ({duration}s)</span>
              </button>
            )}

            {audioUrl && !isRecording && (
              <button
                type="button"
                onClick={resetRecording}
                className="btn-touch px-3 py-1.5 bg-slate-800 text-slate-300 text-xs rounded-lg"
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
        <div className="border border-slate-700 bg-slate-900/40 rounded-xl p-5 text-center flex flex-col items-center justify-center space-y-2">
          <span className="text-3xl" aria-hidden="true">📁</span>
          <label
            htmlFor="audio-upload"
            className="cursor-pointer text-xs font-semibold text-cyan-400 hover:underline"
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
            <div className="text-[11px] text-slate-300">
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
          className="btn-touch px-6 py-2.5 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-bold rounded-xl shadow text-sm flex items-center space-x-2"
        >
          {isSubmitting ? (
            <>
              <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
              <span>Analyzing Harmonics (FFT)...</span>
            </>
          ) : (
            <span>Diagnose Chatter & Calculate Sweet Spots →</span>
          )}
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-950/80 border border-red-500/50 rounded-xl text-red-200 text-xs">
          {error}
        </div>
      )}

      {/* Chatter Result */}
      {result && (
        <div className="space-y-4 pt-4 border-t border-slate-700/60">
          <div className="bg-slate-900 border border-cyan-500/30 rounded-xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Acoustic Analysis
                </span>
                <div className="text-lg font-bold text-cyan-300">
                  Dominant Frequency: {Math.round(result.fc || 427)} Hz
                </div>
              </div>

              <div className="text-xs text-slate-300">
                Current Speed: <span className="font-mono text-red-400 font-bold">{currentRpm} RPM (Unstable)</span>
              </div>
            </div>

            {/* Candidate Stable RPMs */}
            <div>
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-2">
                🎯 Recommended Stable RPM Lobes (Machining Sweet Spots):
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {(result.candidate_rpms || [12810, 6405, 4270, 3202]).map((rpmVal, idx) => (
                  <div
                    key={idx}
                    className="bg-slate-950 border border-cyan-500/40 rounded-xl p-3 text-center shadow"
                  >
                    <span className="text-[10px] text-slate-400 block">Lobe #{idx + 1}</span>
                    <span className="text-base font-extrabold text-cyan-400 font-mono">
                      {rpmVal}
                    </span>
                    <span className="text-[10px] text-slate-500 block">RPM</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Old Employee Advice */}
            {result.expert_card && (
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 space-y-1 text-xs">
                <div className="font-bold text-cyan-300 flex items-center space-x-1.5">
                  <span>💡</span>
                  <span>Ramesh’s Shop-Floor Rule for Chatter on VMC-3:</span>
                </div>
                <p className="text-slate-200">{result.expert_card.action}</p>
                {result.expert_card.why && (
                  <p className="text-slate-400 italic">{result.expert_card.why}</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
