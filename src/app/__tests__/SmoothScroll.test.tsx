// @vitest-environment jsdom
// src/app/__tests__/SmoothScroll.test.tsx
// Smooth scrolling (Lenis): none under reduced motion or without matchMedia, one instance under full motion,
// removed on unmount, and paused and resumed around "Play the story".
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import SmoothScroll from '@/app/SmoothScroll';
import { getLenis, pauseSmoothScroll, resumeSmoothScroll, setWheelMultiplier } from '@/lib/smooth-scroll';
import { stubMatchMedia } from '@/test/match-media';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

/** jsdom has no ResizeObserver, which Lenis uses to measure the page. */
function stubResizeObserver() {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  );
}

describe('SmoothScroll', () => {
  test('creates no Lenis without matchMedia', () => {
    render(<SmoothScroll>x</SmoothScroll>);
    expect(getLenis()).toBeNull();
  });

  test('creates no Lenis under reduced motion', () => {
    stubMatchMedia({ reducedMotion: true });
    stubResizeObserver();
    render(<SmoothScroll>x</SmoothScroll>);
    expect(getLenis()).toBeNull();
  });

  describe('under full motion', () => {
    beforeEach(() => {
      stubMatchMedia();
      stubResizeObserver();
    });

    test('a page can slow the wheel: each wheel movement is scaled before Lenis uses it, and touch is left alone', () => {
      render(<SmoothScroll>x</SmoothScroll>);
      const hook = getLenis()!.options.virtualScroll as (data: { deltaX: number; deltaY: number; event: Event }) => boolean;
      const wheel = { deltaX: 10, deltaY: 100, event: new Event('wheel') };
      setWheelMultiplier(0.8);
      expect(hook(wheel)).toBe(true);
      expect(wheel.deltaY).toBeCloseTo(80, 6);
      expect(wheel.deltaX).toBeCloseTo(8, 6);
      const touch = { deltaX: 0, deltaY: 100, event: new Event('touchmove') };
      hook(touch);
      expect(touch.deltaY).toBe(100);
      setWheelMultiplier(1);
      const plain = { deltaX: 0, deltaY: 100, event: new Event('wheel') };
      hook(plain);
      expect(plain.deltaY).toBe(100);
    });

    test('creates one instance, driven by GSAP rather than its own loop, and removes it on unmount', () => {
      const { unmount, rerender } = render(<SmoothScroll>x</SmoothScroll>);
      const lenis = getLenis();
      expect(lenis).not.toBeNull();
      expect(lenis?.options.autoRaf).toBe(false);
      // A render that changes nothing keeps the same instance.
      rerender(<SmoothScroll>y</SmoothScroll>);
      expect(getLenis()).toBe(lenis);
      unmount();
      expect(getLenis()).toBeNull();
    });

    test('pause and resume stop and start it', () => {
      render(<SmoothScroll>x</SmoothScroll>);
      const lenis = getLenis()!;
      act(() => pauseSmoothScroll());
      expect(lenis.isStopped).toBe(true);
      act(() => resumeSmoothScroll());
      expect(lenis.isStopped).toBe(false);
    });
  });

  test('pause and resume do nothing when there is no Lenis', () => {
    expect(() => {
      pauseSmoothScroll();
      resumeSmoothScroll();
    }).not.toThrow();
  });
});
