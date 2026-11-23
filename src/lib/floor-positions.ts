// src/lib/floor-positions.ts
// Where the player has dropped folders on the desktop floor, kept in the browser under its own key
// (`histor:case:{caseId}:floor`), so a reload keeps the floor as the player left it. It is apart from the
// investigation and never touches it. Every read and write is wrapped: the floor works without storage, it just
// forgets.
import type { DroppedSpot } from '@/lib/floor';

/** The storage key for a case's floor. */
export function floorKey(caseId: string): string {
  return `histor:case:${caseId}:floor`;
}

/** Most folders remembered: more than any case has. */
const MAX_SPOTS = 200;

const isShare = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1;

/**
 * The folders dropped on this case's floor, in the order they were dropped. Anything that is not a spot of a known
 * file is left out; a missing or broken entry gives an empty floor.
 *
 * @param knownIds - the case's evidence ids
 */
export function loadFloorPositions(caseId: string, knownIds: readonly string[]): Map<string, DroppedSpot> {
  const spots = new Map<string, DroppedSpot>();
  try {
    const json = localStorage.getItem(floorKey(caseId));
    if (json === null) {
      return spots;
    }
    const parsed: unknown = JSON.parse(json);
    if (!Array.isArray(parsed)) {
      return spots;
    }
    const known = new Set(knownIds);
    for (const entry of parsed.slice(0, MAX_SPOTS)) {
      if (Array.isArray(entry) && entry.length === 2 && typeof entry[0] === 'string' && known.has(entry[0])) {
        const spot = entry[1] as Partial<DroppedSpot> | null;
        if (spot !== null && typeof spot === 'object' && isShare(spot.fx) && isShare(spot.fy)) {
          spots.delete(entry[0]);
          spots.set(entry[0], { fx: spot.fx, fy: spot.fy });
        }
      }
    }
  } catch {
    spots.clear();
  }
  return spots;
}

/** Saves the dropped folders, in the order they were dropped. Fails silently. */
export function saveFloorPositions(caseId: string, spots: ReadonlyMap<string, DroppedSpot>): void {
  try {
    localStorage.setItem(floorKey(caseId), JSON.stringify([...spots.entries()].slice(-MAX_SPOTS)));
  } catch {
    // Storage is full or unavailable: the floor keeps its places in memory for this visit.
  }
}
