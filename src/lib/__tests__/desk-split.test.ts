// src/lib/__tests__/desk-split.test.ts
// The desk's split, floor-first (story-steps brief, 5.2): the floor holds all 23 folders apart with their labels at
// 12px or more, the board gets the rest, never less than it needs for its notes.
import { describe, expect, test } from 'vitest';
import maryCeleste from '@/cases/mary-celeste/case';
import { BOARD_MIN_PX, FLOOR_AT_LEAST, deskSplit } from '@/lib/desk-split';
import { LABEL_PX, MIN_LABEL_PX, MIN_SCALE, floorHeightFor, floorLayout, type FolderBox } from '@/lib/floor';

const FOLDER: FolderBox = { width: 124, height: 96, label: { x: 8, y: 0, width: 100, height: 60 } };
const IDS = maryCeleste.evidence.map(evidence => evidence.id);

/** The desk at a screen: the room the board and floor share, and the floor's width. */
const deskAt = (width: number, height: number) => ({ room: height - 44 - 56, floorWidth: width - 32 - 208 - 16 });

describe('deskSplit', () => {
  test.each([
    [1366, 768],
    [1440, 900],
  ])('at %i×%i every floor label is 12px or more, the folders lie apart, and the board keeps its room', (width, height) => {
    const { room, floorWidth } = deskAt(width, height);
    const split = deskSplit(room, floorWidth, IDS.length, FOLDER);
    const layout = floorLayout(IDS, { width: floorWidth, height: split.floor }, FOLDER);
    expect(layout.apart).toBe(true);
    expect(LABEL_PX * layout.scale).toBeGreaterThanOrEqual(MIN_LABEL_PX - 1e-9);
    expect(split.board).toBeGreaterThanOrEqual(BOARD_MIN_PX);
    expect(split.floorRow).toBeGreaterThanOrEqual(Math.floor(room * FLOOR_AT_LEAST));
    expect(split.board + split.floorRow).toBe(room);
  });

  test('about 55/45 where the floor needs no more; more floor only when the folders need it', () => {
    const { room, floorWidth } = deskAt(1920, 1080);
    const split = deskSplit(room, floorWidth, IDS.length, FOLDER);
    expect(split.floorRow / room).toBeCloseTo(FLOOR_AT_LEAST, 2);
  });

  test('never smaller than the board needs: on a short screen the board keeps its least room', () => {
    const split = deskSplit(500, 900, IDS.length, FOLDER);
    expect(split.board).toBe(BOARD_MIN_PX);
  });
});

describe('floorHeightFor', () => {
  test('the fewest rows that hold the folders at their smallest, with their labels at 12px', () => {
    expect(MIN_SCALE).toBeCloseTo(MIN_LABEL_PX / LABEL_PX, 9);
    const height = floorHeightFor(IDS.length, 1110, FOLDER);
    const layout = floorLayout(IDS, { width: 1110, height }, FOLDER);
    expect(layout.apart).toBe(true);
    expect(layout.scale).toBeGreaterThanOrEqual(MIN_SCALE - 1e-9);
    // One row less would not do.
    expect(floorLayout(IDS, { width: 1110, height: height * 0.66 }, FOLDER).scale).toBeLessThan(MIN_SCALE + 0.01);
  });

  test('nothing to hold, no height', () => {
    expect(floorHeightFor(0, 1000, FOLDER)).toBe(0);
  });
});
