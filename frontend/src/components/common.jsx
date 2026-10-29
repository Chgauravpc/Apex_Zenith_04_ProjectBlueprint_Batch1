import { motion } from "framer-motion";
import { MARQUEE_TIPS } from "@/mock/data";

export const EASE = [0.22, 1, 0.36, 1];

export function MaskedLine({ children, delay = 0, className = "" }) {
    return (
        <span className={`block overflow-hidden ${className}`}>
            <motion.span
                className="block"
                initial={{ y: "112%" }}
                animate={{ y: "0%" }}
                transition={{ duration: 0.95, delay, ease: EASE }}
            >
                {children}
            </motion.span>
        </span>
    );
}

export function Reveal({ children, delay = 0, className = "", y = 28 }) {
    return (
        <motion.div
            className={className}
            initial={{ opacity: 0, y }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.7, delay, ease: EASE }}
        >
            {children}
        </motion.div>
    );
}

export function Eyebrow({ children }) {
    return (
        <p className="flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-copper">
            <span className="h-1.5 w-1.5 rounded-full bg-copper" />
            {children}
        </p>
    );
}

export function Marquee({ items = MARQUEE_TIPS }) {
    const doubled = [...items, ...items];
    return (
        <div className="marquee-paused overflow-hidden border-y border-slate-200 bg-white py-4" data-testid="tips-marquee">
            <div className="animate-marquee flex w-max items-center gap-10">
                {doubled.map((tip, i) => (
                    <span key={i} className="flex items-center gap-10 whitespace-nowrap">
                        <span className="font-serif text-base italic text-slate-600">{tip}</span>
                        <span className="text-copper">◆</span>
                    </span>
                ))}
            </div>
        </div>
    );
}

export function RiskChip({ level }) {
    const map = {
        high: ["Critical risk", "bg-red-50 text-red-800 ring-red-200"],
        medium: ["Partial cover", "bg-amber-50 text-amber-800 ring-amber-200"],
        low: ["Documented", "bg-emerald-50 text-emerald-800 ring-emerald-200"],
    };
    const [label, cls] = map[level] || map.low;
    return (
        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${cls}`}>
            {label}
        </span>
    );
}

export function ExpertTag({ person, className = "" }) {
    return (
        <span className={`inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 ${className}`}>
            <img src={person.avatar} alt={person.name} className="h-6 w-6 rounded-full object-cover" />
            <span className="font-serif text-sm italic text-amber-900">{person.name}</span>
        </span>
    );
}

export function PageHead({ eyebrow, title, sub }) {
    return (
        <div className="mb-10">
            <Reveal>
                <Eyebrow>{eyebrow}</Eyebrow>
                <h1 className="mt-3 max-w-2xl font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
                    {title}
                </h1>
                {sub && <p className="mt-3 max-w-xl text-base leading-relaxed text-slate-500">{sub}</p>}
            </Reveal>
        </div>
    );
}
