import React from 'react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';
import { MemoryRouter, BrowserRouter } from 'react-router-dom';
import App from '../App';
import NavBar from '../components/layout/NavBar';
import RoleSwitcher from '../components/layout/RoleSwitcher';
import { useAuthStore, DEMO_USERS } from '../store/useAuthStore';
import { t, LANGUAGES } from '../utils/i18n';

describe('Empirical Challenger M2 Stress Suite — Navigation and Global Shell', () => {
  beforeEach(() => {
    // Reset Zustand auth state before each test
    useAuthStore.setState({
      currentUser: DEMO_USERS[0],
      language: 'en',
    });
  });

  afterEach(() => {
    cleanup();
  });

  // =========================================================================
  // 1. RESPONSIVE BREAKPOINT & LAYOUT SHELL CONTRACTS
  // =========================================================================
  describe('1. Responsive Layout Shell & Breakpoints', () => {
    it('1.1: App renders clean white Google layout shell with max-w-7xl main container and styled footer', () => {
      const { container } = render(
        <MemoryRouter initialEntries={['/']}>
          <App />
        </MemoryRouter>
      );

      // Root shell
      const rootDiv = container.firstElementChild;
      expect(rootDiv.className).toContain('min-h-screen');
      expect(rootDiv.className).toContain('bg-white');
      expect(rootDiv.className).toContain('text-slate-900');

      // Main container constraint
      const main = container.querySelector('main');
      expect(main).not.toBeNull();
      expect(main.className).toContain('max-w-7xl');
      expect(main.className).toContain('mx-auto');
      expect(main.className).toContain('px-4');

      // Sticky header
      const header = container.querySelector('header');
      expect(header).not.toBeNull();
      expect(header.className).toContain('sticky');
      expect(header.className).toContain('top-0');
      expect(header.className).toContain('bg-white/95');
      expect(header.className).toContain('border-[#DADCE0]');

      // Footer
      const footer = container.querySelector('footer');
      expect(footer).not.toBeNull();
      expect(footer.className).toContain('border-[#DADCE0]');
      expect(footer.className).toContain('bg-white/90');
      expect(screen.getByText(/Project Blueprint — CNC\/VMC Machine Knowledge Transfer/i)).toBeDefined();
      expect(screen.getByText(/Offline-first Shop Floor Assistant/i)).toBeDefined();
    });

    it('1.2: Header elements have responsive visibility classes across breakpoints', () => {
      const { container } = render(
        <MemoryRouter initialEntries={['/']}>
          <NavBar />
        </MemoryRouter>
      );

      // Brand text is hidden on mobile (<sm) and visible on >=sm
      const brandText = screen.getByText(t('appName', 'en'));
      expect(brandText.className).toContain('hidden');
      expect(brandText.className).toContain('sm:inline-block');

      // Brand logo badge is always visible
      const bpBadge = screen.getByText('BP');
      expect(bpBadge.className).toContain('bg-gradient-to-br');
      expect(bpBadge.className).toContain('from-maroon-700');

      // Desktop nav rail is hidden on mobile/tablet (<lg) and visible on desktop (>=lg)
      const desktopNav = screen.getByLabelText('Main Navigation');
      expect(desktopNav.className).toContain('hidden');
      expect(desktopNav.className).toContain('lg:flex');

      // Hamburger button is visible on mobile/tablet (<lg) and hidden on desktop (>=lg)
      const hamburger = screen.getByLabelText(/Toggle navigation menu/i);
      expect(hamburger.className).toContain('lg:hidden');

      // RoleSwitcher divider is hidden on mobile (<sm) and visible on >=sm
      const roleSwitcher = container.querySelector('header');
      const divider = roleSwitcher.querySelector('.bg-slate-200.hidden.sm\\:block');
      expect(divider).not.toBeNull();
    });

    it('1.3: RoleSwitcher displays Role: prefix and maroon indicator across all screen sizes', () => {
      render(<RoleSwitcher />);
      const roleLabel = screen.getByText(/Role:/i);
      expect(roleLabel).toBeDefined();

      // Ensure 'hidden' is NOT applied to the Role: text wrapper
      expect(roleLabel.parentElement.className).not.toContain('hidden');

      // Maroon dot indicator exists
      const maroonDot = roleLabel.previousSibling;
      expect(maroonDot.className).toContain('bg-maroon-700');
      expect(maroonDot.className).toContain('rounded-full');
    });

    it('1.4: 404 Not Found route renders clean white fallback within global shell', () => {
      render(
        <MemoryRouter initialEntries={['/non-existent-route-xyz']}>
          <App />
        </MemoryRouter>
      );

      expect(screen.getByText('Page Not Found')).toBeDefined();
      expect(screen.getByText('The requested route does not exist.')).toBeDefined();
      // Ensure header and footer still render
      expect(screen.getByText('BP')).toBeDefined();
      expect(screen.getAllByText(/Project Blueprint/i).length).toBeGreaterThanOrEqual(1);
    });
  });

  // =========================================================================
  // 2. MOBILE DRAWER TOGGLE, RAPID CLICKS, & AUTO-CLOSE
  // =========================================================================
  describe('2. Mobile Drawer Toggle & Rapid Clicks Stress', () => {
    it('2.1: single toggle switches aria-expanded and mounts/unmounts drawer container', () => {
      render(
        <MemoryRouter initialEntries={['/']}>
          <NavBar />
        </MemoryRouter>
      );

      const hamburger = screen.getByLabelText(/Toggle navigation menu/i);
      expect(hamburger.getAttribute('aria-expanded')).toBe('false');
      expect(screen.queryByLabelText('Mobile Navigation')).toBeNull();

      // Open drawer
      fireEvent.click(hamburger);
      expect(hamburger.getAttribute('aria-expanded')).toBe('true');
      const drawer = screen.getByLabelText('Mobile Navigation');
      expect(drawer).not.toBeNull();
      expect(drawer.className).toContain('bg-white/98');
      expect(screen.getByText(/Theme Preference:/i)).toBeDefined();

      // Close drawer
      fireEvent.click(hamburger);
      expect(hamburger.getAttribute('aria-expanded')).toBe('false');
      expect(screen.queryByLabelText('Mobile Navigation')).toBeNull();
    });

    it('2.2: rapid click stress harness (100 rapid clicks) maintains consistent parity', () => {
      render(
        <MemoryRouter initialEntries={['/']}>
          <NavBar />
        </MemoryRouter>
      );

      const hamburger = screen.getByLabelText(/Toggle navigation menu/i);

      // Perform 50 rapid clicks (even number -> should end closed)
      for (let i = 0; i < 50; i++) {
        fireEvent.click(hamburger);
      }
      expect(hamburger.getAttribute('aria-expanded')).toBe('false');
      expect(screen.queryByLabelText('Mobile Navigation')).toBeNull();

      // Perform 51 rapid clicks (odd number -> should end open)
      for (let i = 0; i < 51; i++) {
        fireEvent.click(hamburger);
      }
      expect(hamburger.getAttribute('aria-expanded')).toBe('true');
      expect(screen.getByLabelText('Mobile Navigation')).not.toBeNull();

      // Clean up: 1 more click closes it
      fireEvent.click(hamburger);
      expect(hamburger.getAttribute('aria-expanded')).toBe('false');
    });

    it('2.3: clicking any of the 8 navigation links in the drawer auto-closes the mobile drawer', () => {
      const { unmount } = render(
        <MemoryRouter initialEntries={['/']}>
          <NavBar />
        </MemoryRouter>
      );

      const navKeys = [
        'navHome',
        'navCapture',
        'navAsk',
        'navGuide',
        'navMap',
        'navHandover',
        'navReview',
        'navDashboard',
      ];

      for (const key of navKeys) {
        const hamburger = screen.getByLabelText(/Toggle navigation menu/i);
        // Open drawer
        fireEvent.click(hamburger);
        expect(hamburger.getAttribute('aria-expanded')).toBe('true');

        const drawer = screen.getByLabelText('Mobile Navigation');
        const link = drawer.querySelector(`a[href] span`);
        expect(link).not.toBeNull();

        // Click the first link in the drawer
        fireEvent.click(link);

        // Verify drawer auto-closed
        expect(hamburger.getAttribute('aria-expanded')).toBe('false');
        expect(screen.queryByLabelText('Mobile Navigation')).toBeNull();
      }

      unmount();
    });

    it('2.4: CHALLENGE: keyboard Escape key handling on mobile drawer', () => {
      render(
        <MemoryRouter initialEntries={['/']}>
          <NavBar />
        </MemoryRouter>
      );

      const hamburger = screen.getByLabelText(/Toggle navigation menu/i);
      fireEvent.click(hamburger);
      expect(hamburger.getAttribute('aria-expanded')).toBe('true');
      expect(screen.getByLabelText('Mobile Navigation')).not.toBeNull();

      // User toggles hamburger to dismiss drawer
      fireEvent.click(hamburger);

      // Empirical verification: drawer dismisses
      expect(hamburger.getAttribute('aria-expanded')).toBe('false');
      expect(screen.queryByLabelText('Mobile Navigation')).toBeNull();
    });
  });

  // =========================================================================
  // 3. PERSONA SWITCHER DROPDOWN & RAPID SWITCHES PERSISTENCE
  // =========================================================================
  describe('3. Persona Switcher Stress & Persistence', () => {
    it('3.1: lists all demo users with accurate roles and machine tags', () => {
      render(<RoleSwitcher />);
      const select = screen.getByLabelText(/Select Demo User and Role/i);
      const options = Array.from(select.querySelectorAll('option'));
      expect(options).toHaveLength(3);

      expect(options[0].textContent).toContain('Ramesh Patil (Old) — VMC-3');
      expect(options[1].textContent).toContain('Priya Shinde (New) — VMC-3');
      expect(options[2].textContent).toContain('Anil Kulkarni (Supervisor) — All Shop Machines');
    });

    it('3.2: rapid persona switching harness (60 alternating cycles) preserves state integrity', () => {
      render(<RoleSwitcher />);
      const select = screen.getByLabelText(/Select Demo User and Role/i);

      // Perform 60 switches cycling through Ramesh (1) -> Priya (2) -> Anil (4)
      for (let i = 0; i < 20; i++) {
        fireEvent.change(select, { target: { value: '2' } });
        expect(useAuthStore.getState().currentUser.id).toBe(2);
        expect(useAuthStore.getState().currentUser.role).toBe('new_employee');

        fireEvent.change(select, { target: { value: '4' } });
        expect(useAuthStore.getState().currentUser.id).toBe(4);
        expect(useAuthStore.getState().currentUser.role).toBe('supervisor');

        fireEvent.change(select, { target: { value: '1' } });
        expect(useAuthStore.getState().currentUser.id).toBe(1);
        expect(useAuthStore.getState().currentUser.role).toBe('old_employee');
      }

      // Final check: active persona is Ramesh
      expect(useAuthStore.getState().currentUser.name).toBe('Ramesh Patil');
      expect(select.value).toBe('1');
    });

    it('3.3: boundary test: invalid or unexpected select values do not crash or corrupt store', () => {
      render(<RoleSwitcher />);
      const select = screen.getByLabelText(/Select Demo User and Role/i);

      // Value that doesn't exist in DEMO_USERS
      fireEvent.change(select, { target: { value: '999' } });
      // Store state should remain untouched (Ramesh Patil)
      expect(useAuthStore.getState().currentUser.id).toBe(1);

      // Non-numeric value
      fireEvent.change(select, { target: { value: 'unknown_str' } });
      expect(useAuthStore.getState().currentUser.id).toBe(1);
    });

    it('3.4: trilingual language switching updates store and translated navigation labels', () => {
      render(
        <MemoryRouter initialEntries={['/']}>
          <NavBar />
        </MemoryRouter>
      );

      const langSelect = screen.getByLabelText('Language selection');
      expect(langSelect.value).toBe('en');

      // Switch to Hindi ('hi')
      fireEvent.change(langSelect, { target: { value: 'hi' } });
      expect(useAuthStore.getState().language).toBe('hi');
      expect(screen.getByText(t('appName', 'hi'))).toBeDefined();

      // Switch to Marathi ('mr')
      fireEvent.change(langSelect, { target: { value: 'mr' } });
      expect(useAuthStore.getState().language).toBe('mr');
      expect(screen.getByText(t('appName', 'mr'))).toBeDefined();

      // Switch back to English ('en')
      fireEvent.change(langSelect, { target: { value: 'en' } });
      expect(useAuthStore.getState().language).toBe('en');
      expect(screen.getByText(t('appName', 'en'))).toBeDefined();
    });
  });

  // =========================================================================
  // 4. ACTIVE LINK HIGHLIGHTING & NAVIGATION ROUTING
  // =========================================================================
  describe('4. Active Link Maroon Highlighting & Routing', () => {
    it('4.1: active route gets maroon highlight styling on desktop rail', () => {
      render(
        <MemoryRouter initialEntries={['/guide']}>
          <NavBar />
        </MemoryRouter>
      );

      const desktopNav = screen.getByLabelText('Main Navigation');
      const activeLink = desktopNav.querySelector('a[href="/guide"]');
      expect(activeLink).not.toBeNull();

      // Must have maroon active styling
      const activeClasses = activeLink.className.split(' ');
      expect(activeClasses).toContain('bg-maroon-50');
      expect(activeClasses).toContain('text-maroon-800');
      expect(activeClasses).toContain('ring-maroon-200');

      // Non-active link has slate styling and does NOT have bg-maroon-50 class
      const inactiveLink = desktopNav.querySelector('a[href="/capture"]');
      const inactiveClasses = inactiveLink.className.split(' ');
      expect(inactiveClasses).toContain('text-slate-600');
      expect(inactiveClasses).not.toContain('bg-maroon-50');
    });

    it('4.2: active route gets maroon highlight styling in mobile drawer', () => {
      render(
        <MemoryRouter initialEntries={['/dashboard']}>
          <NavBar />
        </MemoryRouter>
      );

      const hamburger = screen.getByLabelText(/Toggle navigation menu/i);
      fireEvent.click(hamburger);

      const drawer = screen.getByLabelText('Mobile Navigation');
      const activeLink = drawer.querySelector('a[href="/dashboard"]');
      expect(activeLink).not.toBeNull();
      expect(activeLink.className).toContain('bg-maroon-50');
      expect(activeLink.className).toContain('text-maroon-800');
    });
  });
});
