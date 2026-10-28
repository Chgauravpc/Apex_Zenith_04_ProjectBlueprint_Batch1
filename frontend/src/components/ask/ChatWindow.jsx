import React, { useState } from 'react';
import MachineOptions from '../common/MachineOptions';
import { askQuestion, askVoice } from '../../api/ask';
import { routeQuestion } from '../../api/transfer';
import { useAuthStore } from '../../store/useAuthStore';
import AnswerCard from './AnswerCard';
import useRecorder from '../../hooks/useRecorder';

const SUGGESTED_QUERIES = [
  'VMC-3 pe SS304 roughing karte waqt chatter aa raha hai, kya karun?',
  'Lathe-2 spindle vibration normal se zyada lag rahi hai',
  'Coolant pressure low alarm aane par kya check karein?',
  'High speed milling par chip ka colour dark blue kyu ho raha hai?',
];

export default function ChatWindow() {
  const { currentUser } = useAuthStore();
  const [query, setQuery] = useState('');
  const [machineId, setMachineId] = useState(1);
  const [language, setLanguage] = useState('hi');
  const [isLoading, setIsLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState(null);

  const {
    isRecording,
    duration,
    audioBlob,
    startRecording,
    stopRecording,
    resetRecording,
  } = useRecorder();

  const handleAsk = async (textToAsk = query) => {
    if (!textToAsk.trim()) return;

    const userMsg = { role: 'user', text: textToAsk, ts: new Date().toLocaleTimeString() };
    setHistory((prev) => [userMsg, ...prev]);
    setQuery('');
    setIsLoading(true);
    setError(null);

    try {
      const answer = await askQuestion({
        question: textToAsk,
        machine_id: machineId,
        language,
        asked_by_id: currentUser.id,
      });

      setHistory((prev) => [
        { role: 'assistant', data: answer, language, ts: new Date().toLocaleTimeString() },
        ...prev,
      ]);
    } catch (err) {
      setError(err.message || 'Failed to retrieve grounded advice.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVoiceSubmit = async () => {
    if (!audioBlob) return;
    setIsLoading(true);
    setError(null);

    const userMsg = {
      role: 'user',
      text: `🎙️ Voice Note (${duration}s)`,
      ts: new Date().toLocaleTimeString(),
    };
    setHistory((prev) => [userMsg, ...prev]);

    try {
      const formData = new FormData();
      formData.append('file', audioBlob, 'question.webm');
      formData.append('machine_id', machineId.toString());
      formData.append('language', language);
      formData.append('asked_by_id', currentUser.id.toString());

      const answer = await askVoice(formData);
      setHistory((prev) => [
        { role: 'assistant', data: answer, language, ts: new Date().toLocaleTimeString() },
        ...prev,
      ]);
      resetRecording();
    } catch (err) {
      setError(err.message || 'Failed to process voice query.');
    } finally {
      setIsLoading(false);
    }
  };

  /** Route an unanswered question to the expert; their reply becomes a verified card. */
  const handleAskExpert = async (answer) => {
    setError(null);
    try {
      const routed = await routeQuestion(answer.query_id);
      setHistory((prev) => [
        {
          role: 'system',
          text: `Sent to ${routed.routed_to}. Their reply will be saved as a verified card.`,
          ts: new Date().toLocaleTimeString(),
        },
        ...prev,
      ]);
    } catch (err) {
      setError(`Question not sent: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Query Input Box */}
      <div className="bg-white border border-slate-200/90 shadow-sm rounded-2xl p-5 space-y-4 focus-within:ring-2 focus-within:ring-maroon-500/20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
          <div className="flex items-center space-x-2">
            <span className="text-xl" aria-hidden="true">💬</span>
            <span className="font-bold text-slate-900 text-base">Ask Shop-Floor Experience</span>
          </div>

          <div className="flex items-center space-x-3 text-xs">
            <label className="text-slate-600 flex items-center space-x-1">
              <span>Machine:</span>
              <select
                value={machineId}
                onChange={(e) => setMachineId(Number(e.target.value))}
                className="bg-white border border-slate-200 text-slate-800 py-1 px-2.5 rounded-lg focus:border-maroon-700 outline-none"
              >
                <MachineOptions />
              </select>
            </label>

            <label className="text-slate-600 flex items-center space-x-1">
              <span>Lang:</span>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="bg-white border border-slate-200 text-slate-800 py-1 px-2.5 rounded-lg focus:border-maroon-700 outline-none"
              >
                <option value="hi">हिन्दी</option>
                <option value="mr">मराठी</option>
                <option value="en">English</option>
              </select>
            </label>
          </div>
        </div>

        {/* Text Input & Controls */}
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleAsk();
                }
              }}
              placeholder="Ask anything about machine symptoms, tools, or procedures in Hindi/Marathi/English..."
              className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:border-maroon-700 focus:ring-1 focus:ring-maroon-700 placeholder-slate-400 outline-none shadow-xs"
            />

            <button
              type="button"
              disabled={isLoading || !query.trim()}
              onClick={() => handleAsk()}
              className="btn-touch px-6 py-2.5 bg-maroon-700 hover:bg-maroon-800 disabled:opacity-50 text-white font-semibold rounded-xl text-sm shadow-xs transition"
            >
              Ask
            </button>
          </div>

          {/* Voice push-to-talk row */}
          <div className="flex items-center justify-between text-xs pt-1">
            <div className="flex items-center space-x-3">
              {!isRecording ? (
                <button
                  type="button"
                  onClick={startRecording}
                  className="btn-touch px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 border border-slate-200 rounded-lg flex items-center space-x-1.5 transition shadow-xs"
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                  <span>Ask by Voice</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={stopRecording}
                  className="btn-touch px-3 py-1.5 bg-rose-600 text-white font-bold rounded-lg flex items-center space-x-1.5 animate-pulse"
                >
                  <span>⏹️ Stop ({duration}s)</span>
                </button>
              )}

              {audioBlob && !isRecording && (
                <div className="flex items-center space-x-2">
                  <span className="text-emerald-700 font-semibold">Audio Ready ({duration}s)</span>
                  <button
                    type="button"
                    onClick={handleVoiceSubmit}
                    disabled={isLoading}
                    className="btn-touch px-3.5 py-1.5 bg-maroon-700 hover:bg-maroon-800 text-white font-semibold rounded-lg text-xs shadow-xs"
                  >
                    Send Voice Question
                  </button>
                  <button
                    type="button"
                    onClick={resetRecording}
                    className="text-slate-500 hover:text-slate-800 text-xs"
                  >
                    Discard
                  </button>
                </div>
              )}
            </div>

            <span className="text-slate-400 hidden sm:inline">
              Enter sends • Cites verified cards
            </span>
          </div>
        </div>

        {/* Quick Suggested Queries */}
        <div className="pt-2">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-2">
            Suggested Shop-Floor Questions:
          </span>
          <div className="flex flex-wrap gap-2">
            {SUGGESTED_QUERIES.map((sq, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setQuery(sq);
                  handleAsk(sq);
                }}
                className="text-xs bg-slate-50 hover:bg-maroon-50 border border-slate-200 hover:border-maroon-200 text-slate-700 hover:text-maroon-800 rounded-lg px-2.5 py-1 text-left transition shadow-xs"
              >
                {sq}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-medium">
          {error}
        </div>
      )}

      {/* Loading Indicator */}
      {isLoading && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 flex items-center justify-center space-x-3 text-slate-600 text-sm shadow-xs">
          <div className="w-6 h-6 border-2 border-maroon-700 border-t-transparent rounded-full animate-spin" />
          <span>Searching shop-floor memory and synthesizing grounded answer...</span>
        </div>
      )}

      {/* Chat History */}
      <div className="space-y-4">
        {history.map((item, idx) => (
          <div key={idx}>
            {item.role === 'user' ? (
              <div className="flex justify-end">
                <div className="bg-maroon-50 border border-maroon-200 text-maroon-950 rounded-2xl px-4 py-3 max-w-xl text-sm shadow-xs">
                  <div className="text-[10px] text-maroon-700 mb-1 font-semibold">
                    You ({currentUser.name}) • {item.ts}
                  </div>
                  <p>{item.text}</p>
                </div>
              </div>
            ) : item.role === 'system' ? (
              <p className="text-center text-xs text-emerald-300">
                ✓ {item.text} • {item.ts}
              </p>
            ) : (
              <>
                {item.data.transcript && (
                  <p className="text-xs text-slate-400 mb-2">
                    Heard: <span className="text-slate-200">“{item.data.transcript}”</span>
                  </p>
                )}
                <AnswerCard answer={item.data} language={item.language} onAskExpert={handleAskExpert} />
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
