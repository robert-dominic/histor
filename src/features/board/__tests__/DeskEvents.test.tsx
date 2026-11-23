// @vitest-environment jsdom
// src/features/board/__tests__/DeskEvents.test.tsx
// Task 14 of .kiro/specs/desk: the desk's moments are sent as events (so sound can follow later), each once at its
// moment; the desk works from the keyboard; and under reduced motion nothing flips, drifts, moves or drags.
// (The two `seal` events are tested with the "Close the case" stamp and the verdict in Investigation.test.tsx.)
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { continuePastGate, resetPhoneGate } from '@/lib/phone-gate';
import App from '@/App';
import maryCeleste from '@/cases/mary-celeste/case';
import { Draggable, FINE_POINTER_QUERY } from '@/features/board/drag';
import { forgetShownThisLoad } from '@/features/board/hints';
import { onStoryEvent, type StoryEvent } from '@/lib/story-events';
import { DESKTOP_QUERY } from '@/lib/use-media-query';
import { stubMatchMedia } from '@/test/match-media';

vi.setConfig({ testTimeout: 15_000 });

const CASE = maryCeleste;
const BASE = `/case/${CASE.id}`;
const KEY = `histor:case:${CASE.id}`;
const DESK_EVENTS = ['pile-hover', 'folder-open', 'flip', 'stamp', 'pin', 'seal'];

function renderAt(path: string) {
  window.history.pushState({}, '', path);
  return render(<App />);
}

/** A desktop with a mouse, with or without reduced motion. */
function stubDesktop({ reducedMotion }: { reducedMotion: boolean }) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches:
        query === DESKTOP_QUERY ||
        query === FINE_POINTER_QUERY ||
        (query.includes('prefers-reduced-motion: reduce') && reducedMotion) ||
        (query.includes('prefers-reduced-motion: no-preference') && !reducedMotion),
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

/** Listens to the desk's events until `stop` is called. */
function listen() {
  const events: StoryEvent[] = [];
  const stop = onStoryEvent(event => {
    if (DESK_EVENTS.includes(event.type)) {
      events.push(event);
    }
  });
  return { events, stop };
}

const folders = () => [...document.querySelectorAll<HTMLElement>('[data-board="folder"]')];

beforeEach(() => {
  // These tests are about the desk, not the phone gate (which has its own tests): go past it.
  continuePastGate();
  localStorage.clear();
  // The guide opens on every arrival; these tests are about the desk under it.
  localStorage.setItem('histor:desk-guide-off:mary-celeste', '1');
  // The hints are not what these tests are about.
  localStorage.setItem(`histor:desk-hints:${CASE.id}`, '1');
  forgetShownThisLoad();
  stubMatchMedia();
});

afterEach(() => {
  resetPhoneGate();
  cleanup();
  vi.unstubAllGlobals();
  window.history.pushState({}, '', '/');
});

describe('Desk events', () => {
  test('pile-hover: once each time the pointer comes onto the floor', () => {
    stubDesktop({ reducedMotion: false });
    renderAt(`${BASE}/files`);
    const { events, stop } = listen();
    const floor = document.querySelector<HTMLElement>('[data-board="floor"]')!;
    fireEvent.pointerEnter(floor);
    stop();
    expect(events).toStrictEqual([{ type: 'pile-hover' }]);
  });

  test('folder-open, flip and stamp: each once, at its moment, in that order', async () => {
    stubDesktop({ reducedMotion: false });
    const { events, stop } = listen();
    renderAt(`${BASE}/files/e-lifeboat`);

    await waitFor(() => expect(events.some(event => event.type === 'stamp')).toBe(true), { timeout: 6000 });
    stop();

    expect(events).toStrictEqual([
      { type: 'flip', evidence: 'e-lifeboat', direction: 'open' },
      { type: 'folder-open', evidence: 'e-lifeboat' },
      { type: 'stamp', evidence: 'e-lifeboat', status: CASE.evidence.find(item => item.id === 'e-lifeboat')!.status },
    ]);
  });

  test('pin: once, with the file and the theory; on a desktop the cover closes first (flip, close)', async () => {
    stubDesktop({ reducedMotion: false });
    renderAt(`${BASE}/files/e-lifeboat`);
    const { events, stop } = listen();

    fireEvent.click(screen.getByRole('button', { name: 'Pin to…' }));
    fireEvent.click(screen.getByRole('menuitemradio', { name: CASE.theories[1].title }));
    await waitFor(() => expect(events.some(event => event.type === 'pin')).toBe(true), { timeout: 6000 });
    stop();

    const mine = events.filter(event => event.type === 'pin' || (event.type === 'flip' && event.direction === 'close'));
    expect(mine).toStrictEqual([
      { type: 'flip', evidence: 'e-lifeboat', direction: 'close' },
      { type: 'pin', evidence: 'e-lifeboat', target: CASE.theories[1].id },
    ]);
  });

  test('pin on a phone: once, at once, with no flip', () => {
    renderAt(`${BASE}/files/e-sword`);
    const { events, stop } = listen();

    fireEvent.click(screen.getByRole('button', { name: 'Pin to…' }));
    fireEvent.click(screen.getByRole('menuitemradio', { name: 'None of them' }));
    stop();

    expect(events).toStrictEqual([{ type: 'pin', evidence: 'e-sword', target: 'none' }]);
  });
});

describe('The keyboard', () => {
  test('every folder is a link, every note is a tab stop, and each stop has a visible focus ring', () => {
    renderAt(`${BASE}/files`);
    const main = document.querySelector<HTMLElement>('main[data-page="case"]')!;
    const stops = [...main.querySelectorAll<HTMLElement>('a[href], button, [tabindex="0"]')];

    // Every folder, by its link: Enter on a link opens it.
    const links = folders().map(folder => folder.querySelector('a'));
    expect(links).toHaveLength(CASE.evidence.length);
    for (const [index, link] of links.entries()) {
      expect(link?.getAttribute('href')).toBe(`${BASE}/files/${CASE.evidence[index].id}`);
      expect(link?.getAttribute('tabindex')).not.toBe('-1');
    }
    // Every note.
    const notes = [...main.querySelectorAll<HTMLElement>('[data-board="theory"]')];
    expect(notes).toHaveLength(CASE.theories.length);
    expect(notes.every(note => note.tabIndex === 0)).toBe(true);
    // Every stop shows a focus ring when it takes the focus by keyboard.
    expect(stops.length).toBeGreaterThanOrEqual(CASE.evidence.length + CASE.theories.length);
    for (const stop of stops) {
      expect(stop.className, stop.outerHTML.slice(0, 120)).toMatch(/focus-visible:(outline|ring)/);
    }
  });

  test('the "?" button, the Pin menu and the open file\'s links are reachable and ringed', () => {
    renderAt(`${BASE}/files`);
    expect(screen.getByRole('button', { name: 'How the desk works' }).className).toContain('focus-visible:outline');
    cleanup();

    renderAt(`${BASE}/files/e-lifeboat`);
    const file = screen.getByRole('dialog');
    const stops = [...file.querySelectorAll<HTMLElement>('a[href], button')];
    expect(stops.length).toBeGreaterThan(0);
    for (const stop of stops) {
      expect(stop.className, stop.outerHTML.slice(0, 120)).toMatch(/focus-visible:outline|focus-visible:-outline|focus-visible:bg/);
    }
  });

  test('Escape closes the open file and Enter on its folder (a link) opens it again', () => {
    renderAt(`${BASE}/files/e-lifeboat`);
    expect(screen.getByRole('dialog')).toBeDefined();

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(window.location.pathname).toBe(`${BASE}/files`);
    expect(screen.queryByRole('dialog')).toBeNull();

    // A browser turns Enter on a link into a click.
    const link = folders().find(folder => folder.dataset.evidenceId === 'e-lifeboat')!.querySelector('a')!;
    fireEvent.click(link);
    expect(screen.getByRole('dialog')).toBeDefined();
  });
});

describe('Reduced motion', () => {
  test('the whole desk renders with no flip, a still lamp, files on the floor and nothing to drag', async () => {
    stubDesktop({ reducedMotion: true });
    localStorage.setItem(KEY, JSON.stringify({ opened: ['e-lifeboat'], pins: { 'e-lifeboat': CASE.theories[0].id }, verdict: null }));
    const { events, stop } = listen();
    renderAt(`${BASE}/files`);

    expect(document.querySelector('[data-desk="lamp"]')?.getAttribute('data-lamp')).toBe('still');
    expect(document.querySelector('[data-board="floor"]')).not.toBeNull();
    expect(folders().length).toBeGreaterThan(0);
    for (const folder of folders()) {
      expect(Draggable.get(folder)).toBeUndefined();
    }
    expect(document.querySelectorAll('[data-board="theory"]')).toHaveLength(CASE.theories.length);

    // A file opens as a crossfade: no flip, no flight; it is opened and stamped.
    fireEvent.click(folders().find(folder => folder.dataset.evidenceId === 'e-sword')!.querySelector('a')!);
    await waitFor(() => expect(events.some(event => event.type === 'stamp')).toBe(true), { timeout: 6000 });
    stop();

    expect(events.map(event => event.type)).toStrictEqual(['folder-open', 'stamp']);
    expect(document.querySelector('[data-file="folder"]') && Draggable.get(document.querySelector<HTMLElement>('[data-file="folder"]')!)).toBeUndefined();
    expect(document.querySelector('.ink-word')).toBeNull();
  });
});
