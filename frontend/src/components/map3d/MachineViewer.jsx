/* eslint-disable react/no-unknown-property */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import VmcMachine from './VmcMachine';
import PinMarker from './PinMarker';
import { VMC_COMPONENTS_DATA } from '../../api/map3d';

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
  onSelectComponent,
  onResetSelection,
  doorsOpen = false,
  onToggleDoors,
  components = VMC_COMPONENTS_DATA,
}) {
  const [wireframe, setWireframe] = useState(false);
  const [autoRotate, setAutoRotate] = useState(false);
  const [showPins, setShowPins] = useState(true);
  const [cameraPreset, setCameraPreset] = useState('iso');
  const [hoveredName, setHoveredName] = useState(null);
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

  const handleHoverComponent = useCallback((_id, name, isHovered) => {
    setHoveredName(isHovered ? name : null);
  }, []);

  const selectedData = components.find((c) => c.mesh_name === selectedComponent);

  return (
    <div className="relative w-full h-[620px] rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 shadow-2xl select-none">
      {/* 3D Canvas */}
      <Canvas
        camera={{ position: [3.4, 2.4, 3.6], fov: 45 }}
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
        shadows
        className="w-full h-full"
      >
        {/* Dark Industrial Background Color */}
        <color attach="background" args={['#090d16']} />

        {/* Ambient & Directional Lighting */}
        <ambientLight intensity={0.7} color="#94a3b8" />
        {/* Overhead Key Sunlight */}
        <directionalLight
          position={[5, 8, 5]}
          intensity={1.2}
          color="#f8fafc"
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
        />
        {/* Soft Cool Rim Light */}
        <directionalLight position={[-6, 4, -4]} intensity={0.6} color="#38bdf8" />
        {/* Front Warm Fill */}
        <directionalLight position={[0, 2, 6]} intensity={0.4} color="#fde047" />

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
        <gridHelper args={[16, 32, '#334155', '#1e293b']} position={[0, -0.01, 0]} />

        {/* Floor Shadow Contact Disk */}
        <mesh position={[0, -0.015, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[2.8, 32]} />
          <meshBasicMaterial color="#060911" />
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
            const topNote = c.expert_notes?.[0];
            return (
              <PinMarker
                key={`pin-${c.id || c.mesh_name}`}
                position={c.pin_position}
                componentId={c.mesh_name}
                title={topNote?.title ? topNote.title.slice(0, 26) + '...' : c.display_name}
                author={topNote?.author}
                risk={c.risk}
                isSelected={selectedComponent === c.mesh_name}
                onClick={onSelectComponent}
              />
            );
          })}
      </Canvas>

      {/* Top Left HUD: Machine Info & Live Telemetry */}
      <div className="absolute top-4 left-4 z-10 flex flex-col space-y-2 pointer-events-auto">
        <div className="flex items-center space-x-2 bg-slate-900/85 backdrop-blur-md border border-slate-700/80 px-3 py-1.5 rounded-lg shadow-lg">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-semibold text-white tracking-wide">
            VMC-3 • 3D MACHINE MAP
          </span>
          <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            ONLINE
          </span>
        </div>

        {/* Selection indicator pill with quick reset */}
        {selectedData ? (
          <div className="flex items-center space-x-2 bg-cyan-950/90 backdrop-blur-md border border-cyan-400/60 px-3 py-1.5 rounded-lg shadow-xl animate-fade-in">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <span className="text-xs font-bold text-white">
              Selected: <span className="text-cyan-300">{selectedData.display_name}</span>
            </span>
            {onResetSelection && (
              <button
                type="button"
                onClick={onResetSelection}
                className="ml-1 text-[11px] font-bold text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 px-2 py-0.5 rounded border border-slate-600 transition"
                title="Reset Selection"
              >
                ↺ Clear
              </button>
            )}
          </div>
        ) : hoveredName ? (
          <div className="bg-slate-900/80 backdrop-blur-md border border-slate-700 px-3 py-1 rounded-md text-xs font-medium text-slate-300 shadow">
            Hovering: <span className="font-semibold text-cyan-300">{hoveredName}</span>{' '}
            <span className="text-[10px] text-slate-400">(Click to select)</span>
          </div>
        ) : (
          <div className="bg-slate-900/60 backdrop-blur-sm border border-slate-800/80 px-3 py-1 rounded-md text-[11px] text-slate-400 shadow">
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
            className="btn-touch px-3 py-1.5 text-xs font-bold rounded-lg bg-cyan-600/90 hover:bg-cyan-500 text-slate-950 border border-cyan-400 shadow-lg transition flex items-center space-x-1"
            title="Reset Component Selection"
          >
            <span>↺ Reset Selection</span>
          </button>
        )}

        {/* Toggle Doors Button */}
        <button
          type="button"
          onClick={onToggleDoors}
          className={`btn-touch px-3 py-1.5 text-xs font-medium rounded-lg border shadow-lg transition flex items-center space-x-1.5 ${
            doorsOpen
              ? 'bg-amber-600/90 hover:bg-amber-500 text-white border-amber-400'
              : 'bg-slate-800/90 hover:bg-slate-700 text-slate-200 border-slate-700'
          }`}
          title={doorsOpen ? 'Close Enclosure Doors' : 'Open Enclosure Doors to View Inside'}
        >
          <span>{doorsOpen ? '🚪 Doors: Open' : '🚪 Doors: Closed'}</span>
        </button>

        {/* Toggle Wireframe Button */}
        <button
          type="button"
          onClick={() => setWireframe(!wireframe)}
          className={`btn-touch px-3 py-1.5 text-xs font-medium rounded-lg border shadow-lg transition ${
            wireframe
              ? 'bg-cyan-600 text-white border-cyan-400'
              : 'bg-slate-800/90 hover:bg-slate-700 text-slate-300 border-slate-700'
          }`}
          title="Toggle Wireframe / X-Ray Mode"
        >
          <span>📐 {wireframe ? 'Shaded' : 'X-Ray'}</span>
        </button>

        {/* Toggle Auto-Rotate Button */}
        <button
          type="button"
          onClick={() => setAutoRotate(!autoRotate)}
          className={`btn-touch px-3 py-1.5 text-xs font-medium rounded-lg border shadow-lg transition ${
            autoRotate
              ? 'bg-cyan-600 text-white border-cyan-400'
              : 'bg-slate-800/90 hover:bg-slate-700 text-slate-300 border-slate-700'
          }`}
          title="Toggle Turntable 360° Rotation"
        >
          <span>🔄 {autoRotate ? 'Stop' : 'Rotate'}</span>
        </button>

        {/* Toggle Pins Button */}
        <button
          type="button"
          onClick={() => setShowPins(!showPins)}
          className={`btn-touch px-3 py-1.5 text-xs font-medium rounded-lg border shadow-lg transition ${
            showPins
              ? 'bg-indigo-600 text-white border-indigo-400'
              : 'bg-slate-800/90 hover:bg-slate-700 text-slate-400 border-slate-700'
          }`}
          title="Toggle Component Knowledge Pins"
        >
          <span>📍 Pins</span>
        </button>

        {/* Reset View Button */}
        <button
          type="button"
          onClick={handleResetCamera}
          className="btn-touch px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800/90 hover:bg-slate-700 text-slate-300 border border-slate-700 shadow-lg transition"
          title="Reset Camera to Default"
        >
          <span>🎯 Camera</span>
        </button>
      </div>

      {/* Bottom Floating Camera Presets Bar */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center space-x-1 bg-slate-900/90 backdrop-blur-md border border-slate-700/80 px-2.5 py-1.5 rounded-full shadow-2xl">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2 hidden sm:inline">
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
            className={`px-3 py-1 text-xs font-medium rounded-full transition ${
              cameraPreset === p.key
                ? 'bg-cyan-500 text-slate-950 font-bold shadow'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Bottom Left Navigation Tips */}
      <div className="absolute bottom-4 left-4 z-10 hidden md:block text-[10px] text-slate-500 pointer-events-none bg-slate-950/60 px-2.5 py-1 rounded-md border border-slate-800/60 backdrop-blur-sm">
        Rotate: Left Click + Drag • Pan: Right Click + Drag • Zoom: Scroll
      </div>
    </div>
  );
}
