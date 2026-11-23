// @vitest-environment jsdom
// src/app/__tests__/SmoothScroll.test.tsx
// Smooth scrolling (Lenis): none under reduced motion or without matchMedia, one instance under full motion,
// removed on unmount, and paused and resumed around "Play the story".
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import SmoothScroll from '@/app/SmoothScroll';
import { getLenis, holdSmoothScroll, pauseSmoothScroll, releaseSmoothScroll, resumeSmoothScroll } from '@/lib/smooth-scroll';
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

    test('a hold keeps it stopped, whatever pauses and resumes it meanwhile, until it is released', () => {
      render(<SmoothScroll>x</SmoothScroll>);
      const lenis = getLenis()!;
      act(() => holdSmoothScroll());
      expect(lenis.isStopped).toBe(true);
      // A modal closing over the story resumes smooth scrolling: the hold wins.
      act(() => resumeSmoothScroll());
      expect(lenis.isStopped).toBe(true);
      act(() => releaseSmoothScroll());
      expect(lenis.isStopped).toBe(false);
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
