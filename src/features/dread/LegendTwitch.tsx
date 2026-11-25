// src/features/dread/LegendTwitch.tsx
// Legends and the lamp (dread pass, 5). When a Legend stamp lands, the lamp dips: it dims and flickers for about a
// second, as if something passed between it and the desk (lamp.ts). And opened legend files (only once their stamp is
// known: `data-legend-known`) twitch now and then where they lie, on the floor or the board: a tiny shiver every 10 to
// 20 seconds, one file at a time. Sealed files never twitch. The shiver moves the file's drawing, not the file, so it
// never fights where the desk has put it. Reduced motion: neither.
import { useEffect } from 'react';
import gsap from 'gsap';
import { TWITCH, lampFlicker } from '@/lib/lamp';
import { MOTION_QUERIES, tween } from '@/lib/motion';
import { onStoryEvent } from '@/lib/story-events';


export default function LegendTwitch() {
  useEffect(() => {
    if (typeof window.matchMedia !== 'function' || window.matchMedia(MOTION_QUERIES.reduced).matches) {
      return;
    }
    const stopListening = onStoryEvent(event => {
      if (event.type === 'stamp:legend') {
        lampFlicker('long');
      }
    });
    let timer: ReturnType<typeof setTimeout>;
    const next = () => {
      const [low, high] = TWITCH.everyMs;
      timer = setTimeout(twitch, low + Math.random() * (high - low));
    };
    const twitch = () => {
      const known = [...document.querySelectorAll<HTMLElement>('[data-legend-known="true"]')].filter(
        file => file.style.visibility !== 'hidden' && document.documentElement.dataset.dragging !== 'true'
      );
      const file = known[Math.floor(Math.random() * known.length)];
      const drawing = file?.firstElementChild;
      if (drawing != null) {
        const step = tween('dread.twitch');
        gsap
          .timeline()
          .to(drawing, { rotation: TWITCH.turn, x: TWITCH.shift, ...step })
          .to(drawing, { rotation: -TWITCH.turn * 0.8, x: -TWITCH.shift, ...step })
          .to(drawing, { rotation: TWITCH.turn * 0.4, x: TWITCH.shift * 0.4, ...step })
          .to(drawing, { rotation: 0, x: 0, ...step, clearProps: 'transform' });
      }
      next();
    };
    next();
    return () => {
      clearTimeout(timer);
      stopListening();
    };
  }, []);
  return null;
}
