import React, { useState } from 'react';
import { MessageSquareText, AudioLines, Palette, Activity } from 'lucide-react';
import ChatWindow from '../components/ask/ChatWindow';
import ChatterDoctor from '../components/ask/ChatterDoctor';
import ChipReader from '../components/ask/ChipReader';
import { PageHead, Reveal } from '../components/common';

const TABS = [
  { id: 'chat', label: 'Grounded Q&A Chat', icon: MessageSquareText, testid: 'tab-chat' },
  { id: 'chatter', label: 'Chatter Doctor (Acoustic)', icon: AudioLines, testid: 'tab-chatter-doctor' },
  { id: 'chips', label: 'Chip Colour Reader (Thermal)', icon: Palette, testid: 'tab-chip-reader' },
];

export default function Ask() {
  const [activeTab, setActiveTab] = useState('chat');

  return (
    <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
      <PageHead
        eyebrow="Lane 02 · Searchable assistant"
        title="Ask the floor. It answers with receipts."
        sub="Every response is built only from cited records — otherwise the question routes to the veteran who knows."
      />

      <Reveal delay={0.08}>
        <div className="mb-8 flex flex-wrap gap-2">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                data-testid={tab.testid}
                onClick={() => setActiveTab(tab.id)}
                className={`flex min-h-12 items-center gap-2.5 rounded-full px-5 py-3 text-sm font-semibold transition-colors duration-200 ${
                  active
                    ? 'bg-ink text-white'
                    : 'border border-slate-200 bg-white text-slate-600 hover:border-slate-400'
                }`}
              >
                <Icon size={17} className={active ? 'text-copper' : 'text-slate-400'} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </Reveal>

      <Reveal delay={0.14}>
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div>
            {activeTab === 'chat' && <ChatWindow />}
            {activeTab === 'chatter' && <ChatterDoctor />}
            {activeTab === 'chips' && <ChipReader />}
          </div>
        </div>
      </Reveal>

      <p className="mt-8 flex items-center gap-2 text-xs text-slate-400">
        <Activity size={14} className="text-copper" />
        Synthesizing 28+ years of machining know-how with grounded citations, acoustic chatter analysis, and chip thermal diagnosis.
      </p>
    </div>
  );
}
