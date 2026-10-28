import React, { useState } from 'react';
import ChatWindow from '../components/ask/ChatWindow';
import ChatterDoctor from '../components/ask/ChatterDoctor';
import ChipReader from '../components/ask/ChipReader';
import { useAuthStore } from '../store/useAuthStore';
import { t } from '../utils/i18n';
import { LightbulbIcon, MessageSquareIcon, VolumeIcon, SearchIcon } from '../components/common/Icons';

export default function Ask() {
  const { language } = useAuthStore();
  const [activeTab, setActiveTab] = useState('chat');

  const tabs = [
    { id: 'chat', label: 'Grounded Q&A Chat', icon: <MessageSquareIcon className="w-3.5 h-3.5" /> },
    { id: 'chatter', label: 'Chatter Doctor (Acoustic)', icon: <VolumeIcon className="w-3.5 h-3.5" /> },
    { id: 'chips', label: 'Chip Colour Reader (Thermal)', icon: <SearchIcon className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center space-x-2.5">
            <LightbulbIcon className="w-6 h-6 text-maroon-700" />
            <span>{t('navAsk', language)}</span>
          </h1>
          <p className="text-slate-600 text-xs sm:text-sm mt-1.5 font-medium leading-relaxed">
            Synthesize 28+ years of machining know-how with grounded citations, acoustic chatter analysis, and chip thermal diagnosis.
          </p>
        </div>
      </div>

      {/* Mode Tabs (Google Pill Segmented Control) */}
      <div className="flex overflow-x-auto pb-1">
        <div className="inline-flex p-1 bg-[#F1F3F4] border border-[#DADCE0] rounded-xl gap-1 shadow-xs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`btn-touch px-3.5 py-2 rounded-lg text-xs font-semibold transition-all flex items-center space-x-2 whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-white text-maroon-800 border border-[#DADCE0] shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60 border border-transparent'
              }`}
            >
              <span className={activeTab === tab.id ? 'text-maroon-700' : 'text-slate-500'}>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
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
