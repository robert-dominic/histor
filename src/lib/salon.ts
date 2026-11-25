// src/lib/salon.ts
// How the archive room hangs the case frames (landing v3 brief): salon-style, all together on one wall, at varied
// sizes, as in a museum. One place per case, in the registry's order: its left edge in vw, its top in svh, its height
// in svh (its width follows its shape), and which way a sealed case's plaque card opens (below the frames in the top
// row, above those in the bottom row). On a phone the frames are a plain, scrolling wrap and these places are unused.
export interface SalonPlace {
  left: number;
  top: number;
  height: number;
  plaque: 'below' | 'above';
}

export const SALON: readonly SalonPlace[] = [
  { left: 8, top: 14, height: 30, plaque: 'below' },
  { left: 36, top: 9, height: 40, plaque: 'below' },
  { left: 62, top: 17, height: 26, plaque: 'below' },
  { left: 14, top: 56, height: 30, plaque: 'above' },
  { left: 42, top: 55, height: 34, plaque: 'above' },
  { left: 64, top: 60, height: 28, plaque: 'above' },
];

/** The place of case number `index`; further cases than places go round again, a little lower. */
export function salonPlace(index: number): SalonPlace {
  const base = SALON[index % SALON.length];
  const lap = Math.floor(index / SALON.length);
  return lap === 0 ? base : { ...base, left: Math.min(base.left + 3 * lap, 90), top: Math.min(base.top + 2 * lap, 90) };
}
