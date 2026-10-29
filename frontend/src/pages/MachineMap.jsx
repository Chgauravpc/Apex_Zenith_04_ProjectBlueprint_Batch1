import { Suspense, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, Html, OrbitControls, RoundedBox } from "@react-three/drei";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, Flame, Mic, X, AlertTriangle, FileText, Wrench } from "lucide-react";
import { toast } from "sonner";
import { PageHead, Reveal, RiskChip } from "@/components/common";
import { COMPONENTS_3D, KNOWHOW_CARDS, PERSONAS } from "@/mock/data";

const RISK_COLORS = { low: "#0F766E", medium: "#D97706", high: "#DC2626" };

const PRESETS = {
    Reset: [7, 5, 9],
    Front: [0, 2.6, 11],
    Spindle: [1.8, 3.4, 4.2],
    Table: [4.2, 2.2, 3.4],
    Top: [0, 12, 0.6],
};

function Part({ id, position, size, cyl, selected, riskMode, onSelect, children }) {
    const [hover, setHover] = useState(false);
    const comp = COMPONENTS_3D.find((c) => c.id === id);
    const baseColor = riskMode ? RISK_COLORS[comp.risk] : "#E7E3DC";
    const color = selected ? "#D96B27" : baseColor;
    const props = {
        position,
        onClick: (e) => { e.stopPropagation(); onSelect(id); },
        onPointerOver: (e) => { e.stopPropagation(); setHover(true); document.body.style.cursor = "pointer"; },
        onPointerOut: () => { setHover(false); document.body.style.cursor = "auto"; },
    };
    return (
        <group {...props}>
            {cyl ? (
                <mesh castShadow>
                    <cylinderGeometry args={cyl} />
                    <meshStandardMaterial color={color} roughness={0.45} metalness={0.35} emissive={hover || selected ? "#D96B27" : "#000"} emissiveIntensity={hover ? 0.35 : selected ? 0.25 : 0} />
                </mesh>
            ) : (
                <RoundedBox args={size} radius={0.06} smoothness={4} castShadow receiveShadow>
                    <meshStandardMaterial color={color} roughness={0.5} metalness={0.25} emissive={hover || selected ? "#D96B27" : "#000"} emissiveIntensity={hover ? 0.3 : selected ? 0.22 : 0} />
                </RoundedBox>
            )}
            {children}
        </group>
    );
}

function Pin({ position }) {
    const ref = useRef();
    useFrame(({ clock }) => {
        if (ref.current) ref.current.scale.setScalar(1 + Math.sin(clock.elapsedTime * 3) * 0.18);
    });
    return (
        <mesh ref={ref} position={position}>
            <sphereGeometry args={[0.09, 16, 16]} />
            <meshStandardMaterial color="#D96B27" emissive="#D96B27" emissiveIntensity={1.4} />
        </mesh>
    );
}

function Machine({ selected, riskMode, onSelect }) {
    const p = { selected, riskMode, onSelect };
    const sel = (id) => selected === id;
    return (
        <group>
            <Part id="base" position={[0, 0.8, 0]} size={[3.6, 1.6, 2.6]} selected={sel("base")} {...p} />
            <Part id="table" position={[0, 1.75, 0.3]} size={[2.7, 0.28, 1.7]} selected={sel("table")} {...p} />
            <Part id="column" position={[0, 3, -0.85]} size={[1, 2.8, 1.1]} selected={sel("column")} {...p} />
            <Part id="head" position={[0, 3.85, 0]} size={[1.2, 0.9, 1]} selected={sel("head")} {...p} />
            <Part id="spindle" position={[0, 3.05, 0.25]} cyl={[0.17, 0.22, 1.1, 24]} selected={sel("spindle")} {...p} />
            <group position={[0, 2.42, 0.25]}>
                <mesh>
                    <coneGeometry args={[0.1, 0.28, 20]} />
                    <meshStandardMaterial color="#8A94A0" metalness={0.7} roughness={0.3} />
                </mesh>
            </group>
            <group position={[0, 2.05, 0.3]}>
                <mesh>
                    <boxGeometry args={[0.7, 0.35, 0.7]} />
                    <meshStandardMaterial color="#C9C4BB" roughness={0.4} metalness={0.4} />
                </mesh>
            </group>
            <Part id="carousel" position={[2, 2.5, -0.6]} cyl={[0.55, 0.55, 0.42, 28]} selected={sel("carousel")} {...p} />
            <Part id="coolant" position={[1.15, 2.4, 0.55]} cyl={[0.05, 0.05, 1.5, 12]} selected={sel("coolant")} {...p} />
            <Part id="panel" position={[2.25, 2.2, 0.9]} size={[0.75, 1.15, 0.22]} selected={sel("panel")} {...p} />
            <Part id="conveyor" position={[-2.35, 0.5, 0.7]} size={[1.5, 0.6, 0.9]} selected={sel("conveyor")} {...p} />
            <Pin position={[0, 4.5, 0]} />
            <Pin position={[0, 2.15, 0.3]} />
            <Pin position={[-2.35, 1, 0.7]} />
        </group>
    );
}

function CameraRig({ preset }) {
    const { camera, controls } = useThree();
    const target = useMemo(() => ({ pos: PRESETS[preset] || PRESETS.Reset }), [preset]);
    useFrame(() => {
        camera.position.lerp({ x: target.pos[0], y: target.pos[1], z: target.pos[2] }, 0.06);
        controls?.update();
    });
    return null;
}

function Drawer({ id, onClose }) {
    const comp = COMPONENTS_3D.find((c) => c.id === id);
    const cards = KNOWHOW_CARDS.filter((c) => c.component.toLowerCase().includes(comp.name.split(" ")[0].toLowerCase().slice(0, 5)));
    return (
        <motion.aside
            initial={{ x: 60, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 60, opacity: 0 }}
            data-testid="three-component-drawer"
            className="absolute right-4 top-4 z-10 w-[calc(100%-2rem)] max-w-sm rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-2xl backdrop-blur-md"
            data-lenis-prevent
        >
            <div className="flex items-start justify-between">
                <div>
                    <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Component</p>
                    <h3 className="mt-1 font-display text-xl font-bold text-ink">{comp.name}</h3>
                </div>
                <button onClick={onClose} className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-ink"><X size={17} /></button>
            </div>
            <div className="mt-4 flex items-center gap-2">
                <RiskChip level={comp.risk} />
                <span className="rounded-full bg-subtle px-2.5 py-1 font-mono text-[11px] text-slate-600">{comp.cards} cards</span>
                <span className="rounded-full bg-subtle px-2.5 py-1 font-mono text-[11px] text-slate-600">{comp.incidents} incidents</span>
            </div>
            <p className="mt-4 text-sm text-slate-500">
                Deepest knowledge: <span className="font-semibold text-ink">{comp.expert}</span>
                {comp.expert.startsWith("Ramesh") && <span className="text-copper"> · exits in 14 days</span>}
            </p>
            <div className="mt-5 max-h-56 space-y-3 overflow-y-auto pr-1">
                {(cards.length ? cards : KNOWHOW_CARDS.slice(0, 1)).map((c) => (
                    <div key={c.id} className="rounded-2xl bg-canvas p-4 ring-1 ring-slate-200">
                        <p className="flex items-center gap-2 text-sm font-semibold text-ink"><FileText size={14} className="text-copper" />{c.title}</p>
                        <p className="mt-1.5 font-serif text-sm italic text-amber-900">"{c.action}"</p>
                        <p className="mt-1.5 font-mono text-[10px] text-slate-400">Log #{c.id} · {c.author.name} · {c.date}</p>
                    </div>
                ))}
            </div>
            <button
                onClick={() => toast.success("Pin created", { description: `New voice pin attached to ${comp.name}` })}
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white transition-colors duration-300 hover:bg-copper"
            >
                <Mic size={15} /> Pin a voice note here
            </button>
        </motion.aside>
    );
}

export default function MachineMap() {
    const [selected, setSelected] = useState(null);
    const [riskMode, setRiskMode] = useState(true);
    const [preset, setPreset] = useState("Reset");

    return (
        <div className="mx-auto max-w-7xl px-5 py-12 sm:px-8">
            <PageHead
                eyebrow="Cross-cutting · 3D Machine Knowledge Map"
                title="The machine remembers what people forget."
                sub="Click any component. Colour tells you how much of its know-how survives Ramesh's last day."
            />
            <Reveal>
                <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-b from-[#EFECE6] to-[#E5E1D9]" data-testid="three-canvas-container" style={{ height: "min(72vh, 640px)" }}>
                    <Suspense fallback={<div className="flex h-full items-center justify-center font-mono text-sm text-slate-400">loading machine…</div>}>
                        <Canvas shadows camera={{ position: [7, 5, 9], fov: 42 }}>
                            <ambientLight intensity={0.75} />
                            <directionalLight position={[6, 9, 5]} intensity={1.15} castShadow shadow-mapSize={[1024, 1024]} />
                            <Machine selected={selected} riskMode={riskMode} onSelect={setSelected} />
                            <ContactShadows position={[0, -0.01, 0]} opacity={0.32} scale={16} blur={2.4} />
                            <OrbitControls makeDefault enableDamping dampingFactor={0.08} minDistance={4} maxDistance={18} maxPolarAngle={Math.PI / 2.05} />
                            <CameraRig preset={preset} />
                        </Canvas>
                    </Suspense>

                    <div className="absolute left-4 top-4 z-10 flex flex-wrap gap-2">
                        <button
                            data-testid="three-risk-toggle-btn"
                            onClick={() => setRiskMode((r) => !r)}
                            className={`flex items-center gap-2 rounded-full px-4 py-2.5 text-xs font-semibold shadow-sm backdrop-blur transition-colors ${riskMode ? "bg-ink text-white" : "bg-white/85 text-ink ring-1 ring-slate-200"}`}
                        >
                            <Flame size={14} className={riskMode ? "text-copper" : ""} /> Risk heat {riskMode ? "on" : "off"}
                        </button>
                        {Object.keys(PRESETS).map((k) => (
                            <button
                                key={k}
                                data-testid={k === "Reset" ? "three-camera-reset-btn" : undefined}
                                onClick={() => setPreset(k)}
                                className={`flex items-center gap-1.5 rounded-full px-4 py-2.5 text-xs font-semibold shadow-sm backdrop-blur transition-colors ${preset === k ? "bg-copper text-white" : "bg-white/85 text-ink ring-1 ring-slate-200 hover:bg-white"}`}
                            >
                                <Camera size={13} /> {k}
                            </button>
                        ))}
                    </div>

                    <div className="absolute bottom-4 left-4 z-10 flex flex-wrap gap-3 rounded-2xl bg-white/85 px-4 py-3 shadow-sm ring-1 ring-slate-200 backdrop-blur">
                        {Object.entries(RISK_COLORS).map(([k, v]) => (
                            <span key={k} className="flex items-center gap-1.5 text-[11px] font-medium text-slate-600">
                                <span className="h-2.5 w-2.5 rounded-full" style={{ background: v }} />
                                {k === "low" ? "Documented" : k === "medium" ? "Partial" : "Critical gap"}
                            </span>
                        ))}
                    </div>

                    <AnimatePresence>
                        {selected && <Drawer id={selected} onClose={() => setSelected(null)} />}
                    </AnimatePresence>
                </div>
            </Reveal>
            <p className="mt-6 flex items-center gap-2 text-xs text-slate-400">
                <AlertTriangle size={14} className="text-amber-500" />
                Spindle and chip conveyor show critical risk — 14 of 21 failure modes live only in Ramesh's head.
                <Wrench size={14} className="ml-2" /> Model built from primitives — swap in the real CAD mesh anytime.
            </p>
        </div>
    );
}
