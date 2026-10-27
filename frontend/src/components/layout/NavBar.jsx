import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import RoleSwitcher from './RoleSwitcher';
import ThemeToggle from './ThemeToggle';
import { useAuthStore } from '../../store/useAuthStore';
import { t } from '../../utils/i18n';

export default function NavBar() {
  const { language } = useAuthStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { to: '/', labelKey: 'navHome', icon: '🏠' },
    { to: '/capture', labelKey: 'navCapture', icon: '🎙️' },
    { to: '/ask', labelKey: 'navAsk', icon: '💡' },
    { to: '/guide', labelKey: 'navGuide', icon: '📋' },
    { to: '/map', labelKey: 'navMap', icon: '⚙️' },
    { to: '/handover', labelKey: 'navHandover', icon: '🤝' },
    { to: '/review', labelKey: 'navReview', icon: '✅' },
    { to: '/dashboard', labelKey: 'navDashboard', icon: '📊' },
  ];

  return (
    <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-700/80 shadow-lg shadow-black/20">
      <div className="max-w-[1600px] w-full mx-auto px-2 sm:px-4 lg:px-6">
        <div className="flex items-center justify-between h-16 gap-2">
          {/* Brand Logo */}
          <div className="flex items-center flex-shrink-0">
            <NavLink
              to="/"
              className="flex items-center space-x-2 text-slate-100 hover:text-cyan-400 transition group"
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 via-cyan-500 to-blue-600 flex items-center justify-center font-black text-slate-950 text-sm shadow-sm ring-1 ring-cyan-300/40 group-hover:scale-105 transition-transform">
                BP
              </div>
              <span className="font-extrabold text-sm sm:text-base tracking-tight text-white hidden sm:inline-block">
                {t('appName', language)}
              </span>
            </NavLink>
          </div>

          {/* Desktop Navigation Links Rail */}
          <nav className="hidden lg:flex items-center space-x-0.5 bg-slate-900/80 p-1 rounded-xl border border-slate-800 flex-shrink-0" aria-label="Main Navigation">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `px-2 xl:px-2.5 py-1.5 rounded-lg text-xs transition-all flex items-center space-x-1 ${
                    isActive
                      ? 'bg-slate-800 text-cyan-300 font-semibold border border-slate-700 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent font-medium'
                  }`
                }
              >
                <span aria-hidden="true" className="text-xs">{item.icon}</span>
                <span>{t(item.labelKey, language)}</span>
              </NavLink>
            ))}
          </nav>

          {/* Right Action: Role Switcher, Theme Toggle & Mobile Menu Button */}
          <div className="flex items-center space-x-1.5 sm:space-x-2 flex-shrink-0">
            <RoleSwitcher />
            <ThemeToggle />

            {/* Mobile Hamburger Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 border border-slate-700/60 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition"
              aria-label="Toggle navigation menu"
              aria-expanded={mobileMenuOpen}
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md px-4 pt-3 pb-5 space-y-2 shadow-2xl">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Theme Preference:</span>
            <ThemeToggle />
          </div>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              onClick={() => setMobileMenuOpen(false)}
              className={({ isActive }) =>
                `px-3 py-2.5 rounded-xl text-xs font-medium transition flex items-center space-x-2.5 ${
                  isActive
                    ? 'bg-emerald-500/10 text-emerald-700 dark:bg-teal-500/15 dark:text-teal-300 font-semibold border border-emerald-500/30 dark:border-teal-500/30'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 border border-transparent'
                }`
              }
            >
              <span aria-hidden="true">{item.icon}</span>
              <span>{t(item.labelKey, language)}</span>
            </NavLink>
          ))}
        </div>
      )}
    </header>
  );
}
