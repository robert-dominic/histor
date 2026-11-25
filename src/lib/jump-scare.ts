// src/lib/jump-scare.ts
// The one jump scare in the whole app (dread pass, 8): after the player closes the case, if they relied on any legend
// (they trusted one: pinned it to a theory as support). Once per case completion: a closing is remembered by its
// navigation (`location.key`) for the tab's session, so a reload of the report does not play it again.

export const JUMP_SCARE = {
  /** The line the pen writes under the eye. */
  line: 'You trusted a legend.',
  /** The black beat before the eye, and how long the eye and the line hold before the reveal goes on (s). */
  beat: 0.35,
  hold: 1.6,
  /** Reduced motion: how long the line simply shows (s). */
  quietHold: 2.2,
} as const;

const key = (closing: string) => `histor:jump-scare:${closing}`;

/** True the first time a closing asks (and it is then remembered); false after, or where storage fails twice over. */
export function takeJumpScare(closing: string): boolean {
  try {
    if (sessionStorage.getItem(key(closing)) !== null) {
      return false;
    }
    sessionStorage.setItem(key(closing), '1');
  } catch {
    // No session storage: it plays; a reload may play it again.
  }
  return true;
}
