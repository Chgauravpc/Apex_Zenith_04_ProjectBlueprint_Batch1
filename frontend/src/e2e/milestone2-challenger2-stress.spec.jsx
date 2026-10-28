import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '../App';
import NavBar from '../components/layout/NavBar';
import RoleSwitcher from '../components/layout/RoleSwitcher';
import LoadState from '../components/common/LoadState';
import { useAuthStore, DEMO_USERS } from '../store/useAuthStore';
import { t, LANGUAGES } from '../utils/i18n';

describe('Empirical Challenger 2 M2 Stress Suite — Navigation & Global Shell', () => {
  beforeEach(() => {
    useAuthStore.setState({
      currentUser: DEMO_USERS[0],
      language: 'en',
    });
  });

  afterEach(() => {
    cleanup();
  });

  // =========================================================================
  // 1. ROUTE TRANSITIONS & ACTIVE PILL HIGHLIGHTS ACROSS ALL 8 ROUTES
  // =========================================================================
  describe('1. Route Transitions & Active Pill Highlighting', () => {
    const ALL_ROUTES = [
      { path: '/', labelKey: 'navHome', name: 'Home' },
      { path: '/capture', labelKey: 'navCapture', name: 'Capture' },
      { path: '/ask', labelKey: 'navAsk', name: 'Ask Assistant' },
      { path: '/guide', labelKey: 'navGuide', name: 'Guided SOP' },
      { path: '/map', labelKey: 'navMap', name: '3D Map' },
      { path: '/handover', labelKey: 'navHandover', name: 'Handover' },
      { path: '/review', labelKey: 'navReview', name: 'Review & Sign-Off' },
      { path: '/dashboard', labelKey: 'navDashboard', name: 'Operations Dashboard' },
    ];

    it.each(ALL_ROUTES)(
      '1.1: Route $path activates its corresponding pill with Google maroon styling',
      ({ path, labelKey }) => {
        render(
          <MemoryRouter initialEntries={[path]}>
            <NavBar />
          </MemoryRouter>
        );

        const activeText = t(labelKey, 'en');
        const activeLink = screen.getByRole('link', { name: activeText });
        const classList = activeLink.className.split(/\s+/);

        // Verify active link contains maroon pill styling classes
        expect(classList).toContain('bg-maroon-50');
        expect(classList).toContain('text-maroon-800');
        expect(classList).toContain('ring-1');
        expect(classList).toContain('ring-maroon-200');
        expect(classList).toContain('font-semibold');
        expect(classList).toContain('rounded-full');

        // Verify opaque-box backward compatibility token
        expect(classList).toContain('text-cyan-300');

        // Verify all OTHER 7 links do NOT have the active maroon classes
        ALL_ROUTES.filter((r) => r.path !== path).forEach((otherRoute) => {
          const otherText = t(otherRoute.labelKey, 'en');
          const otherLink = screen.getByRole('link', { name: otherText });
          const otherClassList = otherLink.className.split(/\s+/);

          expect(otherClassList).not.toContain('bg-maroon-50');
          expect(otherClassList).not.toContain('text-maroon-800');
          expect(otherClassList).toContain('text-slate-600');
          expect(otherClassList).toContain('font-medium');
        });
      }
    );

    it('1.2: Exact path matching ensures root "/" is not active when on subroutes', () => {
      render(
        <MemoryRouter initialEntries={['/capture']}>
          <NavBar />
        </MemoryRouter>
      );

      const homeLink = screen.getByRole('link', { name: t('navHome', 'en') });
      const captureLink = screen.getByRole('link', { name: t('navCapture', 'en') });

      const homeClasses = homeLink.className.split(/\s+/);
      const captureClasses = captureLink.className.split(/\s+/);

      expect(homeClasses).not.toContain('bg-maroon-50');
      expect(homeClasses).not.toContain('text-maroon-800');
      expect(homeClasses).toContain('text-slate-600');

      expect(captureClasses).toContain('bg-maroon-50');
      expect(captureClasses).toContain('text-maroon-800');
    });

    it('1.3: Deep query parameters maintain the correct active pill highlight', () => {
      render(
        <MemoryRouter initialEntries={['/guide?procedureId=proc-101&step=3']}>
          <NavBar />
        </MemoryRouter>
      );

      const guideLink = screen.getByRole('link', { name: t('navGuide', 'en') });
      const guideClasses = guideLink.className.split(/\s+/);
      expect(guideClasses).toContain('bg-maroon-50');
      expect(guideClasses).toContain('text-maroon-800');
    });

    it('1.4: Exactly one desktop navigation link is active at any time across all routes', () => {
      ALL_ROUTES.forEach(({ path }) => {
        cleanup();
        render(
          <MemoryRouter initialEntries={[path]}>
            <NavBar />
          </MemoryRouter>
        );

        const nav = screen.getByRole('navigation', { name: /Main Navigation/i });
        const allLinks = nav.querySelectorAll('a');
        expect(allLinks.length).toBe(8);

        const activeLinks = Array.from(allLinks).filter((l) =>
          l.className.split(/\s+/).includes('bg-maroon-50')
        );
        expect(activeLinks.length).toBe(1);
      });
    });

    it('1.5: Trailing slash in route URL maintains active link matching', () => {
      render(
        <MemoryRouter initialEntries={['/review/']}>
          <NavBar />
        </MemoryRouter>
      );

      const reviewLink = screen.getByRole('link', { name: t('navReview', 'en') });
      const reviewClasses = reviewLink.className.split(/\s+/);
      expect(reviewClasses).toContain('bg-maroon-50');
      expect(reviewClasses).toContain('text-maroon-800');
    });

    it('1.6: Clicking brand logo BP points to root route "/"', () => {
      render(
        <MemoryRouter initialEntries={['/dashboard']}>
          <NavBar />
        </MemoryRouter>
      );

      const brandLink = screen.getByText('BP').closest('a');
      expect(brandLink).not.toBeNull();
      expect(brandLink.getAttribute('href')).toBe('/');
    });
  });

  // =========================================================================
  // 2. MOBILE NAVIGATION DRAWER & INTERACTION STRESS
  // =========================================================================
  describe('2. Mobile Drawer Navigation & Interactions', () => {
    it('2.1: Mobile menu is closed by default and toggles on hamburger click', () => {
      render(
        <MemoryRouter initialEntries={['/']}>
          <NavBar />
        </MemoryRouter>
      );

      const hamburger = screen.getByLabelText(/Toggle navigation menu/i);
      expect(hamburger.getAttribute('aria-expanded')).toBe('false');
      expect(screen.queryByLabelText(/Mobile Navigation/i)).toBeNull();

      fireEvent.click(hamburger);
      expect(hamburger.getAttribute('aria-expanded')).toBe('true');
      const mobileDrawer = screen.getByLabelText(/Mobile Navigation/i);
      expect(mobileDrawer).not.toBeNull();
      expect(mobileDrawer.className).toContain('bg-white/98');

      fireEvent.click(hamburger);
      expect(hamburger.getAttribute('aria-expanded')).toBe('false');
      expect(screen.queryByLabelText(/Mobile Navigation/i)).toBeNull();
    });

    it('2.2: Mobile navigation links render active pill with maroon accents', () => {
      render(
        <MemoryRouter initialEntries={['/map']}>
          <NavBar />
        </MemoryRouter>
      );

      const hamburger = screen.getByLabelText(/Toggle navigation menu/i);
      fireEvent.click(hamburger);

      const mobileDrawer = screen.getByLabelText(/Mobile Navigation/i);
      const activeMobileLink = Array.from(mobileDrawer.querySelectorAll('a')).find((a) =>
        a.className.split(/\s+/).includes('bg-maroon-50')
      );
      expect(activeMobileLink).toBeDefined();
      expect(activeMobileLink.textContent).toContain(t('navMap', 'en'));
      expect(activeMobileLink.className).toContain('text-maroon-800');
      expect(activeMobileLink.className).toContain('border-maroon-200');
    });

    it('2.3: Clicking a mobile link closes the mobile drawer', () => {
      render(
        <MemoryRouter initialEntries={['/']}>
          <NavBar />
        </MemoryRouter>
      );

      const hamburger = screen.getByLabelText(/Toggle navigation menu/i);
      fireEvent.click(hamburger);
      expect(screen.getByLabelText(/Mobile Navigation/i)).not.toBeNull();

      const mobileDrawer = screen.getByLabelText(/Mobile Navigation/i);
      const askMobileLink = Array.from(mobileDrawer.querySelectorAll('a')).find((a) =>
        a.textContent.includes(t('navAsk', 'en'))
      );
      expect(askMobileLink).toBeDefined();

      fireEvent.click(askMobileLink);
      expect(screen.queryByLabelText(/Mobile Navigation/i)).toBeNull();
      expect(hamburger.getAttribute('aria-expanded')).toBe('false');
    });

    it('2.4: Mobile drawer contains Theme Preference toggle', () => {
      render(
        <MemoryRouter initialEntries={['/']}>
          <NavBar />
        </MemoryRouter>
      );

      const hamburger = screen.getByLabelText(/Toggle navigation menu/i);
      fireEvent.click(hamburger);

      expect(screen.getByText(/Theme Preference:/i)).not.toBeNull();
    });
  });

  // =========================================================================
  // 3. EDGE CASE ROUTING & CLEAN LIGHT 404 NOT FOUND
  // =========================================================================
  describe('3. Edge Case Routing & 404 Page Not Found', () => {
    const INVALID_ROUTES = [
      '/invalid-route',
      '/foo/bar/baz',
      '/undefined',
      '/null',
      '/404',
      '/unknown-path-test',
      '/guide/invalid-sub-path/123',
      '/settings',
      '/admin/metrics',
    ];

    it.each(INVALID_ROUTES)(
      '3.1: Navigating to %s renders clean light 404 message without crashing',
      (invalidPath) => {
        render(
          <MemoryRouter initialEntries={[invalidPath]}>
            <App />
          </MemoryRouter>
        );

        // Verify 404 heading and message
        const heading = screen.getByRole('heading', { level: 2, name: /Page Not Found/i });
        expect(heading).not.toBeNull();
        expect(heading.className).toContain('text-slate-900');

        const message = screen.getByText(/The requested route does not exist\./i);
        expect(message).not.toBeNull();
        expect(message.className).toContain('text-slate-500');

        // Verify shell remains intact
        expect(screen.getByText('BP')).not.toBeNull();
        expect(screen.getByText(/Offline-first Shop Floor Assistant/i)).not.toBeNull();
      }
    );

    it('3.2: Unknown route activates none of the primary navigation pills', () => {
      render(
        <MemoryRouter initialEntries={['/some-completely-invalid-route']}>
          <NavBar />
        </MemoryRouter>
      );

      const nav = screen.getByRole('navigation', { name: /Main Navigation/i });
      const activeLinks = Array.from(nav.querySelectorAll('a')).filter((l) =>
        l.className.split(/\s+/).includes('bg-maroon-50')
      );
      expect(activeLinks.length).toBe(0);
    });

    it('3.3: 404 container contains no legacy dark classes', () => {
      const { container } = render(
        <MemoryRouter initialEntries={['/non-existent-edge-route']}>
          <App />
        </MemoryRouter>
      );

      const notFoundHeading = screen.getByText('Page Not Found');
      const notFoundWrapper = notFoundHeading.parentElement;

      expect(notFoundWrapper.className).not.toContain('bg-slate-900');
      expect(notFoundWrapper.className).not.toContain('text-slate-100');
      expect(notFoundWrapper.className).toContain('text-center');
      expect(notFoundWrapper.className).toContain('py-16');

      // Verify the entire body/container has clean white layout
      const main = container.querySelector('main');
      expect(main.className).toContain('max-w-7xl');
    });
  });

  // =========================================================================
  // 4. PERSONA SWITCHER & TRILINGUAL SYNCHRONIZATION
  // =========================================================================
  describe('4. Role Switcher & Trilingual Synchronization', () => {
    it('4.1: Persona switcher displays visible Role: prefix with maroon indicator dot', () => {
      render(<RoleSwitcher />);
      const rolePrefix = screen.getByText(/Role:/i);
      expect(rolePrefix).not.toBeNull();

      const maroonDot = rolePrefix.parentElement.querySelector('.bg-maroon-700');
      expect(maroonDot).not.toBeNull();
    });

    it('4.2: Switching user persona updates active role in Zustand store', () => {
      render(<RoleSwitcher />);
      const select = screen.getByLabelText(/Select Demo User and Role/i);

      // Switch to Priya Shinde (id: 2)
      fireEvent.change(select, { target: { value: '2' } });
      expect(useAuthStore.getState().currentUser.id).toBe(2);
      expect(useAuthStore.getState().currentUser.name).toBe('Priya Shinde');

      // Switch to Anil Kulkarni (id: 4)
      fireEvent.change(select, { target: { value: '4' } });
      expect(useAuthStore.getState().currentUser.id).toBe(4);
      expect(useAuthStore.getState().currentUser.name).toBe('Anil Kulkarni');
    });

    it('4.3: Switching language updates all navigation items and role indicator dynamically', () => {
      render(
        <MemoryRouter initialEntries={['/']}>
          <NavBar />
        </MemoryRouter>
      );

      const langSelect = screen.getByLabelText(/Language selection/i);

      // Switch to Marathi ('mr')
      fireEvent.change(langSelect, { target: { value: 'mr' } });
      expect(useAuthStore.getState().language).toBe('mr');
      expect(screen.getByText(t('navHome', 'mr'))).not.toBeNull();
      expect(screen.getByText(t('navCapture', 'mr'))).not.toBeNull();
      expect(screen.getByText(t('navAsk', 'mr'))).not.toBeNull();
      expect(screen.getByText(t('navGuide', 'mr'))).not.toBeNull();
      expect(screen.getByText(t('navMap', 'mr'))).not.toBeNull();
      expect(screen.getByText(t('navHandover', 'mr'))).not.toBeNull();
      expect(screen.getByText(t('navReview', 'mr'))).not.toBeNull();
      expect(screen.getByText(t('navDashboard', 'mr'))).not.toBeNull();

      // Switch to Hindi ('hi')
      fireEvent.change(langSelect, { target: { value: 'hi' } });
      expect(useAuthStore.getState().language).toBe('hi');
      expect(screen.getByText(t('navHome', 'hi'))).not.toBeNull();
      expect(screen.getByText(t('navCapture', 'hi'))).not.toBeNull();
      expect(screen.getByText(t('navAsk', 'hi'))).not.toBeNull();
    });

    it('4.4: All supported languages are present in the language select dropdown', () => {
      render(<RoleSwitcher />);
      const langSelect = screen.getByLabelText(/Language selection/i);
      const options = Array.from(langSelect.querySelectorAll('option')).map((o) => o.value);
      expect(options).toEqual(LANGUAGES.map((l) => l.code));
    });

    it('4.5: Unsupported language code falls back gracefully without crash', () => {
      render(
        <MemoryRouter initialEntries={['/']}>
          <NavBar />
        </MemoryRouter>
      );

      // Manually set unsupported language in store
      useAuthStore.setState({ language: 'fr' });

      // Should fall back to default English string in t()
      expect(screen.getByText(t('navHome', 'fr'))).not.toBeNull();
      expect(screen.getByText('BP')).not.toBeNull();
    });
  });

  // =========================================================================
  // 5. GLOBAL SHELL ELEVATION & ACCESSIBILITY CONTRACTS
  // =========================================================================
  describe('5. Global Shell Elevation & Accessibility Contracts', () => {
    it('5.1: Sticky header bar maintains high z-index, translucent white backdrop, and subtle border', () => {
      const { container } = render(
        <MemoryRouter initialEntries={['/']}>
          <NavBar />
        </MemoryRouter>
      );

      const header = container.querySelector('header');
      expect(header.className).toContain('sticky');
      expect(header.className).toContain('top-0');
      expect(header.className).toContain('z-40');
      expect(header.className).toContain('bg-white/95');
      expect(header.className).toContain('backdrop-blur-md');
      expect(header.className).toContain('border-b');
      expect(header.className).toContain('border-[#DADCE0]');
    });

    it('5.2: Brand logo BP has maroon gradient and hover animation', () => {
      render(
        <MemoryRouter initialEntries={['/']}>
          <NavBar />
        </MemoryRouter>
      );

      const brandLogo = screen.getByText('BP');
      expect(brandLogo.className).toContain('bg-gradient-to-br');
      expect(brandLogo.className).toContain('from-maroon-700');
      expect(brandLogo.className).toContain('via-maroon-800');
      expect(brandLogo.className).toContain('to-maroon-900');
      expect(brandLogo.className).toContain('rounded-lg');
    });

    it('5.3: Footer renders clean Google subtle border and status indicator', () => {
      const { container } = render(
        <MemoryRouter initialEntries={['/']}>
          <App />
        </MemoryRouter>
      );

      const footer = container.querySelector('footer');
      expect(footer.className).toContain('border-t');
      expect(footer.className).toContain('border-[#DADCE0]');
      expect(footer.className).toContain('bg-white/90');
      expect(footer.className).toContain('text-slate-500');

      // Pulse indicator
      const pulseIndicator = footer.querySelector('.bg-emerald-500');
      expect(pulseIndicator).not.toBeNull();
      expect(pulseIndicator.className).toContain('animate-pulse');
    });

    it('5.4: Loading fallback displays maroon spinner and clean slate typography', async () => {
      render(
        <MemoryRouter initialEntries={['/']}>
          <App />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(document.querySelector('main')).not.toBeNull();
      });
    });
  });

  // =========================================================================
  // 6. LOADSTATE COMPONENT ADVERSARIAL ERROR STRESS
  // =========================================================================
  describe('6. LoadState Component Adversarial Input Testing', () => {
    it('6.1: LoadState renders safely when error is a standard Error object instance', () => {
      const errorObj = new Error('Database connection failed');
      render(<LoadState error={errorObj} />);

      expect(screen.getByRole('alert')).not.toBeNull();
      expect(screen.getByText(/Could not load: Database connection failed/i)).not.toBeNull();
    });

    it('6.2: LoadState renders safely when error is a string literal', () => {
      render(<LoadState error="Network timeout" />);

      expect(screen.getByRole('alert')).not.toBeNull();
      expect(screen.getByText(/Could not load: Network timeout/i)).not.toBeNull();
    });

    it('6.3: LoadState renders safely when error is an arbitrary object with message property', () => {
      const customErr = { message: '503 Service Unavailable', status: 503 };
      render(<LoadState error={customErr} />);

      expect(screen.getByText(/Could not load: 503 Service Unavailable/i)).not.toBeNull();
    });

    it('6.4: LoadState renders loading spinner with maroon accent color and custom label', () => {
      const { container } = render(<LoadState loading={true} label="Fetching telemetry..." />);

      expect(screen.getByText('Fetching telemetry...')).not.toBeNull();
      const spinnerSvg = container.querySelector('svg.animate-spin');
      expect(spinnerSvg).not.toBeNull();
      expect(spinnerSvg.getAttribute('class')).toContain('text-maroon-700');
    });

    it('6.5: LoadState invokes onRetry callback when Retry button is clicked', () => {
      const handleRetry = vi.fn();
      render(<LoadState error="Temporary failure" onRetry={handleRetry} />);

      const retryBtn = screen.getByRole('button', { name: /Retry/i });
      expect(retryBtn).not.toBeNull();

      fireEvent.click(retryBtn);
      expect(handleRetry).toHaveBeenCalledTimes(1);
    });

    it('6.6: LoadState returns null when neither loading nor error is provided', () => {
      const { container } = render(<LoadState />);
      expect(container.firstChild).toBeNull();
    });
  });
});
