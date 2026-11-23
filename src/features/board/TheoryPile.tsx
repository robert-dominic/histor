// src/features/board/TheoryPile.tsx
// The files pinned to one theory on the desktop desk, as a tidy pile under its note: at most four edges show, the
// top file's label shows, and a badge counts them ("×7"). However many files are pinned, the pile keeps one size,
// so the board never grows.
// Clicking the pile (or hovering it, with a mouse) opens a panel over the board with its files, one tab each (the
// same tabs as before: each has its historians' slip and a link to open the file, and can be dragged out). The
// panel scrolls when it is long. It opens by itself to show the slip of a file just pinned here, until the next
// action. Escape closes it and gives the focus back to the pile.
// The panel's tabs stay in the page while it is closed (hidden), so the desk can drag them and fly folders to them.
// While a tab is carried out of the panel, the panel stops clipping it and everything else in it fades (`carryOut`).

import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import HangingTab from '@/features/board/HangingTab';
import { PILE_EDGES } from '@/features/board/pile';
import type { DeskSlips } from '@/features/board/TheoryBoard';
import { scatter } from '@/lib/desk';
import { QUICK_OUT, MOTION_QUERIES, STEP, tween } from '@/lib/motion';
import type { Evidence } from '@/types/case';

/** A mouse or trackpad: the pile opens on hover too. */
const FINE_HOVER = '(hover: hover) and (pointer: fine)';

interface TheoryPileProps {
  theoryId: string;
  theoryTitle: string;
  files: Evidence[];
  numberOf: Map<string, string>;
  filesHref: string;
  slips: DeskSlips;
}

export default function TheoryPile({ theoryId, theoryTitle, files, numberOf, filesHref, slips }: TheoryPileProps) {
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<number | null>(null);
  const [chosen, setChosen] = useState(false);
  // The slip of a file just pinned here (or tapped) is shown in the open panel.
  const slipHere = slips.open !== null && files.some(file => file.id === slips.open);
  const open = chosen || slipHere;
  // The panel is drawn while it is open and until it has finished leaving, so it never snaps away.
  // Without a way to honour reduced motion it is simply shown and hidden.
  const canAnimate = typeof window !== 'undefined' && typeof window.matchMedia === 'function';
  const [drawn, setDrawn] = useState(open);
  if (open && !drawn) {
    setDrawn(true);
  }
  const shown = canAnimate ? drawn || open : open;
  const top = files[files.length - 1];
  const edges = Math.min(PILE_EDGES, files.length);

  useLayoutEffect(() => {
    const panel = panelRef.current;
    if (panel === null || !canAnimate) {
      return;
    }
    const reduced = window.matchMedia(MOTION_QUERIES.reduced).matches;
    gsap.killTweensOf(panel);
    if (open) {
      gsap.fromTo(
        panel,
        reduced ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.97 },
        { opacity: 1, y: 0, scale: 1, ...tween('paper.lift'), clearProps: 'opacity,transform' }
      );
    } else if (drawn) {
      gsap.to(panel, { opacity: 0, y: reduced ? 0 : -6, ...QUICK_OUT, onComplete: () => setDrawn(false) });
    }
  }, [open, drawn, canAnimate]);

  // Hovering, with a mouse: the panel opens as the pointer comes onto the pile, and closes a moment after it leaves
  // both the pile and the panel. Never while a folder from it is in the hand.
  useEffect(() => {
    const root = rootRef.current;
    if (root === null || typeof window.matchMedia !== 'function' || !window.matchMedia(FINE_HOVER).matches) {
      return;
    }
    const cancel = () => {
      if (closeTimer.current !== null) {
        window.clearTimeout(closeTimer.current);
        closeTimer.current = null;
      }
    };
    const onEnter = () => {
      cancel();
      if (document.documentElement.dataset.dragging !== 'true') {
        setChosen(true);
      }
    };
    const onLeave = () => {
      cancel();
      closeTimer.current = window.setTimeout(() => {
        if (document.documentElement.dataset.dragging !== 'true') {
          setChosen(false);
        }
      }, STEP.base * 1000);
    };
    root.addEventListener('pointerenter', onEnter);
    root.addEventListener('pointerleave', onLeave);
    return () => {
      cancel();
      root.removeEventListener('pointerenter', onEnter);
      root.removeEventListener('pointerleave', onLeave);
    };
  }, []);

  if (top === undefined) {
    return null;
  }
  return (
    <div
      ref={rootRef}
      data-board="pile"
      data-theory-id={theoryId}
      data-files={files.map(file => file.id).join(' ')}
      data-open={open}
      className="relative z-[2] mt-3"
      onKeyDown={event => {
        if (event.key === 'Escape' && open) {
          event.stopPropagation();
          setChosen(false);
          buttonRef.current?.focus();
        }
      }}
      onBlur={event => {
        // The focus left the pile and its panel: it closes.
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setChosen(false);
        }
      }}
    >
      <button
        ref={buttonRef}
        type="button"
        data-board="pile-button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setChosen(!open)}
        className="group/pile relative block h-[3.25rem] w-full text-left outline-offset-2 transition-[scale] duration-150 ease-out focus-visible:outline-2 focus-visible:outline-brass active:scale-[0.97]"
      >
        <span className="sr-only">
          {files.length === 1 ? `1 file pinned to ${theoryTitle}` : `${files.length} files pinned to ${theoryTitle}`}: show
        </span>
        {/* The edges below the top file: one for each file under it, at most three, each a little lower and askew. */}
        {Array.from({ length: edges - 1 }, (_, index) => {
          const { rotate } = scatter(`${theoryId}:${index}`, 2, 0);
          return (
            <span
              key={index}
              aria-hidden="true"
              data-board="pile-edge"
              className="desk-manila absolute inset-x-1 top-0 h-9 rounded-[3px] shadow-sm shadow-black/60"
              style={{ translate: `0 ${(edges - 1 - index) * 4}px`, rotate: `${rotate}deg` }}
            />
          );
        })}
        {/* The top file: its number and label. */}
        <span
          aria-hidden="true"
          data-board="pile-top"
          data-evidence-id={top.id}
          className="desk-manila absolute inset-x-0 top-0 flex h-9 items-center gap-2 rounded-t-[3px] rounded-b-[1px] px-3 pt-1 text-ink shadow-md shadow-black/60"
        >
          <span data-board="tab-pin" className="desk-pin absolute top-1 left-4 size-2 rounded-full" />
          <span className="font-voice text-[0.6875rem] tracking-[0.14em] tabular-nums">{numberOf.get(top.id)}</span>
          <span className="truncate font-voice text-[0.8125rem]">{top.title}</span>
        </span>
        {files.length > 1 && (
          <span
            aria-hidden="true"
            data-board="pile-count"
            className="absolute -top-2 -right-1 rounded-full bg-brass px-1.5 py-0.5 font-voice text-[0.75rem] leading-none text-ink tabular-nums shadow-sm shadow-black/60"
          >
            ×{files.length}
          </span>
        )}
      </button>
      {/* The panel over the board: every file in the pile, one tab each. */}
      <div
        ref={panelRef}
        id={panelId}
        data-board="pile-panel"
        hidden={!shown}
        data-lenis-prevent
        className="thin-scroll absolute inset-x-0 top-full z-10 mt-2 max-h-[min(55svh,22rem)] overflow-y-auto overscroll-contain rounded-sm p-2"
      >
        {/* The panel's own paper: a layer of its own, so it can fade while a tab is carried out (effects.css). */}
        <span
          aria-hidden="true"
          data-board="pile-panel-bg"
          className="pointer-events-none absolute inset-0 rounded-sm bg-night/95 shadow-xl shadow-black/70 ring-1 ring-brass/25"
        />
        <ul data-board="tabs" data-theory-id={theoryId} aria-label={`Files pinned to ${theoryTitle}`} className="relative flex flex-col gap-1.5">
          {files.map(evidence => (
            <HangingTab
              key={evidence.id}
              evidence={evidence}
              number={numberOf.get(evidence.id) ?? ''}
              href={`${filesHref}/${evidence.id}`}
              reading={slips.readings.get(evidence.id)}
              slipOpen={slips.open === evidence.id}
              onToggleSlip={slips.onToggle}
            />
          ))}
        </ul>
      </div>
    </div>
  );
}
