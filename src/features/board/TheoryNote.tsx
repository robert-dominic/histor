// src/features/board/TheoryNote.tsx
// One theory on the board: a paper note held by a brass pin, slightly tilted (the same tilt for the same theory,
// every time), showing its title and claim. It is a drop target for a folder in hand.
// Never its historians' standing: that is revealed only in the case report.
// The tilt sits on the inner paper, so animations of the note itself (GSAP, Flip) never reset it.

import { useId } from 'react';
import { scatter } from '@/lib/desk';
import type { Theory } from '@/types/case';

interface TheoryNoteProps {
  theory: Theory;
  /** Extra classes, e.g. for the verdict screen. */
  className?: string;
}

export default function TheoryNote({ theory, className = '' }: TheoryNoteProps) {
  const titleId = useId();
  const { rotate } = scatter(theory.id, 2.5, 0);
  return (
    <article
      data-board="theory"
      data-theory-id={theory.id}
      data-drop-target={theory.id}
      tabIndex={0}
      aria-labelledby={titleId}
      // While a folder is dragged over it, the note lights up above the lamp's shadow.
      className={`group/note rounded-[2px] outline-offset-4 focus-visible:outline-2 focus-visible:outline-brass ${className} data-[drop-hot=true]:z-[22]`}
    >
      <div
        data-board="paper"
        className="desk-note relative flex h-full flex-col gap-2 rounded-[2px] px-4 pt-6 pb-5 text-ink shadow-lg shadow-black/60"
        style={{ rotate: `${rotate}deg` }}
      >
        {/* The glow while a folder is held over the note: a layer whose opacity changes (no filter or shadow transition). */}
        <span
          aria-hidden="true"
          data-board="glow"
          className="pointer-events-none absolute inset-0 rounded-[2px] bg-white/15 opacity-0 shadow-[0_0_0_3px] shadow-brass/50 transition-opacity duration-(--motion-hover-duration) ease-(--motion-hover-ease) group-data-[drop-hot=true]/note:opacity-100"
        />
        {/* The brass pin that holds the note. */}
        <span aria-hidden="true" data-board="pin" className="desk-pin absolute top-2 left-1/2 size-3 -translate-x-1/2 rounded-full" />
        <h3 id={titleId} className="font-legend text-[1.375rem] leading-[1.05] text-ink">
          {theory.title}
        </h3>
        <p data-board="claim" className="font-record text-[0.9375rem] leading-snug text-ink/85">
          {theory.claim}
        </p>
        {/* A second pin at the foot of the note: the threads to its files hang from here. */}
        <span aria-hidden="true" data-board="anchor" className="desk-pin absolute bottom-1.5 left-1/2 size-2 -translate-x-1/2 rounded-full" />
      </div>
    </article>
  );
}
