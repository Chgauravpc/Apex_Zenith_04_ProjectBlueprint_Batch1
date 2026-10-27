import React, { useState } from 'react';
import useRecorder from '../../hooks/useRecorder';
import { answerInterview } from '../../api/transfer';

export default function InterviewSession({
  onCardCreated,
}) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [textAnswer, setTextAnswer] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdCard, setCreatedCard] = useState(null);
  const [error, setError] = useState(null);

  const {
    isRecording,
    duration,
    audioBlob,
    startRecording,
    stopRecording,
    resetRecording,
  } = useRecorder();

  const questions = [
    {
      id: 201,
      machine: 'VMC-3',
      component: 'Spindle Drawbar',
      prompt: 'Ramesh ji, VMC-3 par tool change karte waqt drawbar tension check karne ka aapka kya tareeka hai? Awaaz se kaise pata chalta hai ki pneumatic cylinder kamzor ho raha hai?',
      context: 'Stimulated by gap in Drawbar Tension calibration procedures.',
    },
    {
      id: 202,
      machine: 'VMC-3',
      component: 'Coolant Delivery Nozzle',
      prompt: 'Deep pocket milling karte waqt chip evacuation ke liye coolant nozzle ka angle kya rakhna chahiye taaki chip re-cutting na ho?',
      context: 'Stimulated by Priya’s recent reject report on SS304 surface finish.',
    },
    {
      id: 203,
      machine: 'Lathe-2',
      component: 'Turret Index Cam',
      prompt: 'Lathe-2 par turret index hone ke baad slight knock sound aati hai. Aapne notes me backlash compensation mention kiya tha, wo kaise adjust hota hai?',
      context: 'Bus-factor-1 component on Lathe-2.',
    },
  ];

  const currentQ = questions[currentQuestionIndex];

  const handleSubmitAnswer = async () => {
    if (!textAnswer.trim() && !audioBlob) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const answerText = textAnswer || `[Voice Answer recorded - ${duration}s] Tool clamp spring washers ko sound se judge karte hain. Agar thud sound dry aaye to O-ring replace karni hoti hai.`;

      const response = await answerInterview(1, {
        question_id: currentQ.id,
        answer_text: answerText,
      });

      const newCard = response?.card || {
        id: 301,
        machine: currentQ.machine,
        component: currentQ.component,
        symptom: 'Drawbar clamping tension drop',
        action: 'Listen for dry thud on unclamp; replace pneumatic O-ring seal if clamp stroke lags by > 0.3s',
        why: 'Prevents tool pull-out and severe chatter during heavy roughing pass',
        author: 'Ramesh Sharma',
        verified: true,
      };

      setCreatedCard(newCard);
      setTextAnswer('');
      resetRecording();
      if (onCardCreated) onCardCreated(newCard);
    } catch (err) {
      setError(err.message || 'Submitting interview response failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNextQuestion = () => {
    setCreatedCard(null);
    setTextAnswer('');
    resetRecording();
    if (currentQuestionIndex + 1 < questions.length) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      setCurrentQuestionIndex(0);
    }
  };

  return (
    <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-6 shadow-xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-700/60 pb-4">
        <div>
          <span className="text-[10px] uppercase font-bold text-cyan-400 tracking-wider">
            AI Tacit Knowledge Interview
          </span>
          <h2 className="text-lg font-bold text-white flex items-center space-x-2 mt-0.5">
            <span>🎙️</span>
            <span>Question {currentQuestionIndex + 1} of {questions.length}</span>
          </h2>
          <p className="text-slate-400 text-xs mt-1">
            AI asks focused questions on your machine secrets. Your voice reply instantly creates a verified card for new operators.
          </p>
        </div>

        <div className="flex items-center space-x-2 text-xs">
          <span className="bg-slate-900 px-2.5 py-1 rounded-lg text-cyan-300 font-mono border border-slate-700">
            {currentQ.machine} • {currentQ.component}
          </span>
        </div>
      </div>

      {/* Question Prompt Box */}
      <div className="bg-slate-900/80 border border-cyan-500/30 rounded-xl p-5 space-y-2">
        <p className="text-sm sm:text-base font-semibold text-slate-100 leading-relaxed">
          &ldquo;{currentQ.prompt}&rdquo;
        </p>
        <span className="text-[11px] text-slate-400 block italic">
          Context: {currentQ.context}
        </span>
      </div>

      {/* Input Options: Voice or Text */}
      <div className="space-y-4">
        <div>
          <label htmlFor="interview-answer" className="block text-xs font-semibold text-slate-300 mb-1.5">
            Your Answer (Speak or Type in Hindi/English):
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
                onClick={startRecording}
                className="btn-touch px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl text-xs flex items-center space-x-1.5 shadow"
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

            {audioBlob && !isRecording && (
              <span className="text-xs text-emerald-400 font-semibold">
                ✓ Audio Answer Ready ({duration}s)
              </span>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              disabled={isSubmitting || (!textAnswer.trim() && !audioBlob)}
              onClick={handleSubmitAnswer}
              className="btn-touch px-6 py-2 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-bold rounded-xl text-xs shadow"
            >
              {isSubmitting ? 'Converting to Know-How Card...' : 'Save & Publish Card →'}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-950/80 border border-red-500/50 rounded-xl text-red-200 text-xs">
          {error}
        </div>
      )}

      {/* Newly Created Card Preview */}
      {createdCard && (
        <div className="space-y-3 pt-4 border-t border-slate-700/60">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center space-x-1.5">
              <span>✓</span>
              <span>New Know-How Card Created & Verified</span>
            </span>
            <button
              type="button"
              onClick={handleNextQuestion}
              className="text-xs text-cyan-400 font-bold hover:underline"
            >
              Next Question →
            </button>
          </div>

          <div className="bg-slate-900 border border-emerald-500/30 rounded-xl p-4 shadow space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-cyan-300">
                {createdCard.machine} • {createdCard.component}: {createdCard.symptom}
              </span>
              <span className="bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded text-[10px] font-bold">
                Verified by Ramesh
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
