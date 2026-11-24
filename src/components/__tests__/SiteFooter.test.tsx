// @vitest-environment jsdom
// src/components/__tests__/SiteFooter.test.tsx
// The footer (review-fixes brief, 9): on the pages that scroll (the end of the story, the report), never on the fixed
// desk. "Histor" with its line, the case's sources and credits (music, images), GitHub, "Built with Kiro", © 2026.
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, test } from 'vitest';
import App from '@/App';
import maryCeleste from '@/cases/mary-celeste/case';
import SiteFooter from '@/components/SiteFooter';
import { FOOTER } from '@/lib/footer-links';
import { continuePastGate, resetPhoneGate } from '@/lib/phone-gate';

afterEach(() => {
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
    for (const track of maryCeleste.theme.playlists?.story ?? []) {
      expect(credits.textContent).toContain(track.title);
    }
  });

  test('without a case: no sources or credits, the rest as ever', () => {
    render(<SiteFooter />);
    expect(screen.queryByRole('button', { name: /Sources/ })).toBeNull();
    expect(screen.getByRole('link', { name: 'GitHub' })).toBeDefined();
  });

  test('on the report, not on the desk', () => {
    continuePastGate();
    localStorage.setItem(
      `histor:case:${maryCeleste.id}`,
      JSON.stringify({ opened: [maryCeleste.evidence[0].id], pins: {}, verdict: maryCeleste.theories[0].id })
    );
    window.history.pushState({}, '', `/case/${maryCeleste.id}/report`);
    const { unmount } = render(<App />);
    expect(document.querySelector('[data-site-footer]')).not.toBeNull();
    unmount();
    window.history.pushState({}, '', `/case/${maryCeleste.id}/files`);
    render(<App />);
    expect(document.querySelector('[data-site-footer]')).toBeNull();
  });
});
