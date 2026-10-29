import React, { useState, useEffect, useCallback, useMemo } from 'react';
import MachineViewer from '../components/map3d/MachineViewer';
import ComponentPanel from '../components/map3d/ComponentPanel';
import PinForm from '../components/map3d/PinForm';
import GuardianDemoBanner from '../components/map3d/GuardianDemoBanner';
import { useMachineStore } from '../store/useMachineStore';
import { useAuthStore } from '../store/useAuthStore';
import { getComponents, createPin, VMC_COMPONENTS_DATA } from '../api/map3d';
import { t } from '../utils/i18n';
import { PageHead, Reveal } from '../components/common';
import { Check, Search, Camera, Flame, DoorClosed, AlertTriangle, Wrench, RotateCcw } from 'lucide-react';

/**
 * 3D Machine Knowledge Map Page.
 * Visual interactive 3D index of shop-floor machining know-how,
 * failure incidents, and expert tips pinned directly to CNC machine components.
 * Reference: PRD.md §9.4 and TASKS.md T12 / T21.
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
  const [searchQuery, setSearchQuery] = useState('');
  const [riskMode, setRiskMode] = useState(true);

  // Load components from real FastAPI backend with graceful fallback
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

  const filteredComponents = useMemo(() => {
    if (!searchQuery.trim()) return components;
    const q = searchQuery.toLowerCase();
    return components.filter(
      (c) =>
        c.display_name.toLowerCase().includes(q) ||
        c.mesh_name.toLowerCase().includes(q) ||
        (c.description || '').toLowerCase().includes(q)
    );
  }, [components, searchQuery]);

  return (
    <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-emerald-600 text-white px-4 py-2.5 rounded-2xl shadow-2xl flex items-center space-x-2 border border-emerald-400">
          <Check className="w-4 h-4 text-white" />
          <span className="text-xs font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Page Header */}
      <PageHead
        eyebrow="Cross-cutting · 3D Machine Knowledge Map"
        title="The machine remembers what people forget."
        sub="Click any component. Real-time telemetry, failure history, and tacit know-how pinned directly to the 3D VMC machine."
      />

      {/* Machine Telemetry Bar */}
      <Reveal delay={0.06}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center space-x-3">
            <span className="inline-flex items-center justify-center w-10 h-10 rounded-2xl bg-copper/10 text-copper font-bold text-lg">
              ⚙️
            </span>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-bold text-ink tracking-tight">
                  VMC-3 (Vertical Machining Centre)
                </h2>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                  Online
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Interactive 3D digital twin with component-level fault histories and tacit wisdom.
              </p>
            </div>
          </div>

          {/* Machine Telemetry Badge */}
          <div className="flex items-center space-x-3 bg-canvas border border-slate-200 px-4 py-2 rounded-2xl text-xs shadow-2xs">
            <div>
              <div className="text-[10px] text-slate-400 uppercase font-mono">Location</div>
              <div className="font-bold text-ink">Bay A • Cell 2</div>
            </div>
            <div className="w-px h-7 bg-slate-200" />
            <div>
              <div className="text-[10px] text-slate-400 uppercase font-mono">Max Spindle</div>
              <div className="font-mono font-bold text-copper">12,000 RPM</div>
            </div>
            <div className="w-px h-7 bg-slate-200" />
            <div>
              <div className="text-[10px] text-slate-400 uppercase font-mono">Mentor Pairing</div>
              <div className="font-bold text-emerald-700">Ramesh (Old) → Priya (New)</div>
            </div>
          </div>
        </div>
      </Reveal>

      {/* Note Guardian Warning Demonstration Banner */}
      <Reveal delay={0.09}>
        <GuardianDemoBanner
          isActive={demoIncidentActive}
          onSelectIncident={handleSelectDemoIncident}
          onDismissIncident={handleDismissDemoIncident}
        />
      </Reveal>

      {/* Interactive Controls Bar: Doors, Risk Mode, Reset */}
      <Reveal delay={0.12}>
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-2xs">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              data-testid="three-risk-toggle-btn"
              onClick={() => setRiskMode((r) => !r)}
              className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold shadow-2xs transition ${
                riskMode ? 'bg-ink text-white' : 'bg-canvas text-slate-700 border border-slate-200'
              }`}
            >
              <Flame size={13} className={riskMode ? 'text-copper' : ''} />
              <span>Risk Heat {riskMode ? 'On' : 'Off'}</span>
            </button>

            <button
              type="button"
              onClick={handleToggleDoors}
              className="flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold bg-canvas text-slate-700 border border-slate-200 hover:bg-slate-100 transition shadow-2xs"
            >
              <DoorClosed size={13} className="text-copper" />
              <span>{doorsOpen ? 'Close Enclosure Doors' : 'Open Enclosure Doors'}</span>
            </button>

            {selectedMesh && (
              <button
                type="button"
                data-testid="three-camera-reset-btn"
                onClick={handleResetSelection}
                className="flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100 transition shadow-2xs"
                title="Reset Selection"
              >
                <RotateCcw size={13} />
                <span>Reset Selection</span>
              </button>
            )}
          </div>

          {/* Quick Component Search */}
          <div className="relative min-w-[200px]">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search components..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-full border border-slate-200 bg-canvas focus:outline-none focus:ring-1 focus:ring-copper"
            />
          </div>
        </div>
      </Reveal>

      {/* Main 3D Stage & Detail Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: 3D Canvas Viewport (8 Cols) */}
        <div className="lg:col-span-8 flex flex-col space-y-3">
          <div className="rounded-3xl border border-slate-200 overflow-hidden bg-canvas shadow-sm" data-testid="three-canvas-container">
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
          </div>

          {/* Quick Select Component Filter Pills Bar */}
          <div className="bg-white border border-slate-200 p-3 rounded-2xl shadow-2xs flex items-center gap-2 overflow-x-auto">
            <span className="shrink-0 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap pl-1">
              Components:
            </span>

            {/* Reset Selection Button in Pill Bar */}
            {selectedMesh && (
              <button
                type="button"
                onClick={handleResetSelection}
                className="btn-touch shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 shadow-2xs transition flex items-center space-x-1"
                title="Reset Selection"
              >
                <span>↺</span>
                <span>Reset Selection</span>
              </button>
            )}

            {filteredComponents.map((c) => {
              const isSelected = selectedMesh === c.mesh_name;
              const totalCount =
                (c.expert_tips || c.expert_notes || []).length +
                (c.past_incidents || []).length +
                (c.troubleshooting || []).length +
                (c.procedures || []).length;

              return (
                <button
                  key={c.mesh_name}
                  type="button"
                  onClick={() => handleSelectComponent(c.mesh_name)}
                  onMouseEnter={() => setHoveredMesh(c.mesh_name)}
                  onMouseLeave={() => setHoveredMesh(null)}
                  className={`btn-touch shrink-0 px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center space-x-2 ${
                    isSelected
                      ? 'bg-ink text-white font-bold shadow-xs ring-2 ring-copper/50'
                      : 'bg-canvas hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs'
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
                        ? 'bg-white/20 text-white'
                        : 'bg-slate-200/80 text-slate-700'
                    }`}
                  >
                    {totalCount}
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
