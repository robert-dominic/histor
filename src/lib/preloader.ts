// src/lib/preloader.ts
// The preloader's memory (dread pass, 1): it shows once per page load.

/** The longest the preloader waits, in ms, whatever is still loading. */
export const PRELOAD_MAX_MS = 3000;

let shownThisLoad = false;

/** True the first time it is asked on a page load; false after. */
export function takePreloader(): boolean {
  const first = !shownThisLoad;
  shownThisLoad = true;
  return first;
}

/** For tests: as if the page had just loaded. */
export function forgetPreloader(): void {
  shownThisLoad = false;
}

let enabled = true;

/** Whether a loader may show at all: in a browser that can say what the visitor prefers, and not switched off. */
export function loadersEnabled(): boolean {
  return enabled && typeof window !== 'undefined' && typeof window.matchMedia === 'function';
}

/** For tests: loaders on or off (src/test/setup.ts turns them off; a test of the loaders turns them back on). */
export function setLoadersEnabled(on: boolean): void {
  enabled = on;
}
