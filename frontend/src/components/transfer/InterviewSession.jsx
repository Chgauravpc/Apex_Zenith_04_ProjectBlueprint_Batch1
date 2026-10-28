import React, { useState } from 'react';
import useDictation from '../../hooks/useDictation';
import { answerInterview, startInterview } from '../../api/transfer';
import WarningBanner from '../guardian/WarningBanner';
import { useAuthStore } from '../../store/useAuthStore';

/**
 * AI interview with a leaving old employee. Questions come from real gaps
 * (POST /transfer/interview/start); each answer becomes a card they verify.
 */
export default function InterviewSession({ employeeId, employeeName, language, onCardCreated }) {
  const { currentUser } = useAuthStore();
  // Answers are saved as the interviewed person's verified know-how, so only they can answer.
  const isInterviewee = currentUser?.id === employeeId;
  const [session, setSession] = useState(null);
  const [isStarting, setIsStarting] = useState(false);
  const [textAnswer, setTextAnswer] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdCard, setCreatedCard] = useState(null);
  const [guardian, setGuardian] = useState(null);
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
        author_id: currentUser.id,
      });
      setCreatedCard(response.card);
      setGuardian(response.guardian || null);
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
      <div className="bg-white border border-[#DADCE0] rounded-2xl p-6 shadow-card hover:border-slate-300 transition-all space-y-4">
        <span className="text-[10px] uppercase font-bold text-maroon-700 tracking-wider">
          AI Tacit Knowledge Interview
        </span>
        <h2 className="text-lg font-bold text-slate-900">🎙️ Interview with {employeeName}</h2>
        <p className="text-slate-600 text-xs">
          The AI asks about what is missing: open handover tasks, questions new employees could not get
          answered, and machine parts with nothing recorded. Every answer becomes a card verified by{' '}
          {firstName}.
        </p>
        {!isInterviewee && (
          <p className="text-xs text-amber-300">
            Only {employeeName || 'the old employee'} can answer this interview. Switch to their
            account to start it.
          </p>
        )}
        <button
          type="button"
          disabled={isStarting || !employeeId || !isInterviewee}
          onClick={handleStart}
          className="btn-touch px-6 py-2 bg-maroon-700 hover:bg-maroon-800 active:scale-[0.98] disabled:opacity-50 text-white font-bold rounded-xl text-xs shadow-xs transition"
        >
          {isStarting ? 'Preparing questions…' : 'Start Interview →'}
        </button>
        {error && (
          <div role="alert" className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-medium">
            {error}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white border border-[#DADCE0] rounded-2xl p-6 shadow-card hover:border-slate-300 transition-all space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <span className="text-[10px] uppercase font-bold text-maroon-700 tracking-wider">
            AI Tacit Knowledge Interview
          </span>
          <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2 mt-0.5">
            <span>🎙️</span>
            <span>
              {currentQ
                ? `Question ${answeredCount + 1} of ${questions.length}`
                : `All ${questions.length} questions answered`}
            </span>
          </h2>
          <p className="text-slate-500 text-xs mt-1">
            AI asks focused questions on your machine secrets. Your reply instantly creates a verified card
            for new operators.
          </p>
        </div>
        {session.mode === 'offline' && (
          <span className="text-[10px] bg-amber-50 px-2 py-1 rounded text-amber-800 border border-amber-200 font-medium">
            AI offline: standard questions
          </span>
        )}
      </div>

      {currentQ ? (
        <>
          {/* Question Prompt Box */}
          <div className="bg-white border border-slate-200/90 rounded-xl p-5 space-y-2 shadow-xs">
            <p className="text-sm sm:text-base font-semibold text-slate-900 leading-relaxed">
              &ldquo;{currentQ.text}&rdquo;
            </p>
            <span className="text-[11px] text-slate-500 block italic">Why we ask: {currentQ.reason}</span>
          </div>

          {/* Input Options: Voice or Text */}
          <div className="space-y-4">
            <div>
              <label htmlFor="interview-answer" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Your Answer (Speak or Type in Hindi/Marathi/English):
              </label>
              <textarea
                id="interview-answer"
                rows={3}
                value={textAnswer}
                onChange={(e) => setTextAnswer(e.target.value)}
                placeholder="Type your explanation, or click the mic button below to answer by voice..."
                className="w-full bg-white border border-slate-300 text-slate-800 rounded-xl p-3 focus:ring-2 focus:ring-maroon-500/20 focus:border-maroon-600 text-sm shadow-xs"
              />
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center space-x-3">
                {!isRecording ? (
                  <button
                    type="button"
                    disabled={isTranscribing}
                    onClick={startRecording}
                    className="btn-touch px-4 py-2 bg-white hover:bg-slate-50 border border-slate-300 active:scale-[0.98] disabled:opacity-50 text-slate-700 font-semibold rounded-xl text-xs flex items-center space-x-2 shadow-xs transition"
                  >
                    <span className="w-2 h-2 rounded-full bg-maroon-700" />
                    <span>Answer by Voice</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={stopRecording}
                    className="btn-touch px-4 py-2 bg-maroon-700 hover:bg-maroon-800 active:scale-[0.98] text-white font-bold rounded-xl text-xs flex items-center space-x-2 shadow-xs transition animate-pulse"
                  >
                    <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                    <span>Stop Recording ({duration}s)</span>
                  </button>
                )}
                {isTranscribing && (
                  <span className="text-xs text-maroon-700 font-semibold">Writing down what you said…</span>
                )}
              </div>

              <button
                type="button"
                disabled={isSubmitting || !textAnswer.trim()}
                onClick={handleSubmitAnswer}
                className="btn-touch px-6 py-2 bg-maroon-700 hover:bg-maroon-800 active:scale-[0.98] disabled:opacity-50 text-white font-bold rounded-xl text-xs shadow-xs transition"
              >
                {isSubmitting ? 'Converting to Know-How Card...' : 'Save & Publish Card →'}
              </button>
            </div>
          </div>
        </>
      ) : (
        <p className="text-sm text-emerald-700 font-medium bg-emerald-50 border border-emerald-200 rounded-xl p-4">
          Thank you, {firstName}. Everything you said is now searchable by new employees.
        </p>
      )}

      {(error || dictationError) && (
        <div role="alert" className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-semibold">
          {error || dictationError}
        </div>
      )}

      {/* Newly Created Card Preview */}
      {createdCard && (
        <div className="space-y-3 pt-4 border-t border-slate-100">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 flex items-center space-x-1.5">
            <span>✓</span>
            <span>New Know-How Card Created & Verified</span>
          </span>

          {guardian && <WarningBanner result={guardian} />}

          <div className="bg-emerald-50/50 border border-emerald-200 rounded-xl p-4 shadow-xs space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900">{createdCard.title}</span>
              <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded text-[10px] font-bold">
                Verified by {firstName}
              </span>
            </div>
            <p className="text-slate-800">
              <strong className="text-slate-900">Action: </strong>
              {createdCard.action}
            </p>
            {createdCard.why && (
              <p className="text-slate-600 italic">
                <strong className="text-slate-700">Why: </strong>
                {createdCard.why}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
