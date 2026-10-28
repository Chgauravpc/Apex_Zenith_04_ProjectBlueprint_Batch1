/* eslint-disable react/no-unknown-property */
import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import ComponentMesh from './ComponentMesh';

/**
 * High-fidelity 3D CNC Vertical Machining Centre (VMC).
 * Built with modular Three.js geometries for performance and offline reliability.
 * Components:
 *  1. Machine Body (Base, Column, Enclosure, Canopy, Chip Trough, Leveling Pads)
 *  2. Spindle (Headstock, Motor, Cartridge, Nose, Coolant Nozzles)
 *  3. Tool Holder (BT40 Holder, End Mill, ATC Carousel Magazine)
 *  4. Worktable (X-Y Table, Longitudinal T-Slots, Telescopic Way Bellows)
 *  5. Vise (Kurt-style Precision Milling Vise, Jaws, Hex Screw, Clamped Workpiece)
 *  6. Control Panel (Pendant Arm, Console Box, LCD Screen, Keypad, E-Stop, Stack Light)
 *  7. Doors (Front Sliding Enclosure Doors with Safety Polycarbonate Windows, Handles)
 */
export default function VmcMachine({
  doorsOpen = false,
  wireframe = false,
  active = true,
  selectedComponent = null,
  highlightedComponent = null,
  onSelectComponent,
  onHoverComponent,
}) {
  // Animated refs
  const spindleRef = useRef();
  const leftDoorRef = useRef();
  const rightDoorRef = useRef();

  // Smooth door sliding animation via useFrame (mutates refs directly per ENGINEERING.md)
  useFrame((_, delta) => {
    // Spindle gentle rotation if active
    if (active && spindleRef.current) {
      spindleRef.current.rotation.y += delta * 4.0;
    }

    // Door interpolation
    const targetLeft = doorsOpen ? -0.88 : -0.37;
    const targetRight = doorsOpen ? 0.88 : 0.37;

    if (leftDoorRef.current) {
      leftDoorRef.current.position.x = THREE.MathUtils.damp(
        leftDoorRef.current.position.x,
        targetLeft,
        8,
        delta
      );
    }
    if (rightDoorRef.current) {
      rightDoorRef.current.position.x = THREE.MathUtils.damp(
        rightDoorRef.current.position.x,
        targetRight,
        8,
        delta
      );
    }
  });

  // Reusable materials memoized for performance
  const materials = useMemo(() => {
    return {
      // Cast iron structural base
      castIron: new THREE.MeshStandardMaterial({
        color: '#1a1f2c',
        roughness: 0.75,
        metalness: 0.35,
        wireframe,
      }),
      // Sheet metal enclosure (industrial dark slate / charcoal)
      sheetMetalDark: new THREE.MeshStandardMaterial({
        color: '#283141',
        roughness: 0.55,
        metalness: 0.45,
        wireframe,
      }),
      // Enclosure accent panels (clean industrial light gray)
      sheetMetalLight: new THREE.MeshStandardMaterial({
        color: '#94a3b8',
        roughness: 0.4,
        metalness: 0.5,
        wireframe,
      }),
      // Blueprint Cyan accent trim
      accentCyan: new THREE.MeshStandardMaterial({
        color: '#0284c7',
        roughness: 0.3,
        metalness: 0.7,
        wireframe,
      }),
      // Stainless steel internal splash guards & way covers
      stainless: new THREE.MeshStandardMaterial({
        color: '#cbd5e1',
        roughness: 0.3,
        metalness: 0.85,
        wireframe,
      }),
      // Precision ground steel (table surface, spindle cartridge, vise ways)
      groundSteel: new THREE.MeshStandardMaterial({
        color: '#f1f5f9',
        roughness: 0.18,
        metalness: 0.9,
        wireframe,
      }),
      // Dark anodized steel / vise body
      anodizedSteel: new THREE.MeshStandardMaterial({
        color: '#334155',
        roughness: 0.4,
        metalness: 0.6,
        wireframe,
      }),
      // Safety tinted polycarbonate window glass
      safetyGlass: new THREE.MeshPhysicalMaterial({
        color: '#64748b',
        roughness: 0.1,
        metalness: 0.15,
        transmission: 0.85,
        opacity: 0.45,
        transparent: true,
        wireframe,
      }),
      // Spindle drive motor (dark blue)
      motorBlue: new THREE.MeshStandardMaterial({
        color: '#1e3a8a',
        roughness: 0.45,
        metalness: 0.5,
        wireframe,
      }),
      // Carbide cutter coating (TiN Gold)
      carbideGold: new THREE.MeshStandardMaterial({
        color: '#eab308',
        roughness: 0.2,
        metalness: 0.95,
        wireframe,
      }),
      // Coolant Loc-Line hose segments
      coolantBlue: new THREE.MeshStandardMaterial({
        color: '#2563eb',
        roughness: 0.5,
        metalness: 0.2,
        wireframe,
      }),
      coolantOrange: new THREE.MeshStandardMaterial({
        color: '#ea580c',
        roughness: 0.5,
        metalness: 0.2,
        wireframe,
      }),
      // CNC controller screen (glowing green LCD)
      screenGlow: new THREE.MeshBasicMaterial({
        color: '#064e3b',
        wireframe,
      }),
      screenText: new THREE.MeshBasicMaterial({
        color: '#34d399',
        wireframe,
      }),
      // Emergency stop button (high-vis red)
      eStopRed: new THREE.MeshStandardMaterial({
        color: '#dc2626',
        roughness: 0.3,
        metalness: 0.2,
        wireframe,
      }),
      eStopYellow: new THREE.MeshStandardMaterial({
        color: '#facc15',
        roughness: 0.3,
        metalness: 0.2,
        wireframe,
      }),
      // Stack light lenses
      stackGreen: new THREE.MeshStandardMaterial({
        color: '#22c55e',
        emissive: '#15803d',
        emissiveIntensity: 0.6,
        roughness: 0.2,
        wireframe,
      }),
      stackAmber: new THREE.MeshStandardMaterial({
        color: '#f59e0b',
        roughness: 0.3,
        wireframe,
      }),
      stackRed: new THREE.MeshStandardMaterial({
        color: '#ef4444',
        roughness: 0.3,
        wireframe,
      }),
      // Aluminum machined workpiece
      aluminumBillet: new THREE.MeshStandardMaterial({
        color: '#e2e8f0',
        roughness: 0.25,
        metalness: 0.8,
        wireframe,
      }),
    };
  }, [wireframe]);

  return (
    <group position={[0, 0, 0]}>
      {/* 1. MACHINE BODY ASSEMBLY (Base, Column, Enclosure, Canopy, Chip Trough) */}
      <ComponentMesh
        componentId="machine_body"
        name="Machine Body & Column"
        risk="none"
        isSelected={selectedComponent === 'machine_body'}
        isHighlighted={highlightedComponent === 'machine_body'}
        onClick={onSelectComponent}
        onHover={onHoverComponent}
      >
        {/* Main Base Casting */}
        <mesh position={[0, 0.22, 0]} material={materials.castIron} castShadow receiveShadow>
          <boxGeometry args={[2.3, 0.44, 2.1]} />
        </mesh>

        {/* Leveling Feet / Vibration Pads */}
        {[
          [-0.98, 0.05, 0.9],
          [0.98, 0.05, 0.9],
          [-0.98, 0.05, -0.9],
          [0.98, 0.05, -0.9],
        ].map(([x, y, z], i) => (
          <group key={`foot-${i}`} position={[x, y, z]}>
            <mesh material={materials.anodizedSteel}>
              <cylinderGeometry args={[0.08, 0.1, 0.1, 16]} />
            </mesh>
            <mesh position={[0, 0.08, 0]} material={materials.stainless}>
              <cylinderGeometry args={[0.03, 0.03, 0.1, 8]} />
            </mesh>
          </group>
        ))}

        {/* Rear Heavy Z-Axis Column */}
        <mesh position={[0, 1.45, -0.7]} material={materials.castIron} castShadow>
          <boxGeometry args={[1.35, 2.05, 0.7]} />
        </mesh>

        {/* Linear Z-Axis Guide Rails on Column */}
        {[-0.32, 0.32].map((x, i) => (
          <mesh key={`z-rail-${i}`} position={[x, 1.45, -0.34]} material={materials.groundSteel}>
            <boxGeometry args={[0.05, 1.9, 0.025]} />
          </mesh>
        ))}

        {/* Central Z-Axis Ball Screw */}
        <mesh position={[0, 1.45, -0.34]} material={materials.stainless}>
          <cylinderGeometry args={[0.025, 0.025, 1.9, 16]} />
        </mesh>

        {/* Z-Axis Servo Drive Motor on top of Column */}
        <mesh position={[0, 2.58, -0.7]} material={materials.motorBlue}>
          <boxGeometry args={[0.3, 0.32, 0.3]} />
        </mesh>

        {/* Enclosure Left Wall */}
        <mesh position={[-1.12, 1.35, 0.12]} material={materials.sheetMetalDark} castShadow>
          <boxGeometry args={[0.06, 1.82, 1.84]} />
        </mesh>

        {/* Enclosure Right Wall */}
        <mesh position={[1.12, 1.35, 0.12]} material={materials.sheetMetalDark} castShadow>
          <boxGeometry args={[0.06, 1.82, 1.84]} />
        </mesh>

        {/* Enclosure Rear Cover */}
        <mesh position={[0, 1.35, -1.04]} material={materials.sheetMetalDark}>
          <boxGeometry args={[2.3, 1.82, 0.04]} />
        </mesh>

        {/* Top Canopy / Roof */}
        <mesh position={[0, 2.3, 0.12]} material={materials.sheetMetalLight}>
          <boxGeometry args={[2.3, 0.1, 1.88]} />
        </mesh>

        {/* Cyan Accent Stripe on Roof Brow */}
        <mesh position={[0, 2.36, 1.05]} material={materials.accentCyan}>
          <boxGeometry args={[2.28, 0.04, 0.04]} />
        </mesh>

        {/* Machine Model Brand Plate (VMC-3) */}
        <mesh position={[-0.8, 2.15, 1.05]} material={materials.accentCyan}>
          <boxGeometry args={[0.42, 0.12, 0.02]} />
        </mesh>

        {/* Chamber Stainless Steel Splash Guards / Inner Walls */}
        <mesh position={[-1.07, 1.25, 0.12]} material={materials.stainless}>
          <boxGeometry args={[0.02, 1.4, 1.7]} />
        </mesh>
        <mesh position={[1.07, 1.25, 0.12]} material={materials.stainless}>
          <boxGeometry args={[0.02, 1.4, 1.7]} />
        </mesh>

        {/* Sloped Chip Chute at Chamber Base */}
        <mesh position={[0, 0.44, 0.65]} rotation={[-0.2, 0, 0]} material={materials.stainless}>
          <boxGeometry args={[1.9, 0.04, 0.55]} />
        </mesh>

        {/* Chip Conveyor Exit Trough (Right Side) */}
        <mesh position={[1.22, 0.35, 0.2]} rotation={[0, 0, -0.3]} material={materials.sheetMetalDark}>
          <boxGeometry args={[0.35, 0.2, 0.45]} />
        </mesh>

        {/* Overhead Chamber LED Lamp (Illuminates interior machining zone) */}
        <mesh position={[0, 2.22, 0.15]} material={materials.groundSteel}>
          <boxGeometry args={[0.8, 0.04, 0.12]} />
        </mesh>
        <pointLight position={[0, 2.15, 0.15]} intensity={1.8} distance={3.2} color="#f8fafc" />
      </ComponentMesh>

      {/* 2. SPINDLE ASSEMBLY (Headstock, Cartridge, Nose, Coolant Nozzles) */}
      <ComponentMesh
        componentId="spindle"
        name="Spindle Assembly"
        risk="high"
        isSelected={selectedComponent === 'spindle'}
        isHighlighted={highlightedComponent === 'spindle'}
        onClick={onSelectComponent}
        onHover={onHoverComponent}
      >
        <group position={[0, 1.45, -0.15]}>
          {/* Z-Axis Sliding Carriage / Headstock Bracket */}
          <mesh position={[0, 0.25, -0.22]} material={materials.castIron} castShadow>
            <boxGeometry args={[0.62, 0.72, 0.48]} />
          </mesh>

          {/* Spindle Main Drive Motor (Top) */}
          <mesh position={[0, 0.72, -0.18]} material={materials.motorBlue} castShadow>
            <cylinderGeometry args={[0.15, 0.15, 0.34, 24]} />
          </mesh>

          {/* Motor Cooling Fan Cowl & Electrical Box */}
          <mesh position={[0, 0.91, -0.18]} material={materials.sheetMetalDark}>
            <cylinderGeometry args={[0.16, 0.16, 0.06, 24]} />
          </mesh>
          <mesh position={[0.14, 0.72, -0.18]} material={materials.sheetMetalDark}>
            <boxGeometry args={[0.08, 0.18, 0.14]} />
          </mesh>

          {/* Spindle Cartridge Cylinder (Ground Precision Steel) */}
          <mesh position={[0, 0.05, 0]} material={materials.groundSteel} castShadow>
            <cylinderGeometry args={[0.115, 0.115, 0.52, 32]} />
          </mesh>

          {/* Spindle Lower Bearing Flange Collar */}
          <mesh position={[0, -0.18, 0]} material={materials.anodizedSteel}>
            <cylinderGeometry args={[0.135, 0.135, 0.08, 32]} />
          </mesh>

          {/* Rotating Spindle Nose Group (subtly spins if active) */}
          <group ref={spindleRef} position={[0, -0.26, 0]}>
            {/* Spindle Nose Ring */}
            <mesh material={materials.groundSteel}>
              <cylinderGeometry args={[0.09, 0.085, 0.08, 32]} />
            </mesh>

            {/* Spindle Drive Dogs / Drive Keys (two hardened steel lugs) */}
            {[-0.075, 0.075].map((x, i) => (
              <mesh key={`dog-${i}`} position={[x, -0.035, 0]} material={materials.anodizedSteel}>
                <boxGeometry args={[0.02, 0.03, 0.025]} />
              </mesh>
            ))}

            {/* BT40 Tool Taper Socket Hole */}
            <mesh position={[0, -0.045, 0]} material={materials.castIron}>
              <cylinderGeometry args={[0.045, 0.04, 0.02, 24]} />
            </mesh>
          </group>

          {/* Dual Articulated Coolant Hose Nozzles (Loc-Line style) */}
          {[-0.14, 0.14].map((x, i) => (
            <group key={`nozzle-${i}`} position={[x, -0.14, 0.08]}>
              {/* Coolant manifold block */}
              <mesh material={materials.anodizedSteel}>
                <boxGeometry args={[0.04, 0.04, 0.04]} />
              </mesh>
              {/* Segmented hose rings */}
              <mesh position={[0, -0.05, 0.02]} rotation={[0.4, 0, x > 0 ? -0.2 : 0.2]} material={materials.coolantBlue}>
                <cylinderGeometry args={[0.014, 0.014, 0.06, 12]} />
              </mesh>
              <mesh position={[0, -0.1, 0.05]} rotation={[0.6, 0, x > 0 ? -0.3 : 0.3]} material={materials.coolantOrange}>
                <cylinderGeometry args={[0.013, 0.013, 0.06, 12]} />
              </mesh>
              {/* Brass nozzle tip */}
              <mesh position={[0, -0.15, 0.08]} rotation={[0.8, 0, x > 0 ? -0.4 : 0.4]} material={materials.carbideGold}>
                <coneGeometry args={[0.012, 0.04, 12]} />
              </mesh>
            </group>
          ))}
        </group>
      </ComponentMesh>

      {/* 3. TOOL HOLDER & ATC CAROUSEL ASSEMBLY */}
      <ComponentMesh
        componentId="tool_holder"
        name="Tool Holder & ATC"
        risk="medium"
        isSelected={selectedComponent === 'tool_holder'}
        isHighlighted={highlightedComponent === 'tool_holder'}
        onClick={onSelectComponent}
        onHover={onHoverComponent}
      >
        {/* Tool Holder Clamped in Active Spindle */}
        <group position={[0, 1.13, -0.15]}>
          {/* BT40 Taper Body & Flange */}
          <mesh position={[0, 0.02, 0]} material={materials.groundSteel} castShadow>
            <cylinderGeometry args={[0.055, 0.048, 0.06, 24]} />
          </mesh>
          {/* Tool Changer V-Groove Flange Ring */}
          <mesh position={[0, -0.015, 0]} material={materials.anodizedSteel}>
            <cylinderGeometry args={[0.068, 0.068, 0.022, 24]} />
          </mesh>
          {/* ER32 Collet Chuck Nut */}
          <mesh position={[0, -0.05, 0]} material={materials.anodizedSteel}>
            <cylinderGeometry args={[0.038, 0.036, 0.05, 12]} />
          </mesh>
          {/* 4-Flute Solid Carbide End Mill Cutting Tool */}
          <mesh position={[0, -0.11, 0]} material={materials.groundSteel}>
            <cylinderGeometry args={[0.01, 0.01, 0.07, 16]} />
          </mesh>
          {/* TiN Coated Cutter Flutes Tip */}
          <mesh position={[0, -0.15, 0]} material={materials.carbideGold}>
            <cylinderGeometry args={[0.01, 0.01, 0.03, 16]} />
          </mesh>
        </group>

        {/* Automatic Tool Changer (ATC) Carousel Drum (Mounted on Left Side) */}
        <group position={[-0.78, 1.55, -0.12]}>
          {/* ATC Carousel Housing Plate */}
          <mesh rotation={[0, 0, 0.2]} material={materials.sheetMetalDark}>
            <cylinderGeometry args={[0.34, 0.34, 0.04, 32]} />
          </mesh>
          {/* ATC Center Hub */}
          <mesh rotation={[0, 0, 0.2]} material={materials.accentCyan}>
            <cylinderGeometry args={[0.08, 0.08, 0.08, 16]} />
          </mesh>
          {/* 10 Tool Pockets around Carousel Perimeter */}
          {[...Array(10)].map((_, i) => {
            const angle = (i * Math.PI * 2) / 10;
            const r = 0.27;
            const px = Math.cos(angle) * r;
            const py = Math.sin(angle) * r;
            return (
              <group key={`tool-pocket-${i}`} position={[px, py, 0.03]}>
                <mesh material={materials.anodizedSteel}>
                  <cylinderGeometry args={[0.026, 0.026, 0.06, 12]} />
                </mesh>
                <mesh position={[0, 0, 0.04]} material={materials.groundSteel}>
                  <cylinderGeometry args={[0.012, 0.012, 0.05, 8]} />
                </mesh>
              </group>
            );
          })}
          {/* Twin-Arm Tool Changer Transfer Arm Bracket */}
          <mesh position={[0.22, -0.18, 0]} rotation={[0, 0, -0.4]} material={materials.anodizedSteel}>
            <boxGeometry args={[0.35, 0.05, 0.04]} />
          </mesh>
        </group>
      </ComponentMesh>

      {/* 4. WORKTABLE & AXES ASSEMBLY */}
      <ComponentMesh
        componentId="worktable"
        name="T-Slot Worktable"
        risk="low"
        isSelected={selectedComponent === 'worktable'}
        isHighlighted={highlightedComponent === 'worktable'}
        onClick={onSelectComponent}
        onHover={onHoverComponent}
      >
        <group position={[0, 0.62, 0.04]}>
          {/* Y-Axis Cast Iron Saddle */}
          <mesh position={[0, -0.1, 0]} material={materials.castIron} castShadow>
            <boxGeometry args={[1.35, 0.16, 0.85]} />
          </mesh>

          {/* Telescopic Way Covers (Corrugated/Stepped Stainless Bellows) */}
          <mesh position={[0, -0.05, -0.38]} material={materials.stainless}>
            <boxGeometry args={[1.1, 0.06, 0.35]} />
          </mesh>
          <mesh position={[0, -0.05, 0.38]} material={materials.stainless}>
            <boxGeometry args={[1.1, 0.06, 0.35]} />
          </mesh>

          {/* Precision Ground T-Slot Table Top */}
          <mesh position={[0, 0.04, 0]} material={materials.groundSteel} castShadow receiveShadow>
            <boxGeometry args={[1.25, 0.12, 0.52]} />
          </mesh>

          {/* 4 Visible Longitudinal T-Slots Milled on Table Surface */}
          {[-0.18, -0.06, 0.06, 0.18].map((z, i) => (
            <mesh key={`tslot-${i}`} position={[0, 0.101, z]} material={materials.castIron}>
              <boxGeometry args={[1.23, 0.01, 0.024]} />
            </mesh>
          ))}

          {/* Coolant Perimeter Drainage Trough */}
          <mesh position={[0, 0.01, 0.28]} material={materials.anodizedSteel}>
            <boxGeometry args={[1.28, 0.04, 0.04]} />
          </mesh>
        </group>
      </ComponentMesh>

      {/* 5. VISE & CLAMPED WORKPIECE ASSEMBLY */}
      <ComponentMesh
        componentId="vise"
        name="Precision Milling Vise"
        risk="low"
        isSelected={selectedComponent === 'vise'}
        isHighlighted={highlightedComponent === 'vise'}
        onClick={onSelectComponent}
        onHover={onHoverComponent}
      >
        <group position={[0, 0.77, 0.04]}>
          {/* Vise Heavy Stationary Base (Kurt 6-Inch style) */}
          <mesh position={[0, 0.03, 0]} material={materials.anodizedSteel} castShadow>
            <boxGeometry args={[0.34, 0.06, 0.54]} />
          </mesh>

          {/* Vise Ground Guide Ways */}
          <mesh position={[0, 0.065, 0]} material={materials.groundSteel}>
            <boxGeometry args={[0.26, 0.015, 0.48]} />
          </mesh>

          {/* Table T-Slot Mounting Toe Clamps (2 clamps securing vise to bed) */}
          {[-0.19, 0.19].map((x, i) => (
            <group key={`clamp-${i}`} position={[x, 0.02, 0]}>
              <mesh material={materials.anodizedSteel}>
                <boxGeometry args={[0.06, 0.04, 0.08]} />
              </mesh>
              <mesh position={[0, 0.035, 0]} material={materials.stainless}>
                <cylinderGeometry args={[0.014, 0.014, 0.04, 8]} />
              </mesh>
            </group>
          ))}

          {/* Stationary (Fixed) Jaw Block (Rear) */}
          <mesh position={[0, 0.11, -0.1]} material={materials.anodizedSteel} castShadow>
            <boxGeometry args={[0.3, 0.08, 0.07]} />
          </mesh>
          {/* Hardened Ground Jaw Plate */}
          <mesh position={[0, 0.11, -0.06]} material={materials.groundSteel}>
            <boxGeometry args={[0.3, 0.07, 0.012]} />
          </mesh>

          {/* Movable Jaw Block (Front) */}
          <mesh position={[0, 0.11, 0.05]} material={materials.anodizedSteel} castShadow>
            <boxGeometry args={[0.3, 0.08, 0.07]} />
          </mesh>
          <mesh position={[0, 0.11, 0.01]} material={materials.groundSteel}>
            <boxGeometry args={[0.3, 0.07, 0.012]} />
          </mesh>

          {/* Vise Clamping Acme Screw & Front Hex Nut Collar */}
          <mesh position={[0, 0.05, 0.28]} rotation={[Math.PI / 2, 0, 0]} material={materials.groundSteel}>
            <cylinderGeometry args={[0.022, 0.022, 0.08, 6]} />
          </mesh>

          {/* Clamped Workpiece Billet (Aerospace Aluminum / SS304 Block) */}
          <group position={[0, 0.125, -0.025]}>
            <mesh material={materials.aluminumBillet} castShadow>
              <boxGeometry args={[0.22, 0.06, 0.06]} />
            </mesh>
            {/* Machined Internal Pocket on workpiece */}
            <mesh position={[0, 0.02, 0]} material={materials.groundSteel}>
              <boxGeometry args={[0.14, 0.022, 0.035]} />
            </mesh>
          </group>
        </group>
      </ComponentMesh>

      {/* 6. CONTROL PANEL PENDANT ASSEMBLY */}
      <ComponentMesh
        componentId="control_panel"
        name="CNC Control Panel"
        risk="low"
        isSelected={selectedComponent === 'control_panel'}
        isHighlighted={highlightedComponent === 'control_panel'}
        onClick={onSelectComponent}
        onHover={onHoverComponent}
      >
        <group position={[1.36, 1.45, 0.88]} rotation={[0, -0.32, 0]}>
          {/* Swiveling Pendant Arm from machine frame */}
          <mesh position={[-0.26, 0, -0.15]} rotation={[0, 0.4, 0]} material={materials.castIron}>
            <boxGeometry args={[0.42, 0.08, 0.08]} />
          </mesh>

          {/* Pendant Console Enclosure Box */}
          <mesh position={[0, 0, 0]} material={materials.sheetMetalDark} castShadow>
            <boxGeometry args={[0.48, 0.64, 0.18]} />
          </mesh>

          {/* Cyan Trim Frame around Console */}
          <mesh position={[0, 0, 0.091]} material={materials.accentCyan}>
            <boxGeometry args={[0.46, 0.62, 0.005]} />
          </mesh>

          {/* CNC Display Screen (LCD glowing matrix) */}
          <mesh position={[0, 0.14, 0.095]} material={materials.screenGlow}>
            <boxGeometry args={[0.38, 0.24, 0.005]} />
          </mesh>

          {/* Display G-Code and Coordinate Text Simulation Lines */}
          {[-0.04, 0.0, 0.04, 0.08].map((y, i) => (
            <mesh key={`line-${i}`} position={[0, 0.14 + y, 0.098]} material={materials.screenText}>
              <boxGeometry args={[0.32 - i * 0.04, 0.008, 0.002]} />
            </mesh>
          ))}

          {/* Alphanumeric Membrane Keypad Grid */}
          <mesh position={[0, -0.14, 0.095]} material={materials.anodizedSteel}>
            <boxGeometry args={[0.38, 0.22, 0.005]} />
          </mesh>

          {/* Machine Operation Buttons */}
          {/* Green Cycle Start */}
          <mesh position={[-0.12, -0.22, 0.1]} material={materials.stackGreen}>
            <cylinderGeometry args={[0.016, 0.016, 0.015, 16]} rotation={[Math.PI / 2, 0, 0]} />
          </mesh>

          {/* Amber Feed Hold */}
          <mesh position={[-0.04, -0.22, 0.1]} material={materials.stackAmber}>
            <cylinderGeometry args={[0.016, 0.016, 0.015, 16]} rotation={[Math.PI / 2, 0, 0]} />
          </mesh>

          {/* Emergency Stop Button (Large Red Mushroom with Yellow Collar) */}
          <group position={[0.11, -0.21, 0.1]}>
            <mesh material={materials.eStopYellow}>
              <cylinderGeometry args={[0.026, 0.026, 0.015, 16]} rotation={[Math.PI / 2, 0, 0]} />
            </mesh>
            <mesh position={[0, 0, 0.012]} material={materials.eStopRed}>
              <cylinderGeometry args={[0.022, 0.018, 0.02, 16]} rotation={[Math.PI / 2, 0, 0]} />
            </mesh>
          </group>

          {/* 3-Tier Status Tower / Stack Light on top of Console */}
          <group position={[0.16, 0.38, 0]}>
            {/* Vertical mounting mast */}
            <mesh material={materials.stainless}>
              <cylinderGeometry args={[0.012, 0.012, 0.14, 12]} />
            </mesh>
            {/* Red Light Tier */}
            <mesh position={[0, 0.15, 0]} material={materials.stackRed}>
              <cylinderGeometry args={[0.022, 0.022, 0.035, 16]} />
            </mesh>
            {/* Amber Light Tier */}
            <mesh position={[0, 0.11, 0]} material={materials.stackAmber}>
              <cylinderGeometry args={[0.022, 0.022, 0.035, 16]} />
            </mesh>
            {/* Green Light Tier (illuminated active) */}
            <mesh position={[0, 0.07, 0]} material={materials.stackGreen}>
              <cylinderGeometry args={[0.022, 0.022, 0.035, 16]} />
            </mesh>
          </group>
        </group>
      </ComponentMesh>

      {/* 7. ENCLOSURE DOORS (Sliding Safety Doors with Observation Windows) */}
      <ComponentMesh
        componentId="doors"
        name="Enclosure Doors"
        risk="none"
        isSelected={selectedComponent === 'doors'}
        isHighlighted={highlightedComponent === 'doors'}
        onClick={onSelectComponent}
        onHover={onHoverComponent}
      >
        {/* Top and Bottom Door Sliding Tracks */}
        <mesh position={[0, 2.22, 1.05]} material={materials.anodizedSteel}>
          <boxGeometry args={[2.0, 0.05, 0.06]} />
        </mesh>
        <mesh position={[0, 0.46, 1.05]} material={materials.anodizedSteel}>
          <boxGeometry args={[2.0, 0.05, 0.06]} />
        </mesh>

        {/* Left Sliding Door */}
        <group ref={leftDoorRef} position={[-0.37, 1.34, 1.04]}>
          {/* Door Metal Frame */}
          <mesh material={materials.sheetMetalDark} castShadow>
            <boxGeometry args={[0.74, 1.72, 0.035]} />
          </mesh>
          {/* Large Observation Safety Polycarbonate Window */}
          <mesh position={[0, 0.06, 0]} material={materials.safetyGlass}>
            <boxGeometry args={[0.58, 1.36, 0.015]} />
          </mesh>
          {/* Vertical Door Handle (Right edge of left door) */}
          <mesh position={[0.31, 0, 0.035]} material={materials.stainless}>
            <cylinderGeometry args={[0.014, 0.014, 0.42, 12]} />
          </mesh>
        </group>

        {/* Right Sliding Door */}
        <group ref={rightDoorRef} position={[0.37, 1.34, 1.04]}>
          {/* Door Metal Frame */}
          <mesh material={materials.sheetMetalDark} castShadow>
            <boxGeometry args={[0.74, 1.72, 0.035]} />
          </mesh>
          {/* Large Observation Safety Polycarbonate Window */}
          <mesh position={[0, 0.06, 0]} material={materials.safetyGlass}>
            <boxGeometry args={[0.58, 1.36, 0.015]} />
          </mesh>
          {/* Vertical Door Handle (Left edge of right door) */}
          <mesh position={[-0.31, 0, 0.035]} material={materials.stainless}>
            <cylinderGeometry args={[0.014, 0.014, 0.42, 12]} />
          </mesh>
        </group>
      </ComponentMesh>
    </group>
  );
}
