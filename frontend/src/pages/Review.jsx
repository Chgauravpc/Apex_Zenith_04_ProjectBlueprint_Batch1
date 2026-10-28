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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-700/60 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center space-x-2.5">
            <CheckCircleIcon className="w-6 h-6 text-emerald-400" />
            <span>{t('navReview', language)}</span>
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-1.5 font-medium leading-relaxed">
            Sign-off queue for experienced employees. Verify, correct, or reject AI-extracted know-how before it reaches operators.
          </p>
        </div>

        <span className="text-xs bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 px-3.5 py-1.5 rounded-xl font-semibold font-mono shadow-sm flex items-center space-x-2 self-start sm:self-auto">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" aria-hidden="true" />
          <span>{pendingTotal} Cards Pending Verification</span>
        </span>
      </div>

      {!canReview && (
        <div className="p-3 bg-slate-800 border border-slate-700 rounded-xl text-slate-300 text-xs">
          Only an old employee or a supervisor can verify know-how. Switch role to review these cards.
        </div>
      )}

      {errorMsg && (
        <div role="alert" className="p-3 bg-red-950/80 border border-red-500/50 rounded-xl text-red-200 text-xs font-semibold flex items-center justify-between">
          <span>{errorMsg}</span>
          <button type="button" onClick={() => setErrorMsg(null)} className="text-red-400 font-bold">
            ✕
          </button>
        </div>
      )}

      <LoadState loading={queue.loading} error={queue.error} onRetry={queue.reload} label="Loading review queue…" />

      {feedbackMsg && (
        <div className="p-3.5 bg-emerald-950/80 border border-emerald-500/50 rounded-xl text-emerald-200 text-xs font-semibold flex items-center justify-between shadow-lg">
          <span className="flex items-center space-x-2">
            <span className="text-emerald-400 font-bold">✓</span>
            <span>{feedbackMsg}</span>
          </span>
          <button type="button" onClick={() => setFeedbackMsg(null)} className="text-emerald-400 font-bold hover:text-emerald-300 px-2 py-1">
            ✕
          </button>
        </div>
      )}

      {/* Pending Review List */}
      <div className="space-y-4">
        {queue.loading || queue.error ? null : pendingCards.length === 0 ? (
          <div className="bg-slate-800/60 border border-slate-800 rounded-2xl p-8 text-center text-slate-400 text-sm">
            <SparklesIcon className="w-8 h-8 mx-auto mb-2 text-cyan-400" />
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
                      #{card.id} • {card.machine || 'Machine not set'}
                      {card.component ? ` (${card.component})` : ''}
                    </span>
                  </div>

                  <span className="text-slate-400 text-[11px]">
                    Captured by: <strong className="text-slate-300">{card.author || 'Unknown'}</strong>
                    {' '}• confidence {Math.round(card.confidence * 100)}%
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="text-xs font-bold text-cyan-300 flex items-center space-x-1.5">
                    <span>Symptom / Scenario:</span>
                    <span className="text-slate-200 font-normal">
                      {card.title}
                      {card.symptom ? ` (${symptomLabel(card.symptom)})` : ''}
                    </span>
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
                          disabled={isSubmitting || !editText.trim()}
                          onClick={() => handleApprove(card, true)}
                          className="btn-touch px-4 py-1 bg-emerald-500 text-slate-950 font-bold rounded-lg text-xs shadow"
                        >
                          Save Changes & Approve
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
                      disabled={!canReview || isSubmitting}
                      onClick={() => handleReject(card)}
                      className="btn-touch px-3 py-1.5 text-red-400 hover:text-red-300 text-xs font-semibold rounded-lg hover:bg-red-950/40 border border-transparent hover:border-red-500/30 transition disabled:opacity-40"
                    >
                      Discard / Reject
                    </button>

                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        disabled={!canReview}
                        onClick={() => startEdit(card)}
                        className="btn-touch px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 active:scale-[0.98] text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition"
                      >
                        Edit Details
                      </button>

                      <button
                        type="button"
                        disabled={!canReview || isSubmitting}
                        onClick={() => handleApprove(card, false)}
                        className="btn-touch px-5 py-1.5 bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] disabled:opacity-50 text-slate-950 font-extrabold text-xs rounded-xl shadow-lg shadow-emerald-500/20 transition"
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
                    #{c.id} • {c.title}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400">
                    Verified
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
