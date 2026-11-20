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

/**
 * What a release does: pins the file to the target it was dropped on, or, dropped on nothing, sends it back.
 * Returns the pin it made, if any.
 */
export function dropOnto(
  hot: Element | null,
  theories: Theory[],
  pin: (target: PinTarget) => void,
  cancel: () => void
): PinTarget | null {
  const target = dropTargetOf(hot, theories);
  if (target === null) {
    cancel();
    return null;
  }
  pin(target);
  return target;
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
