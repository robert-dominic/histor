// @vitest-environment jsdom
// src/features/board/__tests__/OpenFileDrop.test.tsx
// Returning an open file to the floor (review-fixes brief, 4). Let go anywhere that is not a theory or the tray, the
// open file goes back to the floor, where it was let go and kept inside the floor: on the floor, on the board's empty
// space, past the edges. Opening a file never forces a pin. A clear "Back to the floor" button does the same as
// Escape and a click outside.
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import App from '@/App';
import maryCeleste from '@/cases/mary-celeste/case';
import { Draggable } from '@/features/board/drag';
import { clearFlight, takeTabs } from '@/features/board/flight';
import { forgetShownThisLoad } from '@/features/board/hints';
import { floorKey } from '@/lib/floor-positions';
import { continuePastGate, resetPhoneGate } from '@/lib/phone-gate';
import { DESKTOP_QUERY } from '@/lib/use-media-query';

vi.setConfig({ testTimeout: 15_000 });
const CASE = maryCeleste;
const BASE = `/case/${CASE.id}`;
const KEY = `histor:case:${CASE.id}`;
const THEORY = CASE.theories[0].id;
/** The floor on the screen, in px: its left, top, width and height. */
const FLOOR = { left: 20, top: 500, width: 1000, height: 300 };

function stubMedia() {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches: query === DESKTOP_QUERY || query.includes('hover: hover') || query.includes('no-preference'),
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
function seed(pins: Record<string, string>, opened: string[]) {
  localStorage.setItem(KEY, JSON.stringify({ opened, pins, verdict: null }));
}
function renderAt(path: string) {
  window.history.pushState({}, '', path);
  return render(<App />);
}
const saved = () => JSON.parse(localStorage.getItem(KEY) ?? 'null');
const spots = (): Record<string, { fx: number; fy: number }> => Object.fromEntries(JSON.parse(localStorage.getItem(floorKey(CASE.id)) ?? '[]'));
const openFolder = () => document.querySelector<HTMLElement>('[data-file="folder"]')!;
const target = (value: string) => document.querySelector<HTMLElement>(`main [data-drop-target="${value}"]`)!;

/** The floor's place on the screen, as jsdom has no layout. */
function layOutFloor() {
  const floor = document.querySelector<HTMLElement>('[data-board="floor"]')!;
  vi.spyOn(floor, 'getBoundingClientRect').mockReturnValue(new DOMRect(FLOOR.left, FLOOR.top, FLOOR.width, FLOOR.height));
  Object.defineProperty(floor, 'clientWidth', { configurable: true, value: FLOOR.width });
  Object.defineProperty(floor, 'clientHeight', { configurable: true, value: FLOOR.height });
}

/** Carries the open folder so its centre is at (x, y) on the screen, over `where` (or nothing), and lets go. */
function dropOpenFile(x: number, y: number, where: Element | null) {
  const folder = openFolder();
  const draggable = Draggable.get(folder);
  vi.spyOn(draggable, 'hitTest').mockImplementation(candidate => candidate === where);
  vi.spyOn(folder, 'getBoundingClientRect').mockReturnValue(new DOMRect(x - 50, y - 40, 100, 80));
  act(() => {
    draggable.vars.onDragStart!.call(draggable);
    draggable.vars.onDrag!.call(draggable);
    draggable.vars.onDragEnd!.call(draggable);
  });
}

beforeEach(() => {
  continuePastGate();
  localStorage.clear();
  localStorage.setItem('histor:desk-guide-off:mary-celeste', '1');
  localStorage.setItem(`histor:desk-hints:${CASE.id}`, '1');
  forgetShownThisLoad();
  stubMedia();
});
afterEach(() => {
  clearFlight();
  takeTabs();
  resetPhoneGate();
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  window.history.pushState({}, '', '/');
  document.documentElement.style.overflow = '';
});

describe('the open file let go', () => {
  test('on the floor: it closes and lies where it was let go, never pinned, on the first try', () => {
    seed({}, ['e-lifeboat']);
    renderAt(`${BASE}/files/e-lifeboat`);
    layOutFloor();
    dropOpenFile(FLOOR.left + 250, FLOOR.top + 150, target('floor'));
    expect(window.location.pathname).toBe(`${BASE}/files`);
    expect(saved().pins).toEqual({});
    expect(spots()['e-lifeboat']).toEqual({ fx: 0.25, fy: 0.5 });
  });

  test("on the board's empty space: a pinned file comes off its theory and lands at the floor's top edge", () => {
    seed({ 'e-lifeboat': THEORY }, ['e-lifeboat']);
    renderAt(`${BASE}/files/e-lifeboat`);
    layOutFloor();
    dropOpenFile(FLOOR.left + 600, FLOOR.top - 200, target('board'));
    expect(window.location.pathname).toBe(`${BASE}/files`);
    expect(saved().pins).toEqual({});
    expect(saved().opened).toEqual(['e-lifeboat']);
    expect(spots()['e-lifeboat']).toEqual({ fx: 0.6, fy: 0 });
  });

  test('past the edges, over nothing: kept inside the floor', () => {
    seed({}, ['e-lifeboat']);
    renderAt(`${BASE}/files/e-lifeboat`);
    layOutFloor();
    dropOpenFile(FLOOR.left - 400, FLOOR.top + FLOOR.height + 400, null);
    expect(window.location.pathname).toBe(`${BASE}/files`);
    expect(spots()['e-lifeboat']).toEqual({ fx: 0, fy: 1 });
  });

  test('on a theory: pinned, as before', () => {
    seed({}, ['e-lifeboat']);
    renderAt(`${BASE}/files/e-lifeboat`);
    layOutFloor();
    dropOpenFile(300, 200, target(THEORY));
    expect(saved().pins).toEqual({ 'e-lifeboat': THEORY });
    expect(spots()['e-lifeboat']).toBeUndefined();
  });
});

describe('"Back to the floor"', () => {
  test('a visible button closes the file, the same as Escape; nothing is pinned', () => {
    renderAt(`${BASE}/files/e-lifeboat`);
    fireEvent.click(screen.getByRole('button', { name: /Back to the floor/ }));
    expect(window.location.pathname).toBe(`${BASE}/files`);
    expect(saved().pins).toEqual({});
  });

  test('a pinned file says where it goes back to: the board', () => {
    seed({ 'e-lifeboat': THEORY }, ['e-lifeboat']);
    renderAt(`${BASE}/files/e-lifeboat`);
    expect(screen.getByRole('button', { name: /Back to the board/ })).toBeDefined();
  });
});
