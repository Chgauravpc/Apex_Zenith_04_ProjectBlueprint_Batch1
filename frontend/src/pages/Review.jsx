import React, { useEffect, useState } from 'react';
import { getReviewQueue, reviewCard } from '../api/capture';
import LoadState from '../components/common/LoadState';
import useApi from '../hooks/useApi';
import { useAuthStore } from '../store/useAuthStore';
import { t } from '../utils/i18n';
import { CheckCircleIcon, SparklesIcon } from '../components/common/Icons';

const symptomLabel = (key) => (key ? key.replace(/_/g, ' ') : null);

export default function Review() {
  const { currentUser, language } = useAuthStore();
  const queue = useApi((signal) => getReviewQueue({ limit: 50 }, signal), []);
  const [cards, setCards] = useState([]);

  useEffect(() => {
    if (queue.data) setCards(queue.data.items.map((c) => ({ ...c, status: 'pending' })));
  }, [queue.data]);

  const [editingCardId, setEditingCardId] = useState(null);
  const [editText, setEditText] = useState('');
  const [editWhy, setEditWhy] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  // The backend lets only old employees and supervisors verify know-how.
  const canReview = currentUser.role !== 'new_employee';

  const startEdit = (card) => {
    setEditingCardId(card.id);
    setEditText(card.action);
    setEditWhy(card.why || '');
  };

  const submitReview = async (card, payload, onDone) => {
    setIsSubmitting(true);
    setFeedbackMsg(null);
    setErrorMsg(null);
    try {
      const res = await reviewCard(card.id, { reviewer_id: currentUser.id, ...payload });
      onDone(res);
      setEditingCardId(null);
    } catch (err) {
      setErrorMsg(`Card #${card.id} was not saved: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApprove = (card, isEdited = false) =>
    submitReview(
      card,
      isEdited
        ? { action: 'edit', action_text: editText, why: editWhy.trim() || null }
        : { action: 'approve' },
      (res) => {
        setCards((prev) =>
          prev.map((c) =>
            c.id === card.id
              ? { ...c, ...res.card, status: 'approved', verified_by: currentUser.name }
              : c
          )
        );
        setFeedbackMsg(`Card #${card.id} was verified and published to the plant knowledge base!`);
      }
    );

  const handleReject = (card) =>
    submitReview(card, { action: 'reject' }, () => {
      setCards((prev) => prev.filter((c) => c.id !== card.id));
      setFeedbackMsg(`Card #${card.id} was discarded from the verification queue.`);
    });

  const pendingCards = cards.filter((c) => c.status === 'pending');
  const approvedCards = cards.filter((c) => c.status === 'approved');
  // Server total, minus the cards reviewed on this page since it loaded.
  const pendingTotal = queue.data
    ? queue.data.total - (queue.data.items.length - pendingCards.length)
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center space-x-2.5">
            <span className="w-9 h-9 rounded-xl bg-maroon-50 text-maroon-700 flex items-center justify-center border border-maroon-100 shadow-xs">
              <CheckCircleIcon className="w-5 h-5 text-maroon-700" />
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {t('navReview', language)}
            </h1>
          </div>
          <p className="text-slate-500 text-xs sm:text-sm mt-1.5 font-medium leading-relaxed">
            Sign-off queue for experienced employees. Verify, correct, or reject AI-extracted know-how before it reaches operators.
          </p>
        </div>

        <span className="text-xs bg-maroon-50 border border-maroon-200 text-maroon-800 px-3.5 py-1.5 rounded-xl font-semibold font-mono shadow-xs flex items-center space-x-2 self-start sm:self-auto">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" aria-hidden="true" />
          <span>{pendingTotal} Cards Pending Verification</span>
        </span>
      </div>

      {!canReview && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs font-medium">
          Only an old employee or a supervisor can verify know-how. Switch role to review these cards.
        </div>
      )}

      {errorMsg && (
        <div role="alert" className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-semibold flex items-center justify-between shadow-xs">
          <span>{errorMsg}</span>
          <button type="button" onClick={() => setErrorMsg(null)} className="text-rose-700 font-bold hover:text-rose-900">
            ✕
          </button>
        </div>
      )}

      <LoadState loading={queue.loading} error={queue.error} onRetry={queue.reload} label="Loading review queue…" />

      {feedbackMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-center justify-between shadow-xs">
          <span className="flex items-center space-x-2">
            <span className="text-emerald-700 font-bold">✓</span>
            <span>{feedbackMsg}</span>
          </span>
          <button type="button" onClick={() => setFeedbackMsg(null)} className="text-emerald-700 font-bold hover:text-emerald-900 px-2 py-1">
            ✕
          </button>
        </div>
      )}

      {/* Pending Review List */}
      <div className="space-y-4">
        {queue.loading || queue.error ? null : pendingCards.length === 0 ? (
          <div className="bg-white border border-[#DADCE0] rounded-2xl p-8 text-center text-slate-500 text-sm shadow-card">
            <SparklesIcon className="w-8 h-8 mx-auto mb-2 text-maroon-600" />
            <span>All know-how cards in the review queue have been verified!</span>
          </div>
        ) : (
          pendingCards.map((card) => {
            const isEditing = editingCardId === card.id;

            return (
              <div
                key={card.id}
                className="bg-white border border-[#DADCE0] rounded-2xl p-6 shadow-card hover:border-slate-300 transition-all space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div className="flex items-center space-x-2">
                    <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-200 uppercase tracking-wider">
                      Pending Sign-off
                    </span>
                    <span className="text-xs font-bold text-slate-900">
                      #{card.id} • {card.machine || 'Machine not set'}
                      {card.component ? ` (${card.component})` : ''}
                    </span>
                  </div>

                  <span className="text-slate-500 text-[11px]">
                    Captured by: <strong className="text-slate-700">{card.author || 'Unknown'}</strong>
                    {' '}• confidence {Math.round(card.confidence * 100)}%
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="text-xs font-bold text-maroon-800 flex items-center space-x-1.5">
                    <span>Symptom / Scenario:</span>
                    <span className="text-slate-800 font-normal">
                      {card.title}
                      {card.symptom ? ` (${symptomLabel(card.symptom)})` : ''}
                    </span>
                  </div>

                  {isEditing ? (
                    <div className="space-y-3 bg-slate-50/70 p-5 rounded-xl border border-slate-200/90">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Correct Action:
                        </label>
                        <textarea
                          rows={2}
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          className="w-full bg-white border border-slate-300 rounded-xl p-3 text-xs text-slate-800 focus:border-maroon-600 focus:ring-2 focus:ring-maroon-500/20 shadow-xs"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Why / Technical Explanation:
                        </label>
                        <textarea
                          rows={2}
                          value={editWhy}
                          onChange={(e) => setEditWhy(e.target.value)}
                          className="w-full bg-white border border-slate-300 rounded-xl p-3 text-xs text-slate-800 focus:border-maroon-600 focus:ring-2 focus:ring-maroon-500/20 shadow-xs"
                        />
                      </div>

                      <div className="flex justify-end space-x-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setEditingCardId(null)}
                          className="btn-touch px-4 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded-xl text-xs font-semibold shadow-xs transition"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          disabled={isSubmitting || !editText.trim()}
                          onClick={() => handleApprove(card, true)}
                          className="btn-touch px-5 py-2 bg-maroon-700 hover:bg-maroon-800 active:scale-[0.98] disabled:opacity-50 text-white font-semibold rounded-xl text-xs shadow-xs transition"
                        >
                          Save Changes & Approve
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1.5 text-xs">
                      <div className="text-slate-800">
                        <strong className="text-slate-500 font-normal">Recommended Action: </strong>
                        {card.action}
                      </div>
                      {card.why && (
                        <div className="text-slate-700">
                          <strong className="text-slate-500 font-normal">Why: </strong>
                          {card.why}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {!isEditing && (
                  <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      disabled={!canReview || isSubmitting}
                      onClick={() => handleReject(card)}
                      className="btn-touch bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 rounded-xl px-4 py-2 text-xs font-semibold shadow-xs active:scale-[0.98] transition disabled:opacity-40 disabled:hover:bg-white"
                    >
                      Discard / Reject
                    </button>

                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        disabled={!canReview}
                        onClick={() => startEdit(card)}
                        className="btn-touch bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl px-4 py-2 text-xs font-semibold shadow-xs active:scale-[0.98] transition disabled:opacity-40 disabled:hover:bg-white"
                      >
                        Edit Details
                      </button>

                      <button
                        type="button"
                        disabled={!canReview || isSubmitting}
                        onClick={() => handleApprove(card, false)}
                        className="btn-touch bg-maroon-700 hover:bg-maroon-800 text-white font-semibold rounded-xl px-5 py-2.5 text-xs shadow-sm active:scale-[0.98] transition disabled:opacity-40 disabled:hover:bg-maroon-700"
                      >
                        Approve & Verify
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
        <div className="space-y-3 pt-6 border-t border-slate-200">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
            Recently Verified Cards ({approvedCards.length}):
          </span>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {approvedCards.map((c) => (
              <div
                key={c.id}
                className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1.5 text-xs shadow-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 truncate">
                    #{c.id} • {c.title}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Verified
                  </span>
                </div>
                <p className="text-slate-700 leading-snug">{c.action}</p>
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
