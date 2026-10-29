import React, { useState } from 'react';
import { Mic, Video, ScanLine, Type, UploadCloud } from 'lucide-react';
import VoiceRecorder from '../components/capture/VoiceRecorder';
import NoteEditor from '../components/capture/NoteEditor';
import PhotoUpload from '../components/capture/PhotoUpload';
import VideoUpload from '../components/capture/VideoUpload';
import { PageHead, Reveal } from '../components/common';

const TABS = [
  { id: 'voice', label: 'Voice Note', icon: Mic, testid: 'capture-mode-voice' },
  { id: 'text', label: 'Text & Params', icon: Type, testid: 'capture-mode-text' },
  { id: 'photo', label: 'Handwritten / Photo', icon: ScanLine, testid: 'capture-mode-ocr' },
  { id: 'video', label: 'Setup Video', icon: Video, testid: 'capture-mode-video' },
];

export default function Capture() {
  const [activeTab, setActiveTab] = useState('voice');

  return (
    <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
      <PageHead
        eyebrow="Lane 01 · Capture"
        title="Know-how in, manuals never."
        sub="Voice, video, logbooks and quick notes — every source becomes a structured card credited to its author."
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
            {activeTab === 'voice' && <VoiceRecorder />}
            {activeTab === 'text' && <NoteEditor />}
            {activeTab === 'photo' && <PhotoUpload />}
            {activeTab === 'video' && <VideoUpload />}
          </div>
        </div>
      </Reveal>

      <p className="mt-8 flex items-center gap-2 text-xs text-slate-400">
        <UploadCloud size={14} className="text-copper" />
        Runs with real AI pipeline & offline fallback — recordings and parameter checks verified on-device.
      </p>
    </div>
  );
}
