// src/features/board/Threads.tsx
// A thin rust-night thread from each theory note to every file that hangs beneath it, pinned at both ends: from the
// brass pin at the foot of the note to the brass pin on the file's tab. Each thread sags a little, like real thread.
// Decorative (aria-hidden): the tabs themselves sit under their note, and say so to screen readers.
// The paths are measured from the page and written straight to the SVG, never through React state.

import { useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';
import { EASE, MOTION_QUERIES } from '@/lib/motion';

interface ThreadsProps {
  /** One thread per pinned file: evidence id → theory id. */
  threads: { evidenceId: string; theoryId: string }[];
  /** The file just pinned: its thread draws in from the note to the tab, once per `token`. */
  fresh?: { evidenceId: string; token: string } | null;
}

/** The centre of an element, relative to the board. */
function centreOf(element: Element, origin: DOMRect) {
  const box = element.getBoundingClientRect();
  return { x: box.left + box.width / 2 - origin.left, y: box.top + box.height / 2 - origin.top };
}

/**
 * Place it inside the element that holds both the theory notes and their tabs: the SVG covers that element.
 * It finds it as its own parent, not through a ref, because a parent's ref is not set yet when this
 * component's layout effect first runs.
 */
export default function Threads({ threads, fresh = null }: ThreadsProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  /** The last pin whose thread was drawn in: the board re-renders often, and it draws in only once. */
  const drawnRef = useRef<string | null>(null);

  useLayoutEffect(() => {
    const svg = svgRef.current;
    const board = svg?.parentElement ?? null;
    if (svg === null || board === null) {
      return;
    }

    const draw = () => {
      const origin = board.getBoundingClientRect();
      svg.setAttribute('viewBox', `0 0 ${Math.max(1, origin.width)} ${Math.max(1, origin.height)}`);
      for (const path of svg.querySelectorAll<SVGPathElement>('path[data-evidence-id]')) {
        const tabPin = board.querySelector(`[data-board="tab"][data-evidence-id="${path.dataset.evidenceId}"] [data-board="tab-pin"]`);
        const anchor = board.querySelector(`[data-board="theory"][data-theory-id="${path.dataset.theoryId}"] [data-board="anchor"]`);
        if (tabPin === null || anchor === null) {
          path.removeAttribute('d');
          continue;
        }
        const from = centreOf(anchor, origin);
        const to = centreOf(tabPin, origin);
        // A slight natural sag: the middle of the thread hangs a little below the straight line between its pins.
        const length = Math.hypot(to.x - from.x, to.y - from.y);
        const sag = Math.min(18, length * 0.12);
        const midX = (from.x + to.x) / 2;
        const midY = (from.y + to.y) / 2 + sag;
        path.setAttribute('d', `M ${from.x} ${from.y} Q ${midX} ${midY} ${to.x} ${to.y}`);
      }
    };

    draw();

    // The thread of the file just pinned draws in from the note (stroke uncovered), or fades in with reduced motion.
    const freshPath =
      fresh !== null && drawnRef.current !== fresh.token
        ? svg.querySelector<SVGPathElement>(`path[data-evidence-id="${fresh.evidenceId}"]`)
        : null;
    if (fresh !== null && freshPath !== null && freshPath.hasAttribute('d') && typeof window.matchMedia === 'function') {
      drawnRef.current = fresh.token;
      const reduced = window.matchMedia(MOTION_QUERIES.reduced).matches;
      if (reduced) {
        gsap.fromTo(freshPath, { opacity: 0 }, { opacity: 1, duration: 0.4, ease: EASE.out, clearProps: 'opacity' });
      } else {
        gsap.fromTo(
          freshPath,
          { attr: { 'stroke-dashoffset': 1 } },
          { attr: { 'stroke-dashoffset': 0 }, duration: 0.6, delay: 0.25, ease: EASE.inOut }
        );
      }
    }

    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(draw) : null;
    observer?.observe(board);
    window.addEventListener('resize', draw);
    document.fonts?.ready.then(draw);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', draw);
    };
  }, [threads, fresh]);

  return (
    <svg
      ref={svgRef}
      aria-hidden="true"
      data-board="threads"
      className="pointer-events-none absolute inset-0 z-[1] h-full w-full overflow-visible"
      fill="none"
    >
      {threads.map(thread => (
        <path
          key={thread.evidenceId}
          data-evidence-id={thread.evidenceId}
          data-theory-id={thread.theoryId}
          stroke="var(--color-rust-night)"
          strokeOpacity="0.85"
          strokeWidth="1.25"
          strokeLinecap="round"
          pathLength={1}
          strokeDasharray="1"
        />
      ))}
    </svg>
  );
}
