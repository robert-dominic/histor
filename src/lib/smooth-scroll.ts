// src/lib/smooth-scroll.ts
// The page's one smooth scroller (Lenis), kept where any feature can reach it. SmoothScroll.tsx creates and
// removes the instance; there is none under reduced motion, so every function here also works without one.
import gsap from 'gsap';
import { ScrollToPlugin } from 'gsap/ScrollToPlugin';
import type Lenis from 'lenis';
import { tween } from '@/lib/motion';

gsap.registerPlugin(ScrollToPlugin);

let instance: Lenis | null = null;

/** Called by SmoothScroll only. */
export function setLenis(lenis: Lenis | null): void {
  instance = lenis;
}

/** The smooth scroller, or null under reduced motion (or before it is created). */
export function getLenis(): Lenis | null {
  return instance;
}

/**
 * Scrolls the page to `y`. Through Lenis when there is one, otherwise with GSAP's ScrollToPlugin.
 * Any scroll the reader starts takes over.
 */
export function scrollToY(y: number, { ease, duration } = tween('paper.move')): void {
  if (instance !== null) {
    instance.scrollTo(y, { duration, easing: gsap.parseEase(ease), force: true });
    return;
  }
  gsap.to(window, { scrollTo: { y, autoKill: true }, ease, duration });
}

/**
 * Pauses smooth scrolling, for a scroll that something else drives (the story playing itself) or for a screen
 * that never scrolls. Pair every call with `resumeSmoothScroll`.
 */
export function pauseSmoothScroll(): void {
  instance?.stop();
}

/** Starts smooth scrolling again, from wherever the page now is. */
export function resumeSmoothScroll(): void {
  instance?.start();
}
