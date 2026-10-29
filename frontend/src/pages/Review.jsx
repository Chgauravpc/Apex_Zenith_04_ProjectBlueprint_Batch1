import React, { useEffect, useState } from 'react';
import { getReviewQueue, reviewCard } from '../api/capture';
import LoadState from '../components/common/LoadState';
import useApi from '../hooks/useApi';
import { useAuthStore } from '../store/useAuthStore';
import { PageHead, Reveal, ExpertTag } from '../components/common';
import { PERSONAS } from '../mock/data';
import { BadgeCheck, Pencil, Star, ShieldAlert, CheckCircle } from 'lucide-react';

function Stars({ value = 4 }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={15}
          className={n <= value ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}
        />
      ))}
    </div>
  );
}

export default function Review() {
  const { currentUser } = useAuthStore();
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
  const pendingTotal = queue.data
    ? queue.data.total - (queue.data.items.length - pendingCards.length)
    : 0;

  return (
    <div className="mx-auto max-w-5xl px-5 py-8 sm:px-8">
      <PageHead
        eyebrow="Trust layer · Validation queue"
        title="Nothing goes live without a human's name on it."
        sub="AI drafts the card. The veteran or supervisor verifies it — that's why the floor trusts the answers."
      />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <span className="inline-flex items-center gap-2 rounded-full border border-copper/30 bg-copper-light px-4 py-2 font-mono text-xs font-semibold text-copper">
          <span className="h-2 w-2 rounded-full bg-copper animate-pulse" />
          <span>{pendingTotal} Cards Pending Verification</span>
        </span>

        {!canReview && (
          <span className="rounded-full bg-amber-50 px-4 py-2 text-xs font-medium text-amber-900 border border-amber-200">
            Only an old employee or a supervisor can verify know-how. Switch role to review these cards.
          </span>
        )}
      </div>

      {errorMsg && (
        <div role="alert" className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-semibold text-red-800">
          {errorMsg}
        </div>
      )}

      {feedbackMsg && (
        <div role="status" className="mb-6 rounded-2xl border border-teal/30 bg-teal-light p-4 text-xs font-semibold text-teal">
          {feedbackMsg}
        </div>
      )}

      <LoadState loading={queue.loading} error={queue.error} onRetry={queue.reload} label="Loading verification queue…" />

      {/* Cards List */}
      <div className="space-y-5">
        {pendingCards.length === 0 && !queue.loading && (
          <div className="rounded-3xl border border-dashed border-teal/40 bg-teal-light p-14 text-center">
            <BadgeCheck size={36} className="mx-auto text-teal" />
            <p className="mt-3 font-display text-xl font-bold text-ink">Queue clear.</p>
            <p className="mt-1 text-sm text-slate-500">All know-how cards in the review queue have been verified! Every draft is verified, so the floor can trust today's answers.</p>
          </div>
        )}

        {pendingCards.map((card) => {
          const isEditing = editingCardId === card.id;
          return (
            <div
              key={card.id}
              data-testid="review-card-item"
              className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition-all sm:p-7"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4">
                <div>
                  <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Card #{card.id} · {card.machine || 'Machine'} · {card.component || 'General'}
                  </span>
                  <h3 className="mt-1 font-display text-lg font-bold text-ink">{card.title}</h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2.5 py-1 font-mono text-[11px] font-semibold ${card.confidence >= 0.8 ? 'bg-teal-light text-teal' : 'bg-amber-50 text-amber-700 ring-1 ring-amber-200'}`}>
                    AI Confidence: {Math.round((card.confidence || 0) * 100)}%
                  </span>
                </div>
              </div>

              <div className="py-4">
                {isEditing ? (
                  <div className="space-y-3">
                    <div>
                      <label className="block font-mono text-[10px] uppercase text-slate-400 mb-1">Recommended Action:</label>
                      <textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        rows={3}
                        className="w-full resize-none rounded-2xl border border-copper bg-canvas p-3 text-sm outline-none focus:ring-1 focus:ring-copper"
                      />
                    </div>
                    <div>
                      <label className="block font-mono text-[10px] uppercase text-slate-400 mb-1">Reason / Explanation:</label>
                      <textarea
                        value={editWhy}
                        onChange={(e) => setEditWhy(e.target.value)}
                        rows={2}
                        className="w-full resize-none rounded-2xl border border-slate-200 bg-canvas p-3 text-sm outline-none"
                      />
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setEditingCardId(null)}
                        className="rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:border-ink"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={isSubmitting || !editText.trim()}
                        onClick={() => handleApprove(card, true)}
                        className="rounded-full bg-ink px-5 py-2 text-xs font-semibold text-white hover:bg-copper disabled:opacity-50"
                      >
                        Save Changes & Approve
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="font-serif text-base italic leading-relaxed text-amber-950">
                      "{card.action}"
                    </p>
                    {card.why && (
                      <p className="text-xs text-slate-500">
                        <strong className="text-slate-700">Why: </strong>{card.why}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {!isEditing && (
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                  <div className="flex items-center gap-3">
                    <ExpertTag person={PERSONAS.ramesh} />
                    <Stars value={4} />
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={!canReview || isSubmitting}
                      onClick={() => handleReject(card)}
                      className="rounded-full border border-red-200 px-4 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-40"
                    >
                      Discard / Reject
                    </button>
                    <button
                      type="button"
                      data-testid="review-edit-btn"
                      disabled={!canReview}
                      onClick={() => startEdit(card)}
                      className="rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:border-ink disabled:opacity-40"
                    >
                      Edit Details
                    </button>
                    <button
                      type="button"
                      data-testid="review-approve-btn"
                      disabled={!canReview || isSubmitting}
                      onClick={() => handleApprove(card, false)}
                      className="rounded-full bg-ink px-5 py-2.5 text-xs font-semibold text-white transition-colors duration-300 hover:bg-teal disabled:opacity-40"
                    >
                      Approve & Verify
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
