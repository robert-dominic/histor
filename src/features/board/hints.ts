// src/features/board/hints.ts
// The desk's first-visit hints: which one is showing, and what each says. The steps run in order:
// 1 the pile (the floor, on a desktop), 2 the Pin menu, 3 the progress line; 4 means all three have been shown.
import { createContext, useContext } from 'react';

export type HintStep = 1 | 2 | 3 | 4;

export interface DeskHintsApi {
  /** The hint on show now. 4: finished. */
  step: HintStep;
  /** True when this visit started with the hints still to show: the hint row is kept for the whole visit. */
  active: boolean;
  /** The case's close threshold, for the third hint. */
  threshold: number;
  /** A file has been opened: the second hint comes next. */
  reachPinMenu: () => void;
  /** True when hint 2 should say "Drag": a fine pointer with full motion, and the last input was the pointer. */
  wantsDrag: () => boolean;
}

export const DeskHintsContext = createContext<DeskHintsApi | null>(null);

/** The hints, or null where there are none (outside the desk). */
export function useDeskHints(): DeskHintsApi | null {
  return useContext(DeskHintsContext);
}

const NUMBER_WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];

/** A small number in words ("six"), a larger one in digits. */
export function numberWord(value: number): string {
  return NUMBER_WORDS[value] ?? String(value);
}

/**
 * What a hint says, in the app's voice (D5 for the second). On a desktop the files lie on the floor; on a phone they
 * are still a pile.
 */
export function hintText(
  step: 1 | 2 | 3,
  options: { threshold: number; drag: boolean; floor?: boolean }
): string {
  switch (step) {
    case 1:
      return options.floor === true ? 'Open a file from the floor.' : 'Open a file from the pile.';
    case 2:
      return options.drag
        ? 'Drag it to the theory you think it points to.'
        : 'Pin it to the theory you think it points to.';
    case 3:
      return `Open ${numberWord(options.threshold)} files to close the case.`;
  }
}

/** Case ids whose hints were shown during this page load: where storage fails, they still show only once. */
const shownThisLoad = new Set<string>();

export function rememberShownThisLoad(caseId: string): void {
  shownThisLoad.add(caseId);
}

export function wasShownThisLoad(caseId: string): boolean {
  return shownThisLoad.has(caseId);
}

/** For tests: forget what this page load has shown. */
export function forgetShownThisLoad(): void {
  shownThisLoad.clear();
}
