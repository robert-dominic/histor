// src/features/landing/Opening.tsx
// The landing page's opening (landing brief, 2): a black screen with the Histor wordmark large in the centre. On the
// first scroll, touch or key (or after about 1.5s) it rises and shrinks into the header's wordmark, and the page
// behind is shown; as it docks, `onDock` lets the first frame rise in. The page does not scroll until then.
// Reduced motion: nothing moves; the black fades and the header's wordmark fades in.
import { useEffect, useRef, useState, type RefObject } from 'react';
import gsap from 'gsap';
import { MOTION_QUERIES, tween } from '@/lib/motion';
import { pauseSmoothScroll, resumeSmoothScroll } from '@/lib/smooth-scroll';

/** How long the wordmark waits before it docks by itself, in ms. */
export const OPENING_WAIT_MS = 1500;

/** Keys that mean "go on": the ones that would scroll. */
const GO_KEYS = new Set(['ArrowDown', 'PageDown', ' ', 'End', 'Enter']);

interface OpeningProps {
  /** The header's wordmark: where this one docks. */
  targetRef: RefObject<HTMLImageElement | null>;
  /** The wordmark has started docking: the first frame may rise. */
  onDock: () => void;
}

export default function Opening({ targetRef, onDock }: OpeningProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const markRef = useRef<HTMLImageElement>(null);
  const [gone, setGone] = useState(false);
  const dockRef = useRef(onDock);
  useEffect(() => {
    dockRef.current = onDock;
  }, [onDock]);

  useEffect(() => {
    const root = rootRef.current;
    const mark = markRef.current;
    if (root === null || mark === null) {
      return;
    }
    const html = document.documentElement;
    const overflow = html.style.overflow;
    html.style.overflow = 'hidden';
    pauseSmoothScroll();
    let timeline: gsap.core.Timeline | null = null;
    let done = false;
    const unlock = () => {
      html.style.overflow = overflow;
      resumeSmoothScroll();
    };
    const reduced = typeof window.matchMedia !== 'function' || window.matchMedia(MOTION_QUERIES.reduced).matches;

    const dock = () => {
      if (done) {
        return;
      }
      done = true;
      window.clearTimeout(timer);
      listeners(false);
      const target = targetRef.current;
      dockRef.current();
      const finish = () => {
        if (target !== null) {
          gsap.set(target, { opacity: 1 });
        }
        unlock();
        setGone(true);
      };
      timeline = gsap.timeline({ onComplete: finish });
      if (reduced || target === null) {
        timeline.to(root, { opacity: 0, ...tween('ink.out') });
        if (target !== null) {
          timeline.to(target, { opacity: 1, ...tween('ink.in') }, 0);
        }
        return;
      }
      const from = mark.getBoundingClientRect();
      const to = target.getBoundingClientRect();
      const scale = from.width > 0 ? to.width / from.width : 1;
      // The wordmark rises and shrinks into the header, while the black behind it clears.
      timeline
        .to(mark, { x: to.left - from.left, y: to.top - from.top, scale, transformOrigin: '0 0', ...tween('scene') }, 0)
        .to(root.querySelector('[data-landing="opening-black"]'), { opacity: 0, ...tween('scene') }, 0);
    };

    const onKey = (event: KeyboardEvent) => {
      if (GO_KEYS.has(event.key)) {
        dock();
      }
    };
    const listeners = (on: boolean) => {
      if (on) {
        window.addEventListener('wheel', dock, { passive: true });
        window.addEventListener('touchmove', dock, { passive: true });
        window.addEventListener('keydown', onKey);
      } else {
        window.removeEventListener('wheel', dock);
        window.removeEventListener('touchmove', dock);
        window.removeEventListener('keydown', onKey);
      }
    };
    listeners(true);
    const timer = window.setTimeout(dock, OPENING_WAIT_MS);
    return () => {
      window.clearTimeout(timer);
      listeners(false);
      timeline?.kill();
      unlock();
    };
  }, [targetRef]);

  if (gone) {
    return null;
  }
  return (
    <div ref={rootRef} data-landing="opening" aria-hidden="true" className="pointer-events-none fixed inset-0 z-50">
      <div data-landing="opening-black" className="absolute inset-0 bg-black" />
      <div className="absolute inset-0 grid place-items-center px-6">
        <img ref={markRef} src="/brand/histor-logo-cream.svg" alt="" data-landing="opening-mark" className="w-[min(78vw,56rem)]" />
      </div>
    </div>
  );
}
