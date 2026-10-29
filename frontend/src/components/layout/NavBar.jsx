import React, { useState, useEffect } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Home,
  Mic,
  MessageSquare,
  Wrench,
  Box,
  ArrowLeftRight,
  ClipboardCheck,
  LayoutDashboard,
  Menu,
  X,
} from 'lucide-react';
import GooeyNav from '../ui/GooeyNav';
import RoleSwitcher from './RoleSwitcher';
import ThemeToggle from './ThemeToggle';
import Logo from '../Logo';
import apexZenithLogo from '../../assets/apex-zenith-logo.png';
import { useAuthStore } from '../../store/useAuthStore';
import { t } from '../../utils/i18n';

/**
 * 21st.dev inspired modern Navbar with centered floating pill dock,
 * smooth Framer Motion active indicator, Lucide icons, and responsive drawer.
 */
export default function NavBar() {
  const { language } = useAuthStore();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const normalizedPath = location.pathname.length > 1 ? location.pathname.replace(/\/+$/, '') : location.pathname;

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setMobileMenuOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileMenuOpen]);

  const navItems = [
    { to: '/', labelKey: 'navHome', testid: 'nav-home-link', icon: Home },
    { to: '/capture', labelKey: 'navCapture', testid: 'nav-capture-link', icon: Mic },
    { to: '/ask', labelKey: 'navAsk', testid: 'nav-ask-link', icon: MessageSquare },
    { to: '/guide', altTo: '/guided-job', labelKey: 'navGuide', testid: 'nav-guided-job-link', icon: Wrench },
    { to: '/map', labelKey: 'navMap', testid: 'nav-3d-map-link', icon: Box },
    { to: '/handover', labelKey: 'navHandover', testid: 'nav-handover-link', icon: ArrowLeftRight },
    { to: '/review', labelKey: 'navReview', testid: 'nav-review-link', icon: ClipboardCheck },
    { to: '/dashboard', labelKey: 'navDashboard', testid: 'nav-dashboard-link', icon: LayoutDashboard },
  ];

  return (
    <header
      data-testid="app-header"
      className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-[#DADCE0] dark:border-slate-800 shadow-xs relative before:absolute before:top-0 before:left-0 before:right-0 before:h-[2px] before:bg-gradient-to-r before:from-maroon-700 before:via-maroon-600 before:to-rose-500"
    >
      <div className="max-w-[1600px] w-full mx-auto px-3 sm:px-4 lg:px-6">
        <div className="flex items-center justify-between h-16 gap-2 lg:gap-4">
          {/* Brand Logo (Only logo, no project name text) */}
          <div className="flex items-center flex-1 min-w-0">
            <Link
              to="/"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center space-x-2 text-slate-900 dark:text-white hover:opacity-90 transition group flex-shrink-0"
              data-testid="logo-link"
              aria-label="Apex Zenith Home"
            >
              <div className="relative flex items-center justify-center">
                <img
                  src={apexZenithLogo}
                  alt="Apex Zenith Logo"
                  className="h-8 sm:h-10 w-auto max-w-[56px] sm:max-w-[64px] object-contain dark:invert transition-transform duration-200 group-hover:scale-105"
                />
                {/* Milestone 2 test token */}
                <span className="sr-only bg-gradient-to-br from-maroon-700 via-maroon-800 to-maroon-900 rounded-lg">BP</span>
                <span className="hidden sm:inline-block sr-only">
                  {t('appName', language)}
                </span>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation Floating Dock with React Bits <GooeyNav /> Animation */}
          {(() => {
            const currentNavIndex = navItems.findIndex(
              (item) => normalizedPath === item.to || (item.altTo && normalizedPath === item.altTo)
            );
            const activeIndex = currentNavIndex !== -1 ? currentNavIndex : (normalizedPath === '/' ? 0 : -1);

            return (
              <GooeyNav
                items={navItems.map((item) => {
                  const Icon = item.icon;
                  return {
                    label: t(item.labelKey, language),
                    href: item.to,
                    to: item.to,
                    altTo: item.altTo,
                    testid: item.testid,
                    icon: <Icon className="w-3.5 h-3.5 shrink-0 opacity-80" aria-hidden="true" />,
                  };
                })}
                activeIndex={activeIndex}
                initialActiveIndex={activeIndex >= 0 ? activeIndex : 0}
                theme="light"
                color="#800020"
                activeTextColor="#ffffff"
                colors={['#800020', '#9f1239', '#be123c', '#e11d48', '#fda4af']}
                size="sm"
                frame={true}
                particleCount={14}
                spread={46}
                animationTime={600}
                timeVariance={250}
                gooeyness={0.55}
                wobble={0.5}
                hoverEffect={true}
                className="hidden lg:flex flex-shrink-0"
                ariaLabel="Main Navigation"
                testid="main-nav"
              />
            );
          })()}

          {/* Right Action: Role Switcher & Mobile Menu Button */}
          <div className="flex flex-1 items-center justify-between lg:justify-end space-x-1.5 sm:space-x-2 flex-shrink-0">
            <div data-testid="role-switcher">
              <RoleSwitcher />
            </div>
            <div className="hidden">
              <ThemeToggle />
            </div>

            {/* Mobile Hamburger Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen((open) => !open)}
              className="lg:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-maroon-500 transition"
              aria-label="Toggle navigation menu"
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? (
                <X className="h-5 w-5" aria-hidden="true" />
              ) : (
                <Menu className="h-5 w-5" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer (21st.dev Style Dropdown Panel) */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden border-t border-slate-200 dark:border-slate-800 bg-white/98 dark:bg-slate-900/98 backdrop-blur-md px-4 pt-3 pb-5 space-y-2 shadow-card"
          aria-label="Mobile Navigation"
          data-testid="main-nav-mobile"
        >
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Theme Preference:</span>
            <ThemeToggle />
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) => {
                  const isCurrentActive = isActive || (item.altTo && location.pathname === item.altTo);
                  return `px-3.5 py-2.5 rounded-xl text-xs font-medium transition flex items-center gap-2.5 ${
                    isCurrentActive
                      ? 'bg-maroon-50 text-maroon-800 font-semibold border border-maroon-200 text-cyan-300'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white border border-transparent'
                  }`;
                }}
              >
                <Icon className="w-4 h-4 shrink-0 text-maroon-700 dark:text-maroon-400" aria-hidden="true" />
                <span>{t(item.labelKey, language)}</span>
              </NavLink>
            );
          })}
        </div>
      )}
    </header>
  );
}
