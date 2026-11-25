// @vitest-environment jsdom
// src/components/__tests__/SiteFooter.test.tsx
// The footer (landing brief, 5): a normal, standard footer on the pages that scroll and are not a case's: the landing
// page, the credits and the sources.
import { cleanup, render, screen, within } from '@testing-library/react';
import gsap from 'gsap';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { exhibits } from '@/cases';
import { legendsOf, pickLegend } from '@/lib/legend-of-the-day';
import { stubMatchMedia } from '@/test/match-media';
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

describe('the footer: big and typographic (landing v2 brief, 4)', () => {
  test('HISTOR in the logo\'s letterforms, one group per letter, and "Legend or history" running beside it', () => {
    renderFooter();
    const footer = screen.getByRole('contentinfo');
    const wordmark = within(footer).getByRole('img', { name: 'Histor' });
    expect([...wordmark.querySelectorAll('[data-footer-letter]')].map(letter => letter.getAttribute('data-footer-letter')).join('')).toBe('HISTOR');
    expect(footer.querySelector('[data-footer="vertical"]')!.textContent).toBe(FOOTER.vertical);
    expect(footer.querySelector('[data-footer="vertical"]')!.className).toContain('writing-mode:vertical-rl');
    // A phone: the same words as a line under the wordmark.
    expect(footer.querySelector('[data-footer="line"]')!.textContent).toBe(FOOTER.vertical);
    expect(footer.className).toContain('bg-night');
    expect(footer.className).toContain('border-t');
  });

  test('the archive: open cases are links, sealed ones are muted and say Sealed', () => {
    renderFooter();
    const archive = within(screen.getByRole('contentinfo')).getByRole('navigation', { name: 'The archive' });
    for (const exhibit of exhibits) {
      if (exhibit.status === 'open') {
        expect(within(archive).getByRole('link', { name: exhibit.title }).getAttribute('href')).toBe(`/case/${exhibit.id}`);
      } else {
        expect(within(archive).queryByRole('link', { name: exhibit.title })).toBeNull();
        expect(within(archive).getByText(exhibit.title).textContent).toBe(exhibit.title);
      }
    }
    expect(within(archive).getAllByText('Sealed')).toHaveLength(exhibits.filter(exhibit => exhibit.status === 'sealed').length);
  });

  test('about: the line, Credits, Sources, GitHub and Built with Kiro', () => {
    renderFooter();
    const footer = screen.getByRole('contentinfo');
    expect(footer.querySelector('[data-footer="description"]')!.textContent).toBe('Histor separates what really happened from what was added later.');
    const nav = within(footer).getByRole('navigation', { name: 'About Histor' });
    expect(within(nav).getAllByRole('link').map(link => [link.textContent, link.getAttribute('href')])).toEqual([
      ['Credits', '/credits'],
      ['Sources', '/sources'],
      ['GitHub', FOOTER.repository],
      ['Built with Kiro', FOOTER.kiro],
    ]);
  });

  test('"Today\'s legend": a legend file from an open case, a different one for a different draw', () => {
    const titles = legendsOf([maryCeleste]).map(entry => entry.legend);
    expect(titles.length).toBeGreaterThan(3);
    const seen = new Set<string>();
    for (const draw of [0, 0.5, 0.99]) {
      vi.spyOn(Math, 'random').mockReturnValue(draw);
      const { container, unmount } = renderFooter();
      const line = container.querySelector('[data-footer="legend"]')!;
      const name = line.querySelector('em')!.textContent!;
      expect(titles).toContain(name);
      expect(line.textContent).toContain("Today\u2019s legend:");
      expect(line.textContent).toContain('It never happened.');
      seen.add(name);
      unmount();
      vi.restoreAllMocks();
    }
    expect(seen.size).toBeGreaterThan(1);
    expect(pickLegend([maryCeleste], 0)).toEqual({ legend: 'the warm breakfast', caseTitle: maryCeleste.title });
    expect(pickLegend([], 0.5)).toBeNull();
  });

  test('the foot: © 2026 Histor on the left; "Designed and built by Robert" on the right, Robert linking to DESIGNER_URL', () => {
    renderFooter();
    const footer = screen.getByRole('contentinfo');
    expect(footer.querySelector('[data-footer="copyright"]')!.textContent).toBe('© 2026 Histor');
    expect(footer.querySelector('[data-footer="byline"]')!.textContent).toBe('Designed and built by Robert');
    expect(screen.getByRole('link', { name: 'Robert' }).getAttribute('href')).toBe(DESIGNER_URL);
    expect(DESIGNER_URL).toBe('https://histor-vestigia.vercel.app/');
  });

  test('links have a drawn underline on hover (a transform), the letters rise one by one (a fade under reduced motion)', () => {
    const css = readFileSync(resolve(__dirname, '../../styles/effects.css'), 'utf8');
    expect(css).toContain('.draw-link::after');
    expect(css).toMatch(/\.draw-link:hover::after/);
    expect(css).toMatch(/@media \(hover: hover\) and \(pointer: fine\)\s*\{\s*\.draw-link:hover/);
    expect(screen.queryByRole('contentinfo')).toBeNull();
    stubMatchMedia();
    renderFooter();
    expect(gsap.getTweensOf([...document.querySelectorAll('[data-footer-letter]')]).length).toBeGreaterThan(0);
    expect(gsap.getProperty(document.querySelector('[data-footer-letter]'), 'y')).toBe(828);
    cleanup();
    vi.unstubAllGlobals();
    stubMatchMedia({ reducedMotion: true });
    renderFooter();
    expect(gsap.getProperty(document.querySelector('[data-footer-letter]'), 'y')).toBe(0);
    expect(gsap.getProperty(document.querySelector('[data-footer-letter]'), 'opacity')).toBe(0);
  });
});

describe('the footer on its pages', () => {
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
