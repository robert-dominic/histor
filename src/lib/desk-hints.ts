// src/lib/desk-hints.ts
// Remembers, per case, that the desk's first-visit hints have been shown, so they never show again.
// Kept in localStorage under "histor:desk-hints:<caseId>". If storage is unavailable, the hints simply show
// once per page load.

function getKey(caseId: string): string {
  return `histor:desk-hints:${caseId}`;
}

/** True when this case's desk hints have been shown before. */
export function hasSeenDeskHints(caseId: string): boolean {
  try {
    return localStorage.getItem(getKey(caseId)) === '1';
  } catch {
    return false;
  }
}

/** Records that this case's desk hints have been shown. Fails silently. */
export function markDeskHintsSeen(caseId: string): void {
  try {
    localStorage.setItem(getKey(caseId), '1');
  } catch {
    // Storage unavailable or full: the hints will show again next time.
  }
}
