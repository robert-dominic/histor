// src/lib/materials.ts
// The materials of the dread pass (dread pass, 1): everything recovered from the sea. Which torn edge a sheet has, and
// whether it carries a water ring or a curled corner, by a seeded pick from its id, so a file looks the same every
// visit and no two neighbours are alike. Pure.
import { hashUnit } from '@/lib/desk';

/** How many torn-edge masks there are (`.deckle-0` to `.deckle-3` in effects.css). */
export const DECKLES = 4;

/** The torn-edge mask class for `id`. */
export function deckleOf(id: string): string {
  return `deckle-${Math.floor(hashUnit(id, 'deckle') * DECKLES) % DECKLES}`;
}

/** The odd mark on a sheet: about one in three has a water ring (and where), about one in four a curled corner. */
export function paperMarks(id: string): { ring: { x: number; y: number } | null; curl: boolean } {
  const ring = hashUnit(id, 'ring') < 0.34 ? { x: 55 + hashUnit(id, 'ring-x') * 30, y: 8 + hashUnit(id, 'ring-y') * 60 } : null;
  return { ring, curl: hashUnit(id, 'curl') < 0.25 };
}
