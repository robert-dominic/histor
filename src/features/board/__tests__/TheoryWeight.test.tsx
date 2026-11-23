// @vitest-environment jsdom
// src/features/board/__tests__/TheoryWeight.test.tsx
// The theories answer back (investigation brief, item 2): the board shows the player's own argument building up,
// from their pins only, and every change is tweened.
import { act, cleanup, render } from '@testing-library/react';
import gsap from 'gsap';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import App from '@/App';
import maryCeleste from '@/cases/mary-celeste/case';
import { Draggable } from '@/features/board/drag';
import { clearFlight, takeTabs } from '@/features/board/flight';
import { forgetShownThisLoad } from '@/features/board/hints';
import { continuePastGate, resetPhoneGate } from '@/lib/phone-gate';
import { WEIGHT_LOOK } from '@/lib/theory-weight';
import { DESKTOP_QUERY } from '@/lib/use-media-query';

vi.setConfig({ testTimeout: 15_000 });
const CASE = maryCeleste;
const KEY = `histor:case:${CASE.id}`;
const [A, B] = [CASE.theories[0].id, CASE.theories[1].id];
const ids = CASE.evidence.map(evidence => evidence.id);

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
function renderDesk(opened: string[], pins: Record<string, string>) {
  localStorage.setItem(KEY, JSON.stringify({ opened, pins, verdict: null }));
  window.history.pushState({}, '', `/case/${CASE.id}/files`);
  return render(<App />);
}
const note = (theoryId: string) => document.querySelector<HTMLElement>(`[data-board="theory"][data-theory-id="${theoryId}"]`)!;

beforeEach(() => {
  continuePastGate();
  localStorage.clear();
  localStorage.setItem('histor:desk-guide-off:mary-celeste', '1');
  localStorage.setItem(`histor:desk-hints:${CASE.id}`, '1');
  forgetShownThisLoad();
  stubDesktop();
});
afterEach(() => {
  clearFlight();
  takeTabs();
  resetPhoneGate();
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  window.history.pushState({}, '', '/');
});

describe('the theories answer back', () => {
  test('3 or more pins make a theory heavier; the one with the most is the heaviest; an empty one is forgotten', () => {
    const pins = { [ids[0]]: A, [ids[1]]: A, [ids[2]]: A, [ids[3]]: A, [ids[4]]: B, [ids[5]]: B, [ids[6]]: B };
    renderDesk(Object.keys(pins), pins);
    expect(note(A).dataset.weight).toBe('heaviest');
    expect(note(B).dataset.weight).toBe('heavy');
    for (const theory of CASE.theories.slice(2)) {
      expect(note(theory.id).dataset.weight).toBe('forgotten');
    }
    // The look, set at once on arrival: the edge and the lift.
    const edge = note(A).querySelector<HTMLElement>('[data-board="weight-edge"]')!;
    expect(edge.style.opacity).toBe(String(WEIGHT_LOOK.heaviest.edge));
    expect(note(CASE.theories[2].id).querySelector<HTMLElement>('[data-board="curl"]')!.style.opacity).toBe('1');
  });

  test('early on, before 4 files are opened, nothing is forgotten', () => {
    renderDesk([ids[0], ids[1]], { [ids[0]]: A });
    expect(CASE.theories.map(theory => note(theory.id).dataset.weight)).toEqual(CASE.theories.map(() => 'normal'));
  });

  test('a change animates (layout), never jumps: a forgotten theory recovers when a file is pinned to it', () => {
    const pins = { [ids[0]]: A, [ids[1]]: A, [ids[2]]: A, [ids[3]]: A };
    renderDesk(Object.keys(pins), pins);
    const forgotten = CASE.theories[1].id;
    expect(note(forgotten).dataset.weight).toBe('forgotten');
    const strip = document.querySelector<HTMLElement>(`[data-board="tab"][data-evidence-id="${ids[3]}"]`)!;
    const draggable = Draggable.get(strip);
    vi.spyOn(draggable, 'hitTest').mockImplementation(target => target === note(forgotten));
    const tweens = vi.spyOn(gsap, 'to');
    act(() => {
      draggable.vars.onDragStart!.call(draggable);
      draggable.vars.onDrag!.call(draggable);
      draggable.vars.onDragEnd!.call(draggable);
    });
    expect(note(forgotten).dataset.weight).toBe('normal');
    const curl = note(forgotten).querySelector('[data-board="curl"]');
    const recover = tweens.mock.calls.find(call => call[0] === curl);
    expect(recover?.[1]).toMatchObject({ opacity: 0, ease: 'power2.inOut', duration: 0.5 });
  });
});
