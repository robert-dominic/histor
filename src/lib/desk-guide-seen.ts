// src/lib/desk-guide-seen.ts
// Remembers, per case, that the desk's guide has been shown, so it opens by itself only on the first visit to the
// desk. Kept in localStorage under "histor:desk-guide:<caseId>". If storage is unavailable, it opens by itself once
// per page load.

const shownThisLoad = new Set<string>();

function getKey(caseId: string): string {
  return `histor:desk-guide:${caseId}`;
}

/** True when this case's desk guide has been shown before. */
export function hasSeenDeskGuide(caseId: string): boolean {
  if (shownThisLoad.has(caseId)) {
    return true;
  }
  try {
    return localStorage.getItem(getKey(caseId)) === '1';
  } catch {
    return false;
  }
}

/** Records that this case's desk guide has been shown. Fails silently. */
export function markDeskGuideSeen(caseId: string): void {
  shownThisLoad.add(caseId);
  try {
    localStorage.setItem(getKey(caseId), '1');
  } catch {
    // Storage unavailable or full: it is remembered for this page load only.
  }
}

/** For tests: forget what this page load has shown. */
export function forgetDeskGuideThisLoad(): void {
  shownThisLoad.clear();
}
