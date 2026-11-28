// @vitest-environment jsdom
// src/features/hook/__tests__/HookScreen.test.tsx
// The hook screen: the case's lines one at a time, then the dateline, then a dissolve; Skip always there.
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import gsap from 'gsap';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import HookScreen from '@/features/hook/HookScreen';
import { onStoryEvent, type StoryEvent } from '@/lib/story-events';
import { stubMatchMedia } from '@/test/match-media';
import maryCeleste from '@/cases/mary-celeste/case';

beforeEach(() => stubMatchMedia({ reducedMotion: false }));
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

/** Plays the hook's own timeline to its end (its sounds and its end), then lets the dissolve finish. */
const finishAll = () => {
  act(() => {
    gsap.globalTimeline.getChildren(true, false, true).filter(child => child.data === 'hook').forEach(child => child.progress(1, false));
  });
  act(() => {
    gsap.globalTimeline.getChildren(true, true, false).forEach(child => child.progress(1, false));
  });
};

function renderHook() {
  const onEnded = vi.fn();
  const onDone = vi.fn();
  const events: StoryEvent[] = [];
  const stop = onStoryEvent(event => events.push(event));
  const view = render(<HookScreen hook={maryCeleste.hook} image={maryCeleste.story[0].image} onEnded={onEnded} onDone={onDone} />);
  return { ...view, onEnded, onDone, events, stop };
}

describe('HookScreen', () => {
  test('has every line of the hook and the dateline, whole for screen readers, and the case picture behind', () => {
    const { container, stop } = renderHook();
    const region = screen.getByRole('region', { name: 'The hook' });
    for (const line of maryCeleste.hook.lines) {
      expect(region.textContent).toContain(line);
    }
    expect(region.textContent).toContain(maryCeleste.hook.dateline);
    expect(container.querySelectorAll('[data-hook="line"]')).toHaveLength(maryCeleste.hook.lines.length);
    expect(container.querySelector('[data-hook="image"]')?.getAttribute('src')).toBe(maryCeleste.story[0].image?.src);
    stop();
  });

  test('the lines are hidden until their turn: one at a time', () => {
    const { container, stop } = renderHook();
    const lines = [...container.querySelectorAll<HTMLElement>('[data-hook="line"]')];
    expect(lines.every(line => line.style.opacity === '0')).toBe(true);
    expect(container.querySelector<HTMLElement>('[data-hook="dateline"]')?.style.opacity).toBe('0');
    stop();
  });

  test('a small Skip is there from the start: the story can mount, then the screen goes', () => {
    const { onEnded, onDone, stop } = renderHook();
    fireEvent.click(screen.getByRole('button', { name: 'Skip' }));
    expect(onEnded).toHaveBeenCalledTimes(1);
    expect(onDone).not.toHaveBeenCalled();
    finishAll();
    expect(onDone).toHaveBeenCalledTimes(1);
    stop();
  });

  test('played through, it ends by itself, once', () => {
    const { onEnded, onDone, stop } = renderHook();
    finishAll();
    expect(onEnded).toHaveBeenCalledTimes(1);
    expect(onDone).toHaveBeenCalledTimes(1);
    stop();
  });

  test('sound: the screen says it is open and then closed, and each line says it has appeared', () => {
    const { events, stop } = renderHook();
    expect(events.filter(event => event.type === 'hook-screen')).toEqual([{ type: 'hook-screen', on: true }]);
    finishAll();
    expect(events.filter(event => event.type === 'hook-screen').at(-1)).toEqual({ type: 'hook-screen', on: false });
    expect(events.filter(event => event.type === 'hook-line').map(event => (event as { index: number }).index)).toEqual(
      maryCeleste.hook.lines.map((_, index) => index)
    );
    stop();
  });

  test('reduced motion: the same sequence of fades, with no rise', () => {
    stubMatchMedia({ reducedMotion: true });
    const { container, onDone, stop } = renderHook();
    const first = container.querySelector<HTMLElement>('[data-hook="line"]')!;
    expect(gsap.getTweensOf(first).some(tween => 'y' in tween.vars && tween.vars.y !== 0)).toBe(false);
    finishAll();
    expect(onDone).toHaveBeenCalledTimes(1);
    stop();
  });
});
