// src/lib/floor.ts
// Where the evidence folders lie on the desk's floor: tossed flat on the table, seen from above, each with a
// slight tilt, a little overlapping, every folder's tab and label still showing. Pure: the same inputs always give
// the same places, with no randomness (jitter and tilt come from `hashUnit` of the file's id).
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
  /** Degrees, between −8 and 8. */
  rotate: number;
  /** Reading order: a later folder lies over an earlier one. */
  z: number;
}

export interface FloorLayout {
  places: FloorPlace[];
  /** How much smaller than natural size the folders are drawn, so that they fit. 1 when the floor is roomy. */
  scale: number;
}

/** The most a folder is tilted, in degrees. */
export const MAX_TILT = 8;
/** Smallest the folders are drawn before the layout gives up making room. */
export const MIN_SCALE = 0.7;
const SCALE_STEP = 0.05;
/** How far a folder may stray from its grid spot, in px at natural size. */
const JITTER = { x: 10, y: 8 } as const;
/** Space kept between a label and the next folder's edge, in px at natural size. */
const LABEL_GAP = 4;
/** Times a folder's jitter is halved before it is set to zero. */
const HALVINGS = 3;

type Point = readonly [number, number];

/** The four corners of a `width` × `height` rectangle with its top-left at (x, y), turned by `degrees` about `centre`. */
function corners(x: number, y: number, width: number, height: number, degrees: number, centre: Point): Point[] {
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

interface Slot {
  /** The grid spot's centre. */
  cx: number;
  cy: number;
}

/** The rotated outline of the whole folder, and of its label, for a folder centred at (cx, cy). */
function outlines(cx: number, cy: number, degrees: number, folder: FolderBox, scale: number) {
  const width = folder.width * scale;
  const height = folder.height * scale;
  const centre: Point = [cx, cy];
  const left = cx - width / 2;
  const top = cy - height / 2;
  return {
    whole: corners(left, top, width, height, degrees, centre),
    label: corners(
      left + folder.label.x * scale,
      top + folder.label.y * scale,
      folder.label.width * scale,
      folder.label.height * scale,
      degrees,
      centre
    ),
  };
}

/** The growth of a rectangle's bounding box when it is turned by the largest tilt. */
function tiltedExtent(width: number, height: number): { width: number; height: number } {
  const radians = (MAX_TILT * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  return { width: width * cos + height * sin, height: width * sin + height * cos };
}

/** One grid at one scale: the best columns × rows that keep every label clear of the folders after it. */
function planGrid(count: number, floor: FloorSize, folder: FolderBox, scale: number) {
  const extent = tiltedExtent(folder.width * scale, folder.height * scale);
  const jitterX = JITTER.x * scale;
  const jitterY = JITTER.y * scale;
  // Centres may lie in this box: every tilted folder, at the largest jitter, stays inside the floor.
  const minX = extent.width / 2 + jitterX;
  const maxX = floor.width - extent.width / 2 - jitterX;
  const minY = extent.height / 2 + jitterY;
  const maxY = floor.height - extent.height / 2 - jitterY;
  // The next folder in a row starts `pitchX` further on, the next row `pitchY` lower. A label stays clear of them
  // when it ends before they begin.
  const needX = (folder.label.x + folder.label.width) * scale + LABEL_GAP * scale;
  const needY = (folder.label.y + folder.label.height) * scale + LABEL_GAP * scale;
  let best: { columns: number; rows: number; pitchX: number; pitchY: number; fit: number } | null = null;
  for (let columns = 1; columns <= count; columns += 1) {
    const rows = Math.ceil(count / columns);
    const pitchX = columns === 1 ? Number.POSITIVE_INFINITY : (maxX - minX) / (columns - 1);
    const pitchY = rows === 1 ? Number.POSITIVE_INFINITY : (maxY - minY) / (rows - 1);
    if (pitchX < needX || pitchY < needY) {
      continue;
    }
    // The least overlap wins: how close the pitch is to the folder's own size, the tighter of the two.
    const fit = Math.min(pitchX / (folder.width * scale), pitchY / (folder.height * scale));
    if (best === null || fit > best.fit) {
      best = { columns, rows, pitchX, pitchY, fit };
    }
  }
  if (best === null) {
    return null;
  }
  const { columns, rows } = best;
  const slots: Slot[] = [];
  for (let index = 0; index < count; index += 1) {
    const row = Math.floor(index / columns);
    const inRow = Math.min(columns, count - row * columns);
    const pitchX = Number.isFinite(best.pitchX) ? best.pitchX : 0;
    const pitchY = Number.isFinite(best.pitchY) ? best.pitchY : 0;
    // A short last row is centred under the rows above it.
    const firstX = columns === 1 ? (minX + maxX) / 2 : minX + ((columns - inRow) * pitchX) / 2;
    const column = index - row * columns;
    slots.push({
      cx: Math.min(maxX, firstX + column * pitchX),
      cy: rows === 1 ? (minY + maxY) / 2 : minY + row * pitchY,
    });
  }
  return { slots, jitterX, jitterY };
}

/** The layout at one scale, or null when its labels cannot be kept clear. */
function layoutAt(ids: readonly string[], floor: FloorSize, folder: FolderBox, scale: number): FloorPlace[] | null {
  const plan = planGrid(ids.length, floor, folder, scale);
  if (plan === null) {
    return null;
  }
  // How much of its jitter and tilt each folder keeps: 1, 1/2, 1/4, 1/8, then none.
  const keep = ids.map(() => 1);
  const place = (index: number) => {
    const id = ids[index];
    const { cx, cy } = plan.slots[index];
    const factor = keep[index];
    const x = cx + (hashUnit(id, 'fx') * 2 - 1) * plan.jitterX * factor;
    const y = cy + (hashUnit(id, 'fy') * 2 - 1) * plan.jitterY * factor;
    const rotate = (hashUnit(id, 'rot') * 2 - 1) * MAX_TILT * factor;
    return { x, y, rotate };
  };
  // Folders later in the reading order lie over earlier ones, so only they can cover a label. Wherever one does,
  // the covered folder keeps less of its jitter and tilt. Moving a folder can change what covers what, so this
  // repeats until nothing is covered. Every pass only ever lowers a folder's share, so it ends.
  const outlineOf = (index: number) => {
    const { x, y, rotate } = place(index);
    return outlines(x, y, rotate, folder, scale);
  };
  let settled = false;
  while (!settled) {
    settled = true;
    for (let index = 0; index < ids.length; index += 1) {
      const label = outlineOf(index).label;
      let covered = false;
      for (let later = index + 1; later < ids.length && !covered; later += 1) {
        covered = polygonsOverlap(label, outlineOf(later).whole);
      }
      if (!covered) {
        continue;
      }
      if (keep[index] === 0) {
        // Even with no jitter and no tilt this label is covered: the grid is too tight at this scale.
        return null;
      }
      keep[index] = keep[index] <= 1 / 2 ** HALVINGS ? 0 : keep[index] / 2;
      settled = false;
    }
  }
  return ids.map((id, index) => {
    const { x, y, rotate } = place(index);
    return { id, x: x - folder.width / 2, y: y - folder.height / 2, rotate, z: index };
  });
}

/**
 * Places the folders on the floor.
 *
 * A grid of the folders in reading order, each with a little jitter and a tilt of up to 8°, both taken from its id.
 * Later folders lie over earlier ones. Wherever a folder would cover the label of one before it, that folder's
 * jitter and tilt are halved (up to three times), then dropped. If even that is not enough, the whole layout is
 * tried again with smaller folders, down to 70%.
 *
 * @param ids - the folders' ids, in reading order
 */
export function floorLayout(ids: readonly string[], floor: FloorSize, folder: FolderBox): FloorLayout {
  if (ids.length === 0) {
    return { places: [], scale: 1 };
  }
  for (let scale = 1; scale >= MIN_SCALE - 1e-9; scale -= SCALE_STEP) {
    const rounded = Math.round(scale * 100) / 100;
    const places = layoutAt(ids, floor, folder, rounded);
    if (places !== null) {
      return { places, scale: rounded };
    }
  }
  // The floor is too small for the labels to stay clear at 70%: stack them as a plain, untilted grid.
  return { places: fallbackGrid(ids, floor, folder), scale: MIN_SCALE };
}

/** The last resort: untilted rows at the smallest scale, as spread out as the floor allows. */
function fallbackGrid(ids: readonly string[], floor: FloorSize, folder: FolderBox): FloorPlace[] {
  const width = folder.width * MIN_SCALE;
  const height = folder.height * MIN_SCALE;
  const columns = Math.max(1, Math.floor(floor.width / width));
  const rows = Math.ceil(ids.length / columns);
  const pitchX = columns === 1 ? 0 : Math.max(0, (floor.width - width) / (columns - 1));
  const pitchY = rows === 1 ? 0 : Math.max(0, (floor.height - height) / (rows - 1));
  return ids.map((id, index) => {
    const row = Math.floor(index / columns);
    const column = index - row * columns;
    const cx = width / 2 + column * Math.min(pitchX, width);
    const cy = height / 2 + row * pitchY;
    return { id, x: cx - folder.width / 2, y: cy - folder.height / 2, rotate: 0, z: index };
  });
}
