// src/lib/desk-guide-seen.ts
// The desk's guide in storage, per case: whether it has been shown before (from then on it offers "Don't show this
// again"), under "histor:desk-guide:<caseId>", and whether the player ticked that box, under
// "histor:desk-guide-off:<caseId>". Until they do, the guide opens every time they arrive on the desk.

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

function offKey(caseId: string): string {
  return `histor:desk-guide-off:${caseId}`;
}

/** True when the player asked for the guide not to open by itself any more ("Don't show this again"). */
export function isDeskGuideOff(caseId: string): boolean {
  try {
    return localStorage.getItem(offKey(caseId)) === '1';
  } catch {
    return false;
  }
}

/** Remembers the player's "Don't show this again", or forgets it. Fails silently. */
export function setDeskGuideOff(caseId: string, off: boolean): void {
  try {
    if (off) {
      localStorage.setItem(offKey(caseId), '1');
    } else {
      localStorage.removeItem(offKey(caseId));
    }
  } catch {
    // Storage unavailable: the guide simply keeps opening.
  }
}
