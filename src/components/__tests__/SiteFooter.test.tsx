// @vitest-environment jsdom
// src/components/__tests__/SiteFooter.test.tsx
// The footer (review-fixes brief, 9): on the pages that scroll (the end of the story, the report), never on the fixed
// desk. "Histor" with its line, the case's sources and credits (music, images), GitHub, "Built with Kiro", © 2026.
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import App from '@/App';
import maryCeleste from '@/cases/mary-celeste/case';
import SiteFooter from '@/components/SiteFooter';
import { FOOTER } from '@/lib/footer-links';
import { continuePastGate, resetPhoneGate } from '@/lib/phone-gate';

afterEach(() => {
  vi.unstubAllGlobals();
  cleanup();
  resetPhoneGate();
  localStorage.clear();
  window.history.pushState({}, '', '/');
});

describe('the footer', () => {
  test('Histor, its line, GitHub, Built with Kiro and © 2026', () => {
    render(<SiteFooter caseData={maryCeleste} />);
    const footer = screen.getByRole('contentinfo');
    expect(footer.textContent).toContain('Histor');
    expect(footer.textContent).toContain(FOOTER.tagline);
    expect(within(footer).getByRole('link', { name: 'GitHub' }).getAttribute('href')).toBe(FOOTER.repository);
    expect(within(footer).getByRole('link', { name: 'Built with Kiro' }).getAttribute('href')).toBe(FOOTER.kiro);
    expect(footer.textContent).toContain('© 2026');
  });

  test('with life (ui-pass 7): the logo as Histor, a fog layer, a brass rule, a "Back to the top" icon button', () => {
    render(<SiteFooter caseData={maryCeleste} />);
    const footer = screen.getByRole('contentinfo');
    expect(within(footer).getByRole('img', { name: 'Histor' }).getAttribute('src')).toBe('/brand/histor-logo-cream.svg');
    expect(footer.querySelector('.footer-fog')).not.toBeNull();
    expect(footer.querySelector('[data-footer="rule"]')).not.toBeNull();
    const scrollTo = vi.fn();
    vi.stubGlobal('scrollTo', scrollTo);
    fireEvent.click(within(footer).getByRole('button', { name: 'Back to the top' }));
    expect(scrollTo).toHaveBeenCalledWith(expect.objectContaining({ top: 0 }));
    expect(within(footer).getByRole('link', { name: 'GitHub' }).className).toContain('footer-link');
  });

  test("the case's sources and its credits (images and music) open in place", () => {
    render(<SiteFooter caseData={maryCeleste} />);
    const sources = screen.getByRole('button', { name: /Sources/ });
    expect(sources.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(sources);
    expect(sources.getAttribute('aria-expanded')).toBe('true');
    const list = screen.getByRole('region', { name: 'Sources' });
    for (const source of maryCeleste.sources) {
      expect(list.textContent).toContain(source.title);
    }
    fireEvent.click(screen.getByRole('button', { name: /Credits/ }));
    expect(screen.queryByRole('region', { name: 'Sources' })).toBeNull();
    const credits = screen.getByRole('region', { name: 'Credits' });
    expect(credits.textContent).toContain('Images');
    // The music is off (sound-files 3): no music is credited.
    expect(credits.textContent).not.toContain('Music');
    expect(credits.textContent).toContain('Mixkit');
  });

  test('without a case: no sources or credits, the rest as ever', () => {
    render(<SiteFooter />);
    expect(screen.queryByRole('button', { name: /Sources/ })).toBeNull();
    expect(screen.getByRole('link', { name: 'GitHub' })).toBeDefined();
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
