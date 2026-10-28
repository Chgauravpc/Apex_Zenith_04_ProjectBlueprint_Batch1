import React, { useState, useEffect, useCallback } from 'react';
import MachineViewer from '../components/map3d/MachineViewer';
import ComponentPanel from '../components/map3d/ComponentPanel';
import PinForm from '../components/map3d/PinForm';
import { useMachineStore } from '../store/useMachineStore';
import { useAuthStore } from '../store/useAuthStore';
import { getComponents, createPin, VMC_COMPONENTS_DATA } from '../api/map3d';
import { t } from '../utils/i18n';
import { CogIcon, CheckIcon } from '../components/common/Icons';

/**
 * 3D Machine Knowledge Map Page.
 * Visual interactive 3D index of shop-floor machining know-how,
 * failure incidents, and expert tips pinned to CNC machine components.
 * Reference: PRD.md §9.4 and TASKS.md T21.
 */
export default function MachineMap() {
  const { language } = useAuthStore();
  const {
    selectedMachineId,
    selectedComponentId,
    highlightedComponentId,
    setSelectedComponentId,
  } = useMachineStore();

  const [components, setComponents] = useState(VMC_COMPONENTS_DATA);
  const [selectedMesh, setSelectedMesh] = useState(
    selectedComponentId || 'spindle'
  );
  const [doorsOpen, setDoorsOpen] = useState(false);
  const [pinFormOpen, setPinFormOpen] = useState(false);
  const [pinTargetComponent, setPinTargetComponent] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  // Load components from API with fallback
  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    async function load() {
      const data = await getComponents(selectedMachineId, controller.signal);
      if (active && data && data.length > 0) {
        setComponents(data);
      }
    }

    load();
    return () => {
      active = false;
      controller.abort();
    };
  }, [selectedMachineId]);

  // Sync selected mesh from store if changed externally (e.g. Note Guardian warning)
  useEffect(() => {
    if (selectedComponentId !== undefined) {
      setSelectedMesh(selectedComponentId);
    }
  }, [selectedComponentId]);

  const handleSelectComponent = useCallback(
    (meshName) => {
      setSelectedMesh(meshName);
      setSelectedComponentId(meshName);
    },
    [setSelectedComponentId]
  );

  const handleResetSelection = useCallback(() => {
    setSelectedMesh(null);
    setSelectedComponentId(null);
  }, [setSelectedComponentId]);

  const handleToggleDoors = useCallback(() => {
    setDoorsOpen((prev) => !prev);
  }, []);

  const handleOpenPinForm = (comp) => {
    setPinTargetComponent(comp);
    setPinFormOpen(true);
  };

  const handleClosePinForm = () => {
    setPinFormOpen(false);
    setPinTargetComponent(null);
  };

  const handleSavePin = async (pinData) => {
    const res = await createPin(pinData.component_id, pinData);
    if (res) {
      // Append new note to the component's expert notes list in local state
      setComponents((prev) =>
        prev.map((c) => {
          if (c.id === pinData.component_id || c.mesh_name === pinData.mesh_name) {
            const updatedNotes = [
              {
                id: res.id || Date.now(),
                author: pinData.author,
                date: pinData.date,
                severity: pinData.severity,
                title: pinData.title,
                text: pinData.text,
                verified: pinData.verified,
              },
              ...(c.expert_notes || []),
            ];
            return {
              ...c,
              expert_notes: updatedNotes,
            };
          }
          return c;
        })
      );

      setToastMessage(`Pinned new know-how to ${pinData.title}!`);
      setTimeout(() => setToastMessage(null), 4000);
    }
  };

  const selectedComponentData = selectedMesh
    ? components.find((c) => c.mesh_name === selectedMesh) || null
    : null;

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-emerald-600 text-white px-4 py-2.5 rounded-xl shadow-2xl flex items-center space-x-2 border border-emerald-400">
          <CheckIcon className="w-4 h-4 text-white" />
          <span className="text-xs font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Top Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center space-x-2">
              <CogIcon className="w-6 h-6 text-cyan-400" />
              <span>{t('navMap', language)}</span>
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
              VMC-3 (Vertical Machining Centre)
            </span>
          </div>
          <p className="text-slate-400 text-sm mt-1 max-w-2xl">
            Interactive 3D model with independently clickable machine components,
            real-time hover highlighting, verified old-employee advice, and component failure logs.
          </p>
        </div>

        {/* Machine Telemetry Badge */}
        <div className="flex items-center space-x-3 bg-slate-800/80 border border-slate-700/80 px-4 py-2 rounded-xl text-xs">
          <div>
            <div className="text-slate-400">Location</div>
            <div className="font-bold text-white">Bay A • Cell 2</div>
          </div>
          <div className="w-px h-7 bg-slate-700" />
          <div>
            <div className="text-slate-400">Max Spindle Speed</div>
            <div className="font-mono font-bold text-cyan-400">12,000 RPM</div>
          </div>
          <div className="w-px h-7 bg-slate-700" />
          <div>
            <div className="text-slate-400">Mentor Pairing</div>
            <div className="font-bold text-emerald-400">Ramesh (Old) → Priya (New)</div>
          </div>
        </div>
      </div>

      {/* Main 3D Stage & Detail Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: 3D Canvas Viewport (8 Cols) */}
        <div className="lg:col-span-8 flex flex-col space-y-3">
          <MachineViewer
            selectedComponent={selectedMesh}
            highlightedComponent={highlightedComponentId}
            onSelectComponent={handleSelectComponent}
            onResetSelection={handleResetSelection}
            doorsOpen={doorsOpen}
            onToggleDoors={handleToggleDoors}
            components={components}
          />

          {/* Quick Select Component Filter Pills Bar with Reset option */}
          <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-xl flex items-center gap-2 overflow-x-auto">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap pl-1">
              Components:
            </span>

            {/* Reset Selection Button in Pill Bar */}
            {selectedMesh && (
              <button
                type="button"
                onClick={handleResetSelection}
                className="btn-touch px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-400/50 shadow-sm transition flex items-center space-x-1"
                title="Reset Selection"
              >
                <span>↺</span>
                <span>Reset Selection</span>
              </button>
            )}

            {components.map((c) => {
              const isSelected = selectedMesh === c.mesh_name;
              return (
                <button
                  key={c.mesh_name}
                  type="button"
                  onClick={() => handleSelectComponent(c.mesh_name)}
                  className={`btn-touch px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition flex items-center space-x-1.5 ${
                    isSelected
                      ? 'bg-cyan-500 text-slate-950 font-bold shadow-md ring-2 ring-cyan-300'
                      : 'bg-slate-800/90 hover:bg-slate-700 text-slate-300 border border-slate-700/70'
                  }`}
                >
                  {c.risk === 'high' && (
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-ping" />
                  )}
                  {c.risk === 'medium' && (
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  )}
                  <span>{c.display_name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Column: Component Knowledge Panel (4 Cols) */}
        <div className="lg:col-span-4">
          <ComponentPanel
            component={selectedComponentData}
            onClose={handleResetSelection}
            onResetSelection={handleResetSelection}
            onOpenPinForm={handleOpenPinForm}
            onFocusComponent={handleSelectComponent}
            onSelectComponent={handleSelectComponent}
          />
        </div>
      </div>

      {/* Pin Knowledge Modal Dialog */}
      <PinForm
        component={pinTargetComponent}
        isOpen={pinFormOpen}
        onClose={handleClosePinForm}
        onSubmit={handleSavePin}
      />
    </div>
  );
}
