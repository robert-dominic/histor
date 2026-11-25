// src/features/board/Lamp.tsx
// The one lamp over the desk: a warm, brass-tinted pool of light, with everything outside it in shadow.
// One overlay with a radial-gradient mask on CSS variables. The variables are written with gsap.quickSetter from a
// gsap.ticker callback; React never re-renders for the light.
//   Fine pointer: the light follows the mouse, radius about 420px.
//   Touch: the light rests over the active element, and moves to the last tap.
//   Reduced motion: a static soft light, centred. No listeners, no ticker.
// The board, the top bar and the floor's label sit above the shade (so they always read), which left them outside the
// light (dread pass, 2: the bug). A second layer over them carries the warm pool and a gentler shade, so the whole
// desk, board included, is lit by the cursor's light, and every label still reads at 4.5:1. A third, the dip, is for
// the lamp's flicker (lamp.ts): nothing passes between it and the desk unless something does.

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { MOTION_QUERIES, tween } from '@/lib/motion';

/** How quickly the light catches up with its target, per frame (0 to 1). */
const EASE_FACTOR = 0.18;
const RADIUS = { fine: 420, touch: 260, still: 640, narrow: 340 } as const;

const FINE_POINTER = '(hover: hover) and (pointer: fine)';

interface LampProps {
  /** A static light, as under reduced motion: for the verdict and the report, where the paper is the focus. */
  still?: boolean;
  /** A still lamp narrows its pool (the verdict's reveal): over `scene`, or at once under reduced motion. */
  narrow?: boolean;
}

export default function Lamp({ still = false, narrow = false }: LampProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const overRef = useRef<HTMLDivElement>(null);

  // The reveal: the pool narrows onto what is revealed, and opens again after.
  useEffect(() => {
    const root = rootRef.current;
    const over = overRef.current;
    if (root === null || over === null || !still) {
      return;
    }
    const radius = `${narrow ? RADIUS.narrow : RADIUS.still}px`;
    const reduced = typeof window.matchMedia !== 'function' || window.matchMedia(MOTION_QUERIES.reduced).matches;
    if (reduced) {
      root.style.setProperty('--lamp-r', radius);
      over.style.setProperty('--lamp-r', radius);
      return;
    }
    const tweened = gsap.to([root, over], { '--lamp-r': radius, ...tween('scene') });
    return () => {
      tweened.kill();
    };
  }, [still, narrow]);

  useEffect(() => {
    const root = rootRef.current;
    const over = overRef.current;
    if (root === null || over === null) {
      return;
    }
    const layers = [root, over];
    const canQuery = typeof window.matchMedia === 'function';
    const reduced = still || !canQuery || window.matchMedia(MOTION_QUERIES.reduced).matches;
    const fine = canQuery && window.matchMedia(FINE_POINTER).matches;

    if (reduced) {
      root.dataset.lamp = 'still';
      for (const layer of layers) {
        layer.style.setProperty('--lamp-x', '50vw');
        layer.style.setProperty('--lamp-y', '45vh');
        layer.style.setProperty('--lamp-r', `${RADIUS.still}px`);
      }
      return;
    }

    root.dataset.lamp = fine ? 'follow' : 'rest';
    // Both layers follow the same light.
    const setX = gsap.quickSetter(layers, '--lamp-x', 'px') as (value: number) => void;
    const setY = gsap.quickSetter(layers, '--lamp-y', 'px') as (value: number) => void;
    const setR = gsap.quickSetter(layers, '--lamp-r', 'px') as (value: number) => void;
    setR(fine ? RADIUS.fine : RADIUS.touch);

    const current = { x: window.innerWidth / 2, y: window.innerHeight * 0.45 };
    const target = { ...current };
    setX(current.x);
    setY(current.y);

    const aimAt = (x: number, y: number) => {
      target.x = x;
      target.y = y;
    };
    const aimAtElement = (element: Element | null) => {
      if (!(element instanceof HTMLElement) || element === document.body) {
        return;
      }
      const box = element.getBoundingClientRect();
      aimAt(box.left + box.width / 2, box.top + box.height / 2);
    };

    const onPointerMove = (event: PointerEvent) => aimAt(event.clientX, event.clientY);
    const onPointerDown = (event: PointerEvent) => aimAt(event.clientX, event.clientY);
    const onFocusIn = (event: FocusEvent) => aimAtElement(event.target as Element | null);

    if (fine) {
      window.addEventListener('pointermove', onPointerMove, { passive: true });
    } else {
      window.addEventListener('pointerdown', onPointerDown, { passive: true });
    }
    window.addEventListener('focusin', onFocusIn);

    const tick = () => {
      const dx = target.x - current.x;
      const dy = target.y - current.y;
      if (Math.abs(dx) < 0.3 && Math.abs(dy) < 0.3) {
        return;
      }
      current.x += dx * EASE_FACTOR;
      current.y += dy * EASE_FACTOR;
      setX(current.x);
      setY(current.y);
    };
    gsap.ticker.add(tick);

    return () => {
      gsap.ticker.remove(tick);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('focusin', onFocusIn);
    };
  }, [still]);

  return (
    <>
      <div ref={rootRef} aria-hidden="true" data-desk="lamp" className="desk-lamp pointer-events-none fixed inset-0 z-20">
        <div className="desk-lamp-warmth absolute inset-0" />
        <div className="desk-lamp-shadow absolute inset-0" />
      </div>
      {/* Over the board, the top bar and the floor's label: the same light, a gentler shade. */}
      <div ref={overRef} aria-hidden="true" data-desk="lamp-over" className="desk-lamp pointer-events-none fixed inset-0 z-[22]">
        <div className="desk-lamp-warmth absolute inset-0" />
        <div className="desk-lamp-shadow-over absolute inset-0" />
      </div>
      {/* The dip: the lamp flickering, as if something passed between it and the desk (lamp.ts). Over an open file too. */}
      <div aria-hidden="true" data-desk="lamp-dip" className="pointer-events-none fixed inset-0 z-[45] bg-night opacity-0" />
    </>
  );
}
