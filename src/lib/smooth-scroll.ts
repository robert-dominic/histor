// src/lib/smooth-scroll.ts
// The page's one smooth scroller (Lenis), kept where any feature can reach it. SmoothScroll.tsx creates and
// removes the instance; there is none under reduced motion, so every function here also works without one.
import gsap from 'gsap';
import { ScrollToPlugin } from 'gsap/ScrollToPlugin';
import type Lenis from 'lenis';
import { tween } from '@/lib/motion';

gsap.registerPlugin(ScrollToPlugin);

let instance: Lenis | null = null;

/** How many holds keep smooth scrolling stopped (the story's stage holds it while it is on screen). */
let holds = 0;

/** Called by SmoothScroll only. */
export function setLenis(lenis: Lenis | null): void {
  instance = lenis;
  if (holds > 0) {
    instance?.stop();
  }
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

/** Starts smooth scrolling again, from wherever the page now is, unless something holds it stopped. */
export function resumeSmoothScroll(): void {
  if (holds === 0) {
    instance?.start();
  }
}

/**
 * Keeps smooth scrolling stopped until `releaseSmoothScroll`, whatever pauses and resumes it meanwhile: for a
 * screen that never scrolls while it is there (the story's stage). Pair every call with `releaseSmoothScroll`.
 */
export function holdSmoothScroll(): void {
  holds += 1;
  instance?.stop();
}

/** Lets go of one `holdSmoothScroll`; smooth scrolling starts again once nothing holds it. */
export function releaseSmoothScroll(): void {
  holds = Math.max(0, holds - 1);
  if (holds === 0) {
    instance?.start();
  }
}

/** Puts the page at `y` at once, with no glide. */
export function jumpToY(y: number): void {
  if (instance !== null) {
    instance.scrollTo(y, { immediate: true, force: true });
    return;
  }
  window.scrollTo(0, y);
}

/** The default of Lenis, in case a page changes it and puts it back. */
const DEFAULT_LERP = 0.1;

/** Sets how softly the page follows the wheel (Lenis's lerp; lower is softer), or puts the default back with null. */
export function setSmoothLerp(lerp: number | null): void {
  if (instance !== null) {
    instance.options.lerp = lerp ?? DEFAULT_LERP;
  }
}
