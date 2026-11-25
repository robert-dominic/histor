// src/lib/eye-watch.ts
// When the face appears (dread pass, 4; a face without flesh since the fix list: hollow eyes and a nose): rarely. Never in the first 30 seconds of activity, then at most once every 60 to
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
  /** How long it looks to one side, before it fades (s). */
  lookFor: [2, 3],
  /** Its size: this tall (px), and this wide; a zone smaller than that is not used. */
  height: 120,
  width: 100,
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

/** How far the points of light inside the sockets move when it looks to one side, in the drawing's units. */
export const FACE_GLANCE = 8;

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
