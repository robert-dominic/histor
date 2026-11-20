// src/lib/phone-gate.ts
// Remembers, for this browser session, that the visitor chose "Continue anyway" on the phone gate.
// Kept in sessionStorage under "histor:phone-gate". If storage is unavailable the choice is kept in memory, so it
// lasts until the page is reloaded; the app works either way.
const KEY = 'histor:phone-gate';

let memory = false;

/** True once the visitor has chosen to continue past the phone gate in this session. */
export function hasContinuedPastGate(): boolean {
  try {
    if (sessionStorage.getItem(KEY) === '1') {
      return true;
    }
  } catch {
    // Storage unavailable: fall back to memory.
  }
  return memory;
}

/** Records the choice. Fails silently, and always remembers it in memory. */
export function continuePastGate(): void {
  memory = true;
  try {
    sessionStorage.setItem(KEY, '1');
  } catch {
    // Storage unavailable or full: memory keeps it until the page is reloaded.
  }
}

/** Forgets the choice, in storage and in memory. For tests. */
export function resetPhoneGate(): void {
  memory = false;
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // Nothing to remove.
  }
}
