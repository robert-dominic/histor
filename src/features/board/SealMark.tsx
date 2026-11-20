// src/features/board/SealMark.tsx
// A blob of rust-night wax with a brass "H" pressed into it (the favicon's letter). Pure drawing: the desk's wax
// seal (WaxSeal.tsx) and the seal pressed onto the chosen theory (Verdict.tsx) both use it.
import type { CSSProperties } from 'react';

interface SealMarkProps {
  className?: string;
  style?: CSSProperties;
  /** An optional marker, so a screen can find this seal to animate it. */
  'data-verdict'?: string;
}

// An uneven edge, as wax makes when it pools and is pressed.
const WAX_EDGE =
  'M32 2.5c5.5 0 8.6 3.6 13.4 4.9 5 1.3 10.2 1.2 13 5.6 2.8 4.3.2 9.2 1.6 14.1 1.3 4.7 5.2 8.3 3.6 13.2-1.7 5.1-7.5 5.9-10.9 9.5-3.3 3.5-3.9 9.6-8.7 11.7-4.6 2-9.4-1-14-1-4.8 0-9.1 3.6-13.6 1.8-4.6-1.8-4.4-8-7.9-11.4-3.4-3.3-9.3-4.4-10.5-9.1-1.2-4.6 3-8.5 3.4-13.1.4-4.9-3.4-9.6-.4-13.5 3-3.9 8.6-2.5 13-4.5C24.3 8.1 26.4 2.5 32 2.5Z';

export default function SealMark({ className = '', style, 'data-verdict': marker }: SealMarkProps) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" focusable="false" data-seal="mark" data-verdict={marker} className={className} style={style}>
      <path d={WAX_EDGE} className="fill-rust-night" />
      {/* The pressed ring, a shade darker, and a highlight on the raised lip. */}
      <circle cx="32" cy="32" r="20.5" fill="none" strokeWidth="2.2" className="stroke-black/30" />
      <circle cx="32" cy="32" r="22.5" fill="none" strokeWidth="1" className="stroke-white/20" />
      {/* The letter: pressed in, so a dark edge below it and brass on top. */}
      <g transform="translate(0 1.2)" className="fill-black/35">
        <path transform="translate(10.19 53.27) scale(0.07014 -0.07014)" d={H_PATH} />
      </g>
      <path transform="translate(10.19 53.27) scale(0.07014 -0.07014)" d={H_PATH} className="fill-brass" />
    </svg>
  );
}

// "H" in Grenze Gotisch (SIL Open Font License), as in public/favicon.svg.
const H_PATH =
  'M85 535 28 553V602Q43 604 65.0 607.0Q87 610 109.5 612.5Q132 615 148.5 616.0Q165 617 169 616Q176 615 185.0 606.5Q194 598 200.5 589.0Q207 580 208 576V71L286 53L261 5Q247 3 225.0 0.0Q203 -3 181.5 -5.5Q160 -8 144.0 -9.5Q128 -11 125 -10Q118 -9 109.5 -0.5Q101 8 93.5 17.0Q86 26 85 30ZM414 535 360 553V602Q380 605 410.5 609.0Q441 613 467.0 615.5Q493 618 498 616Q505 615 513.5 606.5Q522 598 529.0 589.0Q536 580 537 576V72L594 53V4Q579 2 557.0 -0.5Q535 -3 512.5 -5.5Q490 -8 473.5 -9.5Q457 -11 452 -10Q446 -9 437.0 -0.5Q428 8 421.5 17.0Q415 26 414 31ZM262 342 437 350V272L262 280ZM279 606H309V110Q309 104 303.0 88.5Q297 73 286 53H256V529Q256 539 263.0 560.5Q270 582 279 606Z';
