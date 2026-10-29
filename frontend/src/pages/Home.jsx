import { useRef, useEffect } from "react";
import { initMcpFonts } from "@/utils/mcpFonts";
import { Link } from "react-router-dom";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import {
    Mic, MessageSquareText, Boxes, ClipboardList, ArrowRight, ArrowUpRight,
    CalendarClock, ShieldAlert, Gauge, FileCheck2, Sparkles, Wrench,
} from "lucide-react";
import { MaskedLine, Reveal, Eyebrow, Marquee, RiskChip, EASE } from "@/components/common";
import { useRole } from "@/store/RoleContext";
import { useAuthStore } from "@/store/useAuthStore";
import { IMAGES, PERSONAS, ROLE_ORDER, STATS, KNOWHOW_CARDS, TIMELINE } from "@/mock/data";

function Hero() {
    useEffect(() => {
        initMcpFonts();
    }, []);

    return (
        <section className="relative overflow-hidden pt-12 pb-24 sm:pt-16 sm:pb-32">
            {/* Background Ambient Radial Glow */}
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 size-full overflow-hidden -z-10">
                <div className="absolute inset-0 bg-[radial-gradient(50%_50%_at_50%_0%,rgba(128,0,32,0.12),transparent)] dark:bg-[radial-gradient(50%_50%_at_50%_0%,rgba(128,0,32,0.22),transparent)]" />
                <div className="absolute top-1/4 left-1/2 -translate-x-1/2 h-[500px] w-[800px] rounded-full bg-maroon-700/8 dark:bg-maroon-500/12 blur-[100px]" />
            </div>

            <div className="mx-auto max-w-7xl px-5 sm:px-8">
                {/* Full-Width Centered Hero Content (Not divided into 2 parts) */}
                <div className="relative z-10 mx-auto flex max-w-4xl flex-col items-center text-center gap-6 sm:gap-7">
                    
                    {/* Headline - Aesthetic Typography with Bold Statement & Editorial Serif Below */}
                    <h1
                        data-testid="hero-reveal-title"
                        className="mcp-hero-title text-balance font-hero font-black text-4xl sm:text-5xl md:text-6xl lg:text-[4.75rem] xl:text-[5.25rem] tracking-tight text-ink dark:text-white leading-[1.02] sm:leading-[1.02]"
                        style={{ fontFamily: "var(--font-hero, var(--font-display, 'Plus Jakarta Sans', 'Outfit', sans-serif))" }}
                    >
                        Experience walks out
                        <br />
                        the door.
                        <span className="block font-serif font-normal italic text-maroon-700 dark:text-maroon-400 mt-2 sm:mt-3 text-4xl sm:text-5xl md:text-6xl lg:text-7xl tracking-normal">
                            We make it stay.
                        </span>
                    </h1>

                    {/* Subtext */}
                    <p className="max-w-2xl text-base sm:text-lg lg:text-xl leading-relaxed text-slate-600 dark:text-slate-300 mx-auto">
                        Apex Zenith captures veteran machinists' tacit know-how — audio nuances, vibration signatures, logbook sketches — and returns it to operators as verified procedures and real-time guardrails before scrap happens.
                    </p>

                    {/* Centered CTA Actions */}
                    <div className="flex flex-wrap items-center justify-center gap-4 pt-1">
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

                    {/* Centered Metric Stats Bar */}
                    <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-8 max-w-2xl w-full pt-6 border-t border-slate-200/80 dark:border-slate-800/80 mx-auto">
                        {STATS.map((s) => (
                            <div key={s.label} className="text-center">
                                <div className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-ink dark:text-white">
                                    {s.value}
                                    <span className="text-maroon-700 dark:text-maroon-400">{s.unit}</span>
                                </div>
                                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 font-medium">{s.label}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Big Showcase Frame (Full Width across the screen) */}
                <div className="relative mt-14 sm:mt-18 lg:mt-22">
                    {/* Ambient Radial Glow */}
                    <div
                        className="absolute -inset-x-20 inset-y-0 -translate-y-1/4 scale-110 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(128,0,32,0.20),transparent_70%)] blur-[80px] pointer-events-none"
                        aria-hidden="true"
                    />

                    {/* Console Window Container */}
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
                                    Apex Zenith CNC · Shop Floor Console · Station VMC-3
                                </span>
                            </div>

                        </div>

                        {/* Big Size Image Hero Container with Cinematic Aspect Ratio and Interactive Overlays */}
                        <div className="relative w-full aspect-[16/10] sm:aspect-[21/9] lg:aspect-[2.4/1] min-h-[340px] sm:min-h-[440px] lg:min-h-[480px] overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-950 group">
                            <img
                                src={IMAGES.hero}
                                alt="Machinist inspecting CNC spindle"
                                className="h-full w-full object-cover object-center grayscale-[20%] contrast-[108%] group-hover:scale-105 transition-transform duration-700"
                            />
                            {/* Ambient vignette gradient */}
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/30 to-slate-950/20" />



                            {/* Bottom HUD Overlay Bar: Telemetry & Ramesh Patil Rule in Big Cinematic View */}
                            <div className="absolute bottom-4 left-4 right-4 grid grid-cols-1 md:grid-cols-12 gap-3">
                                {/* Spindle Telemetry HUD */}
                                <div className="md:col-span-6 bg-slate-900/90 border border-white/10 backdrop-blur-md p-3.5 rounded-xl text-white shadow-xl">
                                    <p className="font-mono text-[10px] uppercase tracking-wider text-maroon-400 font-bold mb-1 flex items-center justify-between">
                                        <span>Active Spindle Telemetry</span>
                                        <span className="text-emerald-400 text-[10px]">Threshold: 820 Hz OK</span>
                                    </p>
                                    <div className="grid grid-cols-3 gap-2 text-center pt-1 border-t border-white/10">
                                        <div>
                                            <p className="text-xs text-slate-400">Speed</p>
                                            <p className="text-sm sm:text-base font-mono font-bold text-white">4,200 RPM</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-400">Runout</p>
                                            <p className="text-sm sm:text-base font-mono font-bold text-emerald-400">0.002 mm</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-400">Spindle Temp</p>
                                            <p className="text-sm sm:text-base font-mono font-bold text-amber-300">44°C</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Ramesh Patil Tacit Rule Overlay Card */}
                                <div className="md:col-span-6 bg-amber-950/90 border border-amber-500/30 backdrop-blur-md p-3.5 rounded-xl text-amber-100 shadow-xl flex flex-col justify-between">
                                    <div>
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-amber-300">
                                                <span className="w-1.5 h-1.5 rounded-full bg-maroon-500 pin-pulse" />
                                                Ramesh's Rule #104 · 38 yrs experience
                                            </span>
                                            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/80">
                                                14 Incidents Prevented
                                            </span>
                                        </div>
                                        <p className="font-serif text-xs italic leading-relaxed text-amber-100">
                                            "The wall rings like a bell at 4,200. Drop 150 RPM — never the feed. That SS304 chatter howl precedes bearing thermal trip."
                                        </p>
                                    </div>
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
                                    roleId === id ? "bg-copper text-white shadow-xs font-bold" : "text-slate-500 hover:text-ink"
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
                                    ? "relative overflow-hidden bg-gradient-to-br from-amber-50/70 via-white to-canvas border-copper/30 shadow-md text-ink"
                                    : "border-slate-200 bg-white text-ink"
                            }`}
                        >
                            <div>
                                <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${a.big ? "bg-copper text-white" : "bg-maroon-50 text-maroon-700 dark:bg-maroon-950/80 dark:text-maroon-400"}`}>
                                    <a.icon size={22} />
                                </div>
                                <h3 className="mt-6 font-display text-xl font-bold text-ink">{a.title}</h3>
                                <p className="mt-2 text-sm leading-relaxed text-slate-500">{a.desc}</p>
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
    const { currentUser } = useAuthStore();
    return (
        <div>
            {currentUser && (
                <div className="mx-auto max-w-7xl px-5 pt-6 sm:px-8">
                    <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                            <span className="text-[11px] font-bold uppercase tracking-wider text-maroon-700">
                                Shop-Floor Context
                            </span>
                            <h2 className="text-lg sm:text-xl font-bold text-ink mt-0.5">
                                Welcome back, {currentUser.name}
                            </h2>
                            <p className="text-slate-500 text-xs mt-0.5">
                                Active Shift · {currentUser.role?.replace('_', ' ').toUpperCase()} · Station VMC-3
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                Station Online
                            </span>
                        </div>
                    </div>
                </div>
            )}
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
