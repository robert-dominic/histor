// src/lib/__tests__/floor.test.ts
// The floor layout (desk-fixes item 3): every file in rows, each in its own cell, none covering another; the same
// every time; and a folder the player drops moves only that folder.
import { describe, expect, test } from 'vitest';
import maryCeleste from '@/cases/mary-celeste/case';
import { MAX_JITTER, MAX_TILT, MIN_SCALE, droppedSpot, floorLayout, placeOnFloor, polygonsOverlap } from '@/lib/floor';
import type { FolderBox } from '@/lib/floor';

/** A folder on the desktop floor: 7.75rem by 6rem, its tab and label across the top left. */
export const FOLDER: FolderBox = { width: 124, height: 96, label: { x: 8, y: 0, width: 100, height: 60 } };
const IDS = maryCeleste.evidence.map(evidence => evidence.id);

/**
 * The floor's size on the desk at a given screen: the screen minus the case header (2.75rem), the desk's header
 * (3.5rem), the board's 46 parts of the rest, the floor row's padding and its label (1.25rem), the tray (13rem) and
 * the gap beside it.
 */
function floorAt(screenWidth: number, screenHeight: number) {
  const rows = screenHeight - 44 - 56;
  return { width: screenWidth - 32 - 208 - 16, height: Math.floor((rows * 54) / 100) - 12 - 20 };
}

describe('floorLayout with the Mary Celeste files', () => {
  test('there are 23 files to place', () => {
    expect(IDS).toHaveLength(23);
  });

  test.each([
    [1366, 768],
    [1440, 900],
    [1280, 720],
    [1920, 1080],
  ])('at a %i×%i screen the 23 folders lie apart, in rows, readable (at least 90%% of their size)', (width, height) => {
    const floor = floorAt(width, height);
    const layout = floorLayout(IDS, floor, FOLDER);
    expect(layout.apart).toBe(true);
    expect(layout.places.map(place => place.id)).toEqual(IDS);
    if (width >= 1366) {
      expect(layout.scale).toBeGreaterThanOrEqual(0.9);
    }
    // More than one row, and rows across the floor.
    const rows = new Set(layout.places.map(place => Math.round(place.y / layout.cell.height)));
    expect(rows.size).toBeGreaterThan(1);
    expect(rows.size).toBeLessThan(IDS.length);
  });

  test('every tilt is within ±6°, every offset within ±12px of its cell, and they really vary', () => {
    const floor = floorAt(1440, 900);
    const layout = floorLayout(IDS, floor, FOLDER);
    const columns = Math.round(floor.width / layout.cell.width);
    const tilts = new Set(layout.places.map(place => Math.round(place.rotate * 10)));
    expect(tilts.size).toBeGreaterThan(10);
    layout.places.forEach((place, index) => {
      expect(Math.abs(place.rotate)).toBeLessThanOrEqual(MAX_TILT);
      const row = Math.floor(index / columns);
      const inRow = Math.min(columns, IDS.length - row * columns);
      const cx = ((columns - inRow) * layout.cell.width) / 2 + ((index % columns) + 0.5) * layout.cell.width;
      const cy = (row + 0.5) * layout.cell.height;
      expect(Math.abs(place.x + FOLDER.width / 2 - cx)).toBeLessThanOrEqual(MAX_JITTER + 0.01);
      expect(Math.abs(place.y + FOLDER.height / 2 - cy)).toBeLessThanOrEqual(MAX_JITTER + 0.01);
    });
  });

  test('a roomy floor keeps the folders at full size', () => {
    expect(floorLayout(IDS, { width: 2000, height: 900 }, FOLDER).scale).toBe(1);
  });

  test('a tight floor shrinks the folders, but never below 75%', () => {
    const { scale } = floorLayout(IDS, { width: 800, height: 250 }, FOLDER);
    expect(scale).toBeLessThan(1);
    expect(scale).toBeGreaterThanOrEqual(MIN_SCALE);
  });

  test('the same inputs give the same places', () => {
    const floor = floorAt(1366, 768);
    expect(floorLayout(IDS, floor, FOLDER)).toStrictEqual(floorLayout(IDS, floor, FOLDER));
  });

  test('no ids, no places', () => {
    expect(floorLayout([], { width: 1000, height: 400 }, FOLDER).places).toEqual([]);
  });

  test('one folder lies near the middle', () => {
    const { places } = floorLayout(['e-one'], { width: 1000, height: 400 }, FOLDER);
    expect(places).toHaveLength(1);
    expect(Math.abs(places[0].x + FOLDER.width / 2 - 500)).toBeLessThanOrEqual(MAX_JITTER);
    expect(Math.abs(places[0].y + FOLDER.height / 2 - 200)).toBeLessThanOrEqual(MAX_JITTER);
  });

  test('the same file keeps its tilt when the floor changes size', () => {
    const wide = floorLayout(IDS, floorAt(1920, 1080), FOLDER).places;
    const narrow = floorLayout(IDS, floorAt(1366, 768), FOLDER).places;
    const same = wide.filter((place, index) => place.rotate === narrow[index].rotate).length;
    expect(same).toBe(IDS.length);
  });
});

describe('placeOnFloor: what the player moves', () => {
  const floor = floorAt(1366, 768);
  const layout = floorLayout(IDS, floor, FOLDER);

  test('with nothing dropped, every folder is on its own spot', () => {
    expect(placeOnFloor(layout, floor, FOLDER, new Map())).toEqual(layout.places);
  });

  test('a dropped folder lies where it was dropped, on top, with its own tilt; no other folder moves', () => {
    const spot = droppedSpot(300, 120, floor);
    const places = placeOnFloor(layout, floor, FOLDER, new Map([['e-sword', spot]]));
    const sword = places.find(place => place.id === 'e-sword')!;
    expect(sword.x + FOLDER.width / 2).toBeCloseTo(300, 0);
    expect(sword.y + FOLDER.height / 2).toBeCloseTo(120, 0);
    expect(sword.rotate).toBe(layout.places.find(place => place.id === 'e-sword')!.rotate);
    expect(sword.z).toBeGreaterThan(Math.max(...layout.places.map(place => place.z)));
    expect(places.filter(place => place.id !== 'e-sword')).toEqual(layout.places.filter(place => place.id !== 'e-sword'));
  });

  test('a folder dropped at the edge is kept inside the floor', () => {
    const places = placeOnFloor(layout, floor, FOLDER, new Map([['e-galley', { fx: 1, fy: 1 }]]));
    const galley = places.find(place => place.id === 'e-galley')!;
    expect(galley.x + FOLDER.width / 2 + (FOLDER.width * layout.scale) / 2).toBeLessThanOrEqual(floor.width + 0.01);
    expect(galley.y + FOLDER.height / 2 + (FOLDER.height * layout.scale) / 2).toBeLessThanOrEqual(floor.height + 0.01);
  });

  test('a spot is remembered as a share of the floor, so it survives a change of size', () => {
    expect(droppedSpot(555, 174, { width: 1110, height: 348 })).toEqual({ fx: 0.5, fy: 0.5 });
    expect(droppedSpot(-40, 9000, { width: 1110, height: 348 })).toEqual({ fx: 0, fy: 1 });
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
