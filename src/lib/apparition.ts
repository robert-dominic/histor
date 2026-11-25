// src/lib/apparition.ts
// The shadow on the deck crosses once per visit (dread pass, 6): which chapters' shadows have crossed on this page load.

const crossed = new Set<string>();

/** True the first time a chapter's shadow asks on this page load; false after. */
export function takeApparition(chapterId: string): boolean {
  if (crossed.has(chapterId)) {
    return false;
  }
  crossed.add(chapterId);
  return true;
}

/** For tests: as if the page had just loaded. */
export function forgetApparitions(): void {
  crossed.clear();
}
