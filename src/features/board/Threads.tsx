// src/features/board/Threads.tsx
// Thin rust-night threads from the theory notes to the files pinned to them, pinned at both ends, each with the same
// gentle sag, like real thread.
//   The desktop desk: one thread per theory, from the brass pin at the foot of its note to the pin on the top file of
//   its pile. The "None of them" tray has no thread.
//   The phone desk: one thread per file, from the note's pin to the pin on the file's tab.
// Decorative (aria-hidden): the files themselves sit under their note, and say so to screen readers.
// Both ends are measured from the real elements after layout, again after every Flip on the desk has finished
// (`onDeskLayout`), and again whenever the board, a note or a pile changes size (a ResizeObserver), so a thread never
// points somewhere stale. The paths are written straight to the SVG, never through React state.
// When a pin changes nothing snaps: the thread that moves fades out where it was (ink.out), then draws in at its new
// place once the tab has landed; a thread that goes away (the file is unpinned or set aside) fades out where it hung.
import { useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';
import { onDeskLayout } from '@/features/board/flight';
import { MOTION_QUERIES, STEP, tween } from '@/lib/motion';

const SVG_NS = 'http://www.w3.org/2000/svg';
/** How far the middle of every thread hangs below the straight line between its pins, in px: one gentle sag for all. */
export const THREAD_SAG = 12;

/** One thread: on the desktop desk one per theory (its id is the theory's), on the phone desk one per file. */
export interface Thread {
  id: string;
  theoryId: string;
  /** The files it stands for: one, or every file in the theory's pile. */
  evidenceIds: string[];
}

interface ThreadsProps {
  threads: Thread[];
  /** True on the desktop desk: one thread per theory, ending at its pile. */
  perTheory?: boolean;
  /** The file just pinned: its thread draws in from the note, once per `token`. */
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
export default function Threads({ threads, perTheory = false, fresh = null }: ThreadsProps) {
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

    /** Where a thread ends: the pin on its pile's top file, or on its file's tab. */
    const endOf = (path: SVGPathElement) =>
      perTheory
        ? board.querySelector(`[data-board="pile"][data-theory-id="${path.dataset.theoryId}"] [data-board="pile-top"] [data-board="tab-pin"]`)
        : board.querySelector(`[data-board="tab"][data-evidence-id="${path.dataset.threadId}"] [data-board="tab-pin"]`);
    /** Places one thread between its note's pin and its end. */
    const drawOne = (path: SVGPathElement, origin: DOMRect) => {
      const end = endOf(path);
      const anchor = board.querySelector(`[data-board="theory"][data-theory-id="${path.dataset.theoryId}"] [data-board="anchor"]`);
      if (end === null || anchor === null) {
        path.removeAttribute('d');
        return;
      }
      const from = centreOf(anchor, origin);
      const to = centreOf(end, origin);
      // The same gentle sag for every thread: the middle hangs a little below the straight line between its pins.
      const midX = (from.x + to.x) / 2;
      const midY = (from.y + to.y) / 2 + THREAD_SAG;
      path.setAttribute('d', `M ${from.x} ${from.y} Q ${midX} ${midY} ${to.x} ${to.y}`);
    };
    const draw = () => {
      const origin = board.getBoundingClientRect();
      svg.setAttribute('viewBox', `0 0 ${Math.max(1, origin.width)} ${Math.max(1, origin.height)}`);
      for (const path of svg.querySelectorAll<SVGPathElement>('path[data-thread-id]')) {
        if (!holdingRef.current.has(path.dataset.threadId ?? '')) {
          drawOne(path, origin);
        }
      }
    };

    // What changed since the last draw: threads that moved to another note, and threads that went away.
    const seen = seenRef.current;
    const now = new Map(threads.map(thread => [thread.id, thread.theoryId]));
    const moved = threads.filter(thread => {
      const before = seen.get(thread.id);
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
        const path = svg.querySelector<SVGPathElement>(`path[data-thread-id="${thread.id}"]`);
        if (path === null) {
          continue;
        }
        holdingRef.current.add(thread.id);
        gsap.to(path, {
          opacity: 0,
          ...tween('ink.out'),
          onComplete: () => {
            holdingRef.current.delete(thread.id);
            drawOne(path, board.getBoundingClientRect());
            seen.set(thread.id, { theoryId: thread.theoryId, d: path.getAttribute('d') });
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
    const freshThread = fresh === null ? undefined : threads.find(thread => thread.evidenceIds.includes(fresh.evidenceId));
    const freshPath =
      fresh !== null && freshThread !== undefined && drawnRef.current !== fresh.token && !moved.includes(freshThread)
        ? svg.querySelector<SVGPathElement>(`path[data-thread-id="${freshThread.id}"]`)
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
      const path = svg.querySelector<SVGPathElement>(`path[data-thread-id="${thread.id}"]`);
      seen.set(thread.id, { theoryId: thread.theoryId, d: path?.getAttribute('d') ?? null });
    }

    // Measured again whenever anything that holds an end changes size, after every Flip on the desk, and once the
    // fonts have loaded (they change the notes' heights).
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(draw) : null;
    observer?.observe(board);
    for (const element of board.querySelectorAll('[data-board="theory"], [data-board="pile"], [data-board="tab"]')) {
      observer?.observe(element);
    }
    const stopListening = onDeskLayout(draw);
    window.addEventListener('resize', draw);
    let live = true;
    document.fonts?.ready.then(() => {
      if (live) {
        draw();
      }
    });
    return () => {
      live = false;
      observer?.disconnect();
      stopListening();
      window.removeEventListener('resize', draw);
    };
  }, [threads, fresh, perTheory]);

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
          key={thread.id}
          data-thread-id={thread.id}
          data-evidence-id={perTheory ? undefined : thread.id}
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
