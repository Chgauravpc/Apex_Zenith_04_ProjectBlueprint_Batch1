import React, { useState } from 'react';
import useDictation from '../../hooks/useDictation';
import { answerInterview, startInterview } from '../../api/transfer';

/**
 * AI interview with a leaving old employee. Questions come from real gaps
 * (POST /transfer/interview/start); each answer becomes a card they verify.
 */
export default function InterviewSession({ employeeId, employeeName, language, onCardCreated }) {
  const [session, setSession] = useState(null);
  const [isStarting, setIsStarting] = useState(false);
  const [textAnswer, setTextAnswer] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdCard, setCreatedCard] = useState(null);
  const [error, setError] = useState(null);

  const { isRecording, duration, isTranscribing, dictationError, startRecording, stopRecording } =
    useDictation((text) => setTextAnswer((prev) => (prev ? `${prev} ${text}` : text)), language);

  const firstName = (employeeName || '').split(' ')[0];
  const questions = session ? session.questions : [];
  const currentQ = questions.find((q) => !q.answered);
  const answeredCount = questions.filter((q) => q.answered).length;

  const handleStart = async () => {
    setIsStarting(true);
    setError(null);
    try {
      setSession(await startInterview({ employee_id: employeeId }));
    } catch (err) {
      setError(err.message || 'Could not start the interview.');
    } finally {
      setIsStarting(false);
    }
  };

  const handleSubmitAnswer = async () => {
    if (!textAnswer.trim() || !currentQ) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const response = await answerInterview(session.id, {
        question_id: currentQ.id,
        answer_text: textAnswer.trim(),
      });
      setCreatedCard(response.card);
      setSession((prev) => ({
        ...prev,
        questions: prev.questions.map((q) => (q.id === currentQ.id ? { ...q, answered: true } : q)),
      }));
      setTextAnswer('');
      if (onCardCreated) onCardCreated(response.card);
    } catch (err) {
      setError(err.message || 'Submitting interview response failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!session) {
    return (
      <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-6 shadow-xl space-y-4">
        <span className="text-[10px] uppercase font-bold text-cyan-400 tracking-wider">
          AI Tacit Knowledge Interview
        </span>
        <h2 className="text-lg font-bold text-white">🎙️ Interview with {employeeName}</h2>
        <p className="text-slate-400 text-xs">
          The AI asks about what is missing: open handover tasks, questions new employees could not get
          answered, and machine parts with nothing recorded. Every answer becomes a card verified by{' '}
          {firstName}.
        </p>
        <button
          type="button"
          disabled={isStarting || !employeeId}
          onClick={handleStart}
          className="btn-touch px-6 py-2 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-bold rounded-xl text-xs shadow"
        >
          {isStarting ? 'Preparing questions…' : 'Start Interview →'}
        </button>
        {error && (
          <div role="alert" className="p-3 bg-red-950/80 border border-red-500/50 rounded-xl text-red-200 text-xs">
            {error}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-6 shadow-xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-700/60 pb-4">
        <div>
          <span className="text-[10px] uppercase font-bold text-cyan-400 tracking-wider">
            AI Tacit Knowledge Interview
          </span>
          <h2 className="text-lg font-bold text-white flex items-center space-x-2 mt-0.5">
            <span>🎙️</span>
            <span>
              {currentQ
                ? `Question ${answeredCount + 1} of ${questions.length}`
                : `All ${questions.length} questions answered`}
            </span>
          </h2>
          <p className="text-slate-400 text-xs mt-1">
            AI asks focused questions on your machine secrets. Your reply instantly creates a verified card
            for new operators.
          </p>
        </div>
        {session.mode === 'offline' && (
          <span className="text-[10px] bg-slate-900 px-2 py-1 rounded text-amber-300 border border-slate-700">
            AI offline: standard questions
          </span>
        )}
      </div>

      {currentQ ? (
        <>
          {/* Question Prompt Box */}
          <div className="bg-slate-900/80 border border-cyan-500/30 rounded-xl p-5 space-y-2">
            <p className="text-sm sm:text-base font-semibold text-slate-100 leading-relaxed">
              &ldquo;{currentQ.text}&rdquo;
            </p>
            <span className="text-[11px] text-slate-400 block italic">Why we ask: {currentQ.reason}</span>
          </div>

          {/* Input Options: Voice or Text */}
          <div className="space-y-4">
            <div>
              <label htmlFor="interview-answer" className="block text-xs font-semibold text-slate-300 mb-1.5">
                Your Answer (Speak or Type in Hindi/Marathi/English):
              </label>
              <textarea
                id="interview-answer"
                rows={3}
                value={textAnswer}
                onChange={(e) => setTextAnswer(e.target.value)}
                placeholder="Type your explanation, or click the mic button below to answer by voice..."
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm text-slate-100 placeholder-slate-500 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
              />
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center space-x-3">
                {!isRecording ? (
                  <button
                    type="button"
                    disabled={isTranscribing}
                    onClick={startRecording}
                    className="btn-touch px-4 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center space-x-1.5 shadow"
                  >
                    <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                    <span>Answer by Voice</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={stopRecording}
                    className="btn-touch px-4 py-2 bg-amber-500 text-slate-950 font-bold rounded-xl text-xs flex items-center space-x-1.5"
                  >
                    <span>Stop Recording ({duration}s)</span>
                  </button>
                )}
                {isTranscribing && (
                  <span className="text-xs text-cyan-300 font-semibold">Writing down what you said…</span>
                )}
              </div>

              <button
                type="button"
                disabled={isSubmitting || !textAnswer.trim()}
                onClick={handleSubmitAnswer}
                className="btn-touch px-6 py-2 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-bold rounded-xl text-xs shadow"
              >
                {isSubmitting ? 'Converting to Know-How Card...' : 'Save & Publish Card →'}
              </button>
            </div>
          </div>
        </>
      ) : (
        <p className="text-sm text-emerald-300">
          Thank you, {firstName}. Everything you said is now searchable by new employees.
        </p>
      )}

      {(error || dictationError) && (
        <div role="alert" className="p-3 bg-red-950/80 border border-red-500/50 rounded-xl text-red-200 text-xs">
          {error || dictationError}
        </div>
      )}

      {/* Newly Created Card Preview */}
      {createdCard && (
        <div className="space-y-3 pt-4 border-t border-slate-700/60">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center space-x-1.5">
            <span>✓</span>
            <span>New Know-How Card Created & Verified</span>
          </span>

          <div className="bg-slate-900 border border-emerald-500/30 rounded-xl p-4 shadow space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-cyan-300">{createdCard.title}</span>
              <span className="bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded text-[10px] font-bold">
                Verified by {firstName}
              </span>
            </div>
            <p className="text-slate-200">
              <strong>Action: </strong>
              {createdCard.action}
            </p>
            {createdCard.why && (
              <p className="text-slate-400 italic">
                <strong>Why: </strong>
                {createdCard.why}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
