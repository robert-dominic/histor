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
