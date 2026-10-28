/* eslint-disable react/no-unknown-property */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import {
  OrbitControls,
  Environment,
  ContactShadows,
  BakeShadows,
} from '@react-three/drei';
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

      {/* Top Left HUD: Machine Info & Live Telemetry */}
      <div className="absolute top-4 left-4 z-10 flex flex-col space-y-2 pointer-events-auto">
        <div className="flex items-center space-x-2 bg-white/95 backdrop-blur-md border border-slate-200/80 px-3.5 py-1.5 rounded-xl shadow-sm">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-bold text-slate-900 tracking-wide">
            VMC-3 • 3D MACHINE MAP
          </span>
          <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold">
            ONLINE
          </span>
        </div>

        {/* Selection indicator pill with quick reset */}
        {selectedData ? (
          <div className="flex items-center space-x-2 bg-white/95 backdrop-blur-md border border-maroon-200 px-3.5 py-1.5 rounded-xl shadow-sm animate-fade-in">
            <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping" />
            <span className="text-xs font-semibold text-slate-700">
              Selected: <span className="font-bold text-maroon-800">{selectedData.display_name}</span>
            </span>
            {onResetSelection && (
              <button
                type="button"
                onClick={onResetSelection}
                className="ml-1.5 text-[11px] font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded-md border border-slate-300 transition shadow-2xs"
                title="Reset Selection"
              >
                ↺ Clear
              </button>
            )}
          </div>
        ) : hoveredName ? (
          <div className="bg-white/95 backdrop-blur-md border border-slate-200 px-3 py-1 rounded-lg text-xs font-medium text-slate-700 shadow-xs">
            Hovering: <span className="font-semibold text-maroon-700">{hoveredName}</span>{' '}
            <span className="text-[10px] text-slate-500">(Click to select)</span>
          </div>
        ) : (
          <div className="bg-white/90 backdrop-blur-sm border border-slate-200 px-3 py-1 rounded-lg text-[11px] text-slate-600 shadow-xs">
            Click on spindle, tool holder, worktable, vise, control panel, or doors to inspect
          </div>
        )}
      </div>

      {/* Top Right Controls: Presets & Toggles */}
      <div className="absolute top-4 right-4 z-10 flex flex-wrap items-center justify-end gap-1.5 max-w-sm pointer-events-auto">
        {/* Reset Selection button if a part is active */}
        {selectedComponent && onResetSelection && (
          <button
            type="button"
            onClick={onResetSelection}
            className="btn-touch px-3 py-1.5 text-xs font-bold rounded-lg bg-maroon-800 hover:bg-maroon-900 text-white border border-maroon-900 shadow-xs transition flex items-center space-x-1"
            title="Reset Component Selection"
          >
            <span>↺ Reset Selection</span>
          </button>
        )}

        {/* Toggle Doors Button */}
        <button
          type="button"
          onClick={onToggleDoors}
          className={`btn-touch px-3 py-1.5 text-xs font-medium rounded-lg border shadow-xs transition flex items-center space-x-1.5 ${
            doorsOpen
              ? 'bg-amber-600 hover:bg-amber-700 text-white border-amber-700'
              : 'bg-white/95 hover:bg-slate-50 text-slate-700 border-slate-200/90'
          }`}
          title={doorsOpen ? 'Close Enclosure Doors' : 'Open Enclosure Doors to View Inside'}
        >
          <span>{doorsOpen ? '🚪 Doors: Open' : '🚪 Doors: Closed'}</span>
        </button>

        {/* Toggle Wireframe Button */}
        <button
          type="button"
          onClick={() => setWireframe(!wireframe)}
          className={`btn-touch px-3 py-1.5 text-xs font-medium rounded-lg border shadow-xs transition ${
            wireframe
              ? 'bg-maroon-700 text-white border-maroon-800'
              : 'bg-white/95 hover:bg-slate-50 text-slate-700 border-slate-200/90'
          }`}
          title="Toggle Wireframe / X-Ray Mode"
        >
          <span>📐 {wireframe ? 'Shaded' : 'X-Ray'}</span>
        </button>

        {/* Toggle Auto-Rotate Button */}
        <button
          type="button"
          onClick={() => setAutoRotate(!autoRotate)}
          className={`btn-touch px-3 py-1.5 text-xs font-medium rounded-lg border shadow-xs transition ${
            autoRotate
              ? 'bg-maroon-700 text-white border-maroon-800'
              : 'bg-white/95 hover:bg-slate-50 text-slate-700 border-slate-200/90'
          }`}
          title="Toggle Turntable 360° Rotation"
        >
          <span>🔄 {autoRotate ? 'Stop' : 'Rotate'}</span>
        </button>

        {/* Toggle Pins Button */}
        <button
          type="button"
          onClick={() => setShowPins(!showPins)}
          className={`btn-touch px-3 py-1.5 text-xs font-medium rounded-lg border shadow-xs transition ${
            showPins
              ? 'bg-maroon-700 text-white border-maroon-800'
              : 'bg-white/95 hover:bg-slate-50 text-slate-700 border-slate-200/90'
          }`}
          title="Toggle Component Knowledge Pins"
        >
          <span>📍 Pins</span>
        </button>

        {/* Toggle Pin Density if Pins are visible */}
        {showPins && (
          <button
            type="button"
            onClick={() => setPinMode((prev) => (prev === 'compact' ? 'expanded' : 'compact'))}
            className={`btn-touch px-2.5 py-1.5 text-xs font-medium rounded-lg border shadow-xs transition ${
              pinMode === 'compact'
                ? 'bg-white/95 hover:bg-slate-50 text-slate-700 border-slate-200/90'
                : 'bg-maroon-50 text-maroon-800 border-maroon-300 font-semibold'
            }`}
            title={pinMode === 'compact' ? 'Expand all pins' : 'Collapse pins to compact labels'}
          >
            <span>{pinMode === 'compact' ? '🔍 Compact' : '📖 Expanded'}</span>
          </button>
        )}

        {/* Studio Background Environment Toggle */}
        <button
          type="button"
          onClick={() => setStudioMode((prev) => ((prev || globalTheme) === 'dark' ? 'light' : 'dark'))}
          className={`btn-touch px-3 py-1.5 text-xs font-medium rounded-lg border shadow-xs transition ${
            isDarkStudio
              ? 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700'
              : 'bg-white/95 hover:bg-slate-50 text-slate-700 border-slate-200/90'
          }`}
          title={isDarkStudio ? 'Switch to Light CAD Studio' : 'Switch to Dark Titanium Studio'}
        >
          <span>{isDarkStudio ? '☀️ Studio: Dark' : '🎨 Studio: Light'}</span>
        </button>

        {/* Reset View Button */}
        <button
          type="button"
          onClick={handleResetCamera}
          className="btn-touch px-3 py-1.5 text-xs font-medium rounded-lg bg-white/95 hover:bg-slate-50 text-slate-700 border border-slate-200/90 shadow-xs transition"
          title="Reset Camera to Default"
        >
          <span>🎯 Camera</span>
        </button>
      </div>

      {/* Bottom Floating Camera Presets Bar */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center space-x-1 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 px-2.5 py-1.5 rounded-full shadow-md max-w-[95%] overflow-x-auto">
        <span className="shrink-0 text-[11px] font-bold text-slate-500 uppercase tracking-wider px-2 hidden sm:inline">
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
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Bottom Left Navigation Tips */}
      <div className="absolute bottom-4 left-4 z-10 hidden md:block text-[10px] text-slate-600 dark:text-slate-400 pointer-events-none bg-white/90 dark:bg-slate-900/90 px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-800 shadow-xs backdrop-blur-sm">
        Rotate: Left Click + Drag • Pan: Right Click + Drag • Zoom: Scroll
      </div>
    </div>
  );
}
