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
    const ref = useRef(null);
    const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
    const imgY = useTransform(scrollYProgress, [0, 1], [0, 90]);
    const cardY = useTransform(scrollYProgress, [0, 1], [0, -60]);

    return (
        <section ref={ref} className="relative overflow-hidden">
            <div className="pointer-events-none absolute -right-24 top-10 h-72 w-72 rounded-full border-[28px] border-copper/10" />
            <div className="mx-auto grid max-w-7xl gap-14 px-5 pb-20 pt-16 sm:px-8 lg:grid-cols-12 lg:pt-24">
                <div className="lg:col-span-7">
                    <MaskedLine delay={0.05}>
                        <span className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-600">
                            <Sparkles size={13} className="text-copper" />
                            Project Blueprint · Problem 02 — Manufacturing
                        </span>
                    </MaskedLine>
                    <h1
                        data-testid="hero-reveal-title"
                        className="mt-8 font-display text-4xl font-extrabold leading-[1.04] tracking-tight text-ink sm:text-5xl lg:text-6xl"
                    >
                        <MaskedLine delay={0.15}>Experience walks</MaskedLine>
                        <MaskedLine delay={0.27}>out the door.</MaskedLine>
                        <MaskedLine delay={0.39}>
                            <span className="font-serif font-normal italic text-copper">We make it stay.</span>
                        </MaskedLine>
                    </h1>
                    <motion.p
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.55, duration: 0.7, ease: EASE }}
                        className="mt-6 max-w-lg text-base leading-relaxed text-slate-500 sm:text-lg"
                    >
                        Blueprint captures veteran machinists' know-how — voice, video, logbooks —
                        and returns it to new operators as cited answers, step-by-step jobs, and
                        warnings before the mistake happens. The decision always stays human.
                    </motion.p>
                    <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.68, duration: 0.7, ease: EASE }}
                        className="mt-9 flex flex-wrap items-center gap-4"
                    >
                        <Link
                            to="/capture"
                            data-testid="hero-cta-capture"
                            className="group inline-flex h-13 items-center gap-2.5 rounded-full bg-ink px-7 py-3.5 text-sm font-semibold text-white transition-colors duration-300 hover:bg-copper"
                        >
                            <Mic size={17} />
                            Capture know-how
                            <ArrowRight size={16} className="transition-transform duration-300 group-hover:translate-x-1" />
                        </Link>
                        <Link
                            to="/ask"
                            data-testid="hero-cta-ask"
                            className="inline-flex items-center gap-2.5 rounded-full border border-slate-300 bg-white px-7 py-3.5 text-sm font-semibold text-ink transition-colors duration-300 hover:border-ink"
                        >
                            <MessageSquareText size={17} className="text-teal" />
                            Ask Experience
                        </Link>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.85, duration: 0.8 }}
                        className="mt-14 grid max-w-xl grid-cols-2 gap-x-8 gap-y-7 sm:grid-cols-4"
                    >
                        {STATS.map((s) => (
                            <div key={s.label}>
                                <div className="font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
                                    {s.value}
                                    <span className="text-copper">{s.unit}</span>
                                </div>
                                <p className="mt-1 text-xs leading-snug text-slate-500">{s.label}</p>
                            </div>
                        ))}
                    </motion.div>
                </div>

                <div className="relative lg:col-span-5">
                    <motion.div style={{ y: imgY }} className="relative mx-auto max-w-md lg:max-w-none">
                        <div className="relative aspect-[4/5] overflow-hidden rounded-3xl border border-slate-200 bg-slate-100 shadow-2xl">
                            <img
                                src={IMAGES.hero}
                                alt="Machinist inspecting CNC spindle"
                                className="h-full w-full object-cover grayscale-[30%] contrast-[105%]"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-ink/75 via-transparent to-transparent" />
                            <div className="absolute bottom-5 left-5 right-5 text-white">
                                <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-copper">Live Shop Floor · Bay 3</p>
                                <p className="mt-1 font-display text-lg font-bold">Haas VF-2 · VMC-03</p>
                                <p className="text-xs text-slate-300">Ramesh Sharma handing over to Priya Nair</p>
                            </div>
                        </div>

                        <motion.div
                            style={{ y: cardY }}
                            className="absolute -bottom-6 -left-6 max-w-xs rounded-2xl border border-amber-200 bg-amber-50/95 p-4 shadow-xl backdrop-blur-md"
                        >
                            <div className="flex items-center gap-2">
                                <span className="h-2 w-2 rounded-full bg-copper pin-pulse" />
                                <span className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-amber-900">Ramesh's Rule #104</span>
                            </div>
                            <p className="mt-2 font-serif text-sm italic leading-snug text-amber-950">
                                "The wall rings like a bell at 4,200. Drop 150 RPM — never the feed."
                            </p>
                        </motion.div>
                    </motion.div>
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
                                <img src={persona.avatar} alt="" className="h-12 w-12 rounded-full object-cover ring-2 ring-copper/30" />
                                <div>
                                    <h3 className="font-display text-xl font-bold text-ink">{cur.title}</h3>
                                    <p className="text-xs text-slate-500">{cur.subtitle}</p>
                                </div>
                            </div>
                            <blockquote className="mt-6 border-l-2 border-copper pl-4 font-serif text-lg italic text-slate-700">
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
                                    className="group flex flex-col justify-between rounded-2xl border border-slate-200 bg-canvas p-5 transition-all duration-200 hover:border-copper/60 hover:bg-white hover:shadow-md"
                                >
                                    <div>
                                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-copper-light text-copper">
                                            <act.icon size={20} />
                                        </div>
                                        <h4 className="mt-4 font-display text-base font-bold text-ink">{act.label}</h4>
                                        <p className="mt-1 text-xs leading-relaxed text-slate-500">{act.desc}</p>
                                    </div>
                                    <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-copper group-hover:underline">
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
                                <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${a.big ? "bg-copper text-white" : "bg-copper-light text-copper"}`}>
                                    <a.icon size={22} />
                                </div>
                                <h3 className={`mt-6 font-display text-xl font-bold ${a.big ? "text-white" : "text-ink"}`}>{a.title}</h3>
                                <p className={`mt-2 text-sm leading-relaxed ${a.big ? "text-slate-300" : "text-slate-500"}`}>{a.desc}</p>
                            </div>
                            <span className="mt-6 inline-flex items-center gap-1.5 text-xs font-semibold text-copper">
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
                        <span className="font-display font-bold text-ink">Blueprint<span className="text-copper">CNC</span></span>
                        {" "}· Problem 02 — Knowledge Transfer
                    </p>
                    <p className="font-mono text-xs text-slate-400">transfer knowledge, don't replace people</p>
                </div>
            </footer>
        </div>
    );
}
