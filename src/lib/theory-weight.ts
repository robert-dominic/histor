// src/lib/theory-weight.ts
// The board answers back (investigation brief, item 2): each theory looks as heavy as the player's own argument for
// it. Worked out from the player's pins and how many files they have opened, nothing else: it never reveals what
// historians think.

/** How a theory looks on the board. */
export type TheoryWeight = 'forgotten' | 'normal' | 'heavy' | 'heaviest';

/** The rules, to tune. */
export const THEORY_WEIGHT = {
  /** A theory with this many files pinned or more grows heavier. */
  heavyAt: 3,
  /** Once the player has opened this many files, a theory with nothing pinned is being forgotten. */
  forgottenAfterOpened: 4,
} as const;

/**
 * Each theory's weight.
 * - `heavy`: `heavyAt` files or more pinned to it;
 * - `heaviest`: a heavy theory with the most pins (every one that shares the most);
 * - `forgotten`: nothing pinned, once `forgottenAfterOpened` files or more have been opened;
 * - `normal`: anything else.
 *
 * @param pinCounts - per theory id, how many files the player has pinned to it (every theory of the case)
 * @param opened - how many files the player has opened
 */
export function theoryWeights(pinCounts: ReadonlyMap<string, number>, opened: number): Map<string, TheoryWeight> {
  const most = Math.max(0, ...pinCounts.values());
  const weights = new Map<string, TheoryWeight>();
  for (const [id, count] of pinCounts) {
    if (count >= THEORY_WEIGHT.heavyAt) {
      weights.set(id, count === most ? 'heaviest' : 'heavy');
    } else if (count === 0 && opened >= THEORY_WEIGHT.forgottenAfterOpened) {
      weights.set(id, 'forgotten');
    } else {
      weights.set(id, 'normal');
    }
  }
  return weights;
}

/**
 * How each weight looks on the board (TheoryNote.tsx), to tune: the chalk's strength, the edge layer's opacity, the
 * lift (px) and the curl's opacity. Chalk at 0.62 on slate still reaches 4.7:1 (0.9: 7.9:1).
 */
export const WEIGHT_LOOK: Record<TheoryWeight, { chalk: number; edge: number; lift: number; curl: number }> = {
  forgotten: { chalk: 0.62, edge: 0, lift: 0, curl: 1 },
  normal: { chalk: 0.9, edge: 0, lift: 0, curl: 0 },
  heavy: { chalk: 1, edge: 0.55, lift: -3, curl: 0 },
  heaviest: { chalk: 1, edge: 1, lift: -5, curl: 0 },
};
