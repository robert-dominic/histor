// src/lib/desk-split.ts
// How the desktop desk shares its height between the board of theories and the floor (story-steps brief, 5.2),
// worked out floor-first: the floor gets the height its folders need to lie apart with their labels at 12px or more
// (`floorHeightFor`), and at least `FLOOR_AT_LEAST` of the room; the board takes the rest, never less than it needs
// for its notes.
import { floorHeightFor, type FolderBox } from '@/lib/floor';

/** The floor's share of the room it gets at the least: about 55/45 with the board. */
export const FLOOR_AT_LEAST = 0.45;
/** The board is never shorter than this, in px: room for its notes and a strip or two under each. */
export const BOARD_MIN_PX = 300;
/** What the floor's row holds besides the floor itself, in px: the "Case files · n" label (1.25rem) and padding. */
export const FLOOR_ROW_EXTRA_PX = 32;

export interface DeskSplit {
  /** The floor's row, label and padding included, in px. */
  floorRow: number;
  /** The board's row, in px. */
  board: number;
  /** The floor itself, where the folders lie, in px. */
  floor: number;
}

/**
 * @param room - the height the board and the floor share (the desk less its header), in px
 * @param floorWidth - the floor's width, in px
 * @param count - how many folders the floor must hold (all the case's files)
 * @param folder - a floor folder's natural size, in px
 */
export function deskSplit(room: number, floorWidth: number, count: number, folder: Pick<FolderBox, 'width' | 'height'>): DeskSplit {
  const needed = floorHeightFor(count, floorWidth, folder) + FLOOR_ROW_EXTRA_PX;
  const floorRow = Math.round(Math.max(0, Math.min(room - BOARD_MIN_PX, Math.max(needed, room * FLOOR_AT_LEAST))));
  return { floorRow, board: room - floorRow, floor: floorRow - FLOOR_ROW_EXTRA_PX };
}
