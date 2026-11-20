// src/lib/__tests__/floor.test.ts
import { describe, expect, test } from 'vitest';
import maryCeleste from '@/cases/mary-celeste/case';
import { MAX_TILT, MIN_SCALE, floorLayout, polygonsOverlap } from '@/lib/floor';
import type { FolderBox } from '@/lib/floor';

/** About the size of a folder on the desk: 184px wide, with its tab and label across the top left. */
export const FOLDER: FolderBox = { width: 184, height: 130, label: { x: 14, y: 12, width: 120, height: 40 } };
const IDS = maryCeleste.evidence.map(evidence => evidence.id);

describe('floorLayout with the Mary Celeste files', () => {
  test('there are 23 files to place', () => {
    expect(IDS).toHaveLength(23);
  });

  test.each([
    [1080, 380],
    [1100, 360],
    [900, 330],
    [1300, 420],
  ])('at a floor of %i×%i every file has one place, in order, with a tilt of at most 8°', (width, height) => {
    const { places, scale } = floorLayout(IDS, { width, height }, FOLDER);
    expect(places.map(place => place.id)).toEqual(IDS);
    expect(places.map(place => place.z)).toEqual(IDS.map((_, index) => index));
    for (const place of places) {
      expect(Math.abs(place.rotate)).toBeLessThanOrEqual(MAX_TILT);
    }
    expect(scale).toBeGreaterThanOrEqual(MIN_SCALE);
    expect(scale).toBeLessThanOrEqual(1);
  });

  test('the folders really are tilted: not all the same, not all straight', () => {
    const { places } = floorLayout(IDS, { width: 1100, height: 380 }, FOLDER);
    const tilts = new Set(places.map(place => Math.round(place.rotate * 10)));
    expect(tilts.size).toBeGreaterThan(10);
  });

  test('a roomy floor keeps the folders at full size', () => {
    expect(floorLayout(IDS, { width: 2000, height: 900 }, FOLDER).scale).toBe(1);
  });

  test('a tight floor shrinks the folders, but never below 70%', () => {
    const { scale } = floorLayout(IDS, { width: 800, height: 300 }, FOLDER);
    expect(scale).toBeLessThan(1);
    expect(scale).toBeGreaterThanOrEqual(MIN_SCALE);
  });

  test('the same inputs give the same places', () => {
    const floor = { width: 1100, height: 380 };
    expect(floorLayout(IDS, floor, FOLDER)).toStrictEqual(floorLayout(IDS, floor, FOLDER));
  });

  test('no ids, no places', () => {
    expect(floorLayout([], { width: 1000, height: 400 }, FOLDER)).toEqual({ places: [], scale: 1 });
  });

  test('one folder lies near the middle', () => {
    const { places } = floorLayout(['e-one'], { width: 1000, height: 400 }, FOLDER);
    expect(places).toHaveLength(1);
    // Within the jitter of the middle of the floor.
    expect(Math.abs(places[0].x + FOLDER.width / 2 - 500)).toBeLessThanOrEqual(10);
    expect(Math.abs(places[0].y + FOLDER.height / 2 - 200)).toBeLessThanOrEqual(8);
  });

  test('a short last row is centred under the rows above it', () => {
    const { places } = floorLayout(IDS.slice(0, 7), { width: 1100, height: 380 }, FOLDER);
    expect(places).toHaveLength(7);
  });

  test('the same file keeps its tilt when the floor changes size', () => {
    const wide = floorLayout(IDS, { width: 1300, height: 420 }, FOLDER).places;
    const narrow = floorLayout(IDS, { width: 1100, height: 380 }, FOLDER).places;
    // Tilt comes from the id alone, scaled down only where a label needed room.
    const same = wide.filter((place, index) => place.rotate === narrow[index].rotate).length;
    expect(same).toBeGreaterThan(IDS.length / 2);
  });
});

describe('polygonsOverlap', () => {
  const square = (x: number, y: number, size: number) =>
    [
      [x, y],
      [x + size, y],
      [x + size, y + size],
      [x, y + size],
    ] as const;

  test('overlapping squares overlap', () => {
    expect(polygonsOverlap(square(0, 0, 10), square(5, 5, 10))).toBe(true);
  });

  test('apart, they do not', () => {
    expect(polygonsOverlap(square(0, 0, 10), square(20, 0, 10))).toBe(false);
  });

  test('squares that only touch do not overlap', () => {
    expect(polygonsOverlap(square(0, 0, 10), square(10, 0, 10))).toBe(false);
  });

  test('a turned square can slip past a corner', () => {
    const diamond = [
      [20, 5],
      [25, 10],
      [20, 15],
      [15, 10],
    ] as const;
    expect(polygonsOverlap(square(0, 0, 10), diamond)).toBe(false);
    expect(polygonsOverlap(square(0, 0, 10), [[13, 5], [18, 10], [13, 15], [8, 10]] as const)).toBe(true);
  });
});
