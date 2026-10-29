import { Link, NavLink } from "react-router-dom";
import { motion } from "framer-motion";
import Logo from "@/components/Logo";
import { useRole } from "@/store/RoleContext";
import { NAV, PERSONAS, ROLE_ORDER } from "@/mock/data";
import { toast } from "sonner";

export default function Header() {
    const { roleId, setRoleId } = useRole();

    return (
        <header
            data-testid="app-header"
            className="sticky top-0 z-50 border-b border-[#E2E8F0]/80 bg-[#F9F8F6]/80 backdrop-blur-xl"
        >
            <div className="mx-auto flex max-w-7xl items-center gap-4 px-5 py-3 sm:px-8">
                <Link to="/" className="flex shrink-0 items-center gap-2.5" data-testid="logo-link">
                    <Logo />
                    <div className="leading-none">
                        <span className="font-display text-lg font-bold tracking-tight text-ink">
                            Blueprint<span className="text-copper">CNC</span>
                        </span>
                        <span className="mt-0.5 hidden text-[10px] font-medium uppercase tracking-[0.18em] text-slate-400 sm:block">
                            Experience, preserved
                        </span>
                    </div>
                </Link>

                <nav className="ml-2 hidden flex-1 items-center gap-0.5 lg:flex" data-testid="main-nav">
                    {NAV.map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            data-testid={item.testid}
                            className={({ isActive }) =>
                                `relative rounded-full px-3 py-2 text-sm font-medium transition-colors duration-200 ${
                                    isActive
                                        ? "text-ink"
                                        : "text-slate-500 hover:text-ink"
                                }`
                            }
                        >
                            {({ isActive }) => (
                                <>
                                    {item.label}
                                    {isActive && (
                                        <motion.span
                                            layoutId="nav-pill"
                                            className="absolute inset-0 -z-10 rounded-full bg-white shadow-sm ring-1 ring-slate-200"
                                            transition={{ type: "spring", stiffness: 420, damping: 34 }}
                                        />
                                    )}
                                </>
                            )}
                        </NavLink>
                    ))}
                </nav>

                <div
                    className="ml-auto flex items-center gap-1 rounded-full border border-slate-200 bg-white p-1 shadow-sm"
                    data-testid="role-switcher"
                >
                    {ROLE_ORDER.map((id) => {
                        const p = PERSONAS[id];
                        const active = roleId === id;
                        return (
                            <button
                                key={id}
                                data-testid={`role-btn-${id}`}
                                onClick={() => {
                                    setRoleId(id);
                                    toast(`Viewing as ${p.name}`, {
                                        description: p.badge,
                                    });
                                }}
                                className={`flex h-11 items-center gap-2 rounded-full px-3 transition-colors duration-200 ${
                                    active
                                        ? "bg-ink text-white"
                                        : "text-slate-500 hover:bg-slate-100 hover:text-ink"
                                }`}
                                title={`${p.name} — ${p.badge}`}
                            >
                                <span
                                    className={`flex h-6 w-6 items-center justify-center rounded-full font-mono text-[10px] font-semibold ${
                                        active ? "bg-copper text-white" : "bg-slate-200 text-slate-600"
                                    }`}
                                >
                                    {p.initials}
                                </span>
                                <span className="hidden text-xs font-semibold sm:block">{p.short}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            <nav className="flex gap-1 overflow-x-auto px-4 pb-2 lg:hidden" data-testid="main-nav-mobile">
                {NAV.map((item) => (
                    <NavLink
                        key={item.to}
                        to={item.to}
                        data-testid={`${item.testid}-mobile`}
                        className={({ isActive }) =>
                            `whitespace-nowrap rounded-full px-3.5 py-2 text-sm font-medium transition-colors duration-200 ${
                                isActive
                                    ? "bg-ink text-white"
                                    : "bg-white text-slate-600 ring-1 ring-slate-200"
                            }`
                        }
                    >
                        {item.label}
                    </NavLink>
                ))}
            </nav>
        </header>
    );
}
