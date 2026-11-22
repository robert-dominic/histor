// @vitest-environment jsdom
// src/features/board/__tests__/drag.test.ts
// Dragging is an extra: it exists only on a desktop with a fine pointer and full motion, and a drop pins the file
// to the theory (or the tray) it was dropped on. The drop rule is tested here without a pointer.
import { afterEach, describe, expect, test, vi } from 'vitest';
import maryCeleste from '@/cases/mary-celeste/case';
import { FINE_POINTER_QUERY, canDrag, dropTargetFor, dropTargetOf, dropTargets } from '@/features/board/drag';
import { DESKTOP_QUERY } from '@/lib/use-media-query';

const THEORIES = maryCeleste.theories;

/** A matchMedia that matches exactly the queries given. */
function stubMedia(matching: string[]) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches: matching.includes(query),
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

const FULL = '(prefers-reduced-motion: no-preference)';
const REDUCED = '(prefers-reduced-motion: reduce)';

function target(value: string): HTMLElement {
  const element = document.createElement('div');
  element.setAttribute('data-drop-target', value);
  return element;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('canDrag', () => {
  test('a desktop with a fine pointer and full motion can drag', () => {
    stubMedia([DESKTOP_QUERY, FINE_POINTER_QUERY, FULL]);
    expect(canDrag()).toBe(true);
  });

  test('not with reduced motion', () => {
    stubMedia([DESKTOP_QUERY, FINE_POINTER_QUERY, REDUCED]);
    expect(canDrag()).toBe(false);
  });

  test('not with a coarse pointer (touch)', () => {
    stubMedia([DESKTOP_QUERY, FULL]);
    expect(canDrag()).toBe(false);
  });

  test('not below the desktop width', () => {
    stubMedia([FINE_POINTER_QUERY, FULL]);
    expect(canDrag()).toBe(false);
  });

  test('not without matchMedia at all', () => {
    vi.stubGlobal('matchMedia', undefined);
    expect(canDrag()).toBe(false);
  });
});

describe('dropping', () => {
  test('a theory note names its theory, the tray names "none", anything else is no target', () => {
    expect(dropTargetOf(target(THEORIES[0].id), THEORIES)).toBe(THEORIES[0].id);
    expect(dropTargetOf(target('none'), THEORIES)).toBe('none');
    expect(dropTargetOf(target('t-no-such-theory'), THEORIES)).toBeNull();
    expect(dropTargetOf(document.createElement('div'), THEORIES)).toBeNull();
    expect(dropTargetOf(null, THEORIES)).toBeNull();
  });

  test('dropTargetFor names where a drag ended', () => {
    const at = { x: 40, y: 12 };
    expect(dropTargetFor(target(THEORIES[0].id), THEORIES, at)).toEqual({ kind: 'theory', theoryId: THEORIES[0].id });
    expect(dropTargetFor(target('none'), THEORIES, at)).toEqual({ kind: 'tray' });
    expect(dropTargetFor(target('board'), THEORIES, at)).toEqual({ kind: 'board' });
    expect(dropTargetFor(target('floor'), THEORIES, at)).toEqual({ kind: 'floor', x: 40, y: 12 });
    expect(dropTargetFor(target('t-no-such-theory'), THEORIES, at)).toEqual({ kind: 'nothing' });
    expect(dropTargetFor(null, THEORIES, at)).toEqual({ kind: 'nothing' });
  });
  test('the drop targets are ranked: notes, then the tray, then the board, then the floor', () => {
    document.body.innerHTML =
      '<main><section data-drop-target="board"></section><section data-drop-target="floor"></section>' +
      '<article data-drop-target="t-one"></article><aside data-drop-target="none"></aside></main>';
    expect(dropTargets().map(element => element.getAttribute('data-drop-target'))).toEqual(['t-one', 'none', 'board', 'floor']);
    document.body.innerHTML = '';
  });
});
