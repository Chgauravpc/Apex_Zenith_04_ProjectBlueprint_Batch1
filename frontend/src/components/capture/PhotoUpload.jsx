import React, { useState } from 'react';
import { captureHandwritten, pollJob } from '../../api/capture';
import { useAuthStore } from '../../store/useAuthStore';
import useCamera from '../../hooks/useCamera';
import { formatBytes } from '../../utils/format';

export default function PhotoUpload({ onComplete }) {
  const { currentUser } = useAuthStore();
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [machineId, setMachineId] = useState(1);
  const [jobStatus, setJobStatus] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [isCameraActive, setIsCameraActive] = useState(false);

  const {
    videoRef,
    startCamera,
    stopCamera,
    capturePhoto,
    resetPhoto,
  } = useCamera();

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    if (selected.size > 10 * 1024 * 1024) {
      setError('Photo exceeds maximum size of 10 MB.');
      return;
    }

    setFile(selected);
    setError(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(selected));
    setResult(null);
  };

  const handleStartCamera = async () => {
    setIsCameraActive(true);
    await startCamera();
  };

  const handleSnapPhoto = async () => {
    const blob = await capturePhoto();
    if (blob) {
      setFile(new File([blob], 'handwritten_note.jpg', { type: 'image/jpeg' }));
      setPreviewUrl(URL.createObjectURL(blob));
      setIsCameraActive(false);
      stopCamera();
    }
  };

  const handleSubmit = async () => {
    if (!file) return;

    setError(null);
    setJobStatus({ status: 'uploading', progress: 0 });

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('uploader_id', currentUser.id.toString());
      formData.append('machine_id', machineId.toString());

      const { job_id } = await captureHandwritten(formData);
      setJobStatus({ status: 'queued', progress: 0.1 });

      const jobResult = await pollJob(job_id, (job) => {
        setJobStatus(job);
      });

      setResult(jobResult);
      if (onComplete) onComplete(jobResult);
    } catch (err) {
      setError(err.message || 'Processing handwritten notes failed.');
    } finally {
      setJobStatus(null);
    }
  };

  return (
    <div className="bg-white border border-[#DADCE0] rounded-2xl p-6 shadow-card hover:border-slate-300 transition-all space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
            <span className="w-8 h-8 rounded-xl bg-maroon-50 text-maroon-700 flex items-center justify-center border border-maroon-100 text-sm">📷</span>
            <span>Handwritten Notes & Logbook Capture</span>
          </h2>
          <p className="text-slate-500 text-xs mt-1">
            Photograph shift handover notes, whiteboards, or maintenance logbooks. Vision AI reads issues, decisions, and actions.
          </p>
        </div>

        <div className="flex items-center space-x-2 text-xs">
          <label className="text-slate-600 font-medium">Machine:</label>
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

      {/* Camera Live View */}
      {isCameraActive && (
        <div className="flex flex-col items-center bg-[#F8F9FA] p-4 rounded-xl border border-slate-200">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full max-w-md rounded-lg border border-slate-300 aspect-video object-cover bg-black"
          />
          <div className="mt-3 flex space-x-3">
            <button
              type="button"
              onClick={handleSnapPhoto}
              className="btn-touch px-6 py-2 bg-maroon-700 hover:bg-maroon-800 text-white font-bold rounded-xl text-sm shadow-sm"
            >
              Snap Photo
            </button>
            <button
              type="button"
              onClick={() => {
                setIsCameraActive(false);
                stopCamera();
              }}
              className="btn-touch px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 font-medium rounded-xl text-xs border border-slate-300 shadow-xs"
            >
              Cancel Camera
            </button>
          </div>
        </div>
      )}

      {/* File Upload / Camera Trigger */}
      {!isCameraActive && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:border-maroon-500 bg-[#F8F9FA] hover:bg-rose-50/20 transition flex flex-col items-center justify-center shadow-xs">
            <input
              type="file"
              id="photo-input"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileChange}
              className="hidden"
            />
            <label
              htmlFor="photo-input"
              className="cursor-pointer flex flex-col items-center space-y-2 text-xs text-slate-600"
            >
              <span className="text-3xl" aria-hidden="true">📁</span>
              <span className="font-semibold text-maroon-800 text-sm">Choose Image File</span>
              <span className="text-slate-500">JPEG, PNG up to 10 MB</span>
            </label>
          </div>

          <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:border-maroon-500 bg-[#F8F9FA] hover:bg-rose-50/20 transition flex flex-col items-center justify-center shadow-xs">
            <button
              type="button"
              onClick={handleStartCamera}
              className="flex flex-col items-center space-y-2 text-xs text-slate-600 focus:outline-none"
            >
              <span className="text-3xl" aria-hidden="true">📸</span>
              <span className="font-semibold text-maroon-800 text-sm">Take Photo with Camera</span>
              <span className="text-slate-500">Live phone/tablet camera snapshot</span>
            </button>
          </div>
        </div>
      )}

      {/* Selected Preview */}
      {previewUrl && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-[#F8F9FA] p-4 rounded-xl border border-slate-200">
          <div className="flex items-center space-x-3">
            <img
              src={previewUrl}
              alt="Handwritten note preview"
              className="w-16 h-16 object-cover rounded-lg border border-slate-300 shadow-xs"
            />
            <div>
              <div className="text-xs font-semibold text-slate-900">
                {file?.name || 'Captured Note'}
              </div>
              <div className="text-[11px] text-slate-500">
                {file?.size ? formatBytes(file.size) : ''}
              </div>
            </div>
          </div>

          <div className="flex space-x-2">
            <button
              type="button"
              onClick={() => {
                setFile(null);
                setPreviewUrl(null);
                resetPhoto();
              }}
              className="btn-touch px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs rounded-lg border border-slate-300 shadow-xs"
            >
              Remove
            </button>
            <button
              type="button"
              disabled={Boolean(jobStatus)}
              onClick={handleSubmit}
              className="btn-touch px-5 py-1.5 bg-maroon-700 hover:bg-maroon-800 disabled:opacity-50 text-white font-bold text-xs rounded-lg shadow-sm"
            >
              Process Photo
            </button>
          </div>
        </div>
      )}

      {/* Progress & Status */}
      {jobStatus && (
        <div className="bg-[#F8F9FA] border border-maroon-200 rounded-xl p-4 flex items-center space-x-3">
          <div className="w-5 h-5 border-2 border-maroon-700 border-t-transparent rounded-full animate-spin" />
          <div className="text-xs text-slate-800">
            <strong>Processing Handwritten Document:</strong>{' '}
            <span className="text-maroon-800 capitalize font-semibold">{jobStatus.status}</span>
            {jobStatus.progress ? ` (${Math.round(jobStatus.progress * 100)}%)` : ''}
          </div>
        </div>
      )}

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-medium">
          {error}
        </div>
      )}

      {/* Extracted Structured Result */}
      {result && (
        <div className="space-y-4 pt-4 border-t border-slate-200">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center space-x-2">
            <span>📝</span>
            <span>Extracted Handwritten Insights</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Issues */}
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 space-y-2">
              <span className="text-xs font-bold text-rose-800 block border-b border-rose-200 pb-1">
                ⚠️ Issues Noted ({result.issues?.length || 0})
              </span>
              <ul className="text-xs text-rose-950 space-y-1">
                {result.issues?.map((issue, idx) => (
                  <li key={idx}>• {issue}</li>
                ))}
              </ul>
            </div>

            {/* Decisions */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2">
              <span className="text-xs font-bold text-amber-800 block border-b border-amber-200 pb-1">
                ⚖️ Decisions Made ({result.decisions?.length || 0})
              </span>
              <ul className="text-xs text-amber-950 space-y-1">
                {result.decisions?.map((dec, idx) => (
                  <li key={idx}>• {dec}</li>
                ))}
              </ul>
            </div>

            {/* Action Items */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-2">
              <span className="text-xs font-bold text-emerald-800 block border-b border-emerald-200 pb-1">
                ✅ Action Items ({result.action_items?.length || 0})
              </span>
              <ul className="text-xs text-emerald-950 space-y-1">
                {result.action_items?.map((act, idx) => (
                  <li key={idx}>• {act}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
