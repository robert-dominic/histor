// @vitest-environment jsdom
// src/features/verdict/__tests__/VerdictReveal.test.tsx
// The verdict becomes a reveal (investigation brief, item 3): the leading theories written in, one line comparing
// them with the player's choice, a rank card, and a shareable card that is saved or shared from the browser. The
// full report follows below.
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import gsap from 'gsap';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import App from '@/App';
import maryCeleste from '@/cases/mary-celeste/case';
import { continuePastGate, resetPhoneGate } from '@/lib/phone-gate';
import { SHARE_CARD, drawShareCard, shareCardLines, shareCardText } from '@/lib/share-card';
import { RANK_COPY, REVEAL_COPY } from '@/lib/ui-copy';
import { stubMatchMedia } from '@/test/match-media';
import type { InvestigationState } from '@/types/case';

vi.setConfig({ testTimeout: 15_000 });
const CASE = maryCeleste;
const KEY = `histor:case:${CASE.id}`;
const BASE = `/case/${CASE.id}`;
const leading = CASE.theories.filter(theory => theory.standing === 'leading');
const rejected = CASE.theories.find(theory => theory.standing === 'rejected')!;
const opened = CASE.evidence.slice(0, CASE.closeThreshold).map(evidence => evidence.id);

function renderReport(verdict: string, { fresh = false }: { fresh?: boolean } = {}) {
  const state: InvestigationState = { opened, pins: {}, verdict };
  localStorage.setItem(KEY, JSON.stringify(state));
  // As the verdict navigates: with `{ fresh: true }` in the history state.
  window.history.pushState(fresh ? { usr: { fresh: true }, key: 'test', idx: 0 } : {}, '', `${BASE}/report`);
  return render(<App />);
}
const reveal = () => document.querySelector<HTMLElement>('[data-reveal="root"]')!;
const part = (name: string) => reveal().querySelector<HTMLElement>(`[data-reveal="${name}"]`);

beforeEach(() => {
  continuePastGate();
  localStorage.clear();
  stubMatchMedia();
});
afterEach(() => {
  resetPhoneGate();
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  window.history.pushState({}, '', '/');
});

describe('the reveal', () => {
  test('"Most historians lean toward…", then the leading theories, then the report below', () => {
    renderReport(leading[0].id);
    expect(part('lead')?.textContent).toBe(REVEAL_COPY.lead);
    expect([...reveal().querySelectorAll('[data-reveal="leading"]')].map(item => item.textContent)).toEqual(leading.map(theory => theory.title));
    // The full report follows, as before.
    expect(screen.getByRole('heading', { name: 'Case report' })).toBeDefined();
    expect(reveal().compareDocumentPosition(screen.getByRole('heading', { name: 'Case report' })) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  test('a leading theory chosen: "You stand with the historians."', () => {
    renderReport(leading[0].id);
    expect(part('compare')?.textContent).toBe(REVEAL_COPY.withHistorians);
    expect(part('reason')).toBeNull();
  });

  test('a theory ruled out: "Historians ruled this one out:", then its standing reason', () => {
    renderReport(rejected.id);
    expect(part('compare')?.textContent).toBe(REVEAL_COPY.ruledOut);
    expect(part('reason')?.textContent).toBe(rejected.standingReason);
  });

  test('just closed: the lamp narrows, the lead is typed, the pen writes each leading theory in, one by one', () => {
    renderReport(leading[0].id, { fresh: true });
    const letters = (element: Element) => [...element.querySelectorAll<HTMLElement>('*')].filter(child => child.children.length === 0);
    expect(letters(part('lead')!).every(letter => letter.style.opacity === '0')).toBe(true);
    const titles = [...reveal().querySelectorAll('[data-reveal="leading"]')];
    const starts = titles.map(title => gsap.getTweensOf(letters(title)[0]).find(tween => tween.vars.opacity === 1)!.startTime());
    expect(starts).toEqual([...starts].sort((a, b) => a - b));
    expect(new Set(starts).size).toBe(titles.length);
    expect(gsap.getTweensOf('[data-reveal-pen="quill-body"]').length).toBeGreaterThan(0);
    const lamp = document.querySelector<HTMLElement>('.desk-lamp, [data-lamp]')!;
    expect(gsap.getTweensOf(lamp).some(tween => tween.vars['--lamp-r'] === '340px')).toBe(true);
  });

  test('a later visit: nothing plays, everything is simply there', () => {
    renderReport(leading[0].id);
    expect(part('lead')!.querySelectorAll('*')).toHaveLength(0);
    expect(part('rank')!.style.opacity).toBe('');
  });

  test('reduced motion: everything simply appears', () => {
    vi.unstubAllGlobals();
    stubMatchMedia({ reducedMotion: true });
    renderReport(leading[0].id, { fresh: true });
    expect(part('lead')!.querySelectorAll('*')).toHaveLength(0);
    expect(gsap.getTweensOf('[data-reveal-pen="quill-body"]')).toHaveLength(0);
  });
});

describe('the rank card', () => {
  test('a leading theory and no legends trusted: Historian, with its line', () => {
    renderReport(leading[0].id);
    expect(part('rank-name')?.textContent).toBe(RANK_COPY.historian.name);
    expect(part('rank-line')?.textContent).toBe(RANK_COPY.historian.line);
    expect(part('rank-name')?.className).toContain('rubber-stamp');
  });

  test('a theory ruled out and no legends: Investigator', () => {
    renderReport(rejected.id);
    expect(part('rank-name')?.dataset.rank).toBe('investigator');
  });
});

describe('the shareable card', () => {
  test('its words: the case closed, the rank, the legends, the site', () => {
    const input = { title: 'The Mary Celeste', years: '1872 – 1873', rank: 'deckhand' as const, legends: 3 };
    expect(shareCardLines(input)).toEqual({
      closed: 'I closed the Mary Celeste case.',
      rank: 'Deckhand',
      legends: 'I trusted 3 legends.',
      site: 'histor.space',
    });
    expect(shareCardLines({ ...input, legends: 0 }).legends).toBe('I trusted no legends.');
    expect(shareCardLines({ ...input, legends: 1 }).legends).toBe('I trusted 1 legend.');
    expect(shareCardText(input)).toBe('I closed the Mary Celeste case on Histor. Deckhand. I trusted 3 legends. Can you tell legend from history?');
    expect(shareCardLines({ ...input, title: 'Test Case' }).closed).toBe('I closed the Test Case case.');
  });

  test('drawn 1200×630, in the site\'s faces, with every line on it', () => {
    const drawn: string[] = [];
    const fonts: string[] = [];
    const context = new Proxy(
      {},
      {
        get: (target: Record<string, unknown>, key: string) => {
          if (key === 'fillText') {
            return (text: string) => drawn.push(text);
          }
          if (key === 'measureText') {
            return () => ({ width: 100 });
          }
          if (key === 'createLinearGradient') {
            return () => ({ addColorStop: () => undefined });
          }
          return key in target ? target[key] : () => undefined;
        },
        set: (target: Record<string, unknown>, key: string, value: unknown) => {
          if (key === 'font') {
            fonts.push(String(value));
          }
          target[key] = value;
          return true;
        },
      }
    );
    const canvas = document.createElement('canvas');
    vi.spyOn(canvas, 'getContext').mockReturnValue(context as unknown as CanvasRenderingContext2D);
    const input = { title: 'Test Case', years: '1900 – 1901', rank: 'historian' as const, legends: 0 };
    drawShareCard(canvas, input);
    expect([canvas.width, canvas.height]).toEqual([SHARE_CARD.width, SHARE_CARD.height]);
    const lines = shareCardLines(input);
    expect(drawn).toEqual(expect.arrayContaining(['Test Case', lines.closed, lines.rank.toUpperCase(), lines.legends, lines.site]));
    expect(fonts.some(font => font.includes('Grenze Gotisch'))).toBe(true);
    expect(fonts.some(font => font.includes('Special Elite'))).toBe(true);
  });

  test('"Save the card" downloads the PNG; nothing is sent anywhere', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(function (callback: BlobCallback) {
      callback(new Blob(['png'], { type: 'image/png' }));
    });
    const url = vi.fn(() => 'blob:test');
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: url, revokeObjectURL: vi.fn() }));
    const clicks = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      expect(this.download).toBe(`histor-${CASE.id}.png`);
    });
    renderReport(leading[0].id);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save the card' }));
    });
    await waitFor(() => expect(clicks).toHaveBeenCalledTimes(1));
    expect(url).toHaveBeenCalledTimes(1);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  test('"Share": the browser\'s share sheet with the file where it can; otherwise the text is copied', async () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(function (callback: BlobCallback) {
      callback(new Blob(['png'], { type: 'image/png' }));
    });
    const share = vi.fn(() => Promise.resolve());
    vi.stubGlobal('navigator', { ...navigator, canShare: () => true, share });
    renderReport(leading[0].id);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Share' }));
    });
    await waitFor(() => expect(share).toHaveBeenCalledTimes(1));
    expect((share.mock.calls[0] as unknown as [ShareData])[0].files?.[0].type).toBe('image/png');
    cleanup();
    const writeText = vi.fn(() => Promise.resolve());
    vi.stubGlobal('navigator', { ...navigator, canShare: undefined, share: undefined, clipboard: { writeText } });
    renderReport(leading[0].id);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Share' }));
    });
    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    expect((writeText.mock.calls[0] as unknown as [string])[0]).toContain('I closed the');
    expect(screen.getByText('Copied to the clipboard.')).toBeDefined();
  });
});
