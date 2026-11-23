// src/lib/smooth-scroll.ts
// The page's one smooth scroller (Lenis), kept where any feature can reach it. SmoothScroll.tsx creates and
// removes the instance; there is none under reduced motion, so every function here also works without one.
import gsap from 'gsap';
import { ScrollToPlugin } from 'gsap/ScrollToPlugin';
import type Lenis from 'lenis';
import { tween } from '@/lib/motion';

gsap.registerPlugin(ScrollToPlugin);

let instance: Lenis | null = null;

/** What every wheel or trackpad movement is multiplied by: 1, or less while a page asks for a slower scroll. */
let wheelScale = 1;

/**
 * Makes wheel and trackpad scrolling slower (below 1) or back to normal (1), for the page now on screen. Read on
 * every wheel event, so it takes effect at once, with or without a smooth scroller yet.
 */
export function setWheelMultiplier(multiplier: number): void {
  wheelScale = multiplier;
}

/** The wheel multiplier now asked for. */
export function wheelMultiplier(): number {
  return wheelScale;
}

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
