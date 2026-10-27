import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { t } from './utils/i18n';

describe('App smoke test', () => {
  it('renders navigation bar with all core routes and brand title', async () => {
    render(
      <BrowserRouter>
        <App />
      </BrowserRouter>
    );

    // Verify brand
    expect(screen.getByText('BP')).toBeDefined();
    expect(screen.getByText(t('appName', 'en'))).toBeDefined();

    // Verify navigation items
    expect(screen.getByText(t('navHome', 'en'))).toBeDefined();
    expect(screen.getByText(t('navCapture', 'en'))).toBeDefined();
    expect(screen.getByText(t('navAsk', 'en'))).toBeDefined();
    expect(screen.getByText(t('navGuide', 'en'))).toBeDefined();
    expect(screen.getByText(t('navMap', 'en'))).toBeDefined();
    expect(screen.getByText(t('navHandover', 'en'))).toBeDefined();
    expect(screen.getByText(t('navReview', 'en'))).toBeDefined();
    expect(screen.getByText(t('navDashboard', 'en'))).toBeDefined();
  });

  it('renders role switcher with active demo user', () => {
    render(
      <BrowserRouter>
        <App />
      </BrowserRouter>
    );

    const roleLabel = screen.getByText(/Role:/i);
    expect(roleLabel).toBeDefined();
    const select = screen.getByLabelText(/Select Demo User and Role/i);
    expect(select).toBeDefined();
  });
});
