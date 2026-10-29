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
        sub="Frictionless knowledge capture for CNC/VMC machinists. Voice, video, logbooks and quick notes — every source becomes a structured card credited to its author."
      />

      <Reveal delay={0.08}>
        <div className="mb-8 inline-flex flex-wrap gap-2 p-1.5 rounded-2xl bg-[#F1F3F4] border border-slate-200/80">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                data-testid={tab.testid}
                onClick={() => setActiveTab(tab.id)}
                className={`flex min-h-12 items-center gap-2.5 rounded-xl px-5 py-3 text-sm font-semibold transition-all duration-200 ${
                  active
                    ? 'bg-white text-maroon-800 font-bold shadow-xs border border-maroon-200/60'
                    : 'text-slate-600 hover:text-slate-900 font-medium hover:bg-white/60'
                }`}
              >
                <Icon size={17} className={active ? 'text-maroon-700' : 'text-slate-400'} />
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
