// src/features/board/flight.ts
// The hand-over between the desk and an open file, for the folder's flight (GSAP Flip).
// The desk records where a folder lay when it was activated; the open file flies from there. Closing a file
// records where the open folder was, and that it is going back; the desk then flies it home and returns focus.
// Kept outside React state: these are positions for an animation, read once, and stale after a moment.

import gsap from 'gsap';
import { Flip } from 'gsap/Flip';
import { MOTION_QUERIES } from '@/lib/motion';
import { DESKTOP_QUERY } from '@/lib/use-media-query';

gsap.registerPlugin(Flip);

export type FlipState = ReturnType<typeof Flip.getState>;

/** "in": from the desk to the open file. "out": from the open file back to the desk. */
export type FlightDirection = 'in' | 'out';

interface Flight {
  id: string;
  direction: FlightDirection;
  state: FlipState | null;
  at: number;
}

/** A recorded position older than this belongs to some earlier click, not to this opening. */
const FRESH_MS = 1500;

let pending: Flight | null = null;

/** True where the folder flies and its cover flips: a desktop, with full motion. */
export function canFly(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia(DESKTOP_QUERY).matches && window.matchMedia(MOTION_QUERIES.full).matches;
}

/**
 * Records a flight for file `id`. The position is captured from `element` only where folders fly;
 * the direction is always recorded, so closing a file can return the focus to its folder everywhere.
 */
export function recordFlight(id: string, direction: FlightDirection, element: Element | null): void {
  const state = element !== null && canFly() ? Flip.getState(element) : null;
  pending = { id, direction, state, at: Date.now() };
}

/** The recorded flight for file `id` in `direction`, if it was recorded a moment ago. Reading it does not clear it. */
export function flightFor(id: string, direction: FlightDirection): Flight | null {
  if (pending === null || pending.id !== id || pending.direction !== direction || Date.now() - pending.at > FRESH_MS) {
    return null;
  }
  return pending;
}

/** The recorded flight in `direction`, whichever file it is for, if it was recorded a moment ago. */
export function pendingFlight(direction: FlightDirection): Flight | null {
  return pending !== null && pending.direction === direction && Date.now() - pending.at <= FRESH_MS ? pending : null;
}
/**
 * Where every hanging tab lay just before a pin changed, so the other tabs can move to their new places with Flip
 * (the `layout` token) when a tab leaves a column or joins one. Read once, after the desk has drawn again.
 */
let tabsBefore: { state: FlipState; at: number } | null = null;
export function recordTabs(root: Element): void {
  tabsBefore = canFly() ? { state: Flip.getState(root.querySelectorAll('[data-board="tab"]')), at: Date.now() } : null;
}
/** The recorded tab positions, if they were recorded a moment ago. Reading them clears them. */
export function takeTabs(): FlipState | null {
  const recorded = tabsBefore !== null && Date.now() - tabsBefore.at <= FRESH_MS ? tabsBefore.state : null;
  tabsBefore = null;
  return recorded;
}
/**
 * The open folder at rest after its flight: its natural size, at exactly 0°, with no scale or tilt left over from
 * the Flip.
 */
export function settleOpenFolder(folder: HTMLElement | null): void {
  if (folder !== null) {
    gsap.set(folder, { clearProps: 'transform,transformOrigin' });
  }
}
/** Who wants to know when a move on the desk has finished (the threads, which measure again). */
const layoutListeners = new Set<() => void>();
/** Listens for the end of every Flip on the desk. Returns a function that stops listening. */
export function onDeskLayout(listener: () => void): () => void {
  layoutListeners.add(listener);
  return () => {
    layoutListeners.delete(listener);
  };
}
/** Says that a move on the desk (a Flip) has finished: everything is in its place again. */
export function deskLayoutSettled(): void {
  layoutListeners.forEach(listener => listener());
}
/** Forgets the recorded flight, once it has been flown. */
export function clearFlight(): void {
  pending = null;
}

export { Flip };
