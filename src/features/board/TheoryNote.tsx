// src/features/board/TheoryNote.tsx
// One theory on the board, held by a brass pin, slightly tilted (the same tilt for the same theory, every time),
// showing its title and claim. It is a drop target for a folder in hand.
// On the desktop desk it is a slate card written in chalk, like the ship's log slate, so a theory never looks like a
// manila file; on the phone desk it is still a paper note.
// Never its historians' standing: that is revealed only in the case report.
// The tilt sits on the inner paper, so animations of the note itself (GSAP, Flip) never reset it.
// It answers back to the player's pins (`weight`, theory-weight.ts): a heavier theory has brighter chalk, a soft
// brass edge, a deeper shadow and a slight lift; a forgotten one dims and its corner curls. Changes are tweened
// (`layout`), never a jump; the edge and shadow are a layer whose opacity changes.

import { useId, useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { MOTION_QUERIES, tween } from '@/lib/motion';
import { scatter } from '@/lib/desk';
import { WEIGHT_LOOK, type TheoryWeight } from '@/lib/theory-weight';
import type { Theory } from '@/types/case';

gsap.registerPlugin(useGSAP);



interface TheoryNoteProps {
  theory: Theory;
  /** Extra classes, e.g. for the verdict screen. */
  className?: string;
  /** On the one-screen desk: the note's text and padding follow the screen's height, so the board fits. */
  fitted?: boolean;
  /** How heavy the player's argument for it is (the desk only). */
  weight?: TheoryWeight;
}

export default function TheoryNote({ theory, className = '', fitted = false, weight }: TheoryNoteProps) {
  const titleId = useId();
  const { rotate } = scatter(theory.id, 2.5, 0);
  const rootRef = useRef<HTMLElement>(null);
  /** The first look is set at once; every later change is tweened. */
  const shownRef = useRef(false);
  useGSAP(
    () => {
      const root = rootRef.current;
      if (root === null || weight === undefined) {
        return;
      }
      const look = WEIGHT_LOOK[weight];
      const parts = {
        chalk: root.querySelector('[data-board="chalk"]'),
        edge: root.querySelector('[data-board="weight-edge"]'),
        curl: root.querySelector('[data-board="curl"]'),
      };
      const reduced = typeof window.matchMedia !== 'function' || window.matchMedia(MOTION_QUERIES.reduced).matches;
      const to = (target: Element | null, vars: gsap.TweenVars) => {
        if (target === null) {
          return;
        }
        if (shownRef.current) {
          gsap.to(target, { ...vars, ...tween('layout'), overwrite: 'auto' });
        } else {
          gsap.set(target, vars);
        }
      };
      to(parts.chalk, { opacity: look.chalk });
      to(parts.edge, { opacity: look.edge });
      to(parts.curl, { opacity: look.curl, scale: look.curl > 0 ? 1 : 0.95 });
      // The lift is on the note, not its paper: a transform there would replace the paper's tilt (CSS `rotate`).
      // Reduced motion: the fades stay, the lift does not.
      to(root, { y: reduced ? 0 : look.lift });
      shownRef.current = true;
    },
    { scope: rootRef, dependencies: [weight] }
  );
  return (
    <article
      ref={rootRef}
      data-weight={weight}
      data-board="theory"
      data-theory-id={theory.id}
      data-drop-target={theory.id}
      tabIndex={0}
      aria-labelledby={titleId}
      // While a folder is dragged over it, the note lights up above the lamp's shadow.
      className={`group/note ${fitted ? 'slate-shadow' : ''} rounded-[2px] outline-offset-4 focus-visible:outline-2 focus-visible:outline-brass ${className} data-[drop-hot=true]:z-[22]`}
    >
      <div
        data-board="paper"
        data-surface={fitted ? 'slate' : 'paper'}
        className={`relative flex h-full flex-col rounded-[2px] px-4 shadow-lg shadow-black/60 ${
          fitted ? 'desk-slate gap-1 pt-5 pb-4 text-chalk' : 'desk-note gap-2 pt-6 pb-5 text-ink'
        }`}
        style={{ rotate: `${rotate}deg` }}
      >
        {/* The glow while a folder is held over the note: a layer whose opacity changes (no filter or shadow transition). */}
        <span
          aria-hidden="true"
          data-board="glow"
          className="pointer-events-none absolute inset-0 rounded-[2px] bg-white/15 opacity-0 shadow-[0_0_0_3px] shadow-brass/50 transition-opacity duration-(--motion-hover-duration) ease-(--motion-hover-ease) group-data-[drop-hot=true]/note:opacity-100"
        />
        {/* The weight of the player's argument: a soft brass edge and a deeper shadow, on a layer whose opacity changes. */}
        {weight !== undefined && (
          <span
            aria-hidden="true"
            data-board="weight-edge"
            className="pointer-events-none absolute inset-0 rounded-[2px] opacity-0 shadow-[0_0_0_1.5px_var(--color-brass),0_0_18px_-2px_var(--color-brass),0_18px_30px_-8px_rgb(0_0_0/0.85)]"
          />
        )}
        {/* A forgotten theory: its corner curls up a little. */}
        {weight !== undefined && (
          <span
            aria-hidden="true"
            data-board="curl"
            className="pointer-events-none absolute top-0 right-0 size-5 origin-top-right rounded-bl-[3px] bg-linear-to-bl from-night/70 from-50% to-chalk/25 to-50% opacity-0 shadow-[-2px_2px_4px_rgb(0_0_0/0.35)]"
          />
        )}
        {/* The brass pin that holds the note. */}
        <span aria-hidden="true" data-board="pin" className="desk-pin absolute top-2 left-1/2 size-3 -translate-x-1/2 rounded-full" />
        {/* The chalk: brighter on a heavy theory, dimmer on a forgotten one. */}
        <div data-board="chalk" className="flex flex-col gap-[inherit]">
          <h3
            id={titleId}
            className={`font-legend leading-[1.05] ${fitted ? 'text-[clamp(1.0625rem,2.6svh,1.375rem)] text-chalk' : 'text-[1.375rem] text-ink'}`}
          >
            {theory.title}
          </h3>
          <p
            data-board="claim"
            className={`font-record leading-snug ${fitted ? 'text-[1rem] text-chalk' : 'text-[0.9375rem] text-ink/85'}`}
          >
            {theory.claim}
          </p>
        </div>
        {/* A second pin at the foot of the note: the threads to its files hang from here. */}
        <span aria-hidden="true" data-board="anchor" className="desk-pin absolute bottom-1.5 left-1/2 size-2 -translate-x-1/2 rounded-full" />
      </div>
    </article>
  );
}
