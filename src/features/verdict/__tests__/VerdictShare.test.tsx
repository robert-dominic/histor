// @vitest-environment jsdom
// src/features/verdict/__tests__/VerdictShare.test.tsx
// The result screen (polish brief, A4): two columns on a laptop, the player's name signed onto the card by the pen,
// and the share links.
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import App from '@/App';
import maryCeleste from '@/cases/mary-celeste/case';
import { continuePastGate, resetPhoneGate } from '@/lib/phone-gate';
import { PLAYER_NAME_MAX, cleanPlayerName, loadPlayerName, savePlayerName } from '@/lib/player-name';
import { drawShareCard, shareCardText, shareLinks, shareUrl } from '@/lib/share-card';
import { onStoryEvent, type StoryEvent } from '@/lib/story-events';
import { stubMatchMedia } from '@/test/match-media';
import type { InvestigationState } from '@/types/case';

vi.setConfig({ testTimeout: 15_000 });
const CASE = maryCeleste;
const BASE = `/case/${CASE.id}`;
const leading = CASE.theories.find(theory => theory.standing === 'leading')!;
const opened = CASE.evidence.slice(0, CASE.closeThreshold).map(evidence => evidence.id);

function renderReport() {
  const state: InvestigationState = { opened, pins: {}, verdict: leading.id };
  localStorage.setItem(`histor:case:${CASE.id}`, JSON.stringify(state));
  window.history.pushState({}, '', `${BASE}/report`);
  return render(<App />);
}
const reveal = () => document.querySelector<HTMLElement>('[data-reveal="root"]')!;

/** A 2D context that records the words drawn on it. */
function recordingCanvas() {
  const drawn: string[] = [];
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
        target[key] = value;
        return true;
      },
    }
  );
  return { drawn, context: context as unknown as CanvasRenderingContext2D };
}

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

describe('the result screen', () => {
  test('two columns on a laptop: the reveal and the rank on the left, the card and its actions on the right; the report below', () => {
    renderReport();
    expect(reveal().className).toContain('lg:grid-cols-2');
    const left = reveal().querySelector<HTMLElement>('[data-side="reveal"]')!;
    const right = reveal().querySelector<HTMLElement>('[data-side="share"]')!;
    expect(left.querySelector('[data-reveal="lead"]')).not.toBeNull();
    expect(left.querySelector('[data-reveal="compare"]')).not.toBeNull();
    expect(left.querySelector('[data-reveal="rank"]')).not.toBeNull();
    expect(right.querySelector('canvas')).not.toBeNull();
    expect(right.textContent).toContain('Save the card');
    // The report follows, across the width.
    const report = document.querySelector<HTMLElement>('article')!;
    expect(reveal().compareDocumentPosition(report) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(report.className).toContain('lg:max-w-6xl');
  });
});

describe('the rank revealed', () => {
  test('just closed: the rank is revealed with its own moment (for its typewriter bell); a later visit, none', () => {
    const events: StoryEvent[] = [];
    const stop = onStoryEvent(event => events.push(event));
    stubMatchMedia({ reducedMotion: true });
    const state: InvestigationState = { opened, pins: {}, verdict: leading.id };
    localStorage.setItem(`histor:case:${CASE.id}`, JSON.stringify(state));
    window.history.pushState({ usr: { fresh: true }, key: 'test', idx: 0 }, '', `${BASE}/report`);
    render(<App />);
    expect(events.filter(event => event.type === 'rank')).toHaveLength(1);
    cleanup();
    events.length = 0;
    renderReport();
    stop();
    expect(events.filter(event => event.type === 'rank')).toHaveLength(0);
  });
});

describe('the player signs the card', () => {
  test('"Sign your case file", with "Your name"; optional: with no name the card has no signature', () => {
    renderReport();
    const field = screen.getByLabelText('Sign your case file') as HTMLInputElement;
    expect(field.placeholder).toBe('Your name');
    expect(field.value).toBe('');
    expect(reveal().querySelector<HTMLElement>('[data-sign="root"]')!.style.visibility).toBe('hidden');
    expect(reveal().querySelector('canvas')!.getAttribute('aria-label')).not.toContain('Signed');
  });

  test('typing: once the player pauses, the name is on the card and saved; prefilled next time', async () => {
    const { unmount } = renderReport();
    const field = screen.getByLabelText('Sign your case file');
    fireEvent.change(field, { target: { value: 'Ann' } });
    fireEvent.change(field, { target: { value: 'Ann  Lee ' } });
    // Not every keystroke: nothing yet.
    expect(reveal().querySelector('[data-sign="name"]')!.textContent).toBe('');
    await waitFor(() => expect(reveal().querySelector('[data-sign="name"]')!.textContent).toBe('Ann Lee'), { timeout: 3000 });
    expect(localStorage.getItem('histor:player-name')).toBe('Ann Lee');
    expect(reveal().querySelector('canvas')!.getAttribute('aria-label')).toContain('Signed Ann Lee.');
    unmount();
    renderReport();
    expect((screen.getByLabelText('Sign your case file') as HTMLInputElement).value).toBe('Ann Lee');
    expect(reveal().querySelector('[data-sign="name"]')!.textContent).toBe('Ann Lee');
  });

  test('the name is kept tidy and short, and storage that fails changes nothing', () => {
    expect(cleanPlayerName('  a   b  ')).toBe('a b');
    expect(cleanPlayerName('x'.repeat(80))).toHaveLength(PLAYER_NAME_MAX);
    savePlayerName('Ann');
    expect(loadPlayerName()).toBe('Ann');
    savePlayerName('   ');
    expect(localStorage.getItem('histor:player-name')).toBeNull();
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(loadPlayerName()).toBe('');
  });

  test('the canvas draws the signature line with the name, and none without one', () => {
    const input = { title: 'Test Case', years: '1900', rank: 'historian' as const, legends: 0 };
    const signed = recordingCanvas();
    const canvas = document.createElement('canvas');
    vi.spyOn(canvas, 'getContext').mockReturnValue(signed.context);
    drawShareCard(canvas, { ...input, name: 'Ann Lee' });
    expect(signed.drawn).toEqual(expect.arrayContaining(['SIGNED', 'Ann Lee']));
    const unsigned = recordingCanvas();
    const plain = document.createElement('canvas');
    vi.spyOn(plain, 'getContext').mockReturnValue(unsigned.context);
    drawShareCard(plain, input);
    expect(unsigned.drawn).not.toContain('SIGNED');
  });
});

describe('sharing', () => {
  const input = { title: 'The Mary Celeste', years: '1872', rank: 'historian' as const, legends: 0 };

  test('the words, and the link to the case', () => {
    expect(shareCardText(input)).toBe('I closed the Mary Celeste case on Histor. Historian. I trusted no legends. Can you tell legend from history?');
    expect(shareUrl(CASE.id)).toBe(`https://histor.space/case/${CASE.id}`);
  });

  test('direct links for X, Facebook, LinkedIn, WhatsApp, Reddit and Telegram, with the words and the link filled in', () => {
    const text = shareCardText(input);
    const url = shareUrl(CASE.id);
    const links = shareLinks(text, url);
    expect(links.map(link => link.label)).toEqual(['X', 'Facebook', 'LinkedIn', 'WhatsApp', 'Reddit', 'Telegram']);
    for (const link of links) {
      const href = new URL(link.href);
      expect(href.protocol).toBe('https:');
      expect(decodeURIComponent(link.href)).toContain(url);
    }
    for (const id of ['x', 'whatsapp', 'reddit', 'telegram']) {
      expect(decodeURIComponent(links.find(link => link.id === id)!.href)).toContain(text);
    }
  });

  test('on the page: each link opens in a new tab; "Copy link" copies the link; a line says why the image is saved', async () => {
    const writeText = vi.fn(() => Promise.resolve());
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } });
    renderReport();
    const anchors = [...reveal().querySelectorAll<HTMLAnchorElement>('[data-reveal="links"] a')];
    expect(anchors).toHaveLength(6);
    for (const anchor of anchors) {
      expect(anchor.target).toBe('_blank');
      expect(anchor.rel).toContain('noopener');
    }
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Copy link' }));
    });
    expect(writeText).toHaveBeenCalledWith(shareUrl(CASE.id));
    expect(screen.getByText('Link copied.')).toBeDefined();
    expect(reveal().querySelector('[data-reveal="attach-note"]')!.textContent).toMatch(/can’t carry images/);
  });

  test('"Share" with the native sheet: the signed card, and the words with the link', async () => {
    localStorage.setItem('histor:player-name', 'Ann');
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(function (callback: BlobCallback) {
      callback(new Blob(['png'], { type: 'image/png' }));
    });
    const drawn: string[] = [];
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function () {
      const recording = recordingCanvas();
      const fill = recording.context.fillText.bind(recording.context);
      return new Proxy(recording.context, {
        get: (target, key) => (key === 'fillText' ? (text: string, ...rest: number[]) => (drawn.push(text), fill(text, ...(rest as [number, number]))) : Reflect.get(target, key)),
      });
    } as unknown as typeof HTMLCanvasElement.prototype.getContext);
    const share = vi.fn(() => Promise.resolve());
    vi.stubGlobal('navigator', { ...navigator, canShare: () => true, share });
    renderReport();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Share' }));
    });
    await waitFor(() => expect(share).toHaveBeenCalledTimes(1));
    const data = (share.mock.calls[0] as unknown as [ShareData])[0];
    expect(data.files?.[0].type).toBe('image/png');
    expect(data.text).toContain('Can you tell legend from history?');
    expect(data.text).toContain(shareUrl(CASE.id));
    // The saved card is signed.
    expect(drawn).toContain('Ann');
  });
});
