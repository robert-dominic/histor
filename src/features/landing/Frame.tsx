// src/features/landing/Frame.tsx
// A case's frame on the landing page (dreadful frames): not art but evidence. The picture sits on a piece of scorched
// paper a little larger than itself, its own edges torn, aged by old paper laid over it, held to the wall by one or two
// strips of tape, sometimes torn across a corner, and a little crooked (between -2° and 2°). The choices are made per
// case from its id, so they never change between visits (`pieceOf`, src/lib/evidence-piece.ts). Everything is CSS on this element (effects.css), which sits inside the tilt
// wrapper: no JavaScript animates it. Only a case with no picture keeps the dark cloth veil. Decorative: what it is,
// is said by its section.
import type { CSSProperties } from 'react';
import type { Exhibit } from '@/cases';
import { pieceOf } from '@/lib/evidence-piece';
import { FEATURED_SHAPE, FRAME_SHAPES } from '@/lib/frame-shapes';

interface FrameProps {
  exhibit: Exhibit;
  className?: string;
}

export default function Frame({ exhibit, className = '' }: FrameProps) {
  const shape = exhibit.featured ? FEATURED_SHAPE : FRAME_SHAPES[exhibit.frame];
  const piece = pieceOf(exhibit.id);
  const style = {
    aspectRatio: shape.ratio,
    '--frame-h': shape.height,
    '--frame-h-phone': shape.phone,
    '--piece-tilt': `${piece.tilt}deg`,
    '--backing-tilt': `${piece.backingTilt}deg`,
  } as CSSProperties;
  const image = exhibit.frameImage;
  return (
    <div data-frame={exhibit.frame} data-status={exhibit.status} data-featured={exhibit.featured} aria-hidden="true" style={style} className={`haunted-frame block ${className}`}>
      <span data-frame-part="backing" className="evidence-backing" />
      <div className="haunted-frame__opening">
        {image !== undefined ? (
          <>
            <img src={image.src} alt="" loading="lazy" decoding="async" draggable={false} className="h-full w-full object-cover" />
            <span data-frame-part="stain" className="evidence-stain" />
          </>
        ) : (
          <div data-frame-part="veil" className="frame-veil">
            <span className="frame-plaque absolute bottom-[12%] left-1/2 -translate-x-1/2 rounded-[2px] px-3 pt-1.5 pb-1 font-voice text-[0.6875rem] tracking-[0.24em] uppercase">
              Sealed
            </span>
          </div>
        )}
      </div>
      {piece.tear !== null && <span data-frame-part="tear" data-corner={piece.tear} className="evidence-tear" />}
      {piece.tapes.map((tape, index) => (
        <span
          key={index}
          data-frame-part="tape"
          className="evidence-tape"
          style={{ left: `${tape.left}%`, top: `${tape.top}%`, rotate: `${tape.angle}deg` }}
        />
      ))}
      <span data-frame-part="glint" className="haunted-frame__glint" />
    </div>
  );
}
