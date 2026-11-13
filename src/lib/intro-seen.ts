// src/lib/intro-seen.ts
// Remembers, per case, that the visitor has seen the legend intro, so later visits open on its end state.
// Kept in localStorage under "histor:intro-seen:<caseId>". The app works the same if storage is unavailable:
// the intro simply plays again.

function getKey(caseId: string): string {
  return `histor:intro-seen:${caseId}`;
}

/** True when the visitor has reached the end of this case's legend intro before. */
export function hasSeenIntro(caseId: string): boolean {
  try {
    return localStorage.getItem(getKey(caseId)) === '1';
  } catch {
    return false;
  }
}

/** Records that the visitor has reached the end of this case's legend intro. Fails silently. */
export function markIntroSeen(caseId: string): void {
  try {
    localStorage.setItem(getKey(caseId), '1');
  } catch {
    // Storage unavailable or full: the intro will play again next time.
  }
}
