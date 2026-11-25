// @vitest-environment jsdom
// src/components/__tests__/SiteFooter.test.tsx
// The footer (landing brief, 5): a normal, standard footer on the pages that scroll and are not a case's: the landing
// page, the credits and the sources.
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import App from '@/App';
import { MemoryRouter } from 'react-router-dom';
import maryCeleste from '@/cases/mary-celeste/case';
import SiteFooter from '@/components/SiteFooter';
import { DESIGNER_URL, FOOTER } from '@/lib/footer-links';
import { continuePastGate, resetPhoneGate } from '@/lib/phone-gate';

afterEach(() => {
  vi.unstubAllGlobals();
  cleanup();
  resetPhoneGate();
  localStorage.clear();
  window.history.pushState({}, '', '/');
});

const renderFooter = () =>
  render(
    <MemoryRouter>
      <SiteFooter />
    </MemoryRouter>
  );

describe('the footer: a normal, standard footer (landing brief, 5)', () => {
  test('the description; Credits, Sources, GitHub and Built with Kiro; "Designed and built by Robert"; © 2026', () => {
    renderFooter();
    const footer = screen.getByRole('contentinfo');
    expect(within(footer).getByRole('img', { name: 'Histor' }).getAttribute('src')).toBe('/brand/histor-logo-cream.svg');
    expect(footer.querySelector('[data-footer="description"]')!.textContent).toBe(FOOTER.description);
    const nav = within(footer).getByRole('navigation', { name: 'About Histor' });
    expect(within(nav).getAllByRole('link').map(link => [link.textContent, link.getAttribute('href')])).toEqual([
      ['Credits', '/credits'],
      ['Sources', '/sources'],
      ['GitHub', FOOTER.repository],
      ['Built with Kiro', FOOTER.kiro],
    ]);
    expect(footer.querySelector('[data-footer="byline"]')!.textContent).toContain('Designed and built by Robert');
    expect(footer.textContent).toContain('© 2026');
  });

  test('"Robert" links to DESIGNER_URL, kept in one constant (the current Vercel site for now)', () => {
    renderFooter();
    expect(screen.getByRole('link', { name: 'Robert' }).getAttribute('href')).toBe(DESIGNER_URL);
    expect(DESIGNER_URL).toBe('https://histor-vestigia.vercel.app/');
  });

  test('"Back to the top"; nothing moves on its own', () => {
    const scrollTo = vi.fn();
    vi.stubGlobal('scrollTo', scrollTo);
    renderFooter();
    fireEvent.click(screen.getByRole('button', { name: 'Back to the top' }));
    expect(scrollTo).toHaveBeenCalledWith(expect.objectContaining({ top: 0 }));
    expect(screen.getByRole('contentinfo').querySelector('.footer-fog')).toBeNull();
  });

  test('on no case page (the fix list): not the story, the desk, the verdict or the report; on /credits and /sources', () => {
    continuePastGate();
    localStorage.setItem(
      `histor:case:${maryCeleste.id}`,
      JSON.stringify({ opened: maryCeleste.evidence.slice(0, maryCeleste.closeThreshold).map(e => e.id), pins: {}, verdict: maryCeleste.theories[0].id })
    );
    localStorage.setItem(`histor:intro-seen:${maryCeleste.id}`, '1');
    for (const path of [`/case/${maryCeleste.id}`, `/case/${maryCeleste.id}/files`, `/case/${maryCeleste.id}/verdict`, `/case/${maryCeleste.id}/report`]) {
      window.history.pushState({}, '', path);
      const { unmount } = render(<App />);
      expect(document.querySelector('[data-site-footer]'), path).toBeNull();
      unmount();
    }
    for (const path of ['/credits', '/sources']) {
      window.history.pushState({}, '', path);
      const { unmount } = render(<App />);
      expect(document.querySelector('[data-site-footer]'), path).not.toBeNull();
      unmount();
    }
  });
});
