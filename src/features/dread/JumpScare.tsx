// src/features/dread/JumpScare.tsx
// The one jump scare (dread pass, 8). After the case is closed, if the player relied on a legend: the screen cuts to
// black for a beat; a face without flesh (hollow eyes, a nose) is there in the centre, about 30% of the screen tall; a sharp, short sting plays (the loudest moment in the app, and
// still capped: `SAMPLES['jump-sting']`); the pen writes under it, "You trusted a legend."; then it clears and the
// reveal goes on as before (`onDone`). Under reduced motion there is no cut and no sting: the line simply appears, and
// goes. It covers everything while it plays; the line is announced to screen readers.
import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import Face from '@/features/dread/Face';
import Quill from '@/components/Quill';
import { FACE_GLANCE } from '@/lib/eye-watch';
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
        // No cut and no sting: the line simply appears (the face simply there), and goes.
        gsap.set(root.querySelector('[data-face="svg"]'), { opacity: 1 });
        gsap
          .timeline({ onComplete: finish })
          .fromTo(root, { opacity: 0 }, { opacity: 1, ...tween('ink.in') })
          .to(root, { opacity: 0, ...tween('ink.out') }, `+=${JUMP_SCARE.quietHold}`);
        return;
      }
      const face = root.querySelector('[data-face="svg"]');
      const gaze = root.querySelector('[data-face="gaze"]');
      const line = root.querySelector<HTMLElement>('[data-scare="line"]');
      const point = root.querySelector<HTMLElement>('[data-scare="quill"]');
      const body = root.querySelector<HTMLElement>('[data-scare="quill-body"]');
      const split = line === null ? null : splitForQuill(line);
      const timeline = gsap.timeline({ onComplete: finish });
      // The cut to black.
      timeline.fromTo(root, { opacity: 0 }, { opacity: 1, ...tween('dread.cut') });
      // A beat; then the face is there, all at once, and the sting.
      const opensAt = tween('dread.cut').duration + JUMP_SCARE.beat;
      timeline.call(() => emitStoryEvent({ type: 'jump-sting' }), undefined, opensAt);
      timeline.fromTo(face, { opacity: 0, scale: 0.96 }, { opacity: 1, scale: 1, ...tween('dread.blink') }, opensAt);
      timeline.to(gaze, { x: FACE_GLANCE, ...tween('dread.gaze') }, opensAt + tween('dread.blink').duration);
      // The pen writes under it.
      let at = opensAt + tween('dread.lid').duration / 2;
      if (split !== null && point !== null && body !== null) {
        const letters = split.chars as HTMLElement[];
        at += createQuillWriter(point, body).write(timeline, letters, at, PEN_RATE);
      }
      // It holds; then it fades into the dark, and the dark clears.
      timeline.to(face, { opacity: 0, ...tween('dread.lid') }, at + JUMP_SCARE.hold);
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
        {/* About 30% of the screen's height. */}
        <Face className="block h-[30svh] w-auto opacity-0" />
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
