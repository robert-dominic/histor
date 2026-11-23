// src/lib/floor.ts
// Where the evidence folders lie on the desk's floor: in rows across the table, seen from above, each a little off
// its spot and slightly tilted, so they still look scattered by hand. No folder covers another: at most their cells'
// edges touch, so every tab and label is always in view and nothing hides under anything else.
//
// The places are worked out once, for every file of the case, from the file ids and the floor's size alone. Which
// files are on the floor right now does not matter: a pinned file leaves its spot empty and the others stay where
// they are, and a file sent back to the floor returns to its own spot (or to where the player dropped it, which is
// kept apart: `placeOnFloor`). Pure: the same inputs always give the same places, with no randomness (the offsets
// and tilts come from `hashUnit` of the file's id).
import { hashUnit } from '@/lib/desk';

/** The floor's size in px. */
export interface FloorSize {
  width: number;
  height: number;
}

/** A folder's natural size in px, and where its tab and label are, from the folder's top-left corner. */
export interface FolderBox {
  width: number;
  height: number;
  /** The part of the folder that must stay visible: the tab and the typed label. */
  label: { x: number; y: number; width: number; height: number };
}

/**
 * Where one folder lies. `x` and `y` are the top-left corner of the folder at its natural size; the folder is
 * then scaled by `FloorLayout.scale` and rotated by `rotate`, both about its centre.
 */
export interface FloorPlace {
  id: string;
  x: number;
  y: number;
  /** Degrees, between −6 and 6. */
  rotate: number;
  /** Stacking order. Folders never overlap, so it only matters for one dropped by hand. */
  z: number;
}

export interface FloorLayout {
  places: FloorPlace[];
  /** How much smaller than natural size the folders are drawn, so that they fit. 1 when the floor is roomy. */
  scale: number;
  /** Each folder's cell: the folder, tilted and moved off its spot, always stays inside it. */
  cell: { width: number; height: number };
  /** True when every folder fits its cell, so none overlaps another. False only on a floor too small for them. */
  apart: boolean;
}

/** The most a folder is tilted, in degrees. */
export const MAX_TILT = 6;
/** The most a folder strays from the middle of its cell, in px on screen. */
export const MAX_JITTER = 12;
/** Smallest the folders are drawn before the layout gives up keeping them apart. */
export const MIN_SCALE = 0.75;
/** Room kept around the most tilted folder in its cell, in px, so that even it can stray a little. */
const SLACK = 8;

type Point = readonly [number, number];

/** The four corners of a `width` × `height` rectangle with its top-left at (x, y), turned by `degrees` about `centre`. */
export function corners(x: number, y: number, width: number, height: number, degrees: number, centre: Point): Point[] {
  const radians = (degrees * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  return (
    [
      [x, y],
      [x + width, y],
      [x + width, y + height],
      [x, y + height],
    ] as Point[]
  ).map(([px, py]) => {
    const dx = px - centre[0];
    const dy = py - centre[1];
    return [centre[0] + dx * cos - dy * sin, centre[1] + dx * sin + dy * cos] as Point;
  });
}

/** True when two convex polygons overlap by more than a hair (separating-axis test). */
export function polygonsOverlap(a: readonly Point[], b: readonly Point[]): boolean {
  for (const polygon of [a, b]) {
    for (let index = 0; index < polygon.length; index += 1) {
      const [x1, y1] = polygon[index];
      const [x2, y2] = polygon[(index + 1) % polygon.length];
      // The edge's normal is an axis; project both polygons on it.
      const axis: Point = [y1 - y2, x2 - x1];
      const project = (points: readonly Point[]) => {
        const values = points.map(([px, py]) => px * axis[0] + py * axis[1]);
        return [Math.min(...values), Math.max(...values)] as const;
      };
      const [minA, maxA] = project(a);
      const [minB, maxB] = project(b);
      const length = Math.hypot(axis[0], axis[1]) || 1;
      if (maxA - minB <= 1e-6 * length || maxB - minA <= 1e-6 * length) {
        return false;
      }
    }
  }
  return true;
}

/** The bounding box of a `width` × `height` rectangle turned by `degrees`. */
function tiltedExtent(width: number, height: number, degrees: number): { width: number; height: number } {
  const radians = (Math.abs(degrees) * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  return { width: width * cos + height * sin, height: width * sin + height * cos };
}

const round = (value: number) => Math.round(value * 100) / 100;

/**
 * The grid: the number of columns that lets the folders be drawn largest, with the most tilted folder still
 * inside its cell with `SLACK` to spare.
 */
function planGrid(count: number, floor: FloorSize, folder: FolderBox) {
  const unit = tiltedExtent(folder.width, folder.height, MAX_TILT);
  let best: { columns: number; rows: number; scale: number } | null = null;
  for (let columns = 1; columns <= count; columns += 1) {
    const rows = Math.ceil(count / columns);
    // A grid with a whole empty row is never better than one with fewer columns.
    if (columns > 1 && Math.ceil(count / (columns - 1)) === rows) {
      continue;
    }
    const cellWidth = floor.width / columns;
    const cellHeight = floor.height / rows;
    const scale = Math.min(1, (cellWidth - SLACK) / unit.width, (cellHeight - SLACK) / unit.height);
    if (best === null || scale > best.scale + 1e-9) {
      best = { columns, rows, scale };
    }
  }
  return best!;
}

/**
 * Places every folder of the case on the floor.
 *
 * The folders lie in rows, in case order, each in its own cell; a short last row is centred under the others.
 * Within its cell a folder is tilted by up to 6° and moved off the middle by up to 12px, both taken from its id,
 * and never by so much that it leaves the cell. So no folder covers another, and all of them lie inside the floor.
 * The folders are drawn as large as that allows, at most at their natural size and at least at 75%; on a floor too
 * small even for that, tilts and offsets shrink to nothing before the folders are allowed to overlap.
 *
 * @param ids - every file of the case, in case order (not only those on the floor now)
 */
export function floorLayout(ids: readonly string[], floor: FloorSize, folder: FolderBox): FloorLayout {
  if (ids.length === 0 || floor.width <= 0 || floor.height <= 0) {
    return { places: [], scale: 1, cell: { width: floor.width, height: floor.height }, apart: true };
  }
  const { columns, rows, scale: fitted } = planGrid(ids.length, floor, folder);
  const scale = round(Math.max(MIN_SCALE, Math.floor(fitted * 100) / 100));
  const cellWidth = floor.width / columns;
  const cellHeight = floor.height / rows;
  const width = folder.width * scale;
  const height = folder.height * scale;
  let apart = true;

  const places = ids.map((id, index) => {
    const row = Math.floor(index / columns);
    const column = index - row * columns;
    const inRow = Math.min(columns, ids.length - row * columns);
    const cx = ((columns - inRow) * cellWidth) / 2 + (column + 0.5) * cellWidth;
    const cy = (row + 0.5) * cellHeight;
    // The tilt from the id, halved until the folder fits its cell (only ever needed on a very small floor).
    let rotate = (hashUnit(id, 'rot') * 2 - 1) * MAX_TILT;
    let extent = tiltedExtent(width, height, rotate);
    for (let halvings = 0; (extent.width > cellWidth || extent.height > cellHeight) && halvings < 4; halvings += 1) {
      rotate /= 2;
      extent = tiltedExtent(width, height, rotate);
    }
    if (extent.width > cellWidth || extent.height > cellHeight) {
      rotate = 0;
      extent = tiltedExtent(width, height, 0);
      apart = apart && extent.width <= cellWidth && extent.height <= cellHeight;
    }
    // The offset from the id, as far as the room left in the cell allows (a hair less, for rounding).
    const roomX = Math.max(0, Math.min(MAX_JITTER, (cellWidth - extent.width) / 2 - 0.02));
    const roomY = Math.max(0, Math.min(MAX_JITTER, (cellHeight - extent.height) / 2 - 0.02));
    const x = cx + (hashUnit(id, 'fx') * 2 - 1) * roomX;
    const y = cy + (hashUnit(id, 'fy') * 2 - 1) * roomY;
    return { id, x: round(x - folder.width / 2), y: round(y - folder.height / 2), rotate: round(rotate), z: index };
  });
  return { places, scale, cell: { width: cellWidth, height: cellHeight }, apart };
}

/** Where a folder was dropped by hand: its centre, as a share of the floor's width and height (0 to 1). */
export interface DroppedSpot {
  fx: number;
  fy: number;
}

/**
 * Where each folder on the floor lies now: its own place from `layout`, or, for a folder the player dropped
 * somewhere, there (kept inside the floor, with its own tilt, above the others in the order they were dropped).
 * A folder's place depends only on its own spot and its own drop, so moving one folder never moves another.
 *
 * @param dropped - the folders dropped by hand, in the order they were dropped
 */
export function placeOnFloor(
  layout: FloorLayout,
  floor: FloorSize,
  folder: FolderBox,
  dropped: ReadonlyMap<string, DroppedSpot>
): FloorPlace[] {
  const order = [...dropped.keys()];
  const halfWidth = (folder.width * layout.scale) / 2;
  const halfHeight = (folder.height * layout.scale) / 2;
  return layout.places.map(place => {
    const spot = dropped.get(place.id);
    if (spot === undefined) {
      return place;
    }
    const clamp = (value: number, low: number, high: number) => (low > high ? (low + high) / 2 : Math.min(high, Math.max(low, value)));
    const cx = clamp(spot.fx * floor.width, halfWidth, floor.width - halfWidth);
    const cy = clamp(spot.fy * floor.height, halfHeight, floor.height - halfHeight);
    return {
      id: place.id,
      x: round(cx - folder.width / 2),
      y: round(cy - folder.height / 2),
      rotate: place.rotate,
      z: layout.places.length + order.indexOf(place.id),
    };
  });
}

/** The spot to remember for a folder dropped with its centre at (cx, cy) on the floor. */
export function droppedSpot(cx: number, cy: number, floor: FloorSize): DroppedSpot {
  const share = (value: number, size: number) => (size > 0 ? Math.min(1, Math.max(0, value / size)) : 0.5);
  return { fx: Math.round(share(cx, floor.width) * 10000) / 10000, fy: Math.round(share(cy, floor.height) * 10000) / 10000 };
}
