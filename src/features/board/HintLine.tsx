// src/features/board/HintLine.tsx
// One hint: a short typed line in the app's voice, with a brass tick beside it. It fades in (and rises a touch
// with full motion). On the night desk it reads in night ink; on paper, in ink.
import { useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { EASE, MOTION_QUERIES } from '@/lib/motion';

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
        gsap.fromTo(
          ref.current,
          reduced ? { opacity: 0 } : { opacity: 0, y: 6 },
          { opacity: 1, y: 0, duration: 0.25, ease: EASE.out, clearProps: 'opacity,transform' }
        );
      });
    },
    { scope: ref }
  );
  const colour = tone === 'night' ? 'border-brass text-night-ink' : 'border-rust text-ink';
  return (
    <p ref={ref} data-hint="line" className={`border-l-2 py-0.5 pl-3 font-voice text-[0.9375rem] leading-snug ${colour}`}>
      {text}
    </p>
  );
}
