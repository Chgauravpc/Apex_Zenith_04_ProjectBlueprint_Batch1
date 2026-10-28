import React, { useState } from 'react';
import SourceCard from './SourceCard';
import useSpeech from '../../hooks/useSpeech';
import { submitFeedback } from '../../api/ask';

export default function AnswerCard({ answer, onAskExpert, language = 'hi' }) {
  const { isPlaying, speak, stop } = useSpeech();
  const [feedbackGiven, setFeedbackGiven] = useState(null);
  const [feedbackError, setFeedbackError] = useState(null);

  if (!answer) return null;

  const handleFeedback = async (helpful) => {
    if (feedbackGiven !== null) return;
    setFeedbackGiven(helpful);
    setFeedbackError(null);
    if (answer.query_id) {
      try {
        await submitFeedback(answer.query_id, { helpful });
      } catch (e) {
        setFeedbackGiven(null); // not saved: let them try again
        setFeedbackError(`Feedback not saved: ${e.message}`);
      }
    }
  };

  const handleSpeak = () => {
    if (isPlaying) {
      stop();
    } else {
      const fullText = `${answer.answer}. ${answer.watch_out ? `Watch out: ${answer.watch_out}` : ''}`;
      speak(fullText, language, answer.audio_url);
    }
  };

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm space-y-5 text-slate-800">
      {/* Not Enough Data / Routing Banner */}
      {answer.not_enough_data ? (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-950 text-xs space-y-3">
          <div className="flex items-center space-x-2 font-bold text-amber-900 text-sm">
            <span>❓</span>
            <span>Not Enough Verified Data on Shop Floor</span>
          </div>
          <p>
            The system could not find enough verified cards to answer this safely without guessing.
            {answer.suggested_expert
              ? `Would you like to route this question directly to ${answer.suggested_expert}?`
              : 'Nobody has recorded know-how on this machine yet, so there is no expert to route it to.'}
          </p>
          {onAskExpert && answer.suggested_expert && (
            <button
              type="button"
              onClick={() => onAskExpert(answer)}
              className="btn-touch px-4 py-2 bg-maroon-700 hover:bg-maroon-800 text-white font-medium rounded-xl text-xs transition shadow-xs"
            >
              Ask {answer.suggested_expert} →
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Header with Read Aloud & Confidence */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/90 pb-3">
            <div className="flex items-center space-x-2">
              <span className="text-xl" aria-hidden="true">💡</span>
              <span className="text-sm font-bold uppercase tracking-wider text-slate-900">
                Grounded Machine Advice
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-maroon-50 text-maroon-800 border border-maroon-200">
                Confidence {Math.round((answer.confidence ?? 0) * 100)}%
              </span>
            </div>

            <button
              type="button"
              onClick={handleSpeak}
              className={`btn-touch px-3 py-1.5 rounded-lg text-xs font-medium flex items-center space-x-1.5 transition ${
                isPlaying
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                  : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/90 shadow-xs'
              }`}
            >
              <span>{isPlaying ? '⏹️ Stop Voice' : '🔊 Read Aloud (Edge-TTS)'}</span>
            </button>
          </div>

          {/* Main Answer Text */}
          <div className="text-sm text-slate-800 leading-relaxed font-normal">
            {answer.answer}
          </div>

          {/* Action Steps */}
          {answer.steps && answer.steps.length > 0 && (
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-2">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Recommended Action Steps:
              </span>
              <ol className="list-decimal list-inside space-y-1.5 text-xs text-slate-700">
                {answer.steps.map((st, idx) => (
                  <li key={idx} className="leading-snug">
                    <span className="font-semibold text-maroon-800">Step {idx + 1}: </span>
                    {st}
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Watch Out Warning */}
          {answer.watch_out && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-amber-950 text-xs flex items-start space-x-2">
              <span className="text-base select-none" aria-hidden="true">⚠️</span>
              <div>
                <strong className="font-bold text-amber-900">Watch Out: </strong>
                <span>{answer.watch_out}</span>
              </div>
            </div>
          )}

          {/* Cited Sources List */}
          {answer.sources && answer.sources.length > 0 && (
            <div className="space-y-2.5 pt-3 border-t border-slate-200/90">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                Citing {answer.sources.length} Verified Source{answer.sources.length > 1 ? 's' : ''}:
              </span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {answer.sources.map((src, idx) => (
                  <SourceCard key={src.id || idx} source={src} />
                ))}
              </div>
            </div>
          )}

          {/* Feedback Section */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-200/90 text-xs text-slate-500">
            <span>Was this advice helpful on the shop floor?</span>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                disabled={feedbackGiven !== null}
                onClick={() => handleFeedback(true)}
                className={`px-3 py-1 rounded-lg border text-xs font-medium transition ${
                  feedbackGiven === true
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                    : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200/90 shadow-xs'
                }`}
              >
                👍 Helpful
              </button>
              <button
                type="button"
                disabled={feedbackGiven !== null}
                onClick={() => handleFeedback(false)}
                className={`px-3 py-1 rounded-lg border text-xs font-medium transition ${
                  feedbackGiven === false
                    ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                    : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200/90 shadow-xs'
                }`}
              >
                👎 Unhelpful
              </button>
            </div>
          </div>
          {feedbackError && (
            <p role="alert" className="text-xs text-red-300">
              {feedbackError}
            </p>
          )}
        </>
      )}
    </div>
  );
}
