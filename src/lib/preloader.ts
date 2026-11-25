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
