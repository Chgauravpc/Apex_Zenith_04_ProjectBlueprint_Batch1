import React, { useState } from 'react';
import SourceCard from './SourceCard';
import useSpeech from '../../hooks/useSpeech';
import { submitFeedback } from '../../api/ask';

export default function AnswerCard({ answer, onAskExpert }) {
  const { isPlaying, speak, stop } = useSpeech();
  const [feedbackGiven, setFeedbackGiven] = useState(null);

  if (!answer) return null;

  const handleFeedback = async (helpful) => {
    if (feedbackGiven !== null) return;
    setFeedbackGiven(helpful);
    if (answer.query_id) {
      try {
        await submitFeedback(answer.query_id, { helpful });
      } catch (e) {
        console.error('Feedback submit failed', e);
      }
    }
  };

  const handleSpeak = () => {
    if (isPlaying) {
      stop();
    } else {
      const fullText = `${answer.answer}. ${answer.watch_out ? `Watch out: ${answer.watch_out}` : ''}`;
      speak(fullText, 'hi', answer.audio_url);
    }
  };

  return (
    <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-6 shadow-xl space-y-5">
      {/* Not Enough Data / Routing Banner */}
      {answer.not_enough_data ? (
        <div className="bg-amber-950/80 border border-amber-500/60 rounded-xl p-4 text-amber-200 text-xs space-y-3">
          <div className="flex items-center space-x-2 font-bold text-amber-300 text-sm">
            <span>❓</span>
            <span>Not Enough Verified Data on Shop Floor</span>
          </div>
          <p>
            The system could not find enough verified cards to answer this safely without guessing.
            Would you like to route this question directly to {answer.suggested_expert || 'Ramesh (Old Employee)'}?
          </p>
          {onAskExpert && (
            <button
              type="button"
              onClick={() => onAskExpert(answer)}
              className="btn-touch px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs transition"
            >
              Ask {answer.suggested_expert || 'Ramesh'} via Voice/Message →
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Header with Read Aloud & Confidence */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-700/60 pb-3">
            <div className="flex items-center space-x-2">
              <span className="text-xl" aria-hidden="true">💡</span>
              <span className="text-sm font-bold uppercase tracking-wider text-cyan-300">
                Grounded Machine Advice
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                Confidence {Math.round((answer.confidence || 0.88) * 100)}%
              </span>
            </div>

            <button
              type="button"
              onClick={handleSpeak}
              className={`btn-touch px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition ${
                isPlaying
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
              }`}
            >
              <span>{isPlaying ? '⏹️ Stop Voice' : '🔊 Read Aloud (Edge-TTS)'}</span>
            </button>
          </div>

          {/* Main Answer Text */}
          <div className="text-sm text-slate-100 leading-relaxed font-medium">
            {answer.answer}
          </div>

          {/* Action Steps */}
          {answer.steps && answer.steps.length > 0 && (
            <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 space-y-2">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                Recommended Action Steps:
              </span>
              <ol className="list-decimal list-inside space-y-1.5 text-xs text-slate-200">
                {answer.steps.map((st, idx) => (
                  <li key={idx} className="leading-snug">
                    <span className="font-semibold text-cyan-300">Step {idx + 1}: </span>
                    {st}
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Watch Out Warning */}
          {answer.watch_out && (
            <div className="bg-amber-950/60 border border-amber-500/40 rounded-xl p-3.5 text-amber-200 text-xs flex items-start space-x-2">
              <span className="text-base select-none" aria-hidden="true">⚠️</span>
              <div>
                <strong className="font-bold text-amber-300">Watch Out: </strong>
                <span>{answer.watch_out}</span>
              </div>
            </div>
          )}

          {/* Cited Sources List */}
          {answer.sources && answer.sources.length > 0 && (
            <div className="space-y-2.5 pt-3 border-t border-slate-700/60">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
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
          <div className="flex items-center justify-between pt-3 border-t border-slate-700/60 text-xs text-slate-400">
            <span>Was this advice helpful on the shop floor?</span>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                disabled={feedbackGiven !== null}
                onClick={() => handleFeedback(true)}
                className={`px-3 py-1 rounded-lg border text-xs transition ${
                  feedbackGiven === true
                    ? 'bg-emerald-600 text-white border-emerald-500'
                    : 'bg-slate-900 hover:bg-slate-700 text-slate-300 border-slate-700'
                }`}
              >
                👍 Helpful
              </button>
              <button
                type="button"
                disabled={feedbackGiven !== null}
                onClick={() => handleFeedback(false)}
                className={`px-3 py-1 rounded-lg border text-xs transition ${
                  feedbackGiven === false
                    ? 'bg-red-600 text-white border-red-500'
                    : 'bg-slate-900 hover:bg-slate-700 text-slate-300 border-slate-700'
                }`}
              >
                👎 Unhelpful
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
