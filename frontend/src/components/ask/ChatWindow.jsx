import React, { useState } from 'react';
import { askQuestion, askVoice } from '../../api/ask';
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
      });

      setHistory((prev) => [{ role: 'assistant', data: answer, ts: new Date().toLocaleTimeString() }, ...prev]);
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

      const answer = await askVoice(formData);
      setHistory((prev) => [{ role: 'assistant', data: answer, ts: new Date().toLocaleTimeString() }, ...prev]);
      resetRecording();
    } catch (err) {
      setError(err.message || 'Failed to process voice query.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Query Input Box */}
      <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-700/60 pb-3">
          <div className="flex items-center space-x-2">
            <span className="text-xl" aria-hidden="true">💬</span>
            <span className="font-bold text-white text-base">Ask Shop-Floor Experience</span>
          </div>

          <div className="flex items-center space-x-3 text-xs">
            <label className="text-slate-300 flex items-center space-x-1">
              <span>Machine:</span>
              <select
                value={machineId}
                onChange={(e) => setMachineId(Number(e.target.value))}
                className="bg-slate-900 border border-slate-700 text-slate-200 py-1 px-2 rounded-lg"
              >
                <option value={1}>VMC-3</option>
                <option value={2}>Lathe-2</option>
              </select>
            </label>

            <label className="text-slate-300 flex items-center space-x-1">
              <span>Lang:</span>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="bg-slate-900 border border-slate-700 text-slate-200 py-1 px-2 rounded-lg"
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
              className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 placeholder-slate-500"
            />

            <button
              type="button"
              disabled={isLoading || !query.trim()}
              onClick={() => handleAsk()}
              className="btn-touch px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-bold rounded-xl text-sm transition"
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
                  className="btn-touch px-3 py-1.5 bg-slate-900 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg flex items-center space-x-1.5 transition"
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                  <span>Ask by Voice</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={stopRecording}
                  className="btn-touch px-3 py-1.5 bg-amber-500 text-slate-950 font-bold rounded-lg flex items-center space-x-1.5"
                >
                  <span>⏹️ Stop ({duration}s)</span>
                </button>
              )}

              {audioBlob && !isRecording && (
                <div className="flex items-center space-x-2">
                  <span className="text-emerald-400 font-semibold">Audio Ready ({duration}s)</span>
                  <button
                    type="button"
                    onClick={handleVoiceSubmit}
                    disabled={isLoading}
                    className="btn-touch px-3 py-1 bg-cyan-500 text-slate-950 font-bold rounded-lg"
                  >
                    Send Voice Question
                  </button>
                  <button
                    type="button"
                    onClick={resetRecording}
                    className="text-slate-400 hover:text-slate-200 text-xs"
                  >
                    Discard
                  </button>
                </div>
              )}
            </div>

            <span className="text-slate-500 hidden sm:inline">
              Enter sends • Cites verified cards
            </span>
          </div>
        </div>

        {/* Quick Suggested Queries */}
        <div className="pt-2">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
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
                className="text-xs bg-slate-900 hover:bg-slate-700 text-slate-300 border border-slate-800 rounded-lg px-2.5 py-1 text-left transition"
              >
                {sq}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-950/80 border border-red-500/50 rounded-xl text-red-200 text-xs">
          {error}
        </div>
      )}

      {/* Loading Indicator */}
      {isLoading && (
        <div className="bg-slate-800/80 border border-cyan-500/30 rounded-2xl p-6 flex items-center justify-center space-x-3 text-slate-300 text-sm">
          <div className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
          <span>Searching shop-floor memory and synthesizing grounded answer...</span>
        </div>
      )}

      {/* Chat History */}
      <div className="space-y-4">
        {history.map((item, idx) => (
          <div key={idx}>
            {item.role === 'user' ? (
              <div className="flex justify-end">
                <div className="bg-cyan-500/15 border border-cyan-500/30 text-cyan-100 rounded-2xl px-4 py-3 max-w-xl text-sm shadow">
                  <div className="text-[10px] text-cyan-400/80 mb-1 font-semibold">
                    You ({currentUser.name}) • {item.ts}
                  </div>
                  <p>{item.text}</p>
                </div>
              </div>
            ) : (
              <AnswerCard answer={item.data} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
