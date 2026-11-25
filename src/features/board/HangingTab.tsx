// src/features/board/HangingTab.tsx
// A pinned file, hanging beneath its theory note (or lying in the set-aside tray) as a small folder tab: its
// number and title, and a brass pin where its thread ends.
// Tapping the tab shows the historians' slip clipped beneath it: how historians read this pin, and a link that
// opens the file again (D2). The desk opens the slip of the file just pinned by itself, until the next action.

import { useContext, useId, useLayoutEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { Link } from 'react-router-dom';
import { scatter } from '@/lib/desk';
import { QUICK_OUT, MOTION_QUERIES, tween } from '@/lib/motion';
import type { Evidence } from '@/types/case';
import { InvestigationContext } from '@/app/InvestigationProvider';

/** How historians read the user's pin of this file, in words ready to show. */
export interface SlipReading {
  /** e.g. "Historians agree". */
  label: string;
  /** e.g. "agree": for styling and tests. */
  reading: string;
  note: string;
}

interface HangingTabProps {
  evidence: Evidence;
  number: string;
  href: string;
  reading: SlipReading | undefined;
  slipOpen: boolean;
  onToggleSlip: (evidenceId: string) => void;
}

export default function HangingTab({ evidence, number, href, reading, slipOpen, onToggleSlip }: HangingTabProps) {
  const { rotate } = scatter(evidence.id, 3, 0);
  // Read without insisting on a provider: a tab drawn on its own (a test) simply knows nothing.
  const investigation = useContext(InvestigationContext);
  const legendKnown = evidence.status === 'legend' && investigation?.state.opened.includes(evidence.id) === true;
  const slipId = useId();
  // The slip is drawn while it is open and until it has finished leaving: it slides out from under its tab and slides
  // back, never snapping. Without a way to honour reduced motion it is simply shown and hidden.
  const canAnimate = typeof window !== 'undefined' && typeof window.matchMedia === 'function';
  const [drawn, setDrawn] = useState(slipOpen);
  if (slipOpen && !drawn) {
    setDrawn(true);
  }
  const showSlip = canAnimate ? drawn || slipOpen : slipOpen;
  const slipRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const slip = slipRef.current;
    if (slip === null || !canAnimate) {
      return;
    }
    const reduced = window.matchMedia(MOTION_QUERIES.reduced).matches;
    gsap.killTweensOf(slip);
    if (slipOpen) {
      gsap.fromTo(
        slip,
        reduced ? { opacity: 0 } : { opacity: 0, y: -8 },
        { opacity: 1, y: 0, ...tween('paper.lift'), clearProps: 'opacity,transform' }
      );
    } else {
      gsap.to(slip, { opacity: 0, y: reduced ? 0 : -8, ...QUICK_OUT, onComplete: () => setDrawn(false) });
    }
  }, [slipOpen, canAnimate, showSlip]);
  return (
    <li
      data-board="tab"
      data-evidence-id={evidence.id}
      data-flip-id={`file-${evidence.id}`}
      // An opened legend (its stamp is known): the lantern flickers over it, and it twitches now and then (dread pass).
      data-legend-known={legendKnown ? 'true' : undefined}
      data-slip-open={slipOpen}
      className={`relative ${slipOpen ? 'z-[3]' : ''}`}
    >
      <button
        type="button"
        data-focus-home
        aria-expanded={slipOpen}
        aria-controls={slipId}
        onClick={() => onToggleSlip(evidence.id)}
        className="desk-manila relative flex w-full items-baseline gap-2 rounded-t-[3px] rounded-b-[1px] px-3 pt-3.5 pb-2 text-left text-ink shadow-md shadow-black/60 outline-offset-2 transition-[scale] duration-150 ease-out focus-visible:outline-2 focus-visible:outline-brass active:scale-[0.97]"
        style={{ rotate: `${rotate}deg` }}
      >
        <span aria-hidden="true" data-board="tab-pin" className="desk-pin absolute top-1 left-4 size-2 rounded-full" />
        <span className="font-voice text-[0.6875rem] tracking-[0.14em] text-ink/80 tabular-nums">
          <span className="sr-only">File </span>
          {number}
        </span>
        <span data-board="tab-label" className="min-w-0 font-voice text-[0.8125rem] leading-[1.25] text-pretty break-words text-ink">{evidence.title}</span>
      </button>
      <div id={slipId} aria-live="polite">
        {showSlip && (
          <div
            ref={slipRef}
            data-board="slip"
            className="desk-slip deckle-2 relative mx-1.5 -mt-px rounded-b-[2px] px-3 pt-2.5 pb-3 text-ink shadow-lg shadow-black/50"
          >
            {/* A small brass clip holds the slip to the tab. */}
            <span aria-hidden="true" className="absolute -top-1 right-4 h-3 w-1.5 rounded-[1px] bg-brass/80" />
            {reading !== undefined && (
              <>
                <p data-board="reading" data-reading={reading.reading} className="font-voice text-[0.8125rem] text-ink">
                  {reading.label}
                </p>
                <p className="mt-1 font-record text-[0.875rem] leading-snug text-ink/90">{reading.note}</p>
              </>
            )}
            <Link
              to={href}
              className="mt-2 inline-flex min-h-11 items-center font-voice text-[0.75rem] tracking-[0.12em] text-record uppercase underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass sm:min-h-0 sm:py-1"
            >
              Open the file<span className="sr-only">: {evidence.title}</span>
            </Link>
          </div>
        )}
      </div>
    </li>
  );
}
