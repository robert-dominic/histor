// src/features/dread/JumpScare.tsx
// The one jump scare (dread pass, 8). After the case is closed, if the player relied on a legend: the screen cuts to
// black for a beat; the eye opens large in the centre; a sharp, short sting plays (the loudest moment in the app, and
// still capped: `SAMPLES['jump-sting']`); the pen writes under it, "You trusted a legend."; then it clears and the
// reveal goes on as before (`onDone`). Under reduced motion there is no cut and no sting: the line simply appears, and
// goes. It covers everything while it plays; the line is announced to screen readers.
import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import Eye from '@/features/dread/Eye';
import Quill from '@/components/Quill';
import { EYE_OPEN } from '@/lib/eye-watch';
import { JUMP_SCARE } from '@/lib/jump-scare';
import { MOTION_QUERIES, tween } from '@/lib/motion';
import { createQuillWriter, splitForQuill } from '@/lib/quill-writing';
import { emitStoryEvent } from '@/lib/story-events';

gsap.registerPlugin(useGSAP);

/** The pen's letters a second, under the eye. */
const PEN_RATE = 16;

export default function JumpScare({ onDone }: { onDone: () => void }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const doneRef = useRef(onDone);
  useEffect(() => {
    doneRef.current = onDone;
  });

  useGSAP(
    () => {
      const root = rootRef.current;
      if (root === null) {
        return;
      }
      const finish = () => doneRef.current();
      // Without matchMedia nothing is animated (as everywhere in the app): it is simply skipped.
      if (typeof window.matchMedia !== 'function') {
        finish();
        return;
      }
      const reduced = window.matchMedia(MOTION_QUERIES.reduced).matches;
      if (reduced) {
        // No cut and no sting: the line simply appears, and goes.
        gsap
          .timeline({ onComplete: finish })
          .fromTo(root, { opacity: 0 }, { opacity: 1, ...tween('ink.in') })
          .to(root, { opacity: 0, ...tween('ink.out') }, `+=${JUMP_SCARE.quietHold}`);
        return;
      }
      const upper = root.querySelector('[data-eye="upper"]');
      const lower = root.querySelector('[data-eye="lower"]');
      const line = root.querySelector<HTMLElement>('[data-scare="line"]');
      const point = root.querySelector<HTMLElement>('[data-scare="quill"]');
      const body = root.querySelector<HTMLElement>('[data-scare="quill-body"]');
      const split = line === null ? null : splitForQuill(line);
      const timeline = gsap.timeline({ onComplete: finish });
      // The cut to black.
      timeline.fromTo(root, { opacity: 0 }, { opacity: 1, ...tween('dread.cut') });
      // A beat; then the eye opens, and the sting.
      const opensAt = tween('dread.cut').duration + JUMP_SCARE.beat;
      timeline.call(() => emitStoryEvent({ type: 'jump-sting' }), undefined, opensAt);
      timeline.to(upper, { y: EYE_OPEN.upper, ...tween('dread.blink') }, opensAt);
      timeline.to(lower, { y: EYE_OPEN.lower, ...tween('dread.blink') }, opensAt);
      // The pen writes under it.
      let at = opensAt + tween('dread.lid').duration / 2;
      if (split !== null && point !== null && body !== null) {
        const letters = split.chars as HTMLElement[];
        at += createQuillWriter(point, body).write(timeline, letters, at, PEN_RATE);
      }
      // It holds; then the eye closes and the dark clears.
      timeline.to(upper, { y: 0, ...tween('dread.lid') }, at + JUMP_SCARE.hold);
      timeline.to(lower, { y: 0, ...tween('dread.lid') }, '<');
      timeline.to(root, { opacity: 0, ...tween('scene') });
      return () => {
        timeline.kill();
        split?.revert();
      };
    },
    { scope: rootRef }
  );

  return (
    <div ref={rootRef} data-scare="" className="fixed inset-0 z-[85] grid place-items-center bg-black opacity-0">
      <div className="flex w-full flex-col items-center gap-8 px-6">
        <Eye className="block h-auto w-[min(62vw,32rem)]" />
        <p className="relative font-legend text-[clamp(1.75rem,1.2rem+2.4vw,3rem)] leading-none text-ghost-night">
          <span className="sr-only" role="status">
            {JUMP_SCARE.line}
          </span>
          <span aria-hidden="true" data-scare="line">
            {JUMP_SCARE.line}
          </span>
          <Quill attribute="data-scare" sizeClassName="h-[clamp(2.25rem,4vw,3.25rem)]" />
        </p>
      </div>
    </div>
  );
}
