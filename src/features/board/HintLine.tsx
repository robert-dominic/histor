// src/features/board/HintLine.tsx
// One hint: a short typed line in the app's voice, with a brass tick beside it. With full motion it is typed, letter
// by letter, with the typewriter's keys (review-fixes brief, 8); with reduced motion it simply fades in. On the night
// desk it reads in night ink; on paper, in ink.
import { useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { MOTION_QUERIES, tween } from '@/lib/motion';
import { typeElement } from '@/lib/typewriter';

gsap.registerPlugin(useGSAP);

interface HintLineProps {
  text: string;
  /** Where it sits: on the dark desk, or on a sheet of paper. */
  tone: 'night' | 'paper';
}

export default function HintLine({ text, tone }: HintLineProps) {
  const ref = useRef<HTMLParagraphElement>(null);
  useGSAP(
    () => {
      if (typeof window.matchMedia !== 'function') {
        return;
      }
      const mm = gsap.matchMedia();
      mm.add(MOTION_QUERIES, context => {
        const reduced = context.conditions?.reduced === true;
        if (reduced) {
          gsap.fromTo(ref.current, { opacity: 0 }, { opacity: 1, ...tween('paper.lift'), clearProps: 'opacity' });
          return;
        }
        // The tick comes first; then the line is typed.
        const timeline = gsap.timeline();
        timeline.fromTo(ref.current, { opacity: 0 }, { opacity: 1, ...tween('hover'), clearProps: 'opacity' });
        const typed = typeElement(timeline, ref.current?.querySelector<HTMLElement>('[data-hint="text"]'), tween('hover').duration);
        if (typed !== null) {
          timeline.call(() => typed.split.revert(), undefined, typed.end);
        }
        return () => {
          timeline.kill();
          typed?.split.revert();
        };
      });
    },
    { scope: ref }
  );
  const colour = tone === 'night' ? 'border-brass text-night-ink' : 'border-rust text-ink';
  return (
    <p ref={ref} data-hint="line" className={`border-l-2 py-0.5 pl-3 font-voice text-[0.9375rem] leading-snug ${colour}`}>
      <span data-hint="text">{text}</span>
    </p>
  );
}
