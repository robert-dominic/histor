// src/features/board/Threads.tsx
// A thin rust-night thread from each theory note to every file that hangs beneath it, pinned at both ends: from the
// brass pin at the foot of the note to the brass pin on the file's tab. Each thread sags a little, like real thread.
// Decorative (aria-hidden): the tabs themselves sit under their note, and say so to screen readers.
// The paths are measured from the page and written straight to the SVG, never through React state.
// When a pin changes nothing snaps: the thread that moves fades out where it was (ink.out), then draws in at its new
// place once the tab has landed; a thread that goes away (the file is unpinned or set aside) fades out where it hung.
import { useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';
import { MOTION_QUERIES, STEP, tween } from '@/lib/motion';

const SVG_NS = 'http://www.w3.org/2000/svg';

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
  /** The theory each thread hung from at the last draw, and the path it had: to tell what moved or went away. */
  const seenRef = useRef<Map<string, { theoryId: string; d: string | null }>>(new Map());
  /** Threads that keep their old path while they fade out, before they are redrawn at their new place. */
  const holdingRef = useRef<Set<string>>(new Set());

  useLayoutEffect(() => {
    const svg = svgRef.current;
    const board = svg?.parentElement ?? null;
    if (svg === null || board === null) {
      return;
    }
    const canQuery = typeof window.matchMedia === 'function';
    const reduced = canQuery && window.matchMedia(MOTION_QUERIES.reduced).matches;

    /** Places one thread between its note's pin and its tab's pin. */
    const drawOne = (path: SVGPathElement, origin: DOMRect) => {
      // On the desktop desk a pinned file lies in its theory's pile: the thread ends at the pin on the pile's top file.
      const tabPin =
        board.querySelector(`[data-board="pile"][data-files~="${path.dataset.evidenceId}"] [data-board="pile-top"] [data-board="tab-pin"]`) ??
        board.querySelector(`[data-board="tab"][data-evidence-id="${path.dataset.evidenceId}"] [data-board="tab-pin"]`);
      const anchor = board.querySelector(`[data-board="theory"][data-theory-id="${path.dataset.theoryId}"] [data-board="anchor"]`);
      if (tabPin === null || anchor === null) {
        path.removeAttribute('d');
        return;
      }
      const from = centreOf(anchor, origin);
      const to = centreOf(tabPin, origin);
      // A slight natural sag: the middle of the thread hangs a little below the straight line between its pins.
      const length = Math.hypot(to.x - from.x, to.y - from.y);
      const sag = Math.min(18, length * 0.12);
      const midX = (from.x + to.x) / 2;
      const midY = (from.y + to.y) / 2 + sag;
      path.setAttribute('d', `M ${from.x} ${from.y} Q ${midX} ${midY} ${to.x} ${to.y}`);
    };
    const draw = () => {
      const origin = board.getBoundingClientRect();
      svg.setAttribute('viewBox', `0 0 ${Math.max(1, origin.width)} ${Math.max(1, origin.height)}`);
      for (const path of svg.querySelectorAll<SVGPathElement>('path[data-evidence-id]')) {
        if (!holdingRef.current.has(path.dataset.evidenceId ?? '')) {
          drawOne(path, origin);
        }
      }
    };

    // What changed since the last draw: threads that moved to another note, and threads that went away.
    const seen = seenRef.current;
    const now = new Map(threads.map(thread => [thread.evidenceId, thread.theoryId]));
    const moved = threads.filter(thread => {
      const before = seen.get(thread.evidenceId);
      return before !== undefined && before.theoryId !== thread.theoryId;
    });
    const gone = [...seen.entries()].filter(([id]) => !now.has(id));
    if (canQuery) {
      // A thread that went away fades out where it hung: a copy of its last path, removed when it has faded.
      for (const [, before] of gone) {
        if (before.d === null) {
          continue;
        }
        const ghost = document.createElementNS(SVG_NS, 'path');
        ghost.setAttribute('d', before.d);
        ghost.setAttribute('stroke', 'var(--color-rust-night)');
        ghost.setAttribute('stroke-opacity', '0.85');
        ghost.setAttribute('stroke-width', '1.25');
        ghost.setAttribute('stroke-linecap', 'round');
        svg.appendChild(ghost);
        gsap.to(ghost, { opacity: 0, ...tween('ink.out'), onComplete: () => ghost.remove() });
      }
      // A thread that moved keeps its old path while it fades out; then it is drawn at its new place, after the tab has
      // landed (the tab's flight is `paper.move`; the fade and the delay add up to a little longer).
      for (const thread of moved) {
        const path = svg.querySelector<SVGPathElement>(`path[data-evidence-id="${thread.evidenceId}"]`);
        if (path === null) {
          continue;
        }
        holdingRef.current.add(thread.evidenceId);
        gsap.to(path, {
          opacity: 0,
          ...tween('ink.out'),
          onComplete: () => {
            holdingRef.current.delete(thread.evidenceId);
            drawOne(path, board.getBoundingClientRect());
            seen.set(thread.evidenceId, { theoryId: thread.theoryId, d: path.getAttribute('d') });
            if (reduced) {
              gsap.fromTo(path, { opacity: 0 }, { opacity: 1, ...tween('paper.lift'), clearProps: 'opacity' });
            } else {
              gsap.fromTo(
                path,
                { opacity: 1, attr: { 'stroke-dashoffset': 1 } },
                { attr: { 'stroke-dashoffset': 0 }, ...tween('layout'), delay: STEP.fast, clearProps: 'opacity' }
              );
            }
          },
        });
      }
    }
    draw();

    // The thread of the file just pinned draws in from the note (stroke uncovered), or fades in with reduced motion.
    // A thread that moved draws itself in after its fade, above.
    const freshPath =
      fresh !== null && drawnRef.current !== fresh.token && !moved.some(thread => thread.evidenceId === fresh.evidenceId)
        ? svg.querySelector<SVGPathElement>(`path[data-evidence-id="${fresh.evidenceId}"]`)
        : null;
    if (fresh !== null && freshPath !== null && freshPath.hasAttribute('d') && canQuery) {
      drawnRef.current = fresh.token;
      if (reduced) {
        gsap.fromTo(freshPath, { opacity: 0 }, { opacity: 1, ...tween('paper.lift'), clearProps: 'opacity' });
      } else {
        gsap.fromTo(
          freshPath,
          { attr: { 'stroke-dashoffset': 1 } },
          { attr: { 'stroke-dashoffset': 0 }, ...tween('layout'), delay: STEP.fast }
        );
      }
    }

    // Remember where every thread hangs now.
    seen.clear();
    for (const thread of threads) {
      const path = svg.querySelector<SVGPathElement>(`path[data-evidence-id="${thread.evidenceId}"]`);
      seen.set(thread.evidenceId, { theoryId: thread.theoryId, d: path?.getAttribute('d') ?? null });
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
