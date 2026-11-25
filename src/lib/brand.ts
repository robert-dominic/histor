// src/lib/brand.ts
// The Histor mark (public/brand/histor-mark-*.svg), as data, for everything that draws it itself (quick fixes, 4):
// the header, the preloader, the shareable card and its /api/og image, the PDF report. One path, filled even-odd: the
// H's two stems and its bar, and a round hole in the bar (`dot`, kept apart so a drawer without arcs can draw it).

/** The mark's viewBox: x, y, width, height. */
export const MARK_VIEWBOX = [22, -22, 764, 792] as const;

/** The H, in absolute M, L, H, V, Q and Z commands only. */
export const MARK_BODY =
  'M62 698H134Q161 698 161 671V77Q161 63 154.5 56.5Q148 50 134 50H62V18H352V50H280Q266 50 259.5 56.5Q253 63 253 77V671Q253 698 280 698H352V730H62ZM456 698H528Q555 698 555 671V77Q555 63 548.5 56.5Q542 50 528 50H456V18H746V50H674Q660 50 653.5 56.5Q647 63 647 77V671Q647 698 674 698H746V730H456ZM253,450L354,450Q354,397 404,394Q454,397 454,450L555,450L555,320L253,320Z';

/** The hole in its bar: a circle. */
export const MARK_DOT = { cx: 404, cy: 362, r: 26 } as const;

/** The whole mark as one SVG path (the H, then the hole as two arcs), as in public/brand. */
export const MARK_PATH = `${MARK_BODY}M378,362a26,26 0 1,0 52,0a26,26 0 1,0 -52,0Z`;

/** Its two inks, from public/brand: cream for the night, ink for paper. */
export const MARK_INK = { cream: '#E6E1D3', ink: '#23211D' } as const;

/** The mark as a standalone SVG document, for an <img> (the /api/og image) or a data URL. */
export function markSvg(fill: string, opacity = 1): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${MARK_VIEWBOX.join(' ')}"><path fill="${fill}" fill-opacity="${opacity}" fill-rule="evenodd" d="${MARK_PATH}"/></svg>`;
}

/** Its width for a given height. */
export const markWidth = (height: number) => (height * MARK_VIEWBOX[2]) / MARK_VIEWBOX[3];
