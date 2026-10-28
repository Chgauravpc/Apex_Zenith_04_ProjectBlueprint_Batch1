import React, { useState } from 'react';
import VoiceRecorder from '../components/capture/VoiceRecorder';
import NoteEditor from '../components/capture/NoteEditor';
import PhotoUpload from '../components/capture/PhotoUpload';
import VideoUpload from '../components/capture/VideoUpload';
import { useAuthStore } from '../store/useAuthStore';
import { t } from '../utils/i18n';
import { MicIcon, FileTextIcon, CameraIcon, VideoIcon } from '../components/common/Icons';

export default function Capture() {
  const { language } = useAuthStore();
  const [activeTab, setActiveTab] = useState('voice');

  const tabs = [
    { id: 'voice', label: 'Voice Note', icon: <MicIcon className="w-3.5 h-3.5" /> },
    { id: 'text', label: 'Text & Params', icon: <FileTextIcon className="w-3.5 h-3.5" /> },
    { id: 'photo', label: 'Handwritten / Photo', icon: <CameraIcon className="w-3.5 h-3.5" /> },
    { id: 'video', label: 'Setup Video', icon: <VideoIcon className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-700/60 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center space-x-2.5">
            <MicIcon className="w-6 h-6 text-cyan-400" />
            <span>{t('navCapture', language)}</span>
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-1.5 font-medium leading-relaxed">
            Frictionless knowledge capture for CNC/VMC machinists. Speak, type, photograph, or record video.
          </p>
        </div>
      </div>

      {/* Mode Navigation Tabs (Industrial Segmented Control) */}
      <div className="flex overflow-x-auto pb-1">
        <div className="inline-flex p-1 bg-slate-950/80 border border-slate-700/80 rounded-xl gap-1 shadow-inner">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`btn-touch px-3.5 py-2 rounded-lg text-xs font-semibold transition-all flex items-center space-x-2 whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-slate-800 text-cyan-300 border border-slate-700 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Active Tab Content */}
      <div>
        {activeTab === 'voice' && <VoiceRecorder />}
        {activeTab === 'text' && <NoteEditor />}
        {activeTab === 'photo' && <PhotoUpload />}
        {activeTab === 'video' && <VideoUpload />}
      </div>
    </div>
  );
}
