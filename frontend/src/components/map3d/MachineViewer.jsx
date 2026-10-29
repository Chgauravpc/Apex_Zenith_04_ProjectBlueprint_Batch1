/* eslint-disable react/no-unknown-property */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import VmcMachine from './VmcMachine';
import PinMarker from './PinMarker';
import { VMC_COMPONENTS_DATA } from '../../api/map3d';
import { useThemeStore } from '../../store/useThemeStore';

/**
 * Camera preset controller component inside Canvas.
 */
function CameraController({ cameraPreset, controlsRef }) {
  useEffect(() => {
    if (!controlsRef.current) return;
    const controls = controlsRef.current;

    switch (cameraPreset) {
      case 'front':
        controls.object.position.set(0, 1.45, 4.0);
        controls.target.set(0, 1.3, 0);
        break;
      case 'spindle':
        controls.object.position.set(0, 1.55, 1.5);
        controls.target.set(0, 1.45, -0.15);
        break;
      case 'vise':
        controls.object.position.set(0.3, 1.15, 1.25);
        controls.target.set(0, 0.82, 0.04);
        break;
      case 'control':
        controls.object.position.set(1.9, 1.55, 1.6);
        controls.target.set(1.36, 1.45, 0.88);
        break;
      case 'top':
        controls.object.position.set(0, 4.6, 0.05);
        controls.target.set(0, 1.2, 0);
        break;
      case 'iso':
      default:
        controls.object.position.set(3.4, 2.4, 3.6);
        controls.target.set(0, 1.2, 0);
        break;
    }
    controls.update();
  }, [cameraPreset, controlsRef]);

  return null;
}

/**
 * Interactive 3D Machine Viewer.
 * Embeds React Three Fiber Canvas with industrial lighting, OrbitControls,
 * camera presets, component pins, hover feedback, and selection persistence.
 * Reference: PRD.md §9.4 and TASKS.md T21.
 */
export default function MachineViewer({
  selectedComponent = null,
  highlightedComponent = null,
  hoveredComponent = null,
  onSelectComponent,
  onResetSelection,
  doorsOpen = false,
  onToggleDoors,
  components = VMC_COMPONENTS_DATA,
}) {
  const [wireframe, setWireframe] = useState(false);
  const [autoRotate, setAutoRotate] = useState(false);
  const [showPins, setShowPins] = useState(true);
  const [pinMode, setPinMode] = useState('compact');
  const [cameraPreset, setCameraPreset] = useState('iso');
  const [hoveredName, setHoveredName] = useState(null);
  const [hoveredComponentId, setHoveredComponentId] = useState(null);
  const globalTheme = useThemeStore((state) => state.theme);
  const [studioMode, setStudioMode] = useState(null);
  const isDarkStudio = (studioMode || globalTheme || 'light') === 'dark';
  const controlsRef = useRef();

  // Reset camera view to default isometric
  const handleResetCamera = useCallback(() => {
    setCameraPreset('iso');
    if (controlsRef.current) {
      controlsRef.current.reset();
      controlsRef.current.object.position.set(3.4, 2.4, 3.6);
      controlsRef.current.target.set(0, 1.2, 0);
      controlsRef.current.update();
    }
  }, []);

  const handleHoverComponent = useCallback((id, name, isHovered) => {
    setHoveredComponentId(isHovered ? id : null);
    setHoveredName(isHovered ? name : null);
  }, []);

  const selectedData = components.find((c) => c.mesh_name === selectedComponent);

  return (
    <div className="relative w-full h-[620px] rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-950 border border-slate-200/90 dark:border-slate-800 shadow-xl select-none">
      {/* 3D Canvas */}
      <Canvas
        camera={{ position: [3.4, 2.4, 3.6], fov: 45 }}
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
        shadows
        className="w-full h-full"
      >
        {/* Adaptive CAD Studio Environment Background */}
        <color attach="background" args={[isDarkStudio ? '#0b0f19' : '#eef2f6']} />

        {/* Ambient & Directional Lighting */}
        <ambientLight intensity={isDarkStudio ? 0.75 : 0.95} color={isDarkStudio ? '#94a3b8' : '#f8fafc'} />
        {/* Studio Floor Reflection Fill */}
        <hemisphereLight
          intensity={isDarkStudio ? 0.35 : 0.6}
          color="#ffffff"
          groundColor={isDarkStudio ? '#0f172a' : '#cbd5e1'}
        />
        {/* Overhead Key Sunlight */}
        <directionalLight
          position={[5, 8, 5]}
          intensity={isDarkStudio ? 1.3 : 1.55}
          color="#ffffff"
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
        />
        {/* Signature Industrial Maroon Rim Light */}
        <directionalLight
          position={[-6, 4, -4]}
          intensity={isDarkStudio ? 0.8 : 0.6}
          color={isDarkStudio ? '#9f1239' : '#e11d48'}
        />
        {/* Front Neutral Fill */}
        <directionalLight position={[0, 2, 6]} intensity={isDarkStudio ? 0.45 : 0.6} color="#ffffff" />

        {/* Camera Preset Handler */}
        <CameraController cameraPreset={cameraPreset} controlsRef={controlsRef} />

        {/* Orbit Controls with Damping & Smooth Nav */}
        <OrbitControls
          ref={controlsRef}
          enableDamping
          dampingFactor={0.05}
          autoRotate={autoRotate}
          autoRotateSpeed={1.0}
          minDistance={1.0}
          maxDistance={9.0}
          maxPolarAngle={Math.PI / 2 + 0.05} // prevent going below floor
          target={[0, 1.2, 0]}
        />

        {/* Shop Floor Grid */}
        <gridHelper
          args={[16, 32, isDarkStudio ? '#475569' : '#94a3b8', isDarkStudio ? '#1e293b' : '#cbd5e1']}
          position={[0, -0.01, 0]}
        />

        {/* Floor Shadow Contact Disk */}
        <mesh position={[0, -0.015, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[2.8, 32]} />
          <meshBasicMaterial
            color={isDarkStudio ? '#040711' : '#0f172a'}
            transparent
            opacity={isDarkStudio ? 0.75 : 0.14}
          />
        </mesh>

        {/* 3D CNC VMC Machine Model */}
        <VmcMachine
          doorsOpen={doorsOpen}
          wireframe={wireframe}
          active={true}
          selectedComponent={selectedComponent}
          highlightedComponent={highlightedComponent}
          onSelectComponent={onSelectComponent}
          onHoverComponent={handleHoverComponent}
        />

        {/* 3D Knowledge Pins */}
        {showPins &&
          components.map((c) => {
            if (!c.pin_position) return null;
            const topNote = c.expert_notes?.[0] || c.expert_tips?.[0];
            const isHovered =
              hoveredComponentId === c.mesh_name ||
              hoveredComponent === c.mesh_name;
            return (
              <PinMarker
                key={`pin-${c.id || c.mesh_name}`}
                position={c.pin_position}
                componentId={c.mesh_name}
                componentName={c.display_name}
                title={topNote?.title || c.display_name}
                author={topNote?.author}
                risk={c.risk}
                noteCount={c.expert_tips?.length || c.expert_notes?.length || 0}
                incidentCount={c.incident_count || c.past_incidents?.length || 0}
                isSelected={selectedComponent === c.mesh_name}
                isHighlighted={highlightedComponent === c.mesh_name}
                isComponentHovered={isHovered}
                pinMode={pinMode}
                onClick={onSelectComponent}
              />
            );
          })}
      </Canvas>

      {/* Top Left HUD: Machine Info & Live Telemetry (Vertically Aligned Glassmorphic Card) */}
      <div className="absolute top-4 left-4 z-10 flex flex-col items-start gap-2 max-w-xs pointer-events-auto">
        <div className="w-full backdrop-blur-xl bg-white/60 dark:bg-slate-900/65 border border-white/50 dark:border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.12)] rounded-2xl p-3 flex flex-col items-start gap-2.5 ring-1 ring-white/30 dark:ring-white/5">
          {/* Header Row: Machine Title & Online Indicator */}
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center space-x-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
              </span>
              <span className="text-xs font-black text-slate-900 dark:text-white tracking-wide">
                VMC-3 • 3D MAP
              </span>
            </div>
            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 dark:bg-emerald-500/25 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30 font-bold backdrop-blur-xs">
              ONLINE
            </span>
          </div>

          {/* Machine Sub-telemetry Line */}
          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium flex items-center space-x-2 border-t border-slate-200/60 dark:border-slate-800/80 pt-1.5 w-full">
            <span>Bay A • Cell 2</span>
            <span>•</span>
            <span className="font-mono font-semibold text-maroon-700 dark:text-rose-400">12,000 RPM</span>
          </div>

          {/* Interactive State Readout */}
          {selectedData ? (
            <div className="w-full flex items-center justify-between space-x-2 bg-maroon-50/80 dark:bg-maroon-950/60 backdrop-blur-md border border-maroon-200/70 dark:border-maroon-800/70 px-2.5 py-1.5 rounded-xl shadow-2xs animate-fade-in">
              <div className="flex items-center space-x-2 min-w-0">
                <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse shrink-0" />
                <span className="text-xs text-slate-700 dark:text-slate-300 truncate">
                  Selected: <span className="font-bold text-maroon-800 dark:text-rose-300">{selectedData.display_name}</span>
                </span>
              </div>
              {onResetSelection && (
                <button
                  type="button"
                  onClick={onResetSelection}
                  className="shrink-0 text-[10px] font-bold text-maroon-700 dark:text-rose-300 bg-white/80 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-700 px-2 py-0.5 rounded-md border border-maroon-200 dark:border-maroon-700 transition shadow-2xs"
                  title="Reset Selection"
                >
                  ↺ Clear
                </button>
              )}
            </div>
          ) : hoveredName ? (
            <div className="w-full bg-white/60 dark:bg-slate-800/60 backdrop-blur-md border border-white/60 dark:border-white/10 px-2.5 py-1.5 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 shadow-2xs">
              Hovering: <span className="font-bold text-maroon-700 dark:text-rose-400">{hoveredName}</span>{' '}
              <span className="text-[10px] text-slate-500 dark:text-slate-400">(Click to inspect)</span>
            </div>
          ) : (
            <div className="w-full bg-white/40 dark:bg-slate-800/40 backdrop-blur-xs border border-white/40 dark:border-white/10 px-2.5 py-1.5 rounded-xl text-[11px] text-slate-600 dark:text-slate-400 leading-snug">
              Click spindle, table, vise, ATC, pendant, or doors to inspect
            </div>
          )}
        </div>
      </div>

      {/* Top Right Controls: Presets & Toggles (Compact Glassmorphic Toolbar) */}
      <div className="absolute top-4 right-4 z-10 flex flex-col items-stretch gap-1 w-36 pointer-events-auto backdrop-blur-xl bg-white/20 dark:bg-slate-900/40 p-1.5 rounded-xl border border-white/40 dark:border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.08)] ring-1 ring-white/30 dark:ring-white/5">
        <div className="flex items-center justify-between px-1.5 py-0.5 text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-white/30 dark:border-white/10 pb-1 mb-0.5">
          <span>Controls</span>
          <span className="text-[8px] font-mono opacity-70">3D</span>
        </div>

        {/* Reset Selection button if a part is active */}
        {selectedComponent && onResetSelection && (
          <button
            type="button"
            onClick={onResetSelection}
            className="w-full py-1 px-2 text-[11px] font-medium rounded-lg bg-rose-600/80 hover:bg-rose-600 active:bg-rose-700 text-white border border-rose-300/50 shadow-sm shadow-rose-600/20 backdrop-blur-md transition-all duration-150 flex items-center justify-center text-center"
            title="Reset Component Selection"
          >
            <span className="truncate">Reset Selection</span>
          </button>
        )}

        {/* Toggle Doors Button */}
        <button
          type="button"
          onClick={onToggleDoors}
          className={`w-full py-1 px-2 text-[11px] font-medium rounded-lg border backdrop-blur-md transition-all duration-150 flex items-center justify-center text-center ${
            doorsOpen
              ? 'bg-amber-500/80 hover:bg-amber-500 text-white border-amber-300/50 shadow-sm shadow-amber-500/20'
              : 'bg-white/30 hover:bg-white/55 active:bg-white/70 dark:bg-white/5 dark:hover:bg-white/15 text-slate-800 dark:text-slate-100 border-white/50 dark:border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)]'
          }`}
          title={doorsOpen ? 'Close Enclosure Doors' : 'Open Enclosure Doors to View Inside'}
        >
          <span className="truncate">{doorsOpen ? 'Doors: Open' : 'Doors: Closed'}</span>
        </button>

        {/* Toggle Wireframe Button */}
        <button
          type="button"
          onClick={() => setWireframe(!wireframe)}
          className={`w-full py-1 px-2 text-[11px] font-medium rounded-lg border backdrop-blur-md transition-all duration-150 flex items-center justify-center text-center ${
            wireframe
              ? 'bg-maroon-700/80 hover:bg-maroon-700 text-white border-rose-300/40 shadow-sm shadow-rose-900/20'
              : 'bg-white/30 hover:bg-white/55 active:bg-white/70 dark:bg-white/5 dark:hover:bg-white/15 text-slate-800 dark:text-slate-100 border-white/50 dark:border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)]'
          }`}
          title="Toggle Wireframe / X-Ray Mode"
        >
          <span className="truncate">{wireframe ? 'Shaded' : 'X-Ray'}</span>
        </button>

        {/* Toggle Auto-Rotate Button */}
        <button
          type="button"
          onClick={() => setAutoRotate(!autoRotate)}
          className={`w-full py-1 px-2 text-[11px] font-medium rounded-lg border backdrop-blur-md transition-all duration-150 flex items-center justify-center text-center ${
            autoRotate
              ? 'bg-maroon-700/80 hover:bg-maroon-700 text-white border-rose-300/40 shadow-sm shadow-rose-900/20'
              : 'bg-white/30 hover:bg-white/55 active:bg-white/70 dark:bg-white/5 dark:hover:bg-white/15 text-slate-800 dark:text-slate-100 border-white/50 dark:border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)]'
          }`}
          title="Toggle Turntable 360° Rotation"
        >
          <span className="truncate">{autoRotate ? 'Stop' : 'Rotate'}</span>
        </button>

        {/* Toggle Pins Button */}
        <button
          type="button"
          onClick={() => setShowPins(!showPins)}
          className={`w-full py-1 px-2 text-[11px] font-medium rounded-lg border backdrop-blur-md transition-all duration-150 flex items-center justify-center text-center ${
            showPins
              ? 'bg-maroon-700/80 hover:bg-maroon-700 text-white border-rose-300/40 shadow-sm shadow-rose-900/20'
              : 'bg-white/30 hover:bg-white/55 active:bg-white/70 dark:bg-white/5 dark:hover:bg-white/15 text-slate-800 dark:text-slate-100 border-white/50 dark:border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)]'
          }`}
          title="Toggle Component Knowledge Pins"
        >
          <span className="truncate">Pins</span>
        </button>

        {/* Toggle Pin Density if Pins are visible */}
        {showPins && (
          <button
            type="button"
            onClick={() => setPinMode((prev) => (prev === 'compact' ? 'expanded' : 'compact'))}
            className={`w-full py-1 px-2 text-[11px] font-medium rounded-lg border backdrop-blur-md transition-all duration-150 flex items-center justify-center text-center ${
              pinMode === 'compact'
                ? 'bg-white/30 hover:bg-white/55 active:bg-white/70 dark:bg-white/5 dark:hover:bg-white/15 text-slate-800 dark:text-slate-100 border-white/50 dark:border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)]'
                : 'bg-maroon-700/80 text-white border-rose-300/40 shadow-sm'
            }`}
            title={pinMode === 'compact' ? 'Expand all pins' : 'Collapse pins to compact labels'}
          >
            <span className="truncate">{pinMode === 'compact' ? 'Compact' : 'Expanded'}</span>
          </button>
        )}

        {/* Studio Background Environment Toggle */}
        <button
          type="button"
          onClick={() => setStudioMode((prev) => ((prev || globalTheme) === 'dark' ? 'light' : 'dark'))}
          className={`w-full py-1 px-2 text-[11px] font-medium rounded-lg border backdrop-blur-md transition-all duration-150 flex items-center justify-center text-center ${
            isDarkStudio
              ? 'bg-slate-800/80 hover:bg-slate-800 text-slate-100 border-slate-600/50 shadow-sm'
              : 'bg-white/30 hover:bg-white/55 active:bg-white/70 dark:bg-white/5 dark:hover:bg-white/15 text-slate-800 dark:text-slate-100 border-white/50 dark:border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)]'
          }`}
          title={isDarkStudio ? 'Switch to Light CAD Studio' : 'Switch to Dark Titanium Studio'}
        >
          <span className="truncate">{isDarkStudio ? 'Studio: Dark' : 'Studio: Light'}</span>
        </button>

        {/* Reset View Button */}
        <button
          type="button"
          onClick={handleResetCamera}
          className="w-full py-1 px-2 text-[11px] font-medium rounded-lg bg-white/30 hover:bg-white/55 active:bg-white/70 dark:bg-white/5 dark:hover:bg-white/15 text-slate-800 dark:text-slate-100 border border-white/50 dark:border-white/10 backdrop-blur-md transition-all duration-150 flex items-center justify-center text-center shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)]"
          title="Reset Camera to Default"
        >
          <span className="truncate">Camera</span>
        </button>
      </div>

      {/* Bottom Floating Camera Presets Bar */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center space-x-1 bg-white/60 dark:bg-slate-900/65 backdrop-blur-xl border border-white/50 dark:border-white/10 px-3 py-1.5 rounded-full shadow-lg max-w-[95%] overflow-x-auto ring-1 ring-white/30 dark:ring-white/5">
        <span className="shrink-0 text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider px-2 hidden sm:inline">
          View:
        </span>
        {[
          { key: 'iso', label: 'Isometric' },
          { key: 'front', label: 'Front' },
          { key: 'spindle', label: 'Spindle' },
          { key: 'vise', label: 'Table & Vise' },
          { key: 'control', label: 'Pendant' },
          { key: 'top', label: 'Top' },
        ].map((p) => (
          <button
            key={p.key}
            type="button"
            onClick={() => setCameraPreset(p.key)}
            className={`shrink-0 whitespace-nowrap px-3 py-1 text-xs font-medium rounded-full transition ${
              cameraPreset === p.key
                ? 'bg-maroon-700 text-white font-semibold shadow-xs ring-1 ring-maroon-400'
                : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-800'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Bottom Left Navigation Tips */}
      <div className="absolute bottom-4 left-4 z-10 hidden md:block text-[10px] text-slate-600 dark:text-slate-400 pointer-events-none bg-white/60 dark:bg-slate-900/65 backdrop-blur-xl px-3 py-1.5 rounded-xl border border-white/50 dark:border-white/10 shadow-sm text-slate-700 dark:text-slate-300 ring-1 ring-white/30 dark:ring-white/5">
        Rotate: Left Click + Drag • Pan: Right Click + Drag • Zoom: Scroll
      </div>
    </div>
  );
}
