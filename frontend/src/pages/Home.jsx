import { useRef } from "react";
import { Link } from "react-router-dom";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import {
    Mic, MessageSquareText, Boxes, ClipboardList, ArrowRight, ArrowUpRight,
    CalendarClock, ShieldAlert, Gauge, FileCheck2, Sparkles, Wrench,
} from "lucide-react";
import { MaskedLine, Reveal, Eyebrow, Marquee, RiskChip, EASE } from "@/components/common";
import { useRole } from "@/store/RoleContext";
import { IMAGES, PERSONAS, ROLE_ORDER, STATS, KNOWHOW_CARDS, TIMELINE } from "@/mock/data";

function Hero() {
    return (
        <section className="relative overflow-hidden pt-10 pb-20 sm:pt-14 sm:pb-28">
            {/* Background Radial Shades (21st.dev Hero 3 pattern - id: 11428) */}
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 size-full overflow-hidden -z-10">
                <div className="absolute inset-0 bg-[radial-gradient(45%_60%_at_20%_0%,rgba(128,0,32,0.12),transparent)] dark:bg-[radial-gradient(45%_60%_at_20%_0%,rgba(128,0,32,0.22),transparent)]" />
                <div className="absolute top-1/4 right-0 h-96 w-96 rounded-full bg-maroon-700/10 dark:bg-maroon-500/15 blur-3xl" />
            </div>

            <div className="mx-auto max-w-7xl px-5 sm:px-8">
                {/* Left-Aligned Hero Content */}
                <div className="relative z-10 flex max-w-3xl flex-col gap-5 sm:gap-6">
                    {/* Headline - High-impact large display with White & Maroon styling */}
                    <h1
                        data-testid="hero-reveal-title"
                        className="text-balance font-display font-black text-5xl sm:text-6xl md:text-7xl lg:text-[5.25rem] xl:text-[5.75rem] tracking-tight text-ink dark:text-white leading-[1.02] sm:leading-[1.02]"
                    >
                        Experience walks out
                        <br className="hidden sm:inline" />{" "}
                        the door.{" "}
                        <span className="font-serif font-normal italic text-maroon-700 dark:text-maroon-400">
                            We make it stay.
                        </span>
                    </h1>

                    {/* Subtext */}
                    <p className="max-w-2xl text-base sm:text-lg leading-relaxed text-slate-600 dark:text-slate-300">
                        Apex Zenith captures veteran machinists' tacit know-how — audio nuances, vibration signatures, logbook sketches — and returns it to operators as verified procedures and real-time guardrails before scrap happens.
                    </p>

                    {/* CTA Actions - White and Maroon Theme */}
                    <div className="flex flex-wrap items-center gap-4 pt-1">
                        <Link
                            to="/capture"
                            data-testid="hero-cta-capture"
                            className="group inline-flex h-12 sm:h-14 items-center gap-2.5 rounded-full bg-maroon-700 hover:bg-maroon-800 dark:bg-maroon-700 dark:hover:bg-maroon-600 text-white px-8 py-3.5 text-sm sm:text-base font-semibold transition-all duration-300 shadow-md shadow-maroon-900/20 hover:shadow-lg hover:shadow-maroon-900/30"
                        >
                            <Mic size={18} />
                            Capture know-how
                            <ArrowRight size={17} className="transition-transform duration-300 group-hover:translate-x-1" />
                        </Link>
                        <Link
                            to="/ask"
                            data-testid="hero-cta-ask"
                            className="inline-flex h-12 sm:h-14 items-center gap-2.5 rounded-full border border-maroon-200 dark:border-maroon-800 bg-white/95 dark:bg-slate-900/90 px-8 py-3.5 text-sm sm:text-base font-semibold text-maroon-950 dark:text-maroon-100 transition-all duration-300 hover:border-maroon-700 dark:hover:border-maroon-500 hover:bg-maroon-50/50 dark:hover:bg-maroon-950/40 shadow-xs"
                        >
                            <MessageSquareText size={18} className="text-maroon-700 dark:text-maroon-400" />
                            Ask Experience
                        </Link>
                    </div>

                    {/* Quick Metric Stats Bar */}
                    <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-6 max-w-xl pt-4 border-t border-slate-100 dark:border-slate-800/80">
                        {STATS.map((s) => (
                            <div key={s.label}>
                                <div className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-ink dark:text-white">
                                    {s.value}
                                    <span className="text-maroon-700 dark:text-maroon-400">{s.unit}</span>
                                </div>
                                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 font-medium">{s.label}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 21st.dev Signature Hero 3 Dashboard Mockup Preview */}
                <div className="relative mt-12 sm:mt-16 lg:mt-20">
                    {/* Ambient Radial Glow */}
                    <div
                        className="absolute -inset-x-20 inset-y-0 -translate-y-1/4 scale-110 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(128,0,32,0.20),transparent_70%)] blur-[70px] pointer-events-none"
                        aria-hidden="true"
                    />

                    {/* Dashboard Frame */}
                    <div className="relative mx-auto max-w-6xl overflow-hidden rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 p-2 sm:p-3 shadow-2xl backdrop-blur-xl ring-1 ring-slate-900/5 dark:ring-white/10">
                        
                        {/* Mockup Console Window Header */}
                        <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100 dark:border-slate-800 mb-2">
                            <div className="flex items-center gap-2">
                                <div className="flex items-center gap-1.5">
                                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                                </div>
                                <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500 ml-2 hidden sm:inline-block">
                                    Apex Zenith CNC · Shop Floor Console • Station VMC-3
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    Live Audio Guardrail Active
                                </span>
                            </div>
                        </div>

                        {/* Mockup Dashboard Content Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 p-1">
                            {/* Column 1: Live Machine Image & Spindle Telemetry HUD */}
                            <div className="md:col-span-4 relative aspect-[4/3] md:aspect-auto md:min-h-[280px] overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-900 group">
                                <img
                                    src={IMAGES.hero}
                                    alt="Machinist inspecting CNC spindle"
                                    className="h-full w-full object-cover grayscale-[25%] contrast-[105%] group-hover:scale-105 transition-transform duration-700"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/30 to-transparent" />
                                
                                <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-2 py-1 rounded-md text-[10px] font-mono text-white">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                    Haas VF-2 · VMC-03
                                </div>

                                <div className="absolute bottom-3 left-3 right-3 text-white">
                                    <p className="font-mono text-[9px] uppercase tracking-wider text-maroon-600 dark:text-maroon-400 font-semibold">Active Spindle Telemetry</p>
                                    <div className="flex items-center justify-between text-xs font-semibold mt-1">
                                        <span>4,200 RPM</span>
                                        <span className="text-emerald-400">Runout: 0.002mm</span>
                                        <span className="text-slate-300">Temp: 44°C</span>
                                    </div>
                                </div>
                            </div>

                            {/* Column 2: Active Operation & Tolerances */}
                            <div className="md:col-span-4 flex flex-col justify-between p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
                                <div>
                                    <div className="flex items-center justify-between text-xs mb-2">
                                        <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                            <Wrench size={13} className="text-maroon-700" />
                                            Operation Step 3 of 6
                                        </span>
                                        <span className="text-[10px] font-mono bg-white dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
                                            SS304 Flange
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
                                        Face roughing at 850 mm/min feed. Acoustic chatter monitoring continuously calibrated to 820 Hz threshold.
                                    </p>
                                </div>

                                <div className="space-y-1.5 mt-3 pt-3 border-t border-slate-200/80 dark:border-slate-700/80">
                                    <div className="flex items-center justify-between text-[11px]">
                                        <span className="text-slate-500">Coolant Pressure</span>
                                        <span className="font-mono font-semibold text-slate-900 dark:text-white">4.8 bar ✓</span>
                                    </div>
                                    <div className="flex items-center justify-between text-[11px]">
                                        <span className="text-slate-500">Insert Wear Indicator</span>
                                        <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">92% Life OK</span>
                                    </div>
                                </div>
                            </div>

                            {/* Column 3: Veteran Ramesh Patil Tacit Rule Card */}
                            <div className="md:col-span-4 flex flex-col justify-between p-3.5 rounded-xl border border-amber-200/80 dark:border-amber-900/50 bg-amber-50/80 dark:bg-amber-950/30">
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-maroon-900 dark:text-maroon-300">
                                            <span className="w-1.5 h-1.5 rounded-full bg-maroon-700 pin-pulse" />
                                            Ramesh's Rule #104
                                        </span>
                                        <span className="text-[10px] text-amber-800 dark:text-amber-400 font-mono">38 yrs exp</span>
                                    </div>
                                    <p className="font-serif text-xs italic leading-relaxed text-amber-950 dark:text-amber-200">
                                        "The wall rings like a bell at 4,200. Drop 150 RPM — never the feed. That SS304 chatter howl precedes bearing thermal trip."
                                    </p>
                                </div>

                                <div className="mt-3 pt-2.5 border-t border-amber-200/60 dark:border-amber-900/40 flex items-center justify-between text-[10px] text-amber-900/80 dark:text-amber-300/80">
                                    <span>Verified by Anil K.</span>
                                    <span className="font-mono font-semibold">14 Incidents Prevented</span>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </section>
    );
}

function RoleLens() {
    const { roleId, setRoleId, persona } = useRole();

    const lenses = {
        ramesh: {
            title: "Ramesh Sharma's Handover Cockpit",
            subtitle: "Veteran Master · Retiring in 14 days",
            stat: "14 days",
            statLabel: "until knowledge leaves",
            actions: [
                { label: "Record Voice Note", desc: "Speak in Hindi, Marathi, or English", to: "/capture", icon: Mic },
                { label: "Exit Interview Queue", desc: "Answer Priya's routed questions", to: "/handover", icon: CalendarClock },
                { label: "Verify Draft Cards", desc: "Approve AI-extracted knowledge", to: "/review", icon: FileCheck2 },
            ],
            quote: "I've run this VF-2 since the day it was uncrated in '96. Every vibration tells me what's about to happen.",
        },
        priya: {
            title: "Priya Nair's Learning Dashboard",
            subtitle: "Apprentice · Level 1 · 3 months on floor",
            stat: "L1 → L2",
            statLabel: "qualification target",
            actions: [
                { label: "Ask Ramesh's Experience", desc: "Cited advice on any material or tool", to: "/ask", icon: MessageSquareText },
                { label: "Start Guided Setup", desc: "Step-by-step job with ShadowTrace", to: "/guided-job", icon: ClipboardList },
                { label: "Inspect 3D Machine", desc: "See where knowledge is concentrated", to: "/map", icon: Boxes },
            ],
            quote: "When a tool chatters, the manual says 'reduce feeds and speeds.' Ramesh told me exactly which 150 RPM to drop.",
        },
        vikram: {
            title: "Vikram Patel's Risk Matrix",
            subtitle: "Shift In-Charge · Plant 2 Operations",
            stat: "62%",
            statLabel: "Ramesh know-how covered",
            actions: [
                { label: "Shop Risk Heatmap", desc: "See uncaptured critical components", to: "/dashboard", icon: Gauge },
                { label: "Handover Progress", desc: "Track knowledge transfer metrics", to: "/handover", icon: CalendarClock },
                { label: "Quality Audit Trail", desc: "Zero unexplained scrap incidents", to: "/review", icon: ShieldAlert },
            ],
            quote: "If Ramesh leaves without writing down the flange trick, we lose 40 minutes on every changeover.",
        },
    };

    const cur = lenses[roleId] || lenses.priya;

    return (
        <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
            <Reveal>
                <div className="flex flex-wrap items-end justify-between gap-4">
                    <div>
                        <Eyebrow>Perspective switcher</Eyebrow>
                        <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
                            One plant. Three lenses.
                        </h2>
                    </div>
                    <div className="flex rounded-full border border-slate-200 bg-white p-1">
                        {ROLE_ORDER.map((id) => (
                            <button
                                key={id}
                                onClick={() => setRoleId(id)}
                                className={`rounded-full px-4 py-2 text-xs font-semibold transition-colors ${
                                    roleId === id ? "bg-ink text-white" : "text-slate-500 hover:text-ink"
                                }`}
                            >
                                {PERSONAS[id].short}
                            </button>
                        ))}
                    </div>
                </div>
            </Reveal>

            <AnimatePresence mode="wait">
                <motion.div
                    key={roleId}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -16 }}
                    transition={{ duration: 0.45, ease: EASE }}
                    className="mt-8 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm lg:p-10"
                >
                    <div className="grid gap-8 lg:grid-cols-12">
                        <div className="lg:col-span-5">
                            <div className="flex items-center gap-3">
                                <img src={persona.avatar} alt="" className="h-12 w-12 rounded-full object-cover ring-2 ring-maroon-700/30" />
                                <div>
                                    <h3 className="font-display text-xl font-bold text-ink">{cur.title}</h3>
                                    <p className="text-xs text-slate-500">{cur.subtitle}</p>
                                </div>
                            </div>
                            <blockquote className="mt-6 border-l-2 border-maroon-700 pl-4 font-serif text-lg italic text-slate-700">
                                "{cur.quote}"
                            </blockquote>
                            <div className="mt-6 rounded-2xl bg-canvas p-4">
                                <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Key Metric</span>
                                <div className="mt-1 font-display text-2xl font-extrabold text-ink">{cur.stat}</div>
                                <p className="text-xs text-slate-500">{cur.statLabel}</p>
                            </div>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-3 lg:col-span-7">
                            {cur.actions.map((act) => (
                                <Link
                                    key={act.label}
                                    to={act.to}
                                    className="group flex flex-col justify-between rounded-2xl border border-slate-200 bg-canvas p-5 transition-all duration-200 hover:border-maroon-700/60 hover:bg-white hover:shadow-md"
                                >
                                    <div>
                                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-maroon-50 text-maroon-700 dark:bg-maroon-950/80 dark:text-maroon-400">
                                            <act.icon size={20} />
                                        </div>
                                        <h4 className="mt-4 font-display text-base font-bold text-ink">{act.label}</h4>
                                        <p className="mt-1 text-xs leading-relaxed text-slate-500">{act.desc}</p>
                                    </div>
                                    <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-maroon-700 dark:text-maroon-400 group-hover:underline">
                                        Open <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
                                    </span>
                                </Link>
                            ))}
                        </div>
                    </div>
                </motion.div>
            </AnimatePresence>
        </section>
    );
}

function Bento() {
    const actions = [
        {
            title: "Multi-Modal Capture",
            desc: "Voice notes in Hindi, setup video clips, hand-drawn logbook sketches. AI transcribes, translates, and structures each into an atomic card.",
            icon: Mic,
            to: "/capture",
            big: true,
        },
        {
            title: "Cited Expert QA",
            desc: "Semantic retrieval over shop floor logs. Always cites the card number, author, and timestamp. Never generates an ungrounded parameter.",
            icon: MessageSquareText,
            to: "/ask",
        },
        {
            title: "3D Machine Knowledge Map",
            desc: "Interactive digital twin. Click the spindle, fixture, or carousel to inspect associated know-how, past failures, and unrecorded risks.",
            icon: Boxes,
            to: "/map",
        },
        {
            title: "Adaptive Guided Jobs",
            desc: "Depth toggles from L0 apprentice story mode to L4 speed checklist. ShadowTrace overlays veteran footage on tricky alignment steps.",
            icon: ClipboardList,
            to: "/guided-job",
        },
        {
            title: "Note Guardian",
            desc: "Validates entered parameters against historical tolerances before saving. Flags dangerous speeds or missing coolant steps instantly.",
            icon: ShieldAlert,
            to: "/capture",
        },
        {
            title: "Exit Handover Cockpit",
            desc: "Structured retirement roadmap. Auto-interviews veteran on high-risk gaps and routes questions directly to their priority inbox.",
            icon: CalendarClock,
            to: "/handover",
        },
    ];

    return (
        <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
            <Reveal>
                <Eyebrow>Six core capabilities</Eyebrow>
                <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
                    Built for the shop floor, not the boardroom.
                </h2>
                <p className="mt-3 max-w-xl text-base text-slate-500">
                    High-contrast light interface, oversized touch targets, multilingual input, and zero hallucinated machining parameters.
                </p>
            </Reveal>

            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {actions.map((a, i) => (
                    <Reveal key={a.title} delay={i * 0.08}>
                        <Link
                            to={a.to}
                            className={`group flex h-full flex-col justify-between rounded-3xl border p-7 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${
                                a.big
                                    ? "relative overflow-hidden bg-gradient-to-br from-ink to-slate-900 text-white border-ink"
                                    : "border-slate-200 bg-white"
                            }`}
                        >
                            <div>
                                <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${a.big ? "bg-maroon-700 text-white" : "bg-maroon-50 text-maroon-700 dark:bg-maroon-950/80 dark:text-maroon-400"}`}>
                                    <a.icon size={22} />
                                </div>
                                <h3 className={`mt-6 font-display text-xl font-bold ${a.big ? "text-white" : "text-ink"}`}>{a.title}</h3>
                                <p className={`mt-2 text-sm leading-relaxed ${a.big ? "text-slate-300" : "text-slate-500"}`}>{a.desc}</p>
                            </div>
                            <span className="mt-6 inline-flex items-center gap-1.5 text-xs font-semibold text-maroon-700 dark:text-maroon-400">
                                Explore <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
                            </span>
                        </Link>
                    </Reveal>
                ))}
            </div>
        </section>
    );
}

function LegacyStrip() {
    const card = KNOWHOW_CARDS[0];
    return (
        <section className="border-t border-slate-200 bg-white">
            <div className="mx-auto grid max-w-7xl gap-12 px-5 py-20 sm:px-8 lg:grid-cols-2">
                <Reveal>
                    <Eyebrow>Transfer, don't replace</Eyebrow>
                    <h2 className="mt-3 font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
                        Every answer names its source. Every warning shows its evidence.
                    </h2>
                    <p className="mt-4 max-w-md text-base leading-relaxed text-slate-500">
                        Blueprint never pretends to be the expert. It carries Ramesh's voice to
                        Priya's machine — with the why, the proof, and the final call left to her.
                    </p>
                    <div className="mt-6 flex flex-wrap gap-2 font-mono text-xs text-slate-500">
                        {["No answer without a citation", "Audit log for every AI action", "Veteran validates low confidence"].map((t) => (
                            <span key={t} className="flex items-center gap-1.5 rounded-full bg-subtle px-3 py-1.5">
                                <FileCheck2 size={13} className="text-teal" /> {t}
                            </span>
                        ))}
                    </div>
                </Reveal>
                <Reveal delay={0.12}>
                    <div className="rounded-3xl border border-slate-200 bg-canvas p-7">
                        <div className="flex items-center justify-between">
                            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Card #{card.id}</p>
                            <RiskChip level="low" />
                        </div>
                        <h3 className="mt-3 font-display text-xl font-semibold text-ink">{card.title}</h3>
                        <p className="mt-3 font-serif text-lg italic leading-relaxed text-amber-900">"{card.why}"</p>
                        <div className="mt-5 flex items-center gap-3 border-t border-slate-200 pt-4">
                            <img src={card.author.avatar} alt="" className="h-9 w-9 rounded-full object-cover" />
                            <div>
                                <p className="text-sm font-semibold text-ink">{card.author.name}</p>
                                <p className="text-xs text-slate-500">Logged {card.date} · confidence {card.confidence}%</p>
                            </div>
                        </div>
                    </div>
                </Reveal>
            </div>
        </section>
    );
}

export default function Home() {
    return (
        <div>
            <Hero />
            <Marquee />
            <RoleLens />
            <Bento />
            <LegacyStrip />
            <footer className="border-t border-slate-200 bg-canvas">
                <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-8 sm:px-8">
                    <p className="text-sm text-slate-500">
                        <span className="font-display font-bold text-ink dark:text-white">Apex<span className="text-maroon-700 dark:text-maroon-400">Zenith</span></span>
                        {" "}· Problem 02 — Knowledge Transfer
                    </p>
                    <p className="font-mono text-xs text-slate-400">transfer knowledge, don't replace people</p>
                </div>
            </footer>
        </div>
    );
}
