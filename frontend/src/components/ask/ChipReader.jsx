import React, { useState } from 'react';
import useCamera from '../../hooks/useCamera';
import { askChips } from '../../api/ask';

export default function ChipReader() {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [toolMaterial, setToolMaterial] = useState('carbide');
  const [workpiece, setWorkpiece] = useState('SS304');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const {
    videoRef,
    startCamera,
    stopCamera,
    capturePhoto,
    resetPhoto,
  } = useCamera();

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(URL.createObjectURL(selected));
      setResult(null);
    }
  };

  const handleStartCamera = async () => {
    setIsCameraActive(true);
    await startCamera();
  };

  const handleSnapPhoto = async () => {
    const blob = await capturePhoto();
    if (blob) {
      setFile(new File([blob], 'chip_photo.jpg', { type: 'image/jpeg' }));
      setPreviewUrl(URL.createObjectURL(blob));
      setIsCameraActive(false);
      stopCamera();
    }
  };

  const handleDiagnose = async () => {
    if (!file) {
      setError('Please provide a photo of the metal chips first.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('tool_material', toolMaterial);
      formData.append('workpiece', workpiece);

      const data = await askChips(formData);
      setResult(data);
    } catch (err) {
      setError(err.message || 'Chip colour segmentation and diagnosis failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-6 shadow-xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-700/60 pb-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center space-x-2">
            <span>🔍</span>
            <span>Chip Colour Reader — Cutting Temperature Doctor</span>
          </h2>
          <p className="text-slate-400 text-xs mt-1">
            Segment chip colour via HSV computer vision to evaluate tool interface temperature and prevent thermal wear.
          </p>
        </div>

        <div className="flex items-center space-x-3 text-xs">
          <label className="text-slate-300 flex items-center space-x-1">
            <span>Material:</span>
            <select
              value={workpiece}
              onChange={(e) => setWorkpiece(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-slate-200 py-1 px-2 rounded-lg"
            >
              <option value="SS304">SS304 Stainless</option>
              <option value="Mild Steel">Mild Steel</option>
              <option value="Aluminum">Aluminum</option>
            </select>
          </label>

          <label className="text-slate-300 flex items-center space-x-1">
            <span>Tool:</span>
            <select
              value={toolMaterial}
              onChange={(e) => setToolMaterial(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-slate-200 py-1 px-2 rounded-lg"
            >
              <option value="carbide">Coated Carbide</option>
              <option value="hss">High Speed Steel (HSS)</option>
            </select>
          </label>
        </div>
      </div>

      {/* Live Camera View */}
      {isCameraActive && (
        <div className="flex flex-col items-center bg-slate-950 p-4 rounded-xl border border-slate-800">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full max-w-md rounded-lg border border-slate-700 aspect-video object-cover"
          />
          <div className="mt-3 flex space-x-3">
            <button
              type="button"
              onClick={handleSnapPhoto}
              className="btn-touch px-6 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl text-sm"
            >
              Capture Chips
            </button>
            <button
              type="button"
              onClick={() => {
                setIsCameraActive(false);
                stopCamera();
              }}
              className="btn-touch px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-xl text-xs"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Upload or Camera Button */}
      {!isCameraActive && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border border-slate-700 bg-slate-900/40 rounded-xl p-5 text-center flex flex-col items-center justify-center space-y-2">
            <span className="text-3xl" aria-hidden="true">📸</span>
            <button
              type="button"
              onClick={handleStartCamera}
              className="text-xs font-semibold text-cyan-400 hover:underline"
            >
              Take Photo with Camera
            </button>
            <span className="text-[11px] text-slate-500">Hold phone near machine chip pan</span>
          </div>

          <div className="border border-slate-700 bg-slate-900/40 rounded-xl p-5 text-center flex flex-col items-center justify-center space-y-2">
            <span className="text-3xl" aria-hidden="true">📁</span>
            <label
              htmlFor="chip-upload"
              className="cursor-pointer text-xs font-semibold text-cyan-400 hover:underline"
            >
              Upload Chip Photo
            </label>
            <input
              id="chip-upload"
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
            <span className="text-[11px] text-slate-500">JPEG or PNG format</span>
          </div>
        </div>
      )}

      {/* Selected Preview */}
      {previewUrl && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
          <div className="flex items-center space-x-3">
            <img
              src={previewUrl}
              alt="Chip sample preview"
              className="w-16 h-16 object-cover rounded-lg border border-slate-700"
            />
            <div className="text-xs text-slate-300">
              <span className="font-semibold block">{file?.name || 'Captured Chip Photo'}</span>
              <span className="text-slate-500">Ready for HSV segmentation</span>
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
              className="btn-touch px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg"
            >
              Clear
            </button>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleDiagnose}
              className="btn-touch px-5 py-1.5 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-bold text-xs rounded-lg shadow"
            >
              {isSubmitting ? 'Analyzing...' : 'Diagnose Temperature'}
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-950/80 border border-red-500/50 rounded-xl text-red-200 text-xs">
          {error}
        </div>
      )}

      {/* Chip Result Display */}
      {result && (
        <div className="space-y-4 pt-4 border-t border-slate-700/60">
          <div className="bg-slate-900 border border-cyan-500/30 rounded-xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-3">
                <div
                  className={`w-6 h-6 rounded-full border border-white/40 shadow ${
                    result.colour === 'blue'
                      ? 'bg-blue-600'
                      : result.colour === 'straw' || result.colour === 'golden'
                        ? 'bg-amber-400'
                        : 'bg-slate-300'
                  }`}
                />
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    Classified Chip Colour
                  </span>
                  <div className="text-lg font-bold text-white capitalize">
                    {result.colour || 'Dark Blue'} ({result.temperature_range || '550°C – 650°C'})
                  </div>
                </div>
              </div>

              <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                {result.diagnosis || 'High Thermal Zone'}
              </span>
            </div>

            <div className="space-y-1 text-xs">
              <span className="font-bold text-slate-300 block">Recommended Action:</span>
              <p className="text-slate-200 leading-relaxed font-medium">
                {result.recommendation || 'Reduce cutting speed by 15% and verify coolant angle directly hits tool insert tip.'}
              </p>
            </div>

            {result.expert_card && (
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 space-y-1 text-xs">
                <div className="font-bold text-cyan-300 flex items-center space-x-1.5">
                  <span>💡</span>
                  <span>Ramesh’s Rule of Thumb for Stainless Steel Chips:</span>
                </div>
                <p className="text-slate-200">{result.expert_card.action}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
