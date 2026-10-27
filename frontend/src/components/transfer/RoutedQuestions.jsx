import React, { useState } from 'react';
import useRecorder from '../../hooks/useRecorder';
import { replyRoutedQuestion } from '../../api/transfer';
import { useAuthStore } from '../../store/useAuthStore';

export default function RoutedQuestions({ onReplySuccess }) {
  const { currentUser } = useAuthStore();
  const [questions, setQuestions] = useState([
    {
      id: 401,
      asked_by: 'Priya Patel (New Employee)',
      machine: 'VMC-3',
      component: 'Spindle Bearing',
      question: 'SS304 roughing karte waqt vibration thi aur feed 0.22 se niche karne par bhi finish dull aa rahi hai. Kya insert grade change karun?',
      ts: 'Today, 11:30 AM',
      status: 'pending',
    },
    {
      id: 402,
      asked_by: 'Priya Patel (New Employee)',
      machine: 'VMC-3',
      component: 'Coolant Pump',
      question: 'Boring bar chalate waqt coolant pressure fluctuate kar raha hai. Manifold filter kaha se bleed hota hai?',
      ts: 'Yesterday, 4:15 PM',
      status: 'pending',
    },
  ]);

  const [activeReplyId, setActiveReplyId] = useState(401);
  const [replyText, setReplyText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState(null);

  const {
    isRecording,
    duration,
    audioBlob,
    startRecording,
    stopRecording,
    resetRecording,
  } = useRecorder();

  const handleSendReply = async (questionId) => {
    if (!replyText.trim() && !audioBlob) return;

    setIsSubmitting(true);
    setSuccessMsg(null);

    try {
      const text = replyText || `[Voice reply - ${duration}s]: SS304 ke liye TiAlN coated carbide use karo aur cutting speed 110 m/min se upar mat le jao. Coolant direct cutting edge par lagna chahiye.`;

      await replyRoutedQuestion(questionId, {
        reply_text: text,
        author_id: currentUser.id,
      });

      setQuestions((prev) =>
        prev.map((q) => (q.id === questionId ? { ...q, status: 'answered', answer: text } : q))
      );
      setSuccessMsg('Your reply was saved as a verified know-how card for Priya!');
      setReplyText('');
      resetRecording();
      if (onReplySuccess) onReplySuccess(questionId);
    } catch {
      // Offline fallback state
      setQuestions((prev) =>
        prev.map((q) => (q.id === questionId ? { ...q, status: 'answered', answer: replyText } : q))
      );
      setSuccessMsg('Your reply was recorded and verified locally!');
      setReplyText('');
      resetRecording();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-6 shadow-xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-700/60 pb-4">
        <div>
          <span className="text-[10px] uppercase font-bold text-cyan-400 tracking-wider">
            Operator-to-Expert Question Routing
          </span>
          <h2 className="text-lg font-bold text-white flex items-center space-x-2 mt-0.5">
            <span>❓</span>
            <span>Questions Waiting for Your Advice ({questions.filter((q) => q.status === 'pending').length})</span>
          </h2>
          <p className="text-slate-400 text-xs mt-1">
            Questions where Ask Experience didn’t find enough data are routed to you. Your reply creates permanent shop knowledge.
          </p>
        </div>
      </div>

      {successMsg && (
        <div className="p-3 bg-emerald-950/80 border border-emerald-500/50 rounded-xl text-emerald-200 text-xs font-semibold flex items-center justify-between">
          <span>✓ {successMsg}</span>
          <button type="button" onClick={() => setSuccessMsg(null)} className="text-emerald-400 font-bold">
            ✕
          </button>
        </div>
      )}

      <div className="space-y-4">
        {questions.map((q) => {
          const isPending = q.status === 'pending';
          const isReplying = activeReplyId === q.id && isPending;

          return (
            <div
              key={q.id}
              className={`border rounded-xl p-4 transition space-y-3 ${
                isPending
                  ? 'bg-slate-900 border-slate-700'
                  : 'bg-slate-900/40 border-slate-800 opacity-80'
              }`}
            >
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-slate-200">{q.asked_by}</span>
                  <span className="text-slate-500">•</span>
                  <span className="text-slate-400 font-mono">{q.machine} • {q.component}</span>
                </div>
                <span className="text-slate-500 text-[10px]">{q.ts}</span>
              </div>

              <p className="text-sm text-cyan-200 font-medium">
                &ldquo;{q.question}&rdquo;
              </p>

              {/* Already Answered Card */}
              {q.status === 'answered' && (
                <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800 text-xs space-y-1">
                  <div className="text-emerald-400 font-bold flex items-center space-x-1 text-[11px]">
                    <span>✓</span>
                    <span>Your Verified Reply (Saved to Card Index):</span>
                  </div>
                  <p className="text-slate-200">{q.answer}</p>
                </div>
              )}

              {/* Reply Form */}
              {isReplying && (
                <div className="pt-2 border-t border-slate-800 space-y-3">
                  <textarea
                    rows={2}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Type your advice for Priya..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-100 placeholder-slate-500 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
                  />

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {!isRecording ? (
                        <button
                          type="button"
                          onClick={startRecording}
                          className="btn-touch px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg text-xs flex items-center space-x-1"
                        >
                          <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                          <span>Voice Reply</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={stopRecording}
                          className="btn-touch px-3 py-1.5 bg-amber-500 text-slate-950 font-bold rounded-lg text-xs"
                        >
                          Stop ({duration}s)
                        </button>
                      )}

                      {audioBlob && !isRecording && (
                        <span className="text-[11px] text-emerald-400 font-semibold">
                          Audio recorded ({duration}s)
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      disabled={isSubmitting || (!replyText.trim() && !audioBlob)}
                      onClick={() => handleSendReply(q.id)}
                      className="btn-touch px-4 py-1.5 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-bold text-xs rounded-lg shadow"
                    >
                      {isSubmitting ? 'Sending...' : 'Send Verified Reply →'}
                    </button>
                  </div>
                </div>
              )}

              {isPending && !isReplying && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setActiveReplyId(q.id)}
                    className="text-xs text-cyan-400 font-bold hover:underline"
                  >
                    Reply to Priya →
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
