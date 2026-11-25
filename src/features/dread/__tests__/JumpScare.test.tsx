// @vitest-environment jsdom
// src/features/dread/__tests__/JumpScare.test.tsx
// The one jump scare (dread pass, 8): after closing the case having relied on a legend: a cut to black, the eye large
// in the centre, the sting, the pen writing "You trusted a legend.", then the reveal. Once per completion; not at all
// for a player who trusted no legend; under reduced motion no cut and no sting, the line simply appears.
import { act, cleanup, render, screen } from '@testing-library/react';
import gsap from 'gsap';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import App from '@/App';
import maryCeleste from '@/cases/mary-celeste/case';
import JumpScare from '@/features/dread/JumpScare';
import { JUMP_SCARE, takeJumpScare } from '@/lib/jump-scare';
import { continuePastGate, resetPhoneGate } from '@/lib/phone-gate';
import { SAMPLES } from '@/lib/sound/levels';
import { onStoryEvent, type StoryEvent } from '@/lib/story-events';
import { stubMatchMedia } from '@/test/match-media';

const CASE = maryCeleste;
const legend = CASE.evidence.find(evidence => evidence.status === 'legend')!;
const others = CASE.evidence.filter(evidence => evidence.id !== legend.id).slice(0, CASE.closeThreshold);

function closeTheCase(trusted: boolean) {
  continuePastGate();
  const pins = trusted ? { [legend.id]: CASE.theories[0].id } : {};
  localStorage.setItem(`histor:case:${CASE.id}`, JSON.stringify({ opened: [legend.id, ...others.map(e => e.id)], pins, verdict: CASE.theories[0].id }));
  window.history.pushState({ usr: { fresh: true }, key: `closing-${Math.random()}`, idx: 0 }, '', `/case/${CASE.id}/report`);
  return render(<App />);
}

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});
afterEach(() => {
  cleanup();
  resetPhoneGate();
  vi.unstubAllGlobals();
  window.history.pushState({}, '', '/');
});

describe('the jump scare', () => {
  test('relied on a legend: black, the eye, the sting, the pen writes the line; the reveal waits for it', () => {
    stubMatchMedia();
    const heard: StoryEvent['type'][] = [];
    const stop = onStoryEvent(event => heard.push(event.type));
    closeTheCase(true);
    const scare = document.querySelector<HTMLElement>('[data-scare]')!;
    expect(scare).not.toBeNull();
    expect(scare.className).toContain('bg-black');
    expect(scare.querySelector('[data-eye="svg"]')).not.toBeNull();
    expect(screen.getByRole('status').textContent).toBe(JUMP_SCARE.line);
    // The reveal waits.
    expect(document.querySelector('[data-reveal="root"]')).toBeNull();
    const timeline = gsap.getTweensOf(scare)[0].parent as gsap.core.Timeline;
    act(() => {
      timeline.progress(1);
    });
    expect(heard).toContain('jump-sting');
    expect(heard).toContain('pen');
    expect(document.querySelector('[data-scare]')).toBeNull();
    expect(document.querySelector('[data-reveal="root"]')).not.toBeNull();
    stop();
  });

  test('trusted no legend: no scare, they earned the quiet', () => {
    stubMatchMedia();
    closeTheCase(false);
    expect(document.querySelector('[data-scare]')).toBeNull();
    expect(document.querySelector('[data-reveal="root"]')).not.toBeNull();
  });

  test('once per completion: the same closing does not play it twice', () => {
    expect(takeJumpScare('closing-a')).toBe(true);
    expect(takeJumpScare('closing-a')).toBe(false);
    expect(takeJumpScare('closing-b')).toBe(true);
  });

  test('reduced motion: no cut and no sting; the line simply appears', () => {
    stubMatchMedia({ reducedMotion: true });
    const heard: StoryEvent['type'][] = [];
    const stop = onStoryEvent(event => heard.push(event.type));
    const done = vi.fn();
    render(<JumpScare onDone={done} />);
    const scare = document.querySelector<HTMLElement>('[data-scare]')!;
    const timeline = gsap.getTweensOf(scare)[0].parent as gsap.core.Timeline;
    act(() => {
      timeline.progress(1);
    });
    expect(heard).not.toContain('jump-sting');
    expect(done).toHaveBeenCalledTimes(1);
    stop();
  });

  test('the sting is the loudest file, still capped', () => {
    const loudest = Math.max(...Object.values(SAMPLES).map(sample => sample.level));
    expect(SAMPLES['jump-sting'].level).toBe(loudest);
    expect(SAMPLES['jump-sting'].level).toBeLessThanOrEqual(1);
  });
});
