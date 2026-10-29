import React, { useState, useEffect } from 'react';
import { NavLink, Link } from 'react-router-dom';
import RoleSwitcher from './RoleSwitcher';
import ThemeToggle from './ThemeToggle';
import Logo from '../Logo';
import { useAuthStore } from '../../store/useAuthStore';
import { t } from '../../utils/i18n';

export default function NavBar() {
  const { language } = useAuthStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setMobileMenuOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileMenuOpen]);

  const navItems = [
    { to: '/', labelKey: 'navHome', testid: 'nav-home-link' },
    { to: '/capture', labelKey: 'navCapture', testid: 'nav-capture-link' },
    { to: '/ask', labelKey: 'navAsk', testid: 'nav-ask-link' },
    { to: '/guided-job', altTo: '/guide', labelKey: 'navGuide', testid: 'nav-guided-job-link' },
    { to: '/map', labelKey: 'navMap', testid: 'nav-3d-map-link' },
    { to: '/handover', labelKey: 'navHandover', testid: 'nav-handover-link' },
    { to: '/review', labelKey: 'navReview', testid: 'nav-review-link' },
    { to: '/dashboard', labelKey: 'navDashboard', testid: 'nav-dashboard-link' },
  ];

  return (
    <header
      data-testid="app-header"
      className="sticky top-0 z-50 border-b border-[#E2E8F0]/80 bg-[#F9F8F6]/85 backdrop-blur-xl"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3">
          {/* Brand Logo */}
          <div className="flex items-center flex-shrink-0">
            <Link
              to="/"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2.5 text-ink hover:text-copper transition group"
              data-testid="logo-link"
            >
              <div className="relative flex items-center justify-center">
                <Logo size={32} />
                <span className="sr-only">BP</span>
                <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white animate-pulse" />
              </div>
              <div className="flex flex-col leading-none">
                <span className="font-display text-lg font-bold tracking-tight text-ink">
                  {t('appName', language) || 'Blueprint'}<span className="text-copper">CNC</span>
                </span>
                <span className="mt-0.5 hidden text-[10px] font-medium uppercase tracking-[0.18em] text-slate-400 sm:block">
                  Experience, preserved
                </span>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1" aria-label="Main Navigation" data-testid="main-nav">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                data-testid={item.testid}
                className={({ isActive }) =>
                  `px-3.5 py-2 rounded-full text-xs font-semibold transition-colors duration-200 ${
                    isActive
                      ? 'bg-ink text-white shadow-sm'
                      : 'text-slate-600 hover:text-ink hover:bg-slate-200/50'
                  }`
                }
              >
                <span>{t(item.labelKey, language)}</span>
              </NavLink>
            ))}
          </nav>

          {/* Right Action: Role Switcher & Mobile Menu Button */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <div data-testid="role-switcher">
              <RoleSwitcher />
            </div>

            {/* Mobile Hamburger Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen((open) => !open)}
              className="lg:hidden p-2 rounded-full text-slate-600 hover:text-ink hover:bg-slate-200/60 border border-slate-200 focus:outline-none transition"
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
        <div className="lg:hidden border-t border-slate-200 bg-[#F9F8F6]/98 backdrop-blur-md px-4 pt-3 pb-5 space-y-2 shadow-lg" aria-label="Mobile Navigation" data-testid="main-nav-mobile">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              onClick={() => setMobileMenuOpen(false)}
              className={({ isActive }) =>
                `block px-4 py-2.5 rounded-full text-xs font-semibold transition ${
                  isActive
                    ? 'bg-ink text-white'
                    : 'text-slate-700 bg-white border border-slate-200 hover:bg-slate-50'
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
