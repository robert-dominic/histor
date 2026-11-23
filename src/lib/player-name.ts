// src/lib/player-name.ts
// The name the player signs their case file with (polish brief, A4): optional, kept in localStorage under
// "histor:player-name" and prefilled next time. The app works the same without storage: the field starts empty.

const KEY = 'histor:player-name';

/** The longest signature the card holds, in characters. */
export const PLAYER_NAME_MAX = 32;

/** A name as the card signs it: spaces tidied, cut to PLAYER_NAME_MAX. Empty means no signature. */
export function cleanPlayerName(name: string): string {
  return name.replace(/\s+/g, ' ').trim().slice(0, PLAYER_NAME_MAX).trim();
}

/** The name saved last time, or ''. */
export function loadPlayerName(): string {
  try {
    return cleanPlayerName(localStorage.getItem(KEY) ?? '');
  } catch {
    return '';
  }
}

/** Saves the name (an empty one is forgotten). Fails silently. */
export function savePlayerName(name: string): void {
  const clean = cleanPlayerName(name);
  try {
    if (clean === '') {
      localStorage.removeItem(KEY);
    } else {
      localStorage.setItem(KEY, clean);
    }
  } catch {
    // Storage unavailable or full: the field will start empty next time.
  }
}
