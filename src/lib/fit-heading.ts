// src/lib/fit-heading.ts
// A chapter heading never wraps (quick-fixes brief, item 4). It starts at its design size and shrinks until it fits
// its panel on one line, down to a minimum; if it still does not fit there, the panel widens for that chapter.

/** The smallest a chapter heading is set, in px, before its panel widens instead. */
export const HEADING_MIN_PX = 24;

export interface HeadingFit {
  /** The font size to set, in px. */
  fontPx: number;
  /** How much wider the panel must be for the heading to fit at that size, in px (0 when it fits). */
  widenPx: number;
}

/**
 * Fits a one-line heading: `naturalWidth` is its width at `designPx`, `available` the width it has. Text width
 * scales with font size, so the size that just fits is `designPx * available / naturalWidth`, kept between
 * `minPx` and `designPx`. Rounded down a little so it never overflows by a rounding error.
 */
export function fitHeading(naturalWidth: number, available: number, designPx: number, minPx = HEADING_MIN_PX): HeadingFit {
  if (!(naturalWidth > 0) || !(available > 0) || !(designPx > 0)) {
    return { fontPx: designPx, widenPx: 0 };
  }
  const floor = Math.min(minPx, designPx);
  const fits = Math.floor(((designPx * available) / naturalWidth) * 100) / 100;
  const fontPx = Math.max(floor, Math.min(designPx, fits));
  const width = (naturalWidth * fontPx) / designPx;
  return { fontPx, widenPx: width > available ? Math.ceil(width - available) : 0 };
}

/**
 * A long chapter's page fits the screen by widening its panel, never by shrinking its text (polish brief, A1). The
 * panel starts at its design share of the screen and may grow to `maxShare`; a short chapter keeps its width.
 */
export const PAGE_FIT = {
  /** The panel's design width, as a share of the screen (the stylesheet's `42%`). */
  baseShare: 0.42,
  /** The widest a panel may grow to fit its page, as a share of the screen. */
  maxShare: 0.58,
  /** The search stops once it is this close, in px. */
  precisionPx: 4,
} as const;

/**
 * The smallest widening, in px between `minPx` and `maxPx`, at which `fits(widenPx)` holds. Text only gets shorter as
 * its column gets wider, so `fits` is taken as monotonic and the answer is found by bisection, a handful of layouts.
 * When even `maxPx` does not fit, it returns `maxPx`: as wide as the panel may go.
 */
export function fitPageWidth(fits: (widenPx: number) => boolean, minPx: number, maxPx: number, precisionPx: number = PAGE_FIT.precisionPx): number {
  const low = Math.max(0, minPx);
  const high = Math.max(low, maxPx);
  if (fits(low)) {
    return low;
  }
  if (!fits(high)) {
    return high;
  }
  let lo = low;
  let hi = high;
  while (hi - lo > precisionPx) {
    const mid = (lo + hi) / 2;
    if (fits(mid)) {
      hi = mid;
    } else {
      lo = mid;
    }
  }
  return Math.ceil(hi);
}
