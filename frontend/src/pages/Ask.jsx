import React, { useState } from 'react';
import ChatWindow from '../components/ask/ChatWindow';
import ChatterDoctor from '../components/ask/ChatterDoctor';
import ChipReader from '../components/ask/ChipReader';
import { useAuthStore } from '../store/useAuthStore';
import { t } from '../utils/i18n';

export default function Ask() {
  const { language } = useAuthStore();
  const [activeTab, setActiveTab] = useState('chat');

  const tabs = [
    { id: 'chat', label: 'Grounded Q&A Chat', icon: '💬' },
    { id: 'chatter', label: 'Chatter Doctor (Acoustic)', icon: '🔊' },
    { id: 'chips', label: 'Chip Colour Reader (Thermal)', icon: '🔍' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center space-x-2">
            <span>💡</span>
            <span>{t('navAsk', language)}</span>
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-1">
            Synthesize 28+ years of machining know-how with grounded citations, acoustic chatter analysis, and chip thermal diagnosis.
          </p>
        </div>
      </div>

      {/* Mode Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`btn-touch px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center space-x-2 ${
              activeTab === tab.id
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Active Tab View */}
      <div>
        {activeTab === 'chat' && <ChatWindow />}
        {activeTab === 'chatter' && <ChatterDoctor />}
        {activeTab === 'chips' && <ChipReader />}
      </div>
    </div>
  );
}
