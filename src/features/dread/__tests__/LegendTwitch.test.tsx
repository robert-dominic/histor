// @vitest-environment jsdom
// src/features/dread/__tests__/LegendTwitch.test.tsx
// Legends and the lamp (dread pass, 5): a Legend stamp landing dips the lamp for about a second; opened legends
// (stamp known) twitch every 10 to 20s; sealed files never; nothing under reduced motion.
import { act, cleanup, render } from '@testing-library/react';
import gsap from 'gsap';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import LegendTwitch from '@/features/dread/LegendTwitch';
import { LAMP_FLICKER, TWITCH } from '@/lib/lamp';
import { MOTION } from '@/lib/motion';
import { emitStoryEvent } from '@/lib/story-events';
import { stubMatchMedia } from '@/test/match-media';

function desk() {
  document.body.innerHTML = `
    <div data-desk="lamp-dip" style="opacity: 0"></div>
    <div data-board="folder" data-legend-known="true" id="legend"><span id="legend-drawing"></span></div>
    <div data-board="folder" id="sealed"><span id="sealed-drawing"></span></div>`;
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  document.body.innerHTML = '';
});

describe('legends and the lamp', () => {
  test('a Legend stamp landing dips the lamp: it dims and flickers for about a second, then the light comes back', () => {
    stubMatchMedia();
    desk();
    render(<LegendTwitch />);
    const dip = document.querySelector('[data-desk="lamp-dip"]')!;
    emitStoryEvent({ type: 'stamp:legend', evidence: 'e' });
    const tweens = gsap.getTweensOf(dip);
    expect(tweens.length).toBe(LAMP_FLICKER.length);
    const length = LAMP_FLICKER.length * MOTION['dread.flicker'].duration;
    expect(length).toBeGreaterThan(0.5);
    expect(length).toBeLessThan(1.2);
    expect(Math.max(...tweens.map(tween => tween.vars.opacity as number))).toBeGreaterThan(0.2);
    expect(tweens.at(-1)!.vars.opacity).toBe(0);
  });

  test('an opened legend twitches every 10 to 20 seconds; a sealed file never', () => {
    stubMatchMedia();
    desk();
    render(<LegendTwitch />);
    act(() => {
      vi.advanceTimersByTime(TWITCH.everyMs[0] - 10);
    });
    expect(gsap.getTweensOf('#legend-drawing')).toHaveLength(0);
    act(() => {
      vi.advanceTimersByTime(TWITCH.everyMs[1] - TWITCH.everyMs[0] + 20);
    });
    expect(gsap.getTweensOf('#legend-drawing').length).toBeGreaterThan(0);
    expect(gsap.getTweensOf('#sealed-drawing')).toHaveLength(0);
  });

  test('reduced motion: no dip, no twitch', () => {
    stubMatchMedia({ reducedMotion: true });
    desk();
    render(<LegendTwitch />);
    emitStoryEvent({ type: 'stamp:legend', evidence: 'e' });
    act(() => {
      vi.advanceTimersByTime(TWITCH.everyMs[1] * 2);
    });
    expect(gsap.getTweensOf('[data-desk="lamp-dip"]')).toHaveLength(0);
    expect(gsap.getTweensOf('#legend-drawing')).toHaveLength(0);
  });
});
