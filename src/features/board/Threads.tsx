// src/features/board/Threads.tsx
// Desktop only: a thin rust thread from each pinned folder up to the brass pin of its theory card.
// Decorative (aria-hidden): the "→ theory" label on each folder carries the same information.
// The paths are measured from the page and written straight to the SVG, never through React state.

import { useLayoutEffect, useRef } from 'react';

interface ThreadsProps {
  /** One thread per pin to a theory: evidence id → theory id. */
  threads: { evidenceId: string; theoryId: string }[];
}

/**
 * Place it inside the element that holds both the theory cards and the folders: the SVG covers that element.
 * It finds it as its own parent, not through a ref, because a parent's ref is not set yet when this
 * component's layout effect first runs.
 */
export default function Threads({ threads }: ThreadsProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useLayoutEffect(() => {
    const svg = svgRef.current;
    const board = svg?.parentElement ?? null;
    if (svg === null || board === null) {
      return;
    }

    const draw = () => {
      const origin = board.getBoundingClientRect();
      svg.setAttribute('viewBox', `0 0 ${origin.width} ${origin.height}`);
      for (const path of svg.querySelectorAll<SVGPathElement>('path[data-evidence-id]')) {
        const folder = board.querySelector(`[data-board="folder"][data-evidence-id="${path.dataset.evidenceId}"]`);
        const pin = board.querySelector(`[data-board="theory"][data-theory-id="${path.dataset.theoryId}"] [data-board="pin"]`);
        if (folder === null || pin === null) {
          path.removeAttribute('d');
          continue;
        }
        const from = folder.getBoundingClientRect();
        const to = pin.getBoundingClientRect();
        const x1 = from.left + from.width / 2 - origin.left;
        const y1 = from.top + 4 - origin.top;
        const x2 = to.left + to.width / 2 - origin.left;
        const y2 = to.top + to.height / 2 - origin.top;
        // A slack curve, as if the thread hung between the two pins.
        const sag = Math.min(80, Math.abs(y1 - y2) * 0.35);
        path.setAttribute('d', `M ${x1} ${y1} C ${x1} ${y1 - sag}, ${x2} ${y2 + sag * 1.6}, ${x2} ${y2}`);
      }
    };

    draw();
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(draw) : null;
    observer?.observe(board);
    window.addEventListener('resize', draw);
    document.fonts?.ready.then(draw);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', draw);
    };
  }, [threads]);

  return (
    <svg
      ref={svgRef}
      aria-hidden="true"
      data-board="threads"
      className="pointer-events-none absolute inset-0 z-0 h-full w-full overflow-visible"
      fill="none"
    >
      {threads.map(thread => (
        <path
          key={thread.evidenceId}
          data-evidence-id={thread.evidenceId}
          data-theory-id={thread.theoryId}
          stroke="var(--color-rust-night)"
          strokeOpacity="0.75"
          strokeWidth="1.25"
          strokeLinecap="round"
        />
      ))}
    </svg>
  );
}
