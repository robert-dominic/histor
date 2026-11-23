// @vitest-environment jsdom
// src/features/board/__tests__/NoSnap.test.tsx
// Nothing on the desk changes in one step (Requirement 2): a slip slides out and back, the guide fades out, the tabs
// under a slip move with Flip. The first-visit hint and the ? guide say "floor" on a desktop and "pile" on a phone.
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import gsap from 'gsap';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import App from '@/App';
import maryCeleste from '@/cases/mary-celeste/case';
import { Flip, clearFlight, takeTabs } from '@/features/board/flight';
import { forgetShownThisLoad, hintText } from '@/features/board/hints';
import { continuePastGate, resetPhoneGate } from '@/lib/phone-gate';
import { DESKTOP_QUERY } from '@/lib/use-media-query';
import { stubMatchMedia } from '@/test/match-media';

vi.setConfig({ testTimeout: 15_000 });
const CASE = maryCeleste;
const BASE = `/case/${CASE.id}`;
const KEY = `histor:case:${CASE.id}`;

function stubDesktop() {
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
function renderDesk() {
  window.history.pushState({}, '', `${BASE}/files`);
  return render(<App />);
}
const tab = (id: string) => document.querySelector<HTMLElement>(`[data-board="tab"][data-evidence-id="${id}"]`)!;

beforeEach(() => {
  continuePastGate();
  localStorage.clear();
  forgetShownThisLoad();
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

describe('slips', () => {
  beforeEach(() => {
    localStorage.setItem(`histor:desk-hints:${CASE.id}`, '1');
    localStorage.setItem(KEY, JSON.stringify({ opened: ['e-sword'], pins: { 'e-sword': CASE.theories[2].id }, verdict: null }));
    stubDesktop();
  });

  test('a slip appears with a tween, not a snap: it slides out from under its tab and fades in', () => {
    renderDesk();
    fireEvent.click(tab('e-sword').querySelector('button')!);
    const slip = tab('e-sword').querySelector<HTMLElement>('[data-board="slip"]')!;
    const tweens = gsap.getTweensOf(slip);
    expect(tweens).toHaveLength(1);
    expect(tweens[0].vars).toMatchObject({ opacity: 1, ease: 'power2.out', duration: 0.35 });
    expect(slip.style.opacity).toBe('0');
  });

  test('and it leaves with a quicker tween, and is gone only when that has finished', () => {
    renderDesk();
    fireEvent.click(tab('e-sword').querySelector('button')!);
    gsap.getTweensOf(tab('e-sword').querySelector('[data-board="slip"]')!).forEach(t => t.progress(1));
    fireEvent.click(tab('e-sword').querySelector('button')!);
    const slip = tab('e-sword').querySelector<HTMLElement>('[data-board="slip"]')!;
    expect(slip).not.toBeNull();
    const leaving = gsap.getTweensOf(slip)[0];
    expect(leaving.vars.opacity).toBe(0);
    expect(leaving.vars.duration as number).toBeLessThan(0.35);
    leaving.progress(1);
    // React takes it out once the tween has finished.
    return vi.waitFor(() => expect(tab('e-sword').querySelector('[data-board="slip"]')).toBeNull());
  });

  test('the tabs under a slip move to their new places with Flip (layout)', () => {
    localStorage.setItem(
      KEY,
      JSON.stringify({
        opened: ['e-sword', 'e-galley'],
        pins: { 'e-sword': CASE.theories[2].id, 'e-galley': CASE.theories[2].id },
        verdict: null,
      })
    );
    const from = vi.spyOn(Flip, 'from').mockImplementation(() => gsap.timeline());
    renderDesk();
    fireEvent.click(tab('e-sword').querySelector('button')!);
    const moves = from.mock.calls.filter(call => (call[1] as { duration?: number }).duration === 0.5);
    expect(moves).toHaveLength(1);
    expect(moves[0][1]).toMatchObject({ ease: 'power2.inOut' });
  });

  test('reduced motion: a slip only fades, with no slide', () => {
    vi.unstubAllGlobals();
    stubMatchMedia({ reducedMotion: true, desktop: true });
    renderDesk();
    fireEvent.click(tab('e-sword').querySelector('button')!);
    const tween = gsap.getTweensOf(tab('e-sword').querySelector('[data-board="slip"]')!)[0];
    expect(tween.vars.opacity).toBe(1);
    expect(tween.vars.y).toBe(0);
  });
});

describe('the ? guide', () => {
  beforeEach(() => {
    localStorage.setItem(`histor:desk-hints:${CASE.id}`, '1');
    localStorage.setItem(`histor:desk-guide-off:${CASE.id}`, '1');
  });

  test('fades out with a quick tween, with the focus back on its button at once', () => {
    stubDesktop();
    renderDesk();
    const button = screen.getByRole('button', { name: 'How the desk works' });
    fireEvent.click(button);
    const dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }));
    expect(document.activeElement).toBe(button);
    expect(screen.queryByRole('dialog')).not.toBeNull();
    const overlay = dialog.parentElement!;
    const leaving = gsap.getTweensOf(overlay)[0];
    expect(leaving.vars).toMatchObject({ opacity: 0, ease: 'power2.in' });
    expect(leaving.vars.duration as number).toBeLessThan(0.2);
  });

  test('says "floor" on a desktop and "the files below" on a phone', () => {
    stubDesktop();
    const desktop = renderDesk();
    fireEvent.click(screen.getByRole('button', { name: 'How the desk works' }));
    expect(screen.getByRole('dialog').textContent).toContain('The evidence: the folders on the floor.');
    desktop.unmount();
    vi.unstubAllGlobals();
    stubMatchMedia();
    renderDesk();
    fireEvent.click(screen.getByRole('button', { name: 'How the desk works' }));
    expect(screen.getByRole('dialog').textContent).toContain('The evidence: the files below.');
  });
});

describe('the first-visit hint', () => {
  test('the first hint says "floor" on a desktop and keeps "pile" on a phone', () => {
    expect(hintText(1, { threshold: 6, drag: false, floor: true })).toBe('Open a file from the floor.');
    expect(hintText(1, { threshold: 6, drag: false })).toBe('Open a file from the pile.');
    expect(hintText(1, { threshold: 6, drag: false, floor: false })).toBe('Open a file from the pile.');
  });

  test('on the desktop desk the hint beside the floor says so', () => {
    stubDesktop();
    renderDesk();
    expect(document.querySelector('[data-hint="desk"]')?.textContent).toBe('Open a file from the floor.');
  });

  test('on the phone desk it still says pile', () => {
    stubMatchMedia();
    renderDesk();
    expect(document.querySelector('[data-hint="desk"]')?.textContent).toBe('Open a file from the pile.');
  });
});

describe('the lamp', () => {
  test('is fixed to the screen, so the one-screen desk needs nothing from it', () => {
    stubDesktop();
    localStorage.setItem(`histor:desk-hints:${CASE.id}`, '1');
    renderDesk();
    const lamp = document.querySelector('[data-desk="lamp"]') as HTMLElement;
    expect(lamp.className).toContain('fixed');
    expect(lamp.className).toContain('pointer-events-none');
  });
});
