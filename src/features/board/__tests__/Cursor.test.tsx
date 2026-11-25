// @vitest-environment jsdom
// src/features/board/__tests__/Cursor.test.tsx
// The cursor (the fix list): the system's own again (no lantern). The hand over anything that can be carried (floor
// files, pinned strips, the open file's manila edge), grabbing while carried; the pointer on clickables stays.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import App from '@/App';
import maryCeleste from '@/cases/mary-celeste/case';
import { forgetShownThisLoad } from '@/features/board/hints';
import { continuePastGate, resetPhoneGate } from '@/lib/phone-gate';
import { DESKTOP_QUERY } from '@/lib/use-media-query';

const CASE = maryCeleste;
const BASE = `/case/${CASE.id}`;
const effects = readFileSync(resolve(__dirname, '../../../styles/effects.css'), 'utf8');

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
function renderAt(path: string) {
  window.history.pushState({}, '', path);
  return render(<App />);
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
  resetPhoneGate();
  cleanup();
  vi.unstubAllGlobals();
  window.history.pushState({}, '', '/');
});

describe('the cursor', () => {
  test('no lantern: the system cursor', () => {
    renderAt(`${BASE}/files`);
    expect(document.querySelector('[data-lantern]')).toBeNull();
    expect(document.documentElement.dataset.lantern).toBeUndefined();
    expect(effects).not.toContain('cursor: none');
  });

  test('floor files and pinned strips are marked as carriable', () => {
    localStorage.setItem(`histor:case:${CASE.id}`, JSON.stringify({ opened: [], pins: { [CASE.evidence[0].id]: CASE.theories[0].id }, verdict: null }));
    renderAt(`${BASE}/files`);
    const floor = [...document.querySelectorAll<HTMLElement>('[data-board="floor"] [data-board="folder"]')];
    expect(floor.length).toBeGreaterThan(0);
    expect(floor.every(folder => folder.dataset.draggable === 'true')).toBe(true);
    expect(document.querySelector<HTMLElement>('[data-board="tab"]')!.dataset.draggable).toBe('true');
  });

  test('the open file\'s manila edge is a handle', () => {
    renderAt(`${BASE}/files/${CASE.evidence[0].id}`);
    expect(document.querySelector<HTMLElement>('[data-file="grip"]')!.dataset.draggable).toBe('true');
  });

  test('grab over what can be carried, grabbing while carried, behind the fine-pointer query', () => {
    const rules = effects.slice(effects.indexOf('/* ---- The cursor (the fix list)'));
    expect(rules).toContain('@media (hover: hover) and (pointer: fine)');
    expect(rules).toMatch(/\[data-draggable="true"\][^{]*\{\s*cursor: grab;/);
    expect(rules).toMatch(/\[data-dragging="true"\] \*\s*\{\s*cursor: grabbing !important;/);
  });
});
