// @vitest-environment jsdom
// src/features/board/__tests__/TabDrag.test.tsx
// A pinned file can be dragged straight from its note or from the tray, without opening it: to another theory
// (re-pin), to the tray, or back to the floor (unpin). Threads redraw smoothly, and the other tabs move with Flip.
import { act, cleanup, render } from '@testing-library/react';
import gsap from 'gsap';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import App from '@/App';
import maryCeleste from '@/cases/mary-celeste/case';
import { Draggable } from '@/features/board/drag';
import { Flip, clearFlight, deskLayoutSettled, takeTabs } from '@/features/board/flight';
import { THREAD_SAG } from '@/features/board/Threads';
import { forgetShownThisLoad } from '@/features/board/hints';
import { continuePastGate, resetPhoneGate } from '@/lib/phone-gate';
import { DESKTOP_QUERY } from '@/lib/use-media-query';

vi.setConfig({ testTimeout: 15_000 });
const CASE = maryCeleste;
const BASE = `/case/${CASE.id}`;
const KEY = `histor:case:${CASE.id}`;
const [A, B] = [CASE.theories[0].id, CASE.theories[1].id];

function stubMedia({ mouse = true, reduced = false }: { mouse?: boolean; reduced?: boolean } = {}) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches:
        query === DESKTOP_QUERY ||
        (query.includes('hover: hover') && mouse) ||
        (query.includes('prefers-reduced-motion: reduce') ? reduced : query.includes('no-preference') ? !reduced : false),
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
function seed(pins: Record<string, string>) {
  localStorage.setItem(KEY, JSON.stringify({ opened: Object.keys(pins), pins, verdict: null }));
}
function renderDesk() {
  window.history.pushState({}, '', `${BASE}/files`);
  return render(<App />);
}
const saved = () => JSON.parse(localStorage.getItem(KEY) ?? 'null');
const tab = (id: string) => document.querySelector<HTMLElement>(`[data-board="tab"][data-evidence-id="${id}"]`)!;
const noteOf = (theoryId: string) => document.querySelector<HTMLElement>(`[data-board="theory"][data-drop-target="${theoryId}"]`)!;
/** A theory's thread on the desktop desk. */
const threadOf = (theoryId: string) => document.querySelector<SVGPathElement>(`[data-board="threads"] path[data-thread-id="${theoryId}"]`);

/** Drags `element` over `where` (a drop target element, or null for nothing) and lets go. */
function drop(element: HTMLElement, where: Element | null) {
  const draggable = Draggable.get(element);
  vi.spyOn(draggable, 'hitTest').mockImplementation(target => target === where);
  act(() => {
    draggable.vars.onDragStart!.call(draggable);
    draggable.vars.onDrag!.call(draggable);
    draggable.vars.onDragEnd!.call(draggable);
  });
}

beforeEach(() => {
  continuePastGate();
  localStorage.clear();
  // The guide opens on every arrival; these tests are about the desk under it.
  localStorage.setItem('histor:desk-guide-off:mary-celeste', '1');
  localStorage.setItem(`histor:desk-hints:${CASE.id}`, '1');
  forgetShownThisLoad();
  stubMedia();
});
afterEach(() => {
  // A flight and the tab positions are recorded for a moment: do not leave them for the next test.
  clearFlight();
  takeTabs();
  resetPhoneGate();
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  window.history.pushState({}, '', '/');
  document.documentElement.style.overflow = '';
});

describe('dragging tabs', () => {
  test('tabs on a note and in the tray are draggable for a mouse with full motion, and for nothing else', () => {
    seed({ 'e-lifeboat': A, 'e-sword': 'none' });
    const { unmount } = renderDesk();
    expect(Draggable.get(tab('e-lifeboat'))).toBeDefined();
    expect(Draggable.get(tab('e-sword'))).toBeDefined();
    unmount();
    vi.unstubAllGlobals();
    stubMedia({ reduced: true });
    renderDesk();
    expect(Draggable.get(tab('e-lifeboat'))).toBeUndefined();
    expect(Draggable.get(tab('e-sword'))).toBeUndefined();
  });

  test('a tab dropped on another theory is re-pinned, and hangs under it', () => {
    seed({ 'e-lifeboat': A });
    renderDesk();
    drop(tab('e-lifeboat'), noteOf(B));
    expect(saved().pins).toEqual({ 'e-lifeboat': B });
    expect(window.location.pathname).toBe(`${BASE}/files`);
    expect(document.querySelector(`[data-board="tabs"][data-theory-id="${B}"] [data-evidence-id="e-lifeboat"]`)).not.toBeNull();
    expect(document.querySelector(`[data-board="tabs"][data-theory-id="${A}"] [data-evidence-id="e-lifeboat"]`)).toBeNull();
  });

  test('a tab dropped on its own note goes back and nothing changes', () => {
    seed({ 'e-lifeboat': A });
    renderDesk();
    const element = tab('e-lifeboat');
    gsap.set(element, { x: 90, y: 40 });
    drop(element, noteOf(A));
    gsap.getTweensOf(element).forEach(t => t.progress(1));
    expect(saved().pins).toEqual({ 'e-lifeboat': A });
    expect(Number(gsap.getProperty(element, 'x'))).toBe(0);
    expect(Number(gsap.getProperty(element, 'y'))).toBe(0);
  });

  test('a tab dropped on the tray is set aside: pinned to "none", with no thread', () => {
    seed({ 'e-lifeboat': A });
    renderDesk();
    drop(tab('e-lifeboat'), document.querySelector('[data-board="aside"]'));
    expect(saved().pins).toEqual({ 'e-lifeboat': 'none' });
    expect(document.querySelector('[data-board="aside"] [data-evidence-id="e-lifeboat"]')).not.toBeNull();
    expect(document.querySelectorAll('[data-board="threads"] path[data-thread-id]')).toHaveLength(0);
  });

  test('a tab dropped on the floor is unpinned: still opened, lying where it was dropped', () => {
    seed({ 'e-lifeboat': A });
    renderDesk();
    drop(tab('e-lifeboat'), document.querySelector('[data-board="floor"]'));
    expect(saved().pins).toEqual({});
    expect(saved().opened).toEqual(['e-lifeboat']);
    const folder = document.querySelector<HTMLElement>('[data-board="floor"] [data-evidence-id="e-lifeboat"]')!;
    expect(folder).not.toBeNull();
    expect(folder.querySelector('[data-stamp="record"]')).not.toBeNull();
  });

  test('a set-aside file in the tray is dragged the same way: to a theory, or to the floor', () => {
    seed({ 'e-lifeboat': 'none', 'e-sword': 'none' });
    renderDesk();
    drop(tab('e-lifeboat'), noteOf(B));
    expect(saved().pins).toEqual({ 'e-lifeboat': B, 'e-sword': 'none' });
    drop(tab('e-sword'), document.querySelector('[data-board="floor"]'));
    expect(saved().pins).toEqual({ 'e-lifeboat': B });
  });

  test("a tab dropped on the board's empty space goes back to the floor (review-fixes 4)", () => {
    seed({ 'e-lifeboat': A });
    renderDesk();
    drop(tab('e-lifeboat'), document.querySelector('main [data-drop-target="board"]'));
    expect(saved().pins).toEqual({});
    expect(document.querySelector('[data-board="floor"] [data-evidence-id="e-lifeboat"]')).not.toBeNull();
  });

  test('a tab dropped on nothing goes back to the floor too (review-fixes 4)', () => {
    seed({ 'e-sword': 'none' });
    renderDesk();
    drop(tab('e-sword'), null);
    expect(saved().pins).toEqual({});
  });

  test('the drag does not open the file', () => {
    seed({ 'e-lifeboat': A });
    renderDesk();
    drop(tab('e-lifeboat'), noteOf(B));
    expect(window.location.pathname).toBe(`${BASE}/files`);
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });
});

describe('threads and the other tabs when a pin changes', () => {
  test('one thread per theory: a file moving to another note leaves its old thread alone and draws the new one in', () => {
    seed({ 'e-lifeboat': A, 'e-sword': A });
    renderDesk();
    expect(document.querySelectorAll('[data-board="threads"] path')).toHaveLength(1);
    expect(threadOf(A)).not.toBeNull();
    drop(tab('e-lifeboat'), noteOf(B));
    // A still has e-sword: its thread is not touched. B has its own thread now, and it draws in from the note.
    expect(gsap.getTweensOf(threadOf(A))).toHaveLength(0);
    expect(threadOf(B)).not.toBeNull();
    const drawing = gsap.getTweensOf(threadOf(B)).find(tween => tween.vars.attr !== undefined);
    expect(drawing).toBeDefined();
    expect(drawing!.vars.ease).toBe('power2.inOut');
  });

  test('a theory whose last file is set aside loses its thread: it fades out where it hung, and the tray has none', () => {
    seed({ 'e-lifeboat': A });
    renderDesk();
    expect(document.querySelectorAll('[data-board="threads"] path')).toHaveLength(1);
    const before = threadOf(A)!.getAttribute('d') ?? 'M 0 0';
    threadOf(A)!.setAttribute('d', before);
    drop(tab('e-lifeboat'), document.querySelector('[data-board="aside"]'));
    // The real thread is gone at once; its copy fades out.
    const ghosts = [...document.querySelectorAll<SVGPathElement>('[data-board="threads"] path:not([data-thread-id])')];
    expect(ghosts).toHaveLength(1);
    const fade = gsap.getTweensOf(ghosts[0])[0];
    expect(fade.vars.opacity).toBe(0);
    act(() => {
      fade.progress(1);
    });
    expect(document.querySelectorAll('[data-board="threads"] path')).toHaveLength(0);
  });

  test("a thread runs from the note's pin to the pin at the top of its cascade, with the one gentle sag", () => {
    seed({ 'e-lifeboat': A, 'e-sword': A });
    const boxAt = (x: number, y: number) => ({ left: x, top: y, width: 0, height: 0, right: x, bottom: y, x, y, toJSON: () => ({}) }) as DOMRect;
    renderDesk();
    const anchor = document.querySelector(`[data-board="theory"][data-theory-id="${A}"] [data-board="anchor"]`)!;
        const end = document.querySelector(`[data-board="cascade"][data-theory-id="${A}"] [data-board="cascade-pin"]`)!;
    vi.spyOn(anchor, 'getBoundingClientRect').mockReturnValue(boxAt(100, 40));
    vi.spyOn(end, 'getBoundingClientRect').mockReturnValue(boxAt(120, 140));
    // Measured again once a move on the desk has finished.
    act(() => deskLayoutSettled());
    expect(threadOf(A)!.getAttribute('d')).toBe(`M 100 40 Q 110 ${90 + THREAD_SAG} 120 140`);
    vi.spyOn(end, 'getBoundingClientRect').mockReturnValue(boxAt(300, 160));
    act(() => deskLayoutSettled());
    expect(threadOf(A)!.getAttribute('d')).toBe(`M 100 40 Q 200 ${100 + THREAD_SAG} 300 160`);
  });

  test('the other tabs move to their new places with Flip, using the layout token', () => {
    seed({ 'e-lifeboat': A, 'e-sword': A, 'e-galley': A });
    const from = vi.spyOn(Flip, 'from').mockImplementation(() => gsap.timeline());
    renderDesk();
    drop(tab('e-lifeboat'), noteOf(B));
    const layoutMoves = from.mock.calls.filter(call => (call[1] as { duration?: number }).duration === 0.5);
    expect(layoutMoves).toHaveLength(1);
    expect(layoutMoves[0][1]).toMatchObject({ ease: 'power2.inOut', duration: 0.5 });
    const moved = (layoutMoves[0][1] as { targets: HTMLElement[] }).targets.map(el => el.dataset.evidenceId);
    expect(moved).toContain('e-sword');
    expect(moved).toContain('e-galley');
    expect(moved).not.toContain('e-lifeboat');
  });
});

describe('drop where I drop (story-steps 5.1)', () => {
  const floorSpots = () => JSON.parse(localStorage.getItem(`${KEY}:floor`) ?? '[]') as [string, { fx: number; fy: number }][];
  const rect = (left: number, top: number, width: number, height: number) =>
    ({ left, top, width, height, right: left + width, bottom: top + height, x: left, y: top, toJSON: () => ({}) }) as DOMRect;

  test('a pinned file dragged to the floor lands where it was let go, and that spot is saved', () => {
    seed({ 'e-lifeboat': A });
    renderDesk();
    const floor = document.querySelector<HTMLElement>('[data-board="floor"]')!;
    vi.spyOn(floor, 'getBoundingClientRect').mockReturnValue(rect(100, 400, 1000, 300));
    Object.defineProperty(floor, 'clientWidth', { configurable: true, value: 1000 });
    Object.defineProperty(floor, 'clientHeight', { configurable: true, value: 300 });
    const strip = tab('e-lifeboat');
    // Let go with its centre at (650, 520) on the screen: (550, 120) on the floor.
    vi.spyOn(strip, 'getBoundingClientRect').mockReturnValue(rect(600, 500, 100, 40));
    drop(strip, floor);
    expect(saved().pins).toEqual({});
    expect(floorSpots()).toEqual([['e-lifeboat', { fx: 0.55, fy: 0.4 }]]);
  });

  test('it is measured as it is let go, before the cascade puts its list back', () => {
    seed({ 'e-lifeboat': A });
    renderDesk();
    const floor = document.querySelector<HTMLElement>('[data-board="floor"]')!;
    vi.spyOn(floor, 'getBoundingClientRect').mockReturnValue(rect(0, 0, 1000, 300));
    Object.defineProperty(floor, 'clientWidth', { configurable: true, value: 1000 });
    Object.defineProperty(floor, 'clientHeight', { configurable: true, value: 300 });
    const strip = tab('e-lifeboat');
    // Where it is while carried, then (once the list is put back) somewhere else.
    const box = vi.spyOn(strip, 'getBoundingClientRect').mockReturnValue(rect(200, 100, 100, 40));
    const list = strip.closest<HTMLElement>('[data-board="tabs"]')!;
    const observer = new MutationObserver(() => {
      if (list.style.translate === '') {
        box.mockReturnValue(rect(800, 280, 100, 40));
      }
    });
    observer.observe(list, { attributes: true, attributeFilter: ['style'] });
    drop(strip, floor);
    observer.disconnect();
    expect(floorSpots()).toEqual([['e-lifeboat', { fx: 0.25, fy: 0.4 }]]);
  });

  test('landing on the floor, a folder settles where it lies: the landing never moves it to the top', () => {
    seed({ 'e-lifeboat': A });
    renderDesk();
    const flips = vi.spyOn(Flip, 'from');
    const landings = vi.spyOn(gsap, 'fromTo');
    drop(tab('e-lifeboat'), document.querySelector('[data-board="floor"]'));
    const folder = document.querySelector<HTMLElement>('[data-board="floor"] [data-evidence-id="e-lifeboat"]')!;
    gsap.set(folder, { y: 137 });
    const flight = flips.mock.calls.find(call => call[1]?.targets === folder);
    expect(flight).toBeDefined();
    act(() => {
      (flight![1]!.onComplete as () => void)();
    });
    const landing = landings.mock.calls.find(call => call[0] === folder)!;
    expect(landing[1]).toMatchObject({ y: 133 });
    expect(landing[2]).toMatchObject({ y: 137 });
  });

  test('"Back to the floor" from the Pin menu sends it to its own spot, forgetting where it was last dropped', async () => {
    seed({ 'e-lifeboat': A });
    localStorage.setItem(`${KEY}:floor`, JSON.stringify([['e-lifeboat', { fx: 0.9, fy: 0.9 }]]));
    window.history.pushState({}, '', `${BASE}/files/e-lifeboat`);
    render(<App />);
    const { fireEvent, within } = await import('@testing-library/react');
    const file = document.querySelector<HTMLElement>('[data-file="folder"]')!;
    fireEvent.click(within(file).getByRole('button', { name: /^Pin to/ }));
    const menu = file.querySelector<HTMLElement>('[role="menu"]') ?? [...document.querySelectorAll<HTMLElement>('[role="menu"]')].at(-1)!;
    fireEvent.click(within(menu).getByRole('menuitemradio', { name: /Back to the floor/ }));
    expect(saved().pins).toEqual({});
    expect(floorSpots()).toEqual([]);
  });
});

