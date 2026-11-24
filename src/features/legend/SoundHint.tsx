// src/features/legend/SoundHint.tsx
// A small, quiet hint at the foot of the legend intro (review-fixes brief, 6): browsers need a click or a key before
// any sound can play, so until then it says "🔊 Click anywhere for sound". The first click or key anywhere unlocks the
// sound (src/lib/sound), and so does the play modal's choice; then the hint fades away. Not shown when there is
// nothing to unlock: both channels off, or reduced motion (where a click alone does not start the sound).
import { useRef, useState, useSyncExternalStore } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { MOTION_QUERIES, tween } from '@/lib/motion';
import { sound } from '@/lib/sound';
import type { SoundEngine } from '@/lib/sound/engine';
import { useReducedMotion } from '@/lib/use-reduced-motion';

gsap.registerPlugin(useGSAP);

export const SOUND_HINT = 'Click anywhere for sound';

export default function SoundHint({ engine = sound }: { engine?: SoundEngine }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const waiting = useSyncExternalStore(
    listener => engine.subscribe(listener),
    () => engine.enabled && !engine.running,
    () => false
  );
  const reduced = useReducedMotion();
  // Shown only if it was needed when the page came: a hint that was never there does not fade.
  const [needed] = useState(() => engine.enabled && !engine.running);

  useGSAP(
    () => {
      const hint = ref.current;
      if (hint === null || waiting) {
        return;
      }
      if (typeof window.matchMedia !== 'function' || window.matchMedia(MOTION_QUERIES.reduced).matches) {
        gsap.set(hint, { opacity: 0, visibility: 'hidden' });
        return;
      }
      gsap.to(hint, { opacity: 0, ...tween('ink.out'), onComplete: () => gsap.set(hint, { visibility: 'hidden' }) });
    },
    { dependencies: [waiting] }
  );

  if (!needed || reduced) {
    return null;
  }
  return (
    <p
      ref={ref}
      data-legend="sound-hint"
      role="status"
      className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 font-voice text-[0.75rem] tracking-[0.12em] whitespace-nowrap text-ghost-night/70 sm:bottom-5"
    >
      <span aria-hidden="true">🔊 </span>
      {SOUND_HINT}
    </p>
  );
}
