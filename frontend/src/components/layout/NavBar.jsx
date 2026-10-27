import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import RoleSwitcher from './RoleSwitcher';
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
    <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur border-b border-slate-800 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <div className="flex items-center space-x-3">
            <NavLink
              to="/"
              className="flex items-center space-x-2 text-slate-100 hover:text-cyan-400 transition"
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center font-black text-slate-950 text-base shadow-sm">
                BP
              </div>
              <span className="font-bold text-lg tracking-tight hidden sm:inline-block">
                {t('appName', language)}
              </span>
            </NavLink>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center space-x-1" aria-label="Main Navigation">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center space-x-1.5 ${
                    isActive
                      ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`
                }
              >
                <span aria-hidden="true">{item.icon}</span>
                <span>{t(item.labelKey, language)}</span>
              </NavLink>
            ))}
          </nav>

          {/* Right Action: Role Switcher & Mobile Menu Button */}
          <div className="flex items-center space-x-3">
            <RoleSwitcher />

            {/* Mobile Hamburger Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              aria-label="Toggle navigation menu"
              aria-expanded={mobileMenuOpen}
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
        <div className="lg:hidden border-t border-slate-800 bg-slate-900 px-4 pt-2 pb-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              onClick={() => setMobileMenuOpen(false)}
              className={({ isActive }) =>
                `block px-3 py-2 rounded-lg text-sm font-medium transition flex items-center space-x-2 ${
                  isActive
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    : 'text-slate-300 hover:bg-slate-800'
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
