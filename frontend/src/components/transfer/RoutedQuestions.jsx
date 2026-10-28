import React, { useEffect, useState } from 'react';
import useApi from '../../hooks/useApi';
import useDictation from '../../hooks/useDictation';
import LoadState from '../common/LoadState';
import { getRoutedQuestions, replyRoutedQuestion } from '../../api/transfer';
import { useAuthStore } from '../../store/useAuthStore';

const formatWhen = (iso) =>
  new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

/**
 * Questions Ask Experience could not answer, routed to the old employee who knows the machine.
 * `employeeId` limits the list to one person's questions; null shows every open question.
 */
export default function RoutedQuestions({ employeeId = null, onReplySuccess }) {
  const { currentUser, language } = useAuthStore();
  const routed = useApi(
    (signal) => getRoutedQuestions(employeeId ? { employee_id: employeeId } : {}, signal),
    [employeeId]
  );
  const [questions, setQuestions] = useState([]);

  useEffect(() => {
    if (routed.data) setQuestions(routed.data.items);
  }, [routed.data]);

  const [activeReplyId, setActiveReplyId] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState(null);
  const [error, setError] = useState(null);

  // Old employees and supervisors answer for the team; new employees only read.
  const canReply = currentUser.role !== 'new_employee';

  const { isRecording, duration, isTranscribing, dictationError, startRecording, stopRecording } =
    useDictation((text) => setReplyText((prev) => (prev ? `${prev} ${text}` : text)), language);

  const handleSendReply = async (q) => {
    if (!replyText.trim()) return;
    setIsSubmitting(true);
    setSuccessMsg(null);
    setError(null);
    try {
      const res = await replyRoutedQuestion(q.id, {
        reply_text: replyText.trim(),
        author_id: currentUser.id,
      });
      setQuestions((prev) =>
        prev.map((x) => (x.id === q.id ? { ...res.routed, answer: res.card.action } : x))
      );
      setSuccessMsg(
        `Your reply was saved as a verified know-how card${q.asked_by ? ` for ${q.asked_by.split(' ')[0]}` : ''}!`
      );
      setReplyText('');
      setActiveReplyId(null);
      if (onReplySuccess) onReplySuccess(q.id);
    } catch (err) {
      setError(`Reply not saved: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white border border-[#DADCE0] rounded-2xl p-6 shadow-card hover:border-slate-300 transition-all space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <span className="text-[10px] uppercase font-bold text-maroon-700 tracking-wider">
            Operator-to-Expert Question Routing
          </span>
          <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2 mt-0.5">
            <span>❓</span>
            <span>Questions Waiting for Your Advice ({questions.filter((q) => q.status === 'open').length})</span>
          </h2>
          <p className="text-slate-500 text-xs mt-1">
            Questions where Ask Experience didn’t find enough data are routed to you. Your reply creates permanent shop knowledge.
          </p>
        </div>
      </div>

      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-center justify-between shadow-xs">
          <span>✓ {successMsg}</span>
          <button type="button" onClick={() => setSuccessMsg(null)} className="text-emerald-700 font-bold hover:text-emerald-900">
            ✕
          </button>
        </div>
      )}

      {(error || dictationError) && (
        <div role="alert" className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-semibold">
          {error || dictationError}
        </div>
      )}

      <LoadState loading={routed.loading} error={routed.error} onRetry={routed.reload} label="Loading questions…" />

      {!routed.loading && !routed.error && questions.length === 0 && (
        <div className="text-center text-slate-500 text-xs py-6">No open questions. Everything asked so far has an answer.</div>
      )}

      <div className="space-y-4">
        {questions.map((q) => {
          const isPending = q.status === 'open';
          const isReplying = activeReplyId === q.id && isPending;

          return (
            <div
              key={q.id}
              className={`border rounded-xl p-4 transition space-y-3 ${
                isPending
                  ? 'bg-white border-slate-200 shadow-xs hover:border-slate-300'
                  : 'bg-slate-50/80 border-slate-200/80 opacity-90'
              }`}
            >
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-slate-800">{q.asked_by || 'A new employee'}</span>
                  <span className="text-slate-300">•</span>
                  <span className="text-slate-600 font-mono text-[11px] bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200/60">
                    {q.machine || 'any machine'}
                  </span>
                  <span className="text-slate-400">→ {q.routed_to}</span>
                </div>
                <span className="text-slate-400 text-[10px]">{formatWhen(q.created_at)}</span>
              </div>

              <p className="text-sm text-slate-900 font-medium leading-relaxed">
                &ldquo;{q.question}&rdquo;
              </p>

              {/* Already Answered Card */}
              {q.status === 'answered' && q.answer && (
                <div className="bg-emerald-50/60 p-3 rounded-lg border border-emerald-200 text-xs space-y-1">
                  <div className="text-emerald-800 font-bold flex items-center space-x-1 text-[11px]">
                    <span>✓</span>
                    <span>Your Verified Reply (Saved to Card Index):</span>
                  </div>
                  <p className="text-slate-800">{q.answer}</p>
                </div>
              )}

              {/* Reply Form */}
              {isReplying && (
                <div className="pt-2 border-t border-slate-100 space-y-3">
                  <textarea
                    rows={2}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Type your advice, or reply by voice and check the text..."
                    className="w-full bg-white border border-slate-300 rounded-xl p-3 text-xs text-slate-800 placeholder-slate-400 focus:border-maroon-600 focus:ring-2 focus:ring-maroon-500/20 shadow-xs"
                  />

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {!isRecording ? (
                        <button
                          type="button"
                          disabled={isTranscribing}
                          onClick={startRecording}
                          className="btn-touch px-3.5 py-1.5 bg-white hover:bg-slate-50 border border-slate-300 active:scale-[0.98] disabled:opacity-50 text-slate-700 font-semibold rounded-lg text-xs flex items-center space-x-1.5 shadow-xs transition"
                        >
                          <span className="w-2 h-2 rounded-full bg-maroon-700" />
                          <span>Voice Reply</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={stopRecording}
                          className="btn-touch px-3.5 py-1.5 bg-maroon-700 hover:bg-maroon-800 active:scale-[0.98] text-white font-bold rounded-lg text-xs flex items-center space-x-1.5 shadow-xs transition animate-pulse"
                        >
                          <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                          <span>Stop ({duration}s)</span>
                        </button>
                      )}

                      {isTranscribing && (
                        <span className="text-[11px] text-maroon-700 font-semibold">Writing down what you said…</span>
                      )}
                    </div>

                    <button
                      type="button"
                      disabled={isSubmitting || !replyText.trim()}
                      onClick={() => handleSendReply(q)}
                      className="btn-touch px-4 py-1.5 bg-maroon-700 hover:bg-maroon-800 active:scale-[0.98] disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition"
                    >
                      {isSubmitting ? 'Sending...' : 'Send Verified Reply →'}
                    </button>
                  </div>
                </div>
              )}

              {isPending && !isReplying && canReply && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setActiveReplyId(q.id)}
                    className="text-xs text-maroon-700 font-bold hover:text-maroon-800 hover:underline"
                  >
                    Reply to {(q.asked_by || 'them').split(' ')[0]} →
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
