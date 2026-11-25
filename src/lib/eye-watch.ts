// src/lib/eye-watch.ts
// When the eye opens (dread pass, 4): rarely. Never in the first 30 seconds of activity, then at most once every 60 to
// 120 seconds of it. Activity is time with the page in view and the player doing something (an input in the last
// 15 seconds), so it never opens on an idle screen. Where: a zone marked `[data-eye-zone]` that is on screen, in a
// scene that is showing, and that holds no text and no control. Pure parts, tested.

export const EYE = {
  /** Seconds of activity before the first eye. */
  firstAfter: 30,
  /** Seconds of activity between two eyes. */
  between: [60, 120],
  /** An input this recent (s) counts as activity. */
  activeWithin: 15,
  /** How long it follows the cursor once open (s). */
  followFor: [2, 3],
  /** Its size: at most this wide (px), and never more than the zone allows. */
  maxWidth: 140,
} as const;

/** Whether an eye may open now: enough activity, and enough since the last. */
export function eyeDue(activeSeconds: number, nextAt: number): boolean {
  return activeSeconds >= Math.max(EYE.firstAfter, nextAt);
}

/** The next time (in seconds of activity) an eye may open, after one at `now`. */
export function nextEyeAt(now: number, random: () => number = Math.random): number {
  const [low, high] = EYE.between;
  return now + low + random() * (high - low);
}

/** How far the lids travel to open (in the eye drawing's units): the upper lid stays heavy, part of the iris covered. */
export const EYE_OPEN = { upper: -34, lower: 22 } as const;
/** How far the gaze can move from the centre, in the drawing's units. */
export const EYE_GAZE = { x: 34, y: 9 } as const;

const CONTROL = 'a[href], button, input, select, textarea, [role="button"], [role="link"], [role="menuitem"], [tabindex]:not([tabindex="-1"]), [data-portal-trigger]';

/** True when nothing readable or pressable lies under the box (at its centre and near its corners). */
export function boxIsClear(box: DOMRect, ignore: (element: Element) => boolean): boolean {
  if (typeof document.elementsFromPoint !== 'function') {
    return false;
  }
  const inset = 0.15;
  const points = [
    [0.5, 0.5],
    [inset, inset],
    [1 - inset, inset],
    [inset, 1 - inset],
    [1 - inset, 1 - inset],
  ];
  return points.every(([fx, fy]) =>
    document.elementsFromPoint(box.left + box.width * fx, box.top + box.height * fy).every(element => {
      if (ignore(element)) {
        return true;
      }
      if (element.closest(CONTROL) !== null) {
        return false;
      }
      // Text of its own (not only in children) is something to read.
      return ![...element.childNodes].some(node => node.nodeType === Node.TEXT_NODE && (node.textContent ?? '').trim() !== '');
    })
  );
}
