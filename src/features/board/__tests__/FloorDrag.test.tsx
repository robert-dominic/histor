// @vitest-environment jsdom
// src/features/board/__tests__/FloorDrag.test.tsx
// Dragging a folder from the floor (Requirement 17): Draggables exist only for a mouse with full motion; each drop
// is turned into an outcome by dropOutcome; a folder dropped on the floor stays there for the visit; a sealed
// folder dropped on a note is read first, then pinned.
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
  const droppedAt = { current: new Map() };

  function renderFloor(state: InvestigationState = EMPTY) {
    droppedAt.current = new Map();
    onDrop.mockClear();
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
            droppedAt={droppedAt}
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

  test('a sealed folder dropped on a note: read first, then pinned (reveal-then-pin)', () => {
    stubMedia();
    renderFloor();
    const folder = folders()[2];
    dragTo(folder, screen.getByTestId(`note-${NOTE}`)).over();
    expect(onDrop).toHaveBeenCalledTimes(1);
    expect(onDrop.mock.calls[0][0]).toBe(folder.dataset.evidenceId);
    expect(onDrop.mock.calls[0][1]).toEqual({ kind: 'reveal-then-pin', target: NOTE });
    expect(onDrop.mock.calls[0][2]).toBe(folder);
  });

  test('a sealed folder dropped on the tray: read first, then set aside', () => {
    stubMedia();
    renderFloor();
    dragTo(folders()[0], screen.getByTestId('tray')).over();
    expect(onDrop.mock.calls[0][1]).toEqual({ kind: 'reveal-then-pin', target: 'none' });
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

  test('dropped back on the floor, a folder settles where it was let go, on top, and keeps that spot for the visit', () => {
    stubMedia();
    const { rerender } = renderFloor();
    const folder = folders()[4];
    const id = folder.dataset.evidenceId!;
    gsap.set(folder, { x: 200, y: 60 });
    dragTo(folder, document.querySelector('[data-board="floor"]')).over();
    finish(folder);
    expect(droppedAt.current.get(id)).toMatchObject({ x: 200, y: 60 });
    expect(Number(gsap.getProperty(folder, 'x'))).toBeCloseTo(200, 3);
    expect(Number(folder.style.zIndex)).toBeGreaterThan(23);
    expect(onDrop).not.toHaveBeenCalled();
    // The desk draws again (another file is pinned, say): the folder is still there.
    rerender(
      <MemoryRouter>
        <main>
          <Floor
            layout={deskLayout(CASE, { opened: [], pins: {}, verdict: null })}
            filesHref={`${BASE}/files`}
            theories={CASE.theories}
            droppedAt={droppedAt}
            onDrop={onDrop}
          />
        </main>
      </MemoryRouter>
    );
    expect(Number(gsap.getProperty(folderOf(id), 'x'))).toBeCloseTo(200, 3);
  });

  test('nothing is stored: a fresh visit puts every folder back where floorLayout puts it', () => {
    stubMedia();
    renderFloor();
    const folder = folders()[4];
    gsap.set(folder, { x: 200, y: 60 });
    dragTo(folder, document.querySelector('[data-board="floor"]')).over();
    expect(localStorage.getItem(KEY)).toBeNull();
    cleanup();
    renderFloor();
    expect(Number(gsap.getProperty(folders()[4], 'x'))).not.toBeCloseTo(200, 0);
  });
});

describe('a drop in the whole app', () => {
  beforeEach(() => {
    continuePastGate();
    localStorage.clear();
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

  test('a sealed folder on a note opens the file with the target waiting, then pins it once the reveal is read', async () => {
    renderDesk();
    const id = 'e-lifeboat';
    act(() => dragTo(folderOf(id), note()).over());
    expect(window.location.pathname).toBe(`${BASE}/files/${id}`);
    expect(saved()?.pins ?? {}).toEqual({});
    // The reveal runs; skipped, its moments play and the pin follows.
    const first = gsap.getTweensOf([...document.querySelectorAll<HTMLElement>('#file-title *')].find(e => e.children.length === 0)!)[0];
    const timeline = first.parent as gsap.core.Timeline;
    timeline.time(first.startTime() + 0.01, true);
    fireEvent.click(document.querySelector('[data-file="grip"]')!);
    // The cover closes, then the pin is made.
    act(() => finish(document.querySelector('[data-file="cover"]')!));
    expect(saved().pins).toEqual({ [id]: NOTE });
    await waitFor(() => expect(window.location.pathname).toBe(`${BASE}/files`));
    await waitFor(() => expect(window.location.pathname).toBe(`${BASE}/files`));
    await waitFor(() =>
      expect(document.querySelector(`[data-board="tabs"][data-theory-id="${NOTE}"] [data-evidence-id="${id}"]`)).not.toBeNull()
    );
    expect(saved().opened).toContain(id);
  });

  test('Escape while the dropped file is being read still pins it: the drop was the choice', () => {
    renderDesk();
    const id = 'e-sword';
    act(() => dragTo(folderOf(id), note()).over());
    fireEvent.keyDown(window, { key: 'Escape' });
    act(() => finish(document.querySelector('[data-file="cover"]')!));
    expect(saved().pins).toEqual({ [id]: NOTE });
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
