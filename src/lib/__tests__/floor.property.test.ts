// src/lib/__tests__/floor.property.test.ts
// Properties 1–4 of .kiro/specs/fix-pack: the floor layout. Pure logic, so they run in Node.
import * as fc from 'fast-check';
import { describe, expect, test } from 'vitest';
import { MAX_TILT, floorLayout } from '@/lib/floor';
import type { FloorLayout, FloorSize, FolderBox } from '@/lib/floor';

/** About the size of a folder on the desk. */
const FOLDER: FolderBox = { width: 184, height: 130, label: { x: 14, y: 12, width: 120, height: 40 } };

const ids = fc.uniqueArray(fc.stringMatching(/^e-[a-z0-9]{1,8}$/), { minLength: 0, maxLength: 30 });
const floors: fc.Arbitrary<FloorSize> = fc.record({
  width: fc.integer({ min: 800, max: 2000 }),
  height: fc.integer({ min: 300, max: 600 }),
});

type Point = readonly [number, number];

/** Corners of a folder's whole outline, or of its label, as the layout draws it: scaled and tilted about the centre. */
function outline(layout: FloorLayout, id: string, part: 'whole' | 'label'): Point[] {
  const place = layout.places.find(candidate => candidate.id === id)!;
  const s = layout.scale;
  const cx = place.x + FOLDER.width / 2;
  const cy = place.y + FOLDER.height / 2;
  const box =
    part === 'whole'
      ? { x: cx - (FOLDER.width * s) / 2, y: cy - (FOLDER.height * s) / 2, w: FOLDER.width * s, h: FOLDER.height * s }
      : {
          x: cx - (FOLDER.width * s) / 2 + FOLDER.label.x * s,
          y: cy - (FOLDER.height * s) / 2 + FOLDER.label.y * s,
          w: FOLDER.label.width * s,
          h: FOLDER.label.height * s,
        };
  const angle = (place.rotate * Math.PI) / 180;
  return (
    [
      [box.x, box.y],
      [box.x + box.w, box.y],
      [box.x + box.w, box.y + box.h],
      [box.x, box.y + box.h],
    ] as Point[]
  ).map(([x, y]) => {
    const dx = x - cx;
    const dy = y - cy;
    return [cx + dx * Math.cos(angle) - dy * Math.sin(angle), cy + dx * Math.sin(angle) + dy * Math.cos(angle)] as Point;
  });
}

/** An independent overlap test: do the interiors of two convex quadrilaterals share any area? */
function overlapArea(a: Point[], b: Point[]): boolean {
  // Separating axes from both polygons' edges.
  for (const polygon of [a, b]) {
    for (let i = 0; i < 4; i += 1) {
      const p = polygon[i];
      const q = polygon[(i + 1) % 4];
      const nx = q[1] - p[1];
      const ny = p[0] - q[0];
      const len = Math.hypot(nx, ny);
      const range = (poly: Point[]) => {
        const v = poly.map(([x, y]) => (x * nx + y * ny) / len);
        return [Math.min(...v), Math.max(...v)];
      };
      const [aMin, aMax] = range(a);
      const [bMin, bMax] = range(b);
      if (aMax <= bMin + 1e-6 || bMax <= aMin + 1e-6) {
        return false;
      }
    }
  }
  return true;
}

describe('Floor layout properties', () => {
  /**
   * Feature: fix-pack, Property 1: Every floor folder lies inside the floor
   * **Validates: Requirements 13.3, 13.4**
   */
  test('Property 1: every folder lies inside the floor', () => {
    fc.assert(
      fc.property(ids, floors, (list, floor) => {
        const layout = floorLayout(list, floor, FOLDER);
        for (const id of list) {
          for (const [x, y] of outline(layout, id, 'whole')) {
            expect(x).toBeGreaterThanOrEqual(-1e-6);
            expect(y).toBeGreaterThanOrEqual(-1e-6);
            expect(x).toBeLessThanOrEqual(floor.width + 1e-6);
            expect(y).toBeLessThanOrEqual(floor.height + 1e-6);
          }
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: fix-pack, Property 2: The floor layout is deterministic
   * **Validates: Requirements 13.3, 13.4**
   */
  test('Property 2: two calls give the same result, and the inputs are unchanged', () => {
    fc.assert(
      fc.property(ids, floors, (list, floor) => {
        const listBefore = [...list];
        const floorBefore = { ...floor };
        const folderBefore = JSON.parse(JSON.stringify(FOLDER));
        const first = floorLayout(list, floor, FOLDER);
        const second = floorLayout(list, floor, FOLDER);
        expect(second).toStrictEqual(first);
        expect(list).toEqual(listBefore);
        expect(floor).toEqual(floorBefore);
        expect(FOLDER).toEqual(folderBefore);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: fix-pack, Property 3: No folder label is covered
   * **Validates: Requirements 13.2, 13.4**
   */
  test('Property 3: no label meets the folder of anything above it', () => {
    fc.assert(
      fc.property(ids, floors, (list, floor) => {
        const layout = floorLayout(list, floor, FOLDER);
        const byZ = [...layout.places].sort((a, b) => a.z - b.z);
        byZ.forEach((place, index) => {
          const label = outline(layout, place.id, 'label');
          for (const above of byZ.slice(index + 1)) {
            expect(overlapArea(label, outline(layout, above.id, 'whole'))).toBe(false);
          }
        });
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: fix-pack, Property 4: Floor tilts stay within eight degrees
   * **Validates: Requirements 13.2, 13.3**
   */
  test('Property 4: every tilt is within ±8° and every id appears once', () => {
    fc.assert(
      fc.property(ids, floors, (list, floor) => {
        const { places, scale } = floorLayout(list, floor, FOLDER);
        expect(places.map(place => place.id).sort()).toEqual([...list].sort());
        expect(new Set(places.map(place => place.id)).size).toBe(list.length);
        for (const place of places) {
          expect(place.rotate).toBeGreaterThanOrEqual(-MAX_TILT);
          expect(place.rotate).toBeLessThanOrEqual(MAX_TILT);
        }
        expect(scale).toBeGreaterThanOrEqual(0.7);
        expect(scale).toBeLessThanOrEqual(1);
      }),
      { numRuns: 100 }
    );
  });
});
