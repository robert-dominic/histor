// src/features/dread/LanternCursor.tsx
// The cursor is a small lantern flame (dread pass, 2): a warm dot with a soft halo that flickers gently. It replaces
// the system cursor only on a desktop with a fine pointer and full motion; anywhere else, the system's own. Beside the
// flame, a small typed word says what a press would do: "Open" over a file, "Drag" while carrying one, "Read" over a
// portal name, "Pin" over a theory while carrying a file. Over an opened legend file the lamp's light flickers
// briefly. In a text field the system cursor comes back (the lantern hides), and keyboard focus outlines are never
// touched. Moved on a pointer move, at most once a frame; nothing runs while the pointer is still.
import { useEffect, useRef, useState } from 'react';
import { lampFlicker } from '@/lib/lamp';
import { lanternWord, type LanternWord } from '@/lib/lantern';
import { MOTION_QUERIES } from '@/lib/motion';
import { DESKTOP_QUERY } from '@/lib/use-media-query';

const FINE_POINTER = '(hover: hover) and (pointer: fine)';

const TEXT_FIELD = 'input:not([type="checkbox"]):not([type="radio"]):not([type="range"]), textarea, select, [contenteditable="true"]';

/** True where the lantern takes over the cursor. */
function lanternWanted(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia(FINE_POINTER).matches && window.matchMedia(DESKTOP_QUERY).matches && !window.matchMedia(MOTION_QUERIES.reduced).matches;
}

export default function LanternCursor() {
  const [on] = useState(lanternWanted);
  const rootRef = useRef<HTMLDivElement>(null);
  const wordRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const wordEl = wordRef.current;
    if (!on || root === null || wordEl === null) {
      return;
    }
    const html = document.documentElement;
    html.dataset.lantern = 'on';
    let frame = 0;
    let x = -100;
    let y = -100;
    let target: Element | null = null;
    let word: LanternWord = '';
    let overLegend = false;
    const paint = () => {
      frame = 0;
      root.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      const inField = target?.closest(TEXT_FIELD) != null;
      root.dataset.hidden = String(inField);
      const next = lanternWord(target, html.dataset.dragging === 'true');
      if (next !== word) {
        word = next;
        wordEl.textContent = next;
        root.dataset.word = String(next !== '');
      }
      const legend = target?.closest('[data-legend-known="true"]') != null;
      if (legend && !overLegend) {
        lampFlicker('short');
      }
      overLegend = legend;
    };
    const move = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') {
        return;
      }
      x = event.clientX;
      y = event.clientY;
      target = event.target instanceof Element ? event.target : null;
      root.dataset.away = 'false';
      if (frame === 0) {
        frame = requestAnimationFrame(paint);
      }
    };
    const leave = () => {
      root.dataset.away = 'true';
    };
    window.addEventListener('pointermove', move, { passive: true });
    window.addEventListener('pointerdown', move, { passive: true });
    document.documentElement.addEventListener('pointerleave', leave);
    return () => {
      cancelAnimationFrame(frame);
      delete html.dataset.lantern;
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerdown', move);
      document.documentElement.removeEventListener('pointerleave', leave);
    };
  }, [on]);

  if (!on) {
    return null;
  }
  return (
    <div ref={rootRef} aria-hidden="true" data-lantern="" data-away="true" data-word="false" className="lantern pointer-events-none fixed top-0 left-0 z-[95]">
      <span className="lantern-halo" />
      <span className="lantern-flame" />
      <span ref={wordRef} data-lantern="word" className="lantern-word font-voice" />
    </div>
  );
}
