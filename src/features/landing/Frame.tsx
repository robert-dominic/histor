// src/features/landing/Frame.tsx
// A case's frame on the landing page (landing brief, 3): old gilt gone black (`.haunted-frame`, effects.css), in the
// case's own shape. An open case shows its image, slightly graded; a sealed one is covered by a dark cloth veil with a
// small brass plaque reading "Sealed". Decorative: what it is, is said by its section.
import type { CSSProperties } from 'react';
import type { Exhibit } from '@/cases';
import { FEATURED_SHAPE, FRAME_SHAPES } from '@/lib/frame-shapes';

interface FrameProps {
  exhibit: Exhibit;
  /** A small copy: the next frame peeking in. */
  peek?: boolean;
  className?: string;
}

export default function Frame({ exhibit, peek = false, className = '' }: FrameProps) {
  const shape = exhibit.featured ? FEATURED_SHAPE : FRAME_SHAPES[exhibit.frame];
  const style = { aspectRatio: shape.ratio, '--frame-h': shape.height } as CSSProperties;
  const image = exhibit.frameImage;
  return (
    <div data-frame={exhibit.frame} data-status={exhibit.status} data-featured={exhibit.featured} aria-hidden="true" style={style} className={`haunted-frame block ${className}`}>
      <div className="haunted-frame__opening">
        {image !== undefined && exhibit.status === 'open' ? (
          <img src={image.src} alt="" loading="lazy" decoding="async" draggable={false} className="h-full w-full object-cover" />
        ) : (
          <div data-frame-part="veil" className="frame-veil">
            {!peek && (
              <span className="frame-plaque absolute bottom-[12%] left-1/2 -translate-x-1/2 rounded-[2px] px-3 pt-1.5 pb-1 font-voice text-[0.6875rem] tracking-[0.24em] uppercase">
                Sealed
              </span>
            )}
          </div>
        )}
      </div>
      {!peek && <span data-frame-part="glint" className="haunted-frame__glint" />}
    </div>
  );
}
