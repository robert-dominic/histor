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
