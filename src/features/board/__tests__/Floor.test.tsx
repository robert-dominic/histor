// @vitest-environment jsdom
// src/features/board/__tests__/Floor.test.tsx
// The desktop floor: every sealed file lies flat on it, placed by floorLayout; a file that was opened but not
// pinned lies there with its stamp; the folder under a mouse lifts; reduced motion just places them.
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import gsap from 'gsap';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import maryCeleste from '@/cases/mary-celeste/case';
import Floor from '@/features/board/Floor';
import { deskLayout } from '@/lib/desk';
import { Flip } from '@/features/board/flight';
import { floorLayout } from '@/lib/floor';
import type { InvestigationState } from '@/types/case';

const EMPTY: InvestigationState = { opened: [], pins: {}, verdict: null };
const SIZE = { width: 1100, height: 380 };

/** jsdom lays nothing out: give the floor, the folders and their tab and label sizes by hand. */
function stubLayout(size: { width: number; height: number } = SIZE) {
  const define = (name: string, get: (element: HTMLElement) => number) =>
    Object.defineProperty(HTMLElement.prototype, name, { configurable: true, get() { return get(this as HTMLElement); } });
  define('clientWidth', element => (element.dataset.board === 'floor' ? size.width : 0));
  define('clientHeight', element => (element.dataset.board === 'floor' ? size.height : 0));
  define('offsetWidth', element =>
    element.dataset.board === 'folder' ? 184 : element.dataset.folder === 'tab' ? 40 : element.dataset.folder === 'label' ? 120 : 0
  );
  define('offsetHeight', element =>
    element.dataset.board === 'folder' ? 130 : element.dataset.folder === 'tab' ? 16 : element.dataset.folder === 'label' ? 40 : 0
  );
  define('offsetLeft', element => (element.dataset.folder === 'tab' ? 12 : element.dataset.folder === 'label' ? 14 : 0));
  define('offsetTop', element => (element.dataset.folder === 'label' ? 28 : 0));
}
/** The folder box those sizes add up to: the tab and label together are 12..134 across and 0..68 down. */
const BOX = { width: 184, height: 130, label: { x: 12, y: 0, width: 122, height: 68 } };

function stubMouse({ reduced = false }: { reduced?: boolean } = {}) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches:
        query.includes('min-width: 1024px') ||
        query.includes('hover: hover') ||
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

const onDrop = vi.fn();
const onRearrange = vi.fn();
const ALL = maryCeleste.evidence.map(evidence => evidence.id);
const floorFor = (state: InvestigationState) => (
  <MemoryRouter>
    <Floor
      layout={deskLayout(maryCeleste, state)}
      filesHref="/case/mary-celeste/files"
      theories={maryCeleste.theories}
      dropped={new Map()}
      onRearrange={onRearrange}
      onDrop={onDrop}
    />
  </MemoryRouter>
);
function renderFloor(state: InvestigationState = EMPTY) {
  onDrop.mockClear();
  const layout = deskLayout(maryCeleste, state);
  const view = render(floorFor(state));
  return { ...view, layout };
}
/** Where every folder on the floor lies now. */
const placesNow = () =>
  new Map(
    folders().map(folder => [
      folder.dataset.evidenceId!,
      [gsap.getProperty(folder, 'x'), gsap.getProperty(folder, 'y'), gsap.getProperty(folder, 'rotation'), gsap.getProperty(folder, 'scale')],
    ])
  );
const folders = () => [...document.querySelectorAll<HTMLElement>('[data-board="folder"]')];

beforeEach(() => stubLayout());
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  for (const name of ['clientWidth', 'clientHeight', 'offsetWidth', 'offsetHeight', 'offsetLeft', 'offsetTop']) {
    Reflect.deleteProperty(HTMLElement.prototype, name);
  }
});

describe('Floor', () => {
  test('23 sealed folders lie on the floor, each a link with its number and title, and no status', () => {
    stubMouse();
    renderFloor();
    expect(folders()).toHaveLength(23);
    for (const folder of folders()) {
      expect(folder.querySelector('a[href]')).not.toBeNull();
      expect(folder.dataset.opened).toBe('false');
      expect(folder.querySelector('[data-stamp]')).toBeNull();
    }
    expect(document.querySelector('[data-board="floor"]')?.getAttribute('aria-labelledby')).toBe('floor-title');
  });

  test('each folder lies where floorLayout puts it, worked out for every file of the case', () => {
    stubMouse();
    renderFloor();
    const { places, scale } = floorLayout(ALL, SIZE, BOX);
    for (const place of places) {
      const folder = folders().find(item => item.dataset.evidenceId === place.id)!;
      expect(gsap.getProperty(folder, 'x')).toBeCloseTo(place.x, 3);
      expect(gsap.getProperty(folder, 'y')).toBeCloseTo(place.y, 3);
      expect(gsap.getProperty(folder, 'rotation')).toBeCloseTo(place.rotate, 3);
      expect(gsap.getProperty(folder, 'scale')).toBeCloseTo(scale, 3);
      expect(folder.style.zIndex).toBe(String(place.z));
    }
    expect(document.querySelector<HTMLElement>('[data-board="floor"]')?.dataset.placed).toBe('true');
  });

  test('a file opened but not pinned lies on the floor with its status stamp', () => {
    stubMouse();
    renderFloor({ opened: ['e-lifeboat'], pins: {}, verdict: null });
    const folder = folders().find(item => item.dataset.evidenceId === 'e-lifeboat')!;
    expect(folder.dataset.opened).toBe('true');
    expect(folder.querySelector('[data-stamp="record"]')?.textContent).toBe('Record');
    expect(folders().filter(item => item.querySelector('[data-stamp]') !== null)).toHaveLength(1);
  });

  test('a pinned file is not on the floor', () => {
    stubMouse();
    renderFloor({ opened: ['e-lifeboat'], pins: { 'e-lifeboat': maryCeleste.theories[0].id }, verdict: null });
    expect(folders()).toHaveLength(22);
    expect(document.querySelector('[data-evidence-id="e-lifeboat"]')).toBeNull();
  });

  test('opening, pinning and unpinning a file never moves any other file: a pinned file leaves a gap', () => {
    stubMouse();
    const { rerender } = renderFloor();
    const before = placesNow();
    const same = (except: string[]) => {
      for (const [id, place] of placesNow()) {
        if (!except.includes(id)) {
          expect(place).toEqual(before.get(id));
        }
      }
    };
    rerender(floorFor({ opened: ['e-lifeboat'], pins: {}, verdict: null }));
    same([]);
    rerender(floorFor({ opened: ['e-lifeboat'], pins: { 'e-lifeboat': maryCeleste.theories[0].id }, verdict: null }));
    expect(placesNow().has('e-lifeboat')).toBe(false);
    same([]);
    // Back on the floor: it returns to its own spot.
    rerender(floorFor({ opened: ['e-lifeboat'], pins: {}, verdict: null }));
    same([]);
    expect(placesNow().get('e-lifeboat')).toEqual(before.get('e-lifeboat'));
  });

  test('reduced motion places the folders with no movement', () => {
    stubMouse({ reduced: true });
    renderFloor();
    const { places } = floorLayout(ALL, SIZE, BOX);
    const first = places.find(place => place.id === folders()[0].dataset.evidenceId)!;
    expect(gsap.getProperty(folders()[0], 'x')).toBeCloseTo(first.x, 3);
    for (const folder of folders()) {
      expect(gsap.getTweensOf(folder)).toHaveLength(0);
    }
  });

  test('the folder under a mouse lifts: it grows a little, comes to the top, and settles back', () => {
    stubMouse();
    renderFloor();
    const folder = folders()[3];
    const before = Number(gsap.getProperty(folder, 'scale'));
    const resting = folder.style.zIndex;
    fireEvent.pointerOver(folder.querySelector('a')!, { relatedTarget: document.body });
    expect(folder.style.zIndex).toBe(String(ALL.length * 2 + 10));
    const tweens = gsap.getTweensOf(folder);
    expect(tweens.length).toBeGreaterThan(0);
    tweens.forEach(tween => tween.progress(1));
    expect(Number(gsap.getProperty(folder, 'scale'))).toBeCloseTo(before * 1.04, 6);
    fireEvent.pointerOut(folder.querySelector('a')!, { relatedTarget: document.body });
    gsap.getTweensOf(folder).forEach(tween => tween.progress(1));
    expect(Number(gsap.getProperty(folder, 'scale'))).toBeCloseTo(before, 6);
    expect(folder.style.zIndex).toBe(resting);
  });

  test('without a mouse, nothing lifts', () => {
    vi.stubGlobal('matchMedia', undefined);
    renderFloor();
    const folder = folders()[3];
    fireEvent.pointerOver(folder.querySelector('a')!, { relatedTarget: document.body });
    expect(gsap.getTweensOf(folder)).toHaveLength(0);
  });

  test('the shadow of a lifted folder is a layer, not a shadow that changes', () => {
    stubMouse();
    renderFloor();
    const layer = folders()[0].querySelector('[data-folder="lift"]') as HTMLElement;
    expect(layer.getAttribute('aria-hidden')).toBe('true');
  });

  test('when the floor changes size, the folders move to their new places', () => {
    stubMouse();
    let notify: () => void = () => undefined;
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(callback: () => void) {
          notify = callback;
        }
        observe() {}
        disconnect() {}
      }
    );
    // jsdom has no boxes to move between, so Flip is only watched: it must be asked to move them with `layout`.
    const getState = vi.spyOn(Flip, 'getState').mockImplementation(() => ({}) as never);
    const flip = vi.spyOn(Flip, 'from').mockImplementation(() => gsap.timeline());
    renderFloor();
    const first = folders()[0];
    const wide = Number(gsap.getProperty(first, 'x'));
    expect(flip).not.toHaveBeenCalled();
    stubLayout({ width: 900, height: 330 });
    act(() => notify());
    expect(flip).toHaveBeenCalledTimes(1);
    expect(flip.mock.calls[0][1]).toMatchObject({ ease: 'power2.inOut', duration: 0.5 });
    flip.mockRestore();
    getState.mockRestore();
    const narrow = floorLayout(ALL, { width: 900, height: 330 }, BOX).places.find(place => place.id === first.dataset.evidenceId)!;
    expect(Number(gsap.getProperty(first, 'x'))).toBeCloseTo(narrow.x, 3);
    expect(narrow.x).not.toBeCloseTo(wide, 3);
  });
});
