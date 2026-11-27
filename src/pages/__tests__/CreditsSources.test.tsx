// @vitest-environment jsdom
// src/pages/__tests__/CreditsSources.test.tsx
// /credits and /sources (the fix list): every credit grouped by case, built from each case's data, with the app's own
// credits; each case's sources; the report's ⓘ links to the case's credits.
import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, test } from 'vitest';
import App from '@/App';
import maryCeleste from '@/cases/mary-celeste/case';
import { APP_CREDITS, caseCredits } from '@/lib/credits';
import { continuePastGate, resetPhoneGate } from '@/lib/phone-gate';
import { storyImageCredit } from '@/lib/image-credit';

function renderAt(path: string) {
  window.history.pushState({}, '', path);
  return render(<App />);
}

afterEach(() => {
  cleanup();
  resetPhoneGate();
  localStorage.clear();
  window.history.pushState({}, '', '/');
});

describe('/credits', () => {
  test('the case\'s credits from its own data, under its own anchor, then the app\'s', () => {
    renderAt('/credits');
    const group = document.getElementById(maryCeleste.id)!;
    expect(within(group).getByRole('heading', { name: maryCeleste.title })).toBeDefined();
    for (const section of maryCeleste.story) {
      if (section.image !== undefined) {
        expect(group.textContent).toContain(storyImageCredit(section.image));
      }
    }
    expect(group.textContent).toContain(maryCeleste.theme.legendVideo!.credit);
    expect(group.textContent).toContain('Mixkit');
    const app = document.getElementById('histor')!;
    for (const { lines } of APP_CREDITS) {
      for (const line of lines) {
        expect(app.textContent).toContain(line.what);
      }
    }
    expect(app.textContent).toContain('Pixabay');
    expect(app.textContent).toContain('Special Elite');
    // The sealed cases' pictures on the landing page.
    for (const credit of [
      'The Nemesis of Neglect, John Tenniel, Punch, 1888',
      'The ransom bills found in 1980, FBI photograph',
      'The Children of Edward, Paul Delaroche, 1830',
      'The Dancing Mania, engraving by Hendrik Hondius after Pieter Bruegel, 1642',
      'Amelia Earhart, NASA archive photograph',
    ]) {
      expect(app.textContent).toContain(credit);
    }
  });

  test('each image credit once; the music only while it plays', () => {
    const credits = caseCredits(maryCeleste);
    const keys = credits.images.map(line => `${line.what}|${line.credit}`);
    expect(new Set(keys).size).toBe(keys.length);
    expect(credits.music).toEqual([]);
  });
});

describe('/sources', () => {
  test('each case\'s sources, grouped by case', () => {
    renderAt('/sources');
    const group = document.getElementById(maryCeleste.id)!;
    expect(within(group).getAllByRole('listitem')).toHaveLength(maryCeleste.sources.length);
    for (const source of maryCeleste.sources) {
      expect(group.textContent).toContain(source.title);
    }
  });
});

describe('the report\'s ⓘ', () => {
  test('"Credits & sources" in the icon bar, linking to /credits#{caseId}', () => {
    continuePastGate();
    localStorage.setItem(
      `histor:case:${maryCeleste.id}`,
      JSON.stringify({ opened: maryCeleste.evidence.slice(0, maryCeleste.closeThreshold).map(e => e.id), pins: {}, verdict: maryCeleste.theories[0].id })
    );
    renderAt(`/case/${maryCeleste.id}/report`);
    const bar = screen.getByRole('toolbar', { name: 'Your result' });
    const link = within(bar).getByRole('link', { name: 'Credits & sources' });
    expect(link.getAttribute('href')).toBe(`/credits#${maryCeleste.id}`);
    expect(link.parentElement!.querySelector('[data-tooltip]')!.textContent).toBe('Credits & sources');
  });
});

describe('the header on /credits and /sources', () => {
  test.each(['/credits', '/sources'])('%s: the normal header, its wordmark linking to the landing, and no music button', path => {
    renderAt(path);
    const header = document.querySelector<HTMLElement>('[data-landing="header"]')!;
    const home = header.querySelector('a')!;
    expect(home.getAttribute('href')).toBe('/');
    expect(home.getAttribute('aria-label')).toBe('Histor, back to the archive');
    expect(home.querySelector('img')!.className).not.toContain('opacity-0');
    expect(header.querySelector('[data-landing="music"]')).toBeNull();
    expect(header.querySelector('button')).toBeNull();
  });
});
