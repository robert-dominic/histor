// src/features/board/drag.ts
// Dragging on the desk, as an extra: an open folder can be dragged onto a theory note (or the set-aside tray) to
// pin it, and a folder can be dragged out of the pile to open it. Only on a desktop with a fine pointer and full
// motion; everywhere else nothing is created and the Pin menu does the same job.
// The drop rule is a plain function, so it can be tested without a pointer.

import gsap from 'gsap';
import { Draggable } from 'gsap/Draggable';
import { MOTION_QUERIES } from '@/lib/motion';
import { DESKTOP_QUERY } from '@/lib/use-media-query';
import type { PinTarget, Theory } from '@/types/case';

gsap.registerPlugin(Draggable);

/** A mouse or trackpad: hovering, and pointing finely. */
export const FINE_POINTER_QUERY = '(hover: hover) and (pointer: fine)';

/** Where a drag starts. */
export type DragSource =
  | { from: 'floor'; sealed: boolean }
  | { from: 'board'; theoryId: string }
  | { from: 'tray' }
  | { from: 'open-file' };

/** Where a drag ends. */
export type DropTarget =
  | { kind: 'theory'; theoryId: string }
  | { kind: 'board' }
  | { kind: 'tray' }
  | { kind: 'floor'; x: number; y: number }
  | { kind: 'nothing' };

/** What a drop does. */
export type DropOutcome =
  /** A sealed floor file onto a theory or the tray: it opens and is read first, then it flies there (Q6). */
  | { kind: 'reveal-then-pin'; target: PinTarget }
  /** Pin at once: a re-pin, a file put aside, an opened floor file onto a theory (Q6), the open file. */
  | { kind: 'pin'; target: PinTarget }
  /** A floor file onto the board outside any note: it opens for reading. */
  | { kind: 'open' }
  /** A board or tray file onto the floor: it is taken off the board and lies where it was dropped. */
  | { kind: 'unpin'; x: number; y: number }
  /** A floor file onto the floor: it settles where it was dropped. */
  | { kind: 'settle'; x: number; y: number }
  /** Back to where it came from: onto its own note or the tray, or onto nothing. */
  | { kind: 'return' };

/**
 * The one rule for every drop on the desk (Requirement 17). Pure: the Draggables only report where a drag started
 * and where it ended, and this says what happens.
 */
export function dropOutcome(source: DragSource, target: DropTarget): DropOutcome {
  if (target.kind === 'nothing') {
    return { kind: 'return' };
  }
  switch (source.from) {
    case 'floor':
      switch (target.kind) {
        case 'theory':
          return source.sealed
            ? { kind: 'reveal-then-pin', target: target.theoryId }
            : { kind: 'pin', target: target.theoryId };
        case 'tray':
          return source.sealed ? { kind: 'reveal-then-pin', target: 'none' } : { kind: 'pin', target: 'none' };
        case 'board':
          return { kind: 'open' };
        case 'floor':
          return { kind: 'settle', x: target.x, y: target.y };
      }
      break;
    case 'board':
      switch (target.kind) {
        case 'theory':
          return target.theoryId === source.theoryId ? { kind: 'return' } : { kind: 'pin', target: target.theoryId };
        case 'tray':
          return { kind: 'pin', target: 'none' };
        case 'floor':
          return { kind: 'unpin', x: target.x, y: target.y };
        case 'board':
          return { kind: 'return' };
      }
      break;
    case 'tray':
      switch (target.kind) {
        case 'theory':
          return { kind: 'pin', target: target.theoryId };
        case 'floor':
          return { kind: 'unpin', x: target.x, y: target.y };
        case 'tray':
        case 'board':
          return { kind: 'return' };
      }
      break;
    case 'open-file':
      switch (target.kind) {
        case 'theory':
          return { kind: 'pin', target: target.theoryId };
        case 'tray':
          return { kind: 'pin', target: 'none' };
        case 'board':
        case 'floor':
          return { kind: 'return' };
      }
  }
  return { kind: 'return' };
}

/** How much of the smaller element must overlap a drop target for it to count. */
export const DROP_THRESHOLD = '40%';

/** True where dragging exists: a desktop, a fine pointer, and full motion. */
export function canDrag(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return (
    window.matchMedia(DESKTOP_QUERY).matches &&
    window.matchMedia(FINE_POINTER_QUERY).matches &&
    window.matchMedia(MOTION_QUERIES.full).matches
  );
}

/** The pin a drop target stands for: a theory of the case, or "none" for the tray. Anything else is no target. */
export function dropTargetOf(element: Element | null, theories: Theory[]): PinTarget | null {
  const value = element?.getAttribute('data-drop-target');
  if (value === 'none') {
    return 'none';
  }
  return theories.some(theory => theory.id === value) ? (value as PinTarget) : null;
}

/** How a drop target ranks when several overlap the dragged folder: a note, then the tray, then the board, then the floor. */
function rankOf(element: Element): number {
  const value = element.getAttribute('data-drop-target');
  return value === 'floor' ? 3 : value === 'board' ? 2 : value === 'none' ? 1 : 0;
}

/** Every drop target on the desk, most specific first, so the first one hit is the one meant. */
export function dropTargets(): Element[] {
  return [...document.querySelectorAll('main [data-drop-target]')].sort((a, b) => rankOf(a) - rankOf(b));
}

/**
 * Where a drag ended, from the drop target that was hot (or none). `x` and `y` are the dragged folder's place on
 * the floor, used when it was dropped there.
 */
export function dropTargetFor(hot: Element | null, theories: Theory[], place: { x: number; y: number }): DropTarget {
  const value = hot?.getAttribute('data-drop-target');
  if (value === 'floor') {
    return { kind: 'floor', x: place.x, y: place.y };
  }
  if (value === 'board') {
    return { kind: 'board' };
  }
  if (value === 'none') {
    return { kind: 'tray' };
  }
  const theory = theories.find(item => item.id === value);
  return theory === undefined ? { kind: 'nothing' } : { kind: 'theory', theoryId: theory.id };
}

/** Marks the drop target the dragged element overlaps enough (`data-drop-hot`), and returns it. */
export function markHotTarget(draggable: Draggable, targets: Element[]): Element | null {
  let hot: Element | null = null;
  for (const target of targets) {
    const hit = hot === null && draggable.hitTest(target, DROP_THRESHOLD);
    if (hit) {
      hot = target;
      target.setAttribute('data-drop-hot', 'true');
    } else {
      target.removeAttribute('data-drop-hot');
    }
  }
  return hot;
}

/** Clears every drop target's highlight. */
export function clearHotTargets(targets: Element[]): void {
  for (const target of targets) {
    target.removeAttribute('data-drop-hot');
  }
}

export { Draggable };
