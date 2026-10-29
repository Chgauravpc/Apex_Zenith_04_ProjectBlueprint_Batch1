import React, { useState, useEffect, useCallback } from 'react';
import MachineViewer from '../components/map3d/MachineViewer';
import ComponentPanel from '../components/map3d/ComponentPanel';
import PinForm from '../components/map3d/PinForm';
import GuardianDemoBanner from '../components/map3d/GuardianDemoBanner';
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
    setHighlightedComponentId,
  } = useMachineStore();

  const [components, setComponents] = useState(VMC_COMPONENTS_DATA);
  const [selectedMesh, setSelectedMesh] = useState(
    selectedComponentId || 'spindle'
  );
  const [doorsOpen, setDoorsOpen] = useState(false);
  const [hoveredMesh, setHoveredMesh] = useState(null);
  const [pinFormOpen, setPinFormOpen] = useState(false);
  const [pinTargetComponent, setPinTargetComponent] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);
  const [demoIncidentActive, setDemoIncidentActive] = useState(false);
  const [activeDemoIncident, setActiveDemoIncident] = useState(null);

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
    setHighlightedComponentId(null);
    setDemoIncidentActive(false);
    setActiveDemoIncident(null);
  }, [setSelectedComponentId, setHighlightedComponentId]);

  const handleSelectDemoIncident = useCallback(
    (incident) => {
      setDemoIncidentActive(true);
      setActiveDemoIncident(incident);
      setSelectedMesh('spindle');
      setSelectedComponentId('spindle');
      setHighlightedComponentId('spindle');
      setToastMessage(
        'Note Guardian Alert [DEMO]: Abnormal 427 Hz chatter detected on Spindle!'
      );
      setTimeout(() => setToastMessage(null), 5000);
    },
    [setSelectedComponentId, setHighlightedComponentId]
  );

  const handleDismissDemoIncident = useCallback(() => {
    setDemoIncidentActive(false);
    setActiveDemoIncident(null);
    setHighlightedComponentId(null);
  }, [setHighlightedComponentId]);

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
      const type = pinData.knowledge_type || pinData.type || 'tip';
      // Append new entry to the corresponding collection in local component state
      setComponents((prev) =>
        prev.map((c) => {
          if (c.id === pinData.component_id || c.mesh_name === pinData.mesh_name) {
            let updatedTips = [...(c.expert_tips || c.expert_notes || [])];
            let updatedIncidents = [...(c.past_incidents || [])];
            let updatedProcedures = [...(c.procedures || [])];

            if (type === 'tip') {
              const newTip = {
                id: res.id || Date.now(),
                author: pinData.author,
                date: pinData.date,
                severity: pinData.severity || 'watch',
                title: pinData.title,
                text: pinData.description || pinData.text,
                verified: Boolean(pinData.verified),
              };
              updatedTips = [newTip, ...updatedTips];
            } else if (type === 'incident') {
              const newInc = {
                id: `INC-${String(res.id || Date.now()).slice(-3)}`,
                date: pinData.date,
                type: pinData.title,
                summary: pinData.description || pinData.text,
                root_cause: `Reported by ${pinData.author}`,
                resolution: 'Logged for review by senior team',
              };
              updatedIncidents = [newInc, ...updatedIncidents];
            } else if (type === 'procedure') {
              const newProc = {
                id: `SOP-${String(res.id || Date.now()).slice(-3)}`,
                title: pinData.title,
                description: pinData.description || pinData.text,
                author: pinData.author,
                date: pinData.date,
              };
              updatedProcedures = [newProc, ...updatedProcedures];
            }

            const updatedKnowledgeCount = {
              tips: updatedTips.length,
              incidents: updatedIncidents.length,
              troubleshooting: (c.troubleshooting || []).length,
              procedures: updatedProcedures.length,
              total:
                updatedTips.length +
                updatedIncidents.length +
                (c.troubleshooting || []).length +
                updatedProcedures.length,
            };

            return {
              ...c,
              expert_notes: updatedTips,
              expert_tips: updatedTips,
              past_incidents: updatedIncidents,
              procedures: updatedProcedures,
              knowledge_count: updatedKnowledgeCount,
            };
          }
          return c;
        })
      );

      setToastMessage(`Attached new ${type}: "${pinData.title}"!`);
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center space-x-2">
              <CogIcon className="w-6 h-6 text-maroon-700 dark:text-rose-400" />
              <span>{t('navMap', language)}</span>
            </h1>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-maroon-50 dark:bg-maroon-950/60 text-maroon-800 dark:text-maroon-200 border border-maroon-200 dark:border-maroon-800">
              VMC-3 (Vertical Machining Centre)
            </span>
          </div>
          <p className="text-slate-600 dark:text-slate-400 text-sm mt-1 max-w-2xl">
            Interactive 3D model with independently clickable machine components,
            real-time hover highlighting, verified old-employee advice, and component failure logs.
          </p>
        </div>

        {/* Machine Telemetry Badge */}
        <div className="flex items-center space-x-3 bg-white dark:bg-slate-800/90 border border-[#DADCE0] dark:border-slate-700/80 px-4 py-2.5 rounded-xl text-xs shadow-xs">
          <div>
            <div className="text-slate-500 dark:text-slate-400">Location</div>
            <div className="font-bold text-slate-900 dark:text-white">Bay A • Cell 2</div>
          </div>
          <div className="w-px h-7 bg-slate-200 dark:bg-slate-700" />
          <div>
            <div className="text-slate-500 dark:text-slate-400">Max Spindle Speed</div>
            <div className="font-mono font-bold text-maroon-700 dark:text-maroon-300">12,000 RPM</div>
          </div>
          <div className="w-px h-7 bg-slate-200 dark:bg-slate-700" />
          <div>
            <div className="text-slate-500 dark:text-slate-400">Mentor Pairing</div>
            <div className="font-bold text-emerald-700 dark:text-emerald-400">Ramesh (Old) → Priya (New)</div>
          </div>
        </div>
      </div>

      {/* Note Guardian Warning Demonstration Banner */}
      <GuardianDemoBanner
        isActive={demoIncidentActive}
        onSelectIncident={handleSelectDemoIncident}
        onDismissIncident={handleDismissDemoIncident}
      />

      {/* Main 3D Stage & Detail Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: 3D Canvas Viewport (8 Cols) */}
        <div className="lg:col-span-8 flex flex-col space-y-3">
          <MachineViewer
            selectedComponent={selectedMesh}
            highlightedComponent={highlightedComponentId}
            hoveredComponent={hoveredMesh}
            onSelectComponent={handleSelectComponent}
            onResetSelection={handleResetSelection}
            doorsOpen={doorsOpen}
            onToggleDoors={handleToggleDoors}
            components={components}
          />

          {/* Quick Select Component Filter Pills Bar with Reset option */}
          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200/90 dark:border-slate-800 p-2.5 rounded-xl shadow-xs flex items-center gap-2 overflow-x-auto">
            <span className="shrink-0 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap pl-1">
              Components:
            </span>

            {/* Reset Selection Button in Pill Bar */}
            {selectedMesh && (
              <button
                type="button"
                onClick={handleResetSelection}
                className="btn-touch shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap bg-rose-50 hover:bg-rose-100 dark:bg-maroon-900/80 dark:hover:bg-maroon-800 text-maroon-800 dark:text-rose-200 border border-maroon-200 dark:border-maroon-600/70 shadow-xs transition flex items-center space-x-1"
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
                  onMouseEnter={() => setHoveredMesh(c.mesh_name)}
                  onMouseLeave={() => setHoveredMesh(null)}
                  className={`btn-touch shrink-0 px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center space-x-2 ${
                    isSelected
                      ? 'bg-maroon-700 text-white font-bold shadow-sm ring-2 ring-maroon-400/60'
                      : 'bg-white dark:bg-slate-800/90 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200/90 dark:border-slate-700/70 shadow-xs'
                  }`}
                >
                  {c.risk === 'high' && (
                    <span className="shrink-0 w-2 h-2 rounded-full bg-red-500 animate-ping" />
                  )}
                  {c.risk === 'medium' && (
                    <span className="shrink-0 w-2 h-2 rounded-full bg-amber-500" />
                  )}
                  <span className="shrink-0">{c.display_name}</span>
                  <span
                    className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold ${
                      isSelected
                        ? 'bg-maroon-950/60 text-white'
                        : 'bg-slate-100 dark:bg-slate-900 text-maroon-700 dark:text-rose-300 border border-slate-200 dark:border-slate-700/60'
                    }`}
                  >
                    {(c.expert_tips || c.expert_notes || []).length +
                      (c.past_incidents || []).length +
                      (c.troubleshooting || []).length}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Column: Component Knowledge Panel (4 Cols) */}
        <div className="lg:col-span-4">
          <ComponentPanel
            component={selectedComponentData}
            activeDemoIncident={activeDemoIncident}
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
