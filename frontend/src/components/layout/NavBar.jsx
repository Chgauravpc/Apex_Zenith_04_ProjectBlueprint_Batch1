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
    { to: '/', labelKey: 'navHome' },
    { to: '/capture', labelKey: 'navCapture' },
    { to: '/ask', labelKey: 'navAsk' },
    { to: '/guide', labelKey: 'navGuide' },
    { to: '/map', labelKey: 'navMap' },
    { to: '/handover', labelKey: 'navHandover' },
    { to: '/review', labelKey: 'navReview' },
    { to: '/dashboard', labelKey: 'navDashboard' },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#DADCE0] shadow-xs">
      <div className="max-w-[1600px] w-full mx-auto px-2 sm:px-4 lg:px-6">
        <div className="flex items-center justify-between h-16 gap-2">
          {/* Brand Logo */}
          <div className="flex items-center flex-shrink-0">
            <NavLink
              to="/"
              className="flex items-center space-x-2.5 text-slate-900 hover:text-maroon-800 transition group"
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-maroon-700 via-maroon-800 to-maroon-900 flex items-center justify-center font-black text-white text-sm shadow-xs ring-1 ring-maroon-200 group-hover:scale-105 transition-transform">
                BP
              </div>
              <span className="font-extrabold text-sm sm:text-base tracking-tight text-slate-900 hidden sm:inline-block">
                {t('appName', language)}
              </span>
            </NavLink>
          </div>

          {/* Desktop Navigation Links Rail */}
          <nav className="hidden lg:flex items-center space-x-1 bg-slate-50/90 p-1 rounded-full border border-slate-200/90 shadow-xs flex-shrink-0" aria-label="Main Navigation">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `px-3 xl:px-3.5 py-1.5 rounded-full text-xs transition-all flex items-center ${
                    isActive
                      ? 'bg-maroon-50 text-maroon-800 font-semibold ring-1 ring-maroon-200 shadow-xs text-cyan-300'
                      : 'text-slate-600 hover:text-maroon-900 hover:bg-maroon-50/50 border border-transparent font-medium'
                  }`
                }
              >
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
              className="lg:hidden p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-maroon-500 transition"
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
        <div className="lg:hidden border-t border-slate-200 bg-white/98 backdrop-blur-md px-4 pt-3 pb-5 space-y-2 shadow-card" aria-label="Mobile Navigation">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <span className="text-xs font-semibold text-slate-600">Theme Preference:</span>
            <ThemeToggle />
          </div>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              onClick={() => setMobileMenuOpen(false)}
              className={({ isActive }) =>
                `px-3.5 py-2.5 rounded-xl text-xs font-medium transition flex items-center ${
                  isActive
                    ? 'bg-maroon-50 text-maroon-800 font-semibold border border-maroon-200 text-cyan-300'
                    : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900 border border-transparent'
                }`
              }
            >
              <span>{t(item.labelKey, language)}</span>
            </NavLink>
          ))}
        </div>
      )}
    </header>
  );
}
