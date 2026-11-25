// src/features/dread/GhostLines.tsx
// Ghost text from the files on the floor (dread pass, 3). Every 4 to 8 seconds a random file on the floor, opened or
// sealed alike (it never gives away a status), breathes out a short line of its own text: it rises faintly out of the
// file like smoke, drifting up and to one side in ghost ink, italic, and dissolves after 3 to 5 seconds. At most two
// at once. It waits while a file is open or a modal is showing. Each line on screen is told to the sound (`ghosts`),
// which swells the murmur with them. Reduced motion: no ghost lines at all. Decorative: hidden from screen readers.
import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { GHOST, between, ghostPhrase } from '@/lib/ghost-lines';
import { MOTION, MOTION_QUERIES } from '@/lib/motion';
import { emitStoryEvent } from '@/lib/story-events';
import type { Evidence } from '@/types/case';

interface GhostLine {
  id: number;
  text: string;
  /** Where it starts, in px inside the floor. */
  x: number;
  y: number;
}

interface GhostLinesProps {
  evidence: Evidence[];
  /** A file is open over the desk: no new lines. */
  paused: boolean;
}

let nextId = 0;

export default function GhostLines({ evidence, paused }: GhostLinesProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [lines, setLines] = useState<GhostLine[]>([]);
  const pausedRef = useRef(paused);
  const linesRef = useRef(lines);
  useEffect(() => {
    pausedRef.current = paused;
    linesRef.current = lines;
  });

  // The rhythm: a new line every 4 to 8 seconds, if there is room and nothing is open.
  useEffect(() => {
    if (typeof window.matchMedia !== 'function' || window.matchMedia(MOTION_QUERIES.reduced).matches) {
      return;
    }
    let timer: ReturnType<typeof setTimeout>;
    const next = () => {
      timer = setTimeout(breathe, between(GHOST.everyMs));
    };
    const breathe = () => {
      const root = rootRef.current;
      const floor = root?.parentElement;
      const modal = document.querySelector('[aria-modal="true"]') !== null;
      if (root != null && floor != null && !pausedRef.current && !modal && linesRef.current.length < GHOST.max) {
        const folders = [...floor.querySelectorAll<HTMLElement>('[data-board="folder"]')].filter(folder => folder.style.visibility !== 'hidden');
        const folder = folders[Math.floor(Math.random() * folders.length)];
        const file = evidence.find(item => item.id === folder?.dataset.evidenceId);
        const text = file === undefined ? null : ghostPhrase(file.detail);
        if (folder !== undefined && text !== null) {
          const box = folder.getBoundingClientRect();
          const origin = floor.getBoundingClientRect();
          const line = { id: nextId++, text, x: box.left - origin.left + box.width / 2, y: box.top - origin.top + box.height * 0.3 };
          // Never more than two at once, whatever the timing.
          setLines(current => (current.length >= GHOST.max ? current : [...current, line]));
        }
      }
      next();
    };
    next();
    return () => clearTimeout(timer);
  }, [evidence]);

  // The murmur follows the lines on screen.
  useEffect(() => {
    emitStoryEvent({ type: 'ghosts', count: lines.length });
  }, [lines.length]);
  useEffect(() => () => emitStoryEvent({ type: 'ghosts', count: 0 }), []);

  return (
    <div ref={rootRef} aria-hidden="true" data-ghosts="" className="pointer-events-none absolute inset-0 z-[3] overflow-visible">
      {lines.map(line => (
        <Ghost key={line.id} line={line} onGone={() => setLines(current => current.filter(other => other.id !== line.id))} />
      ))}
    </div>
  );
}

/** One line: it rises and drifts like smoke, then is gone. */
function Ghost({ line, onGone }: { line: GhostLine; onGone: () => void }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const goneRef = useRef(onGone);
  useEffect(() => {
    goneRef.current = onGone;
  });
  useEffect(() => {
    const element = ref.current;
    if (element === null) {
      return;
    }
    const life = between(GHOST.lifeSeconds);
    const side = Math.random() < 0.5 ? -1 : 1;
    const tween = gsap.fromTo(
      element,
      { opacity: 0, y: 0, x: 0 },
      {
        keyframes: { opacity: [0, GHOST.peak, GHOST.peak * 0.8, 0] },
        y: -GHOST.rise,
        x: side * GHOST.drift,
        ease: MOTION['dread.rise'].ease,
        duration: life,
        onComplete: () => goneRef.current(),
      }
    );
    return () => {
      tween.kill();
    };
  }, []);
  return (
    <p
      ref={ref}
      data-ghost-line=""
      className="absolute max-w-[14rem] -translate-x-1/2 text-center font-record text-[0.9375rem] leading-snug text-ghost-night italic"
      style={{ left: line.x, top: line.y, opacity: 0 }}
    >
      {line.text}
    </p>
  );
}
