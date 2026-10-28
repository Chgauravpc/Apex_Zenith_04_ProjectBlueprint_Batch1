import React, { useState } from 'react';
import { useAuthStore } from '../../store/useAuthStore';

/**
 * Modal form for attaching expert knowledge (tip, incident, or procedure)
 * to a selected 3D CNC machine component.
 * Preserves stable component IDs (1..7) for backend compatibility.
 * Reference: PRD.md §9.4 and TASKS.md T21.
 */
export default function PinForm({ component, isOpen, onClose, onSubmit }) {
  const { role } = useAuthStore();
  const [title, setTitle] = useState('');
  const [knowledgeType, setKnowledgeType] = useState('tip'); // 'tip' | 'incident' | 'procedure'
  const [text, setText] = useState('');
  const [severity, setSeverity] = useState('watch');
  const [isRecording, setIsRecording] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen || !component) return null;

  const defaultAuthor =
    role === 'old_employee'
      ? 'Ramesh (Old Employee)'
      : role === 'supervisor'
      ? 'Shop Supervisor'
      : 'Priya (New Employee)';

  const handleVoiceToggle = () => {
    if (!isRecording) {
      setIsRecording(true);
      // Simulate voice capture
      setTimeout(() => {
        setIsRecording(false);
        setText(
          (prev) =>
            (prev ? prev + ' ' : '') +
            'When cutting SS304 on this component, always inspect clamping torque and reduce feed to 0.15 mm/rev if high harmonics begin.'
        );
        if (!title) {
          setTitle('SS304 Chatter & Clamping Tip');
        }
      }, 2000);
    } else {
      setIsRecording(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !text.trim()) return;

    setSubmitting(true);
    try {
      await onSubmit({
        component_id: component.id,
        mesh_name: component.mesh_name,
        title: title.trim(),
        knowledge_type: knowledgeType,
        type: knowledgeType,
        description: text.trim(),
        text: text.trim(),
        severity,
        author: defaultAuthor,
        date: new Date().toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        }),
        verified: role === 'old_employee',
      });
      setTitle('');
      setText('');
      setKnowledgeType('tip');
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fade-in">
      <div className="bg-white border border-slate-200/90 rounded-2xl max-w-lg w-full p-6 shadow-xl relative">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-200 pb-3 mb-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
              <span>📌</span>
              <span>Attach & Pin Knowledge Card</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Attaching know-how to{' '}
              <span className="font-semibold text-maroon-700">{component.display_name}</span>{' '}
              <span className="font-mono text-[11px] text-slate-400">(Component ID #{component.id})</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Knowledge Type Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
              Knowledge Type *
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'tip', label: '💡 Tip', desc: 'Expert Tip / Advice' },
                { id: 'incident', label: '⚠️ Incident', desc: 'Failure / Alarm Log' },
                { id: 'procedure', label: '📋 Procedure', desc: 'Step-by-Step SOP' },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setKnowledgeType(t.id)}
                  className={`p-2.5 rounded-xl border text-left transition flex flex-col ${
                    knowledgeType === t.id
                      ? 'bg-maroon-50 border-maroon-300 text-maroon-900 ring-1 ring-maroon-400 shadow-xs'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-maroon-200 hover:text-slate-900'
                  }`}
                >
                  <span className="text-xs font-bold">{t.label}</span>
                  <span className="text-[10px] text-slate-500 mt-0.5 leading-tight">{t.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Note Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
              Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Flange vibration before roughing cut"
              className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-maroon-700 focus:ring-1 focus:ring-maroon-700 outline-none shadow-xs"
            />
          </div>

          {/* Severity & Author */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                Severity Level
              </label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:border-maroon-700 focus:ring-1 focus:ring-maroon-700 outline-none shadow-xs"
              >
                <option value="info">INFO — Standard Tip / SOP</option>
                <option value="watch">WATCH — Caution / Anomaly</option>
                <option value="stop">STOP — Critical / Safety Hazard</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                Attributed Author
              </label>
              <div className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-700 truncate shadow-xs font-medium">
                {defaultAuthor}
              </div>
            </div>
          </div>

          {/* Description & Push-to-Talk */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Description / Advice *
              </label>
              <button
                type="button"
                onClick={handleVoiceToggle}
                className={`text-xs px-2.5 py-1 rounded-full font-medium transition flex items-center space-x-1 ${
                  isRecording
                    ? 'bg-rose-50 text-rose-700 border border-rose-300 animate-pulse font-bold'
                    : 'bg-slate-100 text-slate-700 hover:text-slate-900 hover:bg-slate-200'
                }`}
              >
                <span>{isRecording ? '🔴 Listening...' : '🎙️ Push-to-Talk'}</span>
              </button>
            </div>
            <textarea
              required
              rows={4}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Explain the symptom, how the problem was identified, and the specific fix or parameter adjustment..."
              className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm text-slate-900 placeholder-slate-400 focus:border-maroon-700 focus:ring-1 focus:ring-maroon-700 outline-none shadow-xs"
            />
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end space-x-3 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="btn-touch px-4 py-2 text-xs font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition border border-slate-200 shadow-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !title.trim() || !text.trim()}
              className="btn-touch px-5 py-2 text-xs font-semibold text-white bg-maroon-700 hover:bg-maroon-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-xs transition"
            >
              {submitting ? 'Attaching...' : 'Attach & Pin to 3D Model'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
