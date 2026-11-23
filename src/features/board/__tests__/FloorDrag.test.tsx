// @vitest-environment jsdom
// src/features/board/__tests__/FloorDrag.test.tsx
// Dragging a folder from the floor (Requirement 17): Draggables exist only for a mouse with full motion; each drop
// is turned into an outcome by dropOutcome; a folder dropped on the floor stays there, and the desk keeps the spot
// in storage; a sealed folder dropped on a note is pinned at once, still sealed.
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import gsap from 'gsap';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import App from '@/App';
import maryCeleste from '@/cases/mary-celeste/case';
import Floor from '@/features/board/Floor';
import { Draggable } from '@/features/board/drag';
import { forgetShownThisLoad } from '@/features/board/hints';
import { deskLayout } from '@/lib/desk';
import type { DroppedSpot } from '@/lib/floor';
import { floorKey } from '@/lib/floor-positions';
import { continuePastGate, resetPhoneGate } from '@/lib/phone-gate';
import { DESKTOP_QUERY } from '@/lib/use-media-query';
import type { InvestigationState } from '@/types/case';

vi.setConfig({ testTimeout: 15_000 });
const CASE = maryCeleste;
const BASE = `/case/${CASE.id}`;
const KEY = `histor:case:${CASE.id}`;
const NOTE = CASE.theories[1].id;

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

/** jsdom lays nothing out: the floor and its folders get sizes by hand. */
function stubLayout() {
  const define = (name: string, get: (element: HTMLElement) => number) =>
    Object.defineProperty(HTMLElement.prototype, name, { configurable: true, get() { return get(this as HTMLElement); } });
  define('clientWidth', element => (element.dataset.board === 'floor' ? 1100 : 0));
  define('clientHeight', element => (element.dataset.board === 'floor' ? 380 : 0));
  define('offsetWidth', element => (element.dataset.board === 'folder' ? 184 : element.dataset.folder ? 60 : 0));
  define('offsetHeight', element => (element.dataset.board === 'folder' ? 130 : element.dataset.folder ? 20 : 0));
}
function unstubLayout() {
  for (const name of ['clientWidth', 'clientHeight', 'offsetWidth', 'offsetHeight']) {
    Reflect.deleteProperty(HTMLElement.prototype, name);
  }
}

const folders = () => [...document.querySelectorAll<HTMLElement>('[data-board="folder"]')];
const folderOf = (id: string) => folders().find(folder => folder.dataset.evidenceId === id)!;

/** Drags `element` to `where` (the drop target element it is over, or null for nothing) and lets go. */
function dragTo(element: HTMLElement, where: Element | null) {
  const draggable = Draggable.get(element);
  vi.spyOn(draggable, 'hitTest').mockImplementation(target => target === where);
  draggable.vars.onDragStart!.call(draggable);
  draggable.vars.onDrag!.call(draggable);
  const over = () => draggable.vars.onDragEnd!.call(draggable);
  return { over, draggable };
}
const finish = (element: Element) => gsap.getTweensOf(element).forEach(tween => tween.progress(1));

describe('Draggables on the floor', () => {
  const EMPTY: InvestigationState = { opened: [], pins: {}, verdict: null };
  const onDrop = vi.fn();
  let dropped = new Map<string, DroppedSpot>();
  const onRearrange = vi.fn((id: string, spot: DroppedSpot) => {
    dropped.delete(id);
    dropped.set(id, spot);
  });

  function renderFloor(state: InvestigationState = EMPTY) {
    dropped = new Map();
    onDrop.mockClear();
    onRearrange.mockClear();
    return render(
      <MemoryRouter>
        <main>
          {CASE.theories.map(theory => (
            <article key={theory.id} data-drop-target={theory.id} data-testid={`note-${theory.id}`} />
          ))}
          <aside data-drop-target="none" data-testid="tray" />
          <section data-drop-target="board" data-testid="board" />
          <Floor
            layout={deskLayout(CASE, state)}
            filesHref={`${BASE}/files`}
            theories={CASE.theories}
            dropped={dropped}
            onRearrange={onRearrange}
            onDrop={onDrop}
          />
        </main>
      </MemoryRouter>
    );
  }
  beforeEach(stubLayout);
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    unstubLayout();
  });

  test('every folder is draggable for a mouse with full motion', () => {
    stubMedia();
    renderFloor();
    expect(folders()).toHaveLength(23);
    for (const folder of folders()) {
      expect(Draggable.get(folder)).toBeDefined();
    }
  });

  test.each([
    ['reduced motion', { reduced: true }],
    ['a coarse pointer', { mouse: false }],
  ])('no Draggable under %s', (_label, options) => {
    stubMedia(options);
    renderFloor();
    for (const folder of folders()) {
      expect(Draggable.get(folder)).toBeUndefined();
    }
  });

  test('a sealed folder over a note shrinks to about 55% and fades, and the note lights up', () => {
    stubMedia();
    renderFloor();
    const folder = folders()[2];
    const note = screen.getByTestId(`note-${NOTE}`);
    const { over } = dragTo(folder, note);
    expect(note.getAttribute('data-drop-hot')).toBe('true');
    finish(folder);
    expect(Number(gsap.getProperty(folder, 'scale'))).toBeCloseTo(0.55, 3);
    expect(Number(gsap.getProperty(folder, 'opacity'))).toBeCloseTo(0.85, 3);
    over();
    expect(note.getAttribute('data-drop-hot')).toBeNull();
  });

  test('over the tray or the board it keeps its size, and only a note shrinks it', () => {
    stubMedia();
    renderFloor();
    const folder = folders()[2];
    const resting = Number(gsap.getProperty(folder, 'scale'));
    dragTo(folder, screen.getByTestId('board'));
    finish(folder);
    expect(Number(gsap.getProperty(folder, 'scale'))).toBeCloseTo(resting, 3);
  });

  test('a sealed folder dropped on a note: pinned at once, without opening it', () => {
    stubMedia();
    renderFloor();
    const folder = folders()[2];
    dragTo(folder, screen.getByTestId(`note-${NOTE}`)).over();
    expect(onDrop).toHaveBeenCalledTimes(1);
    expect(onDrop.mock.calls[0][0]).toBe(folder.dataset.evidenceId);
    expect(onDrop.mock.calls[0][1]).toEqual({ kind: 'pin', target: NOTE });
    expect(onDrop.mock.calls[0][2]).toBe(folder);
  });

  test('a sealed folder dropped on the tray: set aside at once, still sealed', () => {
    stubMedia();
    renderFloor();
    dragTo(folders()[0], screen.getByTestId('tray')).over();
    expect(onDrop.mock.calls[0][1]).toEqual({ kind: 'pin', target: 'none' });
  });

  test('a folder dropped on the board outside any note opens', () => {
    stubMedia();
    renderFloor();
    dragTo(folders()[0], screen.getByTestId('board')).over();
    expect(onDrop.mock.calls[0][1]).toEqual({ kind: 'open' });
  });

  test('an opened folder dropped on a note is pinned at once', () => {
    stubMedia();
    renderFloor({ opened: ['e-sword'], pins: {}, verdict: null });
    dragTo(folderOf('e-sword'), screen.getByTestId(`note-${NOTE}`)).over();
    expect(onDrop.mock.calls[0][1]).toEqual({ kind: 'pin', target: NOTE });
  });

  test('dropped on nothing, a folder goes back to its place and nothing happens', () => {
    stubMedia();
    renderFloor();
    const folder = folders()[4];
    const home = { x: Number(gsap.getProperty(folder, 'x')), y: Number(gsap.getProperty(folder, 'y')) };
    gsap.set(folder, { x: home.x + 300, y: home.y - 200 });
    dragTo(folder, null).over();
    finish(folder);
    expect(onDrop).not.toHaveBeenCalled();
    expect(Number(gsap.getProperty(folder, 'x'))).toBeCloseTo(home.x, 3);
    expect(Number(gsap.getProperty(folder, 'y'))).toBeCloseTo(home.y, 3);
  });

  test('dropped back on the floor, a folder settles where it was let go, on top, and keeps that spot; no other moves', () => {
    stubMedia();
    const { rerender } = renderFloor();
    const folder = folders()[4];
    const id = folder.dataset.evidenceId!;
    const others = folders()
      .filter(item => item !== folder)
      .map(item => [gsap.getProperty(item, 'x'), gsap.getProperty(item, 'y'), gsap.getProperty(item, 'rotation')]);
    gsap.set(folder, { x: 200, y: 60 });
    dragTo(folder, document.querySelector('[data-board="floor"]')).over();
    finish(folder);
    // The spot is the folder's centre, as a share of the floor (1100 × 380).
    expect(onRearrange).toHaveBeenCalledTimes(1);
    expect(dropped.get(id)?.fx).toBeCloseTo((200 + 92) / 1100, 3);
    expect(dropped.get(id)?.fy).toBeCloseTo((60 + 65) / 380, 3);
    expect(Number(gsap.getProperty(folder, 'x'))).toBeCloseTo(200, 0);
    expect(Number(folder.style.zIndex)).toBeGreaterThanOrEqual(23);
    expect(onDrop).not.toHaveBeenCalled();
    expect(
      folders()
        .filter(item => item !== folder)
        .map(item => [gsap.getProperty(item, 'x'), gsap.getProperty(item, 'y'), gsap.getProperty(item, 'rotation')])
    ).toEqual(others);
    // The desk draws again (another file is pinned, say): the folder is still there.
    rerender(
      <MemoryRouter>
        <main>
          <Floor
            layout={deskLayout(CASE, { opened: [], pins: {}, verdict: null })}
            filesHref={`${BASE}/files`}
            theories={CASE.theories}
            dropped={dropped}
            onRearrange={onRearrange}
            onDrop={onDrop}
          />
        </main>
      </MemoryRouter>
    );
    expect(Number(gsap.getProperty(folderOf(id), 'x'))).toBeCloseTo(200, 0);
  });

  test('a folder the desk remembers lies at its spot from the first placement', () => {
    stubMedia();
    dropped = new Map();
    render(
      <MemoryRouter>
        <main>
          <Floor
            layout={deskLayout(CASE, EMPTY)}
            filesHref={`${BASE}/files`}
            theories={CASE.theories}
            dropped={new Map([['e-galley', { fx: 0.5, fy: 0.5 }]])}
            onRearrange={onRearrange}
            onDrop={onDrop}
          />
        </main>
      </MemoryRouter>
    );
    expect(Number(gsap.getProperty(folderOf('e-galley'), 'x'))).toBeCloseTo(550 - 92, 3);
    expect(Number(gsap.getProperty(folderOf('e-galley'), 'y'))).toBeCloseTo(190 - 65, 3);
  });
});

describe('a drop in the whole app', () => {
  beforeEach(() => {
    continuePastGate();
    localStorage.clear();
  // The guide opens on every arrival; these tests are about the desk under it.
  localStorage.setItem('histor:desk-guide-off:mary-celeste', '1');
    localStorage.setItem(`histor:desk-hints:${CASE.id}`, '1');
    forgetShownThisLoad();
    stubMedia();
    stubLayout();
  });
  afterEach(() => {
    resetPhoneGate();
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    unstubLayout();
    window.history.pushState({}, '', '/');
    document.documentElement.style.overflow = '';
  });
  const renderDesk = () => {
    window.history.pushState({}, '', `${BASE}/files`);
    return render(<App />);
  };
  const saved = () => JSON.parse(localStorage.getItem(KEY) ?? 'null');
  const note = () => document.querySelector<HTMLElement>(`[data-board="theory"][data-drop-target="${NOTE}"]`)!;

  test('a folder dropped on the floor is kept under its own key, the investigation untouched, and a reload keeps it', () => {
    const view = renderDesk();
    const folder = folderOf('e-galley');
    gsap.set(folder, { x: 200, y: 60 });
    act(() => dragTo(folder, document.querySelector('[data-board="floor"]')).over());
    const stored = JSON.parse(localStorage.getItem(floorKey(CASE.id)) ?? '[]') as [string, DroppedSpot][];
    expect(stored.map(([id]) => id)).toEqual(['e-galley']);
    expect(saved() ?? { opened: [], pins: {} }).toMatchObject({ opened: [], pins: {} });
    view.unmount();
    renderDesk();
    expect(Number(gsap.getProperty(folderOf('e-galley'), 'x'))).toBeCloseTo(200, 0);
  });

  test('a sealed folder on a note is pinned at once: no file opens, and it stays sealed', async () => {
    renderDesk();
    const id = 'e-lifeboat';
    act(() => dragTo(folderOf(id), note()).over());
    expect(window.location.pathname).toBe(`${BASE}/files`);
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    expect(saved().pins).toEqual({ [id]: NOTE });
    expect(saved().opened).not.toContain(id);
    await waitFor(() =>
      expect(document.querySelector(`[data-board="tabs"][data-theory-id="${NOTE}"] [data-evidence-id="${id}"]`)).not.toBeNull()
    );
  });

  test('a folder dropped on the board outside any note opens for reading, with nothing waiting', () => {
    renderDesk();
    act(() => dragTo(folderOf('e-lifeboat'), document.querySelector('[data-board="board"]')).over());
    expect(window.location.pathname).toBe(`${BASE}/files/e-lifeboat`);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(window.location.pathname).toBe(`${BASE}/files`);
    expect(saved()?.pins ?? {}).toEqual({});
  });

  test('an opened folder dropped on a note is pinned at once, and hangs under it', () => {
    localStorage.setItem(KEY, JSON.stringify({ opened: ['e-sword'], pins: {}, verdict: null }));
    renderDesk();
    act(() => dragTo(folderOf('e-sword'), note()).over());
    expect(saved().pins).toEqual({ 'e-sword': NOTE });
    expect(window.location.pathname).toBe(`${BASE}/files`);
    expect(document.querySelector(`[data-board="tabs"][data-theory-id="${NOTE}"] [data-evidence-id="e-sword"]`)).not.toBeNull();
    expect(document.querySelector('[data-board="floor"] [data-evidence-id="e-sword"]')).toBeNull();
  });
});
