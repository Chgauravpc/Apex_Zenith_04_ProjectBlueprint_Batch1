import React, { useState } from 'react';
import { reviewCard } from '../api/capture';
import { useAuthStore } from '../store/useAuthStore';
import { t } from '../utils/i18n';

export default function Review() {
  const { currentUser, language } = useAuthStore();
  const [cards, setCards] = useState([
    {
      id: 501,
      machine: 'VMC-3',
      component: 'Spindle Bearing',
      symptom: 'Intermittent chatter during roughing pass',
      action: 'Check pull stud torque on BT40 toolholder; ensure clamping force is at least 18 kN',
      why: 'Worn pull stud or low Belleville spring washer stack force causes microscopic tool vibration under high radial loads',
      author: 'Priya Patel (Captured via Voice Note)',
      confidence: 0.92,
      status: 'pending',
    },
    {
      id: 502,
      machine: 'VMC-3',
      component: 'Coolant Delivery',
      symptom: 'Surface discoloration on SS304 bore',
      action: 'Direct nozzle #2 specifically at cutting insert trailing edge, not workpiece top surface',
      why: 'Stainless steel work-hardens rapidly if thermal shock occurs from intermittent splash coolant',
      author: 'AI-Extracted from Shift Meeting Photo',
      confidence: 0.88,
      status: 'pending',
    },
    {
      id: 503,
      machine: 'Lathe-2',
      component: 'Turret Index Cam',
      symptom: 'Turret index alarm 2044',
      action: 'Inspect proximity sensor gap; wipe away fine steel swarf using brass scraper',
      why: 'Magnetic swarf builds up near sensor face giving false unclamp status',
      author: 'Suresh Rao (Supervisor)',
      confidence: 0.95,
      status: 'pending',
    },
  ]);

  const [editingCardId, setEditingCardId] = useState(null);
  const [editText, setEditText] = useState('');
  const [editWhy, setEditWhy] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState(null);

  const startEdit = (card) => {
    setEditingCardId(card.id);
    setEditText(card.action);
    setEditWhy(card.why);
  };

  const handleApprove = async (card, isEdited = false) => {
    setIsSubmitting(true);
    setFeedbackMsg(null);

    const actionText = isEdited ? editText : card.action;
    const whyText = isEdited ? editWhy : card.why;

    try {
      await reviewCard(card.id, {
        verified_by: currentUser.id,
        action: actionText,
        why: whyText,
        approved: true,
      });

      setCards((prev) =>
        prev.map((c) =>
          c.id === card.id
            ? { ...c, status: 'approved', action: actionText, why: whyText, verified_by: currentUser.name }
            : c
        )
      );
      setEditingCardId(null);
      setFeedbackMsg(`Card #${card.id} was verified and published to the plant knowledge base!`);
    } catch {
      // Fallback local update
      setCards((prev) =>
        prev.map((c) =>
          c.id === card.id
            ? { ...c, status: 'approved', action: actionText, why: whyText, verified_by: currentUser.name }
            : c
        )
      );
      setEditingCardId(null);
      setFeedbackMsg(`Card #${card.id} was verified locally!`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async (cardId) => {
    setCards((prev) => prev.filter((c) => c.id !== cardId));
    setFeedbackMsg(`Card #${cardId} was discarded from the verification queue.`);
  };

  const pendingCards = cards.filter((c) => c.status === 'pending');
  const approvedCards = cards.filter((c) => c.status === 'approved');

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center space-x-2">
            <span>✅</span>
            <span>{t('navReview', language)}</span>
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-1">
            Sign-off queue for experienced employees. Verify, correct, or reject AI-extracted know-how before it reaches operators.
          </p>
        </div>

        <span className="text-xs bg-slate-800 border border-slate-700 text-cyan-300 px-3 py-1.5 rounded-xl font-semibold">
          {pendingCards.length} Cards Pending Verification
        </span>
      </div>

      {feedbackMsg && (
        <div className="p-3 bg-emerald-950/80 border border-emerald-500/50 rounded-xl text-emerald-200 text-xs font-semibold flex items-center justify-between">
          <span>✓ {feedbackMsg}</span>
          <button type="button" onClick={() => setFeedbackMsg(null)} className="text-emerald-400 font-bold">
            ✕
          </button>
        </div>
      )}

      {/* Pending Review List */}
      <div className="space-y-4">
        {pendingCards.length === 0 ? (
          <div className="bg-slate-800/60 border border-slate-800 rounded-2xl p-8 text-center text-slate-400 text-sm">
            <span className="text-3xl block mb-2" aria-hidden="true">🎉</span>
            <span>All know-how cards in the review queue have been verified!</span>
          </div>
        ) : (
          pendingCards.map((card) => {
            const isEditing = editingCardId === card.id;

            return (
              <div
                key={card.id}
                className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-5 shadow-lg space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-700/60 pb-3">
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 uppercase">
                      Pending Sign-off
                    </span>
                    <span className="text-xs font-bold text-white">
                      #{card.id} • {card.machine} ({card.component})
                    </span>
                  </div>

                  <span className="text-slate-400 text-[11px]">
                    Captured by: <strong className="text-slate-300">{card.author}</strong>
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="text-xs font-bold text-cyan-300 flex items-center space-x-1.5">
                    <span>Symptom / Scenario:</span>
                    <span className="text-slate-200 font-normal">{card.symptom}</span>
                  </div>

                  {isEditing ? (
                    <div className="space-y-3 bg-slate-900/80 p-4 rounded-xl border border-slate-700">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-300 mb-1">
                          Correct Action:
                        </label>
                        <textarea
                          rows={2}
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-100 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-300 mb-1">
                          Why / Technical Explanation:
                        </label>
                        <textarea
                          rows={2}
                          value={editWhy}
                          onChange={(e) => setEditWhy(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-100 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
                        />
                      </div>

                      <div className="flex justify-end space-x-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setEditingCardId(null)}
                          className="btn-touch px-3 py-1 bg-slate-800 text-slate-300 rounded-lg text-xs"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          disabled={isSubmitting}
                          onClick={() => handleApprove(card, true)}
                          className="btn-touch px-4 py-1 bg-emerald-500 text-slate-950 font-bold rounded-lg text-xs shadow"
                        >
                          Save Changes & Approve ✓
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1.5 text-xs">
                      <div className="text-slate-200">
                        <strong className="text-slate-400 font-normal">Recommended Action: </strong>
                        {card.action}
                      </div>
                      {card.why && (
                        <div className="text-slate-300">
                          <strong className="text-slate-400 font-normal">Why: </strong>
                          {card.why}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {!isEditing && (
                  <div className="flex items-center justify-between pt-3 border-t border-slate-700/60">
                    <button
                      type="button"
                      onClick={() => handleReject(card.id)}
                      className="btn-touch px-3 py-1.5 text-red-400 hover:text-red-300 text-xs font-semibold"
                    >
                      Discard / Reject
                    </button>

                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() => startEdit(card)}
                        className="btn-touch px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700"
                      >
                        Edit Details ✏️
                      </button>

                      <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={() => handleApprove(card, false)}
                        className="btn-touch px-5 py-1.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold text-xs rounded-lg shadow"
                      >
                        Approve & Verify ✓
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Verified History Section */}
      {approvedCards.length > 0 && (
        <div className="space-y-3 pt-6 border-t border-slate-800">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
            Recently Verified Cards ({approvedCards.length}):
          </span>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {approvedCards.map((c) => (
              <div
                key={c.id}
                className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 space-y-1.5 text-xs opacity-90"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-200 truncate">
                    #{c.id} • {c.symptom}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400">
                    Verified ✓
                  </span>
                </div>
                <p className="text-slate-300 leading-snug">{c.action}</p>
                <span className="text-[10px] text-slate-500 block">
                  Verified by: {c.verified_by || currentUser.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
