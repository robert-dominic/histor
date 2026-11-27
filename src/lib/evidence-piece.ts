// src/lib/evidence-piece.ts
// How each case's piece of evidence is pinned up on the landing page (dreadful frames, Frame.tsx): its tilt, its
// tape and its tear, fixed per case (a hash of its id), so they never change between visits.
import { hashUnit } from '@/lib/desk';

/** A strip of tape: where its middle sits on the piece (percent of its box) and its angle, in degrees. */
export interface TapeStrip {
  left: number;
  top: number;
  angle: number;
}

/** How one case's piece of evidence is pinned up: fixed per case, from its id. */
export interface Piece {
  /** The piece's tilt, between -2° and 2°. */
  tilt: number;
  /** The scorched backing's own small tilt against the picture. */
  backingTilt: number;
  /** One or two strips of tape, at slightly different angles. */
  tapes: TapeStrip[];
  /** A tear across one corner, or none. */
  tear: 'tl' | 'tr' | 'bl' | 'br' | null;
}

/** Where tape can go: across the top corners, or the middle of the top edge. */
const TAPE_SPOTS = [
  { left: 8, top: 4, angle: -34 },
  { left: 92, top: 4, angle: 32 },
  { left: 50, top: -1, angle: -4 },
] as const;

/** One case's piece: the same every visit (a hash of its id), different from case to case. */
export function pieceOf(id: string): Piece {
  const unit = (salt: string) => hashUnit(id, salt);
  const tilt = Math.round((unit('tilt') * 4 - 2) * 100) / 100;
  const first = Math.floor(unit('tape-a') * TAPE_SPOTS.length) % TAPE_SPOTS.length;
  const two = unit('tapes') < 0.6;
  const second = (first + 1 + Math.floor(unit('tape-b') * (TAPE_SPOTS.length - 1))) % TAPE_SPOTS.length;
  const strip = (index: number, salt: string): TapeStrip => {
    const spot = TAPE_SPOTS[index];
    return { left: spot.left, top: spot.top, angle: Math.round(spot.angle + (unit(salt) * 10 - 5)) };
  };
  const tapes = two ? [strip(first, 'angle-a'), strip(second, 'angle-b')] : [strip(first, 'angle-a')];
  // Some pieces (not all) are torn across a corner, never the one a sealed tape crosses (top right).
  const torn = unit('torn') < 0.55;
  const tear = torn ? (['tl', 'bl', 'br'] as const)[Math.floor(unit('corner') * 3) % 3] : null;
  return { tilt, backingTilt: Math.round((unit('backing') * 2.4 - 1.2) * 100) / 100, tapes, tear };
}
