import React, { useState } from 'react';
import { captureVideo, pollJob } from '../../api/capture';
import { useAuthStore } from '../../store/useAuthStore';
import { formatBytes } from '../../utils/format';
import WarningBanner from '../guardian/WarningBanner';

export default function VideoUpload({ onComplete }) {
  const { currentUser } = useAuthStore();
  const [file, setFile] = useState(null);
  const [machineId, setMachineId] = useState(1);
  const [jobStatus, setJobStatus] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    if (selected.size > 100 * 1024 * 1024) {
      setError('Video exceeds maximum size of 100 MB.');
      return;
    }

    setFile(selected);
    setError(null);
    setResult(null);
  };

  const handleSubmit = async () => {
    if (!file) return;

    setError(null);
    setJobStatus({ status: 'uploading', progress: 0 });

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('author_id', currentUser.id.toString());
      formData.append('machine_id', machineId.toString());

      const { job_id } = await captureVideo(formData);
      setJobStatus({ status: 'queued', progress: 0.1 });

      const procedureResult = await pollJob(job_id, (job) => {
        setJobStatus(job);
      });

      setResult(procedureResult);
      if (onComplete) onComplete(procedureResult);
    } catch (err) {
      setError(err.message || 'Processing setup video failed.');
    } finally {
      setJobStatus(null);
    }
  };

  return (
    <div className="bg-white border border-[#DADCE0] rounded-2xl p-6 shadow-card hover:border-slate-300 transition-all space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
            <span className="w-8 h-8 rounded-xl bg-maroon-50 text-maroon-700 flex items-center justify-center border border-maroon-100 text-sm">🎥</span>
            <span>Video-to-Procedure Drafter</span>
          </h2>
          <p className="text-slate-500 text-xs mt-1">
            Upload setup videos (up to 100 MB). AI extracts scene keyframes and transcribes audio to draft step-by-step SOPs.
          </p>
        </div>

        <div className="flex items-center space-x-2 text-xs">
          <label className="text-slate-600 font-medium">Target Machine:</label>
          <select
            value={machineId}
            onChange={(e) => setMachineId(Number(e.target.value))}
            className="bg-white border border-slate-300 text-slate-800 py-1.5 px-3 rounded-lg font-semibold focus:outline-none focus:ring-2 focus:ring-maroon-500/20 focus:border-maroon-600 shadow-xs"
          >
            <option value={1}>VMC-3</option>
            <option value={2}>Lathe-2</option>
          </select>
        </div>
      </div>

      {/* Upload Box */}
      <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-maroon-500 bg-[#F8F9FA] hover:bg-rose-50/20 transition cursor-pointer shadow-xs">
        <input
          type="file"
          id="video-input"
          accept="video/mp4,video/webm,video/quicktime"
          onChange={handleFileChange}
          className="hidden"
        />
        <label
          htmlFor="video-input"
          className="cursor-pointer flex flex-col items-center space-y-2 text-xs text-slate-600"
        >
          <span className="text-4xl" aria-hidden="true">🎬</span>
          <span className="font-semibold text-maroon-800 text-sm">Select Setup Video File</span>
          <span className="text-slate-500">MP4, WebM or MOV up to 100 MB</span>
        </label>
      </div>

      {/* Selected File Details & Trigger */}
      {file && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-[#F8F9FA] p-4 rounded-xl border border-slate-200">
          <div className="text-xs">
            <span className="font-semibold text-slate-900 block">{file.name}</span>
            <span className="text-slate-500 text-[11px]">{formatBytes(file.size)}</span>
          </div>

          <div className="flex space-x-2">
            <button
              type="button"
              onClick={() => {
                setFile(null);
                setResult(null);
              }}
              className="btn-touch px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs rounded-lg border border-slate-300 shadow-xs"
            >
              Clear
            </button>

            <button
              type="button"
              disabled={Boolean(jobStatus)}
              onClick={handleSubmit}
              className="btn-touch px-5 py-1.5 bg-maroon-700 hover:bg-maroon-800 disabled:opacity-50 text-white font-bold text-xs rounded-lg shadow-sm"
            >
              Start AI Extraction
            </button>
          </div>
        </div>
      )}

      {/* Polling Status Indicator */}
      {jobStatus && (
        <div className="bg-[#F8F9FA] border border-maroon-200 rounded-xl p-4 space-y-2">
          <div className="flex items-center space-x-3">
            <div className="w-5 h-5 border-2 border-maroon-700 border-t-transparent rounded-full animate-spin" />
            <div className="text-xs text-slate-800">
              <strong>Drafting Procedure:</strong>{' '}
              <span className="text-maroon-800 capitalize font-semibold">{jobStatus.status}</span>
              {jobStatus.progress ? ` (${Math.round(jobStatus.progress * 100)}%)` : ''}
            </div>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-maroon-700 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${Math.max(10, Math.round((jobStatus.progress || 0.1) * 100))}%` }}
            />
          </div>
        </div>
      )}

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-medium">
          {error}
        </div>
      )}

      {/* Resulting Procedure Draft */}
      {result && (
        <div className="space-y-4 pt-4 border-t border-slate-200">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center space-x-2">
              <span>📋</span>
              <span>Draft Procedure Generated ({result.title || 'Setup Procedure'})</span>
            </h3>
            <span className="text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-0.5 rounded-full uppercase">
              Status: Draft (Pending Review)
            </span>
          </div>

          {result.guardian && <WarningBanner result={result.guardian} />}

          <div className="space-y-3">
            {result.steps?.map((step, idx) => (
              <div
                key={step.id || idx}
                className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col md:flex-row gap-4 shadow-xs hover:border-slate-300 transition-all"
              >
                {step.keyframe_url && (
                  <img
                    src={step.keyframe_url}
                    alt={`Keyframe step ${step.step_no || idx + 1}`}
                    className="w-32 h-20 object-cover rounded-lg border border-slate-300 flex-shrink-0 shadow-xs"
                  />
                )}
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-0.5 rounded bg-maroon-50 text-maroon-800 border border-maroon-200 font-bold text-xs">
                      Step {step.step_no || idx + 1}
                    </span>
                    <span className="text-xs text-slate-500 font-mono">
                      Timestamp: {step.clip_start ? `${step.clip_start}s` : '0s'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-800 font-medium leading-relaxed">
                    {step.instruction || step.description}
                  </p>
                  {step.caution && (
                    <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg font-medium inline-block">
                      ⚠️ Caution: {step.caution}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
