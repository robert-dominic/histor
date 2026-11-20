// @vitest-environment jsdom
// src/features/board/__tests__/OpenFileDesktop.test.tsx
// Opening a file on the desktop: one click opens it at once with the full flight, a file read before included;
// the file fits the screen and its document scrolls inside the paper; Escape, a click outside and "Back to the
// board" close it, and the folder flies home and lands.
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import gsap from 'gsap';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import App from '@/App';
import maryCeleste from '@/cases/mary-celeste/case';
import { Flip } from '@/features/board/flight';
import * as flight from '@/features/board/flight';
import { forgetShownThisLoad } from '@/features/board/hints';
import { continuePastGate, resetPhoneGate } from '@/lib/phone-gate';
import { DESKTOP_QUERY } from '@/lib/use-media-query';

vi.setConfig({ testTimeout: 15_000 });
const CASE = maryCeleste;
const BASE = `/case/${CASE.id}`;
const KEY = `histor:case:${CASE.id}`;

/** A desktop with a mouse and full motion. */
function stubDesktop() {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches: query === DESKTOP_QUERY || query.includes('hover: hover') || query.includes('prefers-reduced-motion: no-preference'),
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(() => false),
    }))
  );
}
function renderAt(path: string) {
  window.history.pushState({}, '', path);
  return render(<App />);
}
const folderLink = (id: string) =>
  document.querySelector<HTMLElement>(`[data-board="folder"][data-evidence-id="${id}"] a`)!;
const dialog = () => screen.getByRole('dialog');

beforeEach(() => {
  continuePastGate();
  localStorage.clear();
  localStorage.setItem(`histor:desk-hints:${CASE.id}`, '1');
  forgetShownThisLoad();
  stubDesktop();
});
afterEach(() => {
  resetPhoneGate();
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  window.history.pushState({}, '', '/');
  document.documentElement.style.overflow = '';
});

describe('opening a file by clicking its folder', () => {
  test('one click opens the file and records exactly one flight, in', () => {
    const record = vi.spyOn(flight, 'recordFlight');
    renderAt(`${BASE}/files`);
    fireEvent.click(folderLink('e-lifeboat'));
    expect(window.location.pathname).toBe(`${BASE}/files/e-lifeboat`);
    expect(dialog()).toBeDefined();
    const flights = record.mock.calls.filter(call => call[1] === 'in');
    expect(flights).toHaveLength(1);
    expect(flights[0][0]).toBe('e-lifeboat');
  });

  test('the folder flies from where it lay with paper.move, at once: no mini view first', () => {
    const from = vi.spyOn(Flip, 'from');
    renderAt(`${BASE}/files`);
    fireEvent.click(folderLink('e-lifeboat'));
    expect(from).toHaveBeenCalledTimes(1);
    expect(from.mock.calls[0][1]).toMatchObject({ ease: 'power3.inOut', duration: 0.6, scale: true });
    // The open file's folder is the target of the flight, and it is not drawn at a small size first.
    const target = (from.mock.calls[0][1] as { targets: Element }).targets;
    expect(target).toBe(document.querySelector('[data-file="folder"]'));
  });

  test('a file read before opens with the full flight too, and is already revealed', () => {
    localStorage.setItem(KEY, JSON.stringify({ opened: ['e-sword'], pins: {}, verdict: null }));
    const from = vi.spyOn(Flip, 'from');
    renderAt(`${BASE}/files`);
    fireEvent.click(folderLink('e-sword'));
    expect(from).toHaveBeenCalledTimes(1);
    // Already stamped: no writing reveal.
    expect(document.querySelector('[data-file="sheet"]')?.getAttribute('data-revealed')).toBe('true');
  });

  test('the cover swings open after the flight, for a file read before as well', () => {
    localStorage.setItem(KEY, JSON.stringify({ opened: ['e-sword'], pins: {}, verdict: null }));
    renderAt(`${BASE}/files`);
    fireEvent.click(folderLink('e-sword'));
    const cover = document.querySelector('[data-file="cover"]') as HTMLElement;
    const tweens = gsap.getTweensOf(cover);
    expect(tweens.some(tween => tween.vars.rotationY !== undefined)).toBe(true);
  });
});

describe('the open file fits the screen', () => {
  test('the page does not scroll behind it, and the frame is at most 86% of the screen high', () => {
    renderAt(`${BASE}/files/e-lifeboat`);
    const root = dialog();
    expect(root.className).toContain('lg:overflow-hidden');
    expect(root.className).toContain('lg:place-items-center');
    expect(document.documentElement.style.overflow).toBe('hidden');
    const frame = document.querySelector('[data-file="folder"]') as HTMLElement;
    expect(frame.className).toContain('lg:max-h-[86svh]');
  });

  test('the document is the one thing that scrolls: a thin scrollbar, outside smooth scrolling', () => {
    renderAt(`${BASE}/files/e-lifeboat`);
    const paper = document.querySelector('[data-file="grip"]') as HTMLElement;
    expect(paper.hasAttribute('data-lenis-prevent')).toBe(true);
    expect(paper.className).toContain('lg:overflow-y-auto');
    expect(paper.className).toContain('thin-scroll');
    expect(paper.contains(document.querySelector('[data-file="sheet"]'))).toBe(true);
  });
});

describe('closing a file', () => {
  test('Escape closes it', () => {
    renderAt(`${BASE}/files/e-lifeboat`);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(window.location.pathname).toBe(`${BASE}/files`);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  test('a click on the dimmed desk outside the file closes it', () => {
    renderAt(`${BASE}/files/e-lifeboat`);
    fireEvent.click(document.querySelector('[data-file="backdrop"]')!);
    expect(window.location.pathname).toBe(`${BASE}/files`);
  });

  test('a click on the file itself does not close it', () => {
    renderAt(`${BASE}/files/e-lifeboat`);
    fireEvent.click(document.querySelector('[data-file="sheet"]')!);
    expect(window.location.pathname).toBe(`${BASE}/files/e-lifeboat`);
  });

  test('"Back to the board" closes it', () => {
    renderAt(`${BASE}/files/e-lifeboat`);
    fireEvent.click(screen.getByRole('link', { name: 'Back to the board' }));
    expect(window.location.pathname).toBe(`${BASE}/files`);
  });

  test('the folder flies back with paper.move, then lands with paper.land', () => {
    const from = vi.spyOn(Flip, 'from');
    renderAt(`${BASE}/files`);
    fireEvent.click(folderLink('e-lifeboat'));
    from.mockClear();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(from).toHaveBeenCalledTimes(1);
    const options = from.mock.calls[0][1] as { ease: string; duration: number; onComplete: () => void };
    expect(options).toMatchObject({ ease: 'power3.inOut', duration: 0.6 });
    const home = document.querySelector('[data-board="folder"][data-evidence-id="e-lifeboat"]') as HTMLElement;
    act(() => options.onComplete());
    const landing = gsap.getTweensOf(home).find(tween => tween.vars.ease === 'back.out(1.15)');
    expect(landing).toBeDefined();
  });
});
