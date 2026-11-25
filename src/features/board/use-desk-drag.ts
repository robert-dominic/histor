// src/features/board/use-desk-drag.ts
// Dragging a folder from where it lies: a file on the floor (and, in task 25, a tab on the board or in the tray).
// Draggables exist only on a desktop with a fine pointer and full motion (canDrag); nowhere else is anything created,
// and the Pin menu does the same job. A press that does not move stays a click.
// This file only reports where a drag started and where it ended, through the one pure rule `dropOutcome`; what
// each outcome does belongs to whoever called it. While a folder is over a theory note it shrinks to about 55% and
// fades a little, so the note's title stays readable, and the note lights up (`data-drop-hot`).
import gsap from 'gsap';
import {
  Draggable,
  canDrag,
  clearHotTargets,
  dropOutcome,
  dropTargetFor,
  dropTargets,
  markHotTarget,
  type DragSource,
  type DropOutcome,
} from '@/features/board/drag';
import { tween } from '@/lib/motion';
import { emitStoryEvent } from '@/lib/story-events';
import type { Theory } from '@/types/case';

/** How small a folder gets over a note, and how far it fades. */
export const OVER_NOTE = { scale: 0.55, opacity: 0.85 } as const;
/** The stacking of a folder in the hand: above everything on the desk but the open file. */
const HELD_Z = 60;

export interface DeskDragConfig {
  /** The folders that can be dragged. */
  elements: HTMLElement[];
  /** Where a drag of this folder starts: a sealed or opened file on the floor, a pinned tab, a set-aside tab. */
  sourceOf: (element: HTMLElement) => DragSource;
  theories: Theory[];
  /** What a folder looks like at rest, so it can come back to it: its scale. */
  restingScale: (element: HTMLElement) => number;
  /** Told what a drop does, with the folder as it was let go (still where it was dropped, still small over a note). */
  onDrop: (element: HTMLElement, outcome: DropOutcome) => void;
  /** Told when a folder is picked up, before it moves. */
  onLift?: (element: HTMLElement) => void;
  /** Told when a folder is let go, before `onDrop`. */
  onLetGo?: (element: HTMLElement) => void;
}

/** True when this drop target is a theory note (not the tray, the board or the floor). */
function isNote(element: Element | null, theories: Theory[]): boolean {
  const value = element?.getAttribute('data-drop-target');
  return theories.some(theory => theory.id === value);
}

/**
 * Makes the folders draggable.
 * @returns a function that removes the dragging again; the identity when dragging does not exist here
 */
export function createDeskDrag(config: DeskDragConfig): () => void {
  if (!canDrag() || config.elements.length === 0) {
    return () => undefined;
  }
  let targets: Element[] = [];
  let hot: Element | null = null;
  let overNote = false;
  // Over anything that can be carried, the hand: grab, and grabbing while it is carried (the fix list).
  config.elements.forEach(element => (element.dataset.draggable = 'true'));
  const draggables = Draggable.create(config.elements, {
    type: 'x,y',
    cursor: 'grab',
    activeCursor: 'grabbing',
    // The folders are links: dragging them is the point. A press that does not move is still a click.
    dragClickables: true,
    minimumMovement: 6,
    zIndexBoost: false,
    onDragStart() {
      targets = dropTargets();
      hot = null;
      overNote = false;
      config.onLift?.(this.target as HTMLElement);
      emitStoryEvent({ type: 'folder-lift' });
      gsap.set(this.target, { zIndex: HELD_Z });
      document.documentElement.dataset.dragging = 'true';
    },
    onDrag() {
      const element = this.target as HTMLElement;
      hot = markHotTarget(this as unknown as Draggable, targets);
      const over = isNote(hot, config.theories);
      if (over !== overNote) {
        overNote = over;
        const base = config.restingScale(element);
        gsap.to(element, {
          scale: over ? OVER_NOTE.scale : base,
          opacity: over ? OVER_NOTE.opacity : 1,
          ...tween('hover'),
          overwrite: 'auto',
        });
      }
    },
    onDragEnd() {
      const element = this.target as HTMLElement;
      clearHotTargets(targets);
      delete document.documentElement.dataset.dragging;
      config.onLetGo?.(element);
      emitStoryEvent({ type: 'folder-land' });
      const place = { x: Number(gsap.getProperty(element, 'x')), y: Number(gsap.getProperty(element, 'y')) };
      const outcome = dropOutcome(config.sourceOf(element), dropTargetFor(hot, config.theories, place));
      hot = null;
      overNote = false;
      config.onDrop(element, outcome);
    },
  });
  return () => {
    clearHotTargets(targets);
    delete document.documentElement.dataset.dragging;
    draggables.forEach(draggable => draggable.kill());
    config.elements.forEach(element => delete element.dataset.draggable);
  };
}
