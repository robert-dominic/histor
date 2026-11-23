// @vitest-environment jsdom
// src/features/board/__tests__/FloorPin.test.tsx
// Pinning a sealed file without dragging (night-run 2.5): a floor file with the focus shows a small "Pin to…", the
// same floating menu as in the open file, and P opens it. The file is pinned and stays sealed.
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import App from '@/App';
import maryCeleste from '@/cases/mary-celeste/case';
import { forgetShownThisLoad } from '@/features/board/hints';
import { continuePastGate, resetPhoneGate } from '@/lib/phone-gate';
import { stubMatchMedia } from '@/test/match-media';

vi.setConfig({ testTimeout: 15_000 });
const CASE = maryCeleste;
const BASE = `/case/${CASE.id}`;
const KEY = `histor:case:${CASE.id}`;

beforeEach(() => {
  continuePastGate();
  localStorage.clear();
  localStorage.setItem(`histor:desk-hints:${CASE.id}`, '1');
  localStorage.setItem(`histor:desk-guide-off:${CASE.id}`, '1');
  forgetShownThisLoad();
  stubMatchMedia({ desktop: true });
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    callback(0);
    return 0;
  });
});
afterEach(() => {
  resetPhoneGate();
  cleanup();
  vi.unstubAllGlobals();
  window.history.pushState({}, '', '/');
  document.documentElement.style.overflow = '';
});

function renderDesk() {
  window.history.pushState({}, '', `${BASE}/files`);
  return render(<App />);
}
const folderOf = (id: string) => document.querySelector<HTMLElement>(`[data-board="folder"][data-evidence-id="${id}"]`)!;

describe('pinning a floor file without dragging', () => {
  test('every floor file has a small "Pin to…" that shows while the file has focus', () => {
    renderDesk();
    const folder = folderOf('e-lifeboat');
    const pin = folder.querySelector<HTMLElement>('[data-folder="pin"]')!;
    expect(pin.className).toContain('opacity-0');
    expect(pin.className).toContain('group-focus-within/file:opacity-100');
    const button = pin.querySelector<HTMLButtonElement>('button[aria-haspopup="menu"]')!;
    expect(button.textContent).toContain('Pin to…');
    // Screen readers hear which file it pins.
    expect(button.textContent).toContain(CASE.evidence.find(item => item.id === 'e-lifeboat')!.title);
  });

  test('P on a focused file opens the same menu; choosing a theory pins it, still sealed', () => {
    renderDesk();
    const link = folderOf('e-lifeboat').querySelector('a')!;
    link.focus();
    act(() => {
      fireEvent.keyDown(link, { key: 'p' });
    });
    const menu = screen.getByRole('menu', { name: 'Pin to…' });
    expect(menu.hidden).toBe(false);
    act(() => {
      fireEvent.click(within(menu).getByRole('menuitemradio', { name: CASE.theories[0].title }));
    });
    const saved = JSON.parse(localStorage.getItem(KEY) ?? 'null');
    expect(saved.pins).toEqual({ 'e-lifeboat': CASE.theories[0].id });
    expect(saved.opened).not.toContain('e-lifeboat');
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });

  test('"None of them" works the same way', () => {
    renderDesk();
    const button = within(folderOf('e-galley')).getByRole('button', { name: /Pin to…/ });
    act(() => {
      fireEvent.click(button);
    });
    act(() => {
      fireEvent.click(within(screen.getByRole('menu')).getByRole('menuitemradio', { name: 'None of them' }));
    });
    expect(JSON.parse(localStorage.getItem(KEY) ?? 'null').pins).toEqual({ 'e-galley': 'none' });
  });
});
