// src/features/board/Desk.tsx
// The board: a night investigation desk under a brass lamp. Theories across the top, the case files below.
// Desktop draws a thread from each pinned folder to its theory; phones swipe the theories and list the folders.
// Everything shown comes from the case data and the investigation.

import { useEffect, useMemo, useRef, type MouseEvent } from 'react';
import { Link, Outlet, useParams } from 'react-router-dom';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { useInvestigation } from '@/app/InvestigationProvider';
import DeskSurface from '@/features/board/DeskSurface';
import Pile from '@/features/board/Pile';
import SetAsideTray from '@/features/board/SetAsideTray';
import Lamp from '@/features/board/Lamp';
import TheoryBoard from '@/features/board/TheoryBoard';
import { Flip, clearFlight, flightFor, recordFlight } from '@/features/board/flight';
import { EASE, MOTION_QUERIES } from '@/lib/motion';
import { deskLayout } from '@/lib/desk';

gsap.registerPlugin(useGSAP);

/** The progress line, in the app's voice. */
function progressLine(opened: number, total: number, threshold: number): string {
  const count = `${opened} of ${total} files opened.`;
  const remaining = threshold - opened;
  if (remaining > 0) {
    return `${count} Open ${remaining} more to close the case.`;
  }
  return `${count} You can close the case.`;
}


export default function Desk() {
  const { state, caseData } = useInvestigation();
  // An open file is shown over the desk (the child route); the desk underneath cannot be reached meanwhile.
  const openId = useParams().evidenceId;
  const fileOpen = openId !== undefined;
  const rootRef = useRef<HTMLElement>(null);
  const base = `/case/${caseData.id}`;
  // Where every file lies, worked out from the investigation, never stored.
  const layout = useMemo(() => deskLayout(caseData, state), [caseData, state]);
  const canClose = layout.canClose;

  useGSAP(
    () => {
      if (typeof window.matchMedia !== 'function') {
        return;
      }
      const mm = gsap.matchMedia();
      mm.add(MOTION_QUERIES, context => {
        const reduced = context.conditions?.reduced === true;
        // The notes settle onto the board. The pile places its own folders (Pile.tsx).
        const parts = gsap.utils.toArray<HTMLElement>('[data-board="theory"]');
        gsap.fromTo(
          parts,
          reduced ? { opacity: 0 } : { opacity: 0, y: 10 },
          { opacity: 1, y: 0, duration: 0.4, ease: EASE.out, stagger: 0.03, clearProps: 'opacity,transform' }
        );
      });
    },
    { scope: rootRef }
  );

  // While a file is open, its folder has left the desk: the one on the desk is hidden. When the file closes,
  // the folder comes back, flies home from where the open file was (desktop, full motion), and takes the focus.
  useEffect(() => {
    const root = rootRef.current;
    if (openId === undefined || root === null) {
      return;
    }
    const selector = `[data-flip-id="file-${openId}"]`;
    const away = root.querySelector<HTMLElement>(selector);
    if (away !== null) {
      away.style.visibility = 'hidden';
    }
    return () => {
      if (away !== null) {
        away.style.visibility = '';
      }
      // Only a file closed from inside comes home; moving on to the next file does not.
      const flight = flightFor(openId, 'out');
      if (flight === null) {
        return;
      }
      clearFlight();
      const home = root.querySelector<HTMLElement>(selector);
      if (home === null) {
        return;
      }
      home.querySelector<HTMLElement>('a[href]')?.focus({ preventScroll: true });
      if (flight.state !== null) {
        Flip.from(flight.state, { targets: home, scale: true, duration: 0.35, ease: EASE.out, zIndex: 30 });
      }
    };
  }, [openId]);

  /** Opening a folder: remember where it lay, so the open file can fly from there. */
  const handleClickCapture = (event: MouseEvent<HTMLElement>) => {
    const folder = (event.target as Element).closest('a[href]')?.closest<HTMLElement>('[data-flip-id][data-evidence-id]');
    const id = folder?.dataset.evidenceId;
    if (folder != null && id !== undefined) {
      recordFlight(id, 'in', folder);
    }
  };

  return (
    <>
    <main
      ref={rootRef}
      data-page="case"
      inert={fileOpen}
      onClickCapture={handleClickCapture}
      aria-labelledby="board-title"
      className="relative isolate min-h-svh bg-night pt-[var(--case-header)] text-night-ink"
    >
      <DeskSurface />

      <div className="mx-auto max-w-[90rem] px-4 pt-6 pb-16 lg:px-10 lg:pt-10">
        {/* Above the lamp's shadow: the way to close the case is always readable. */}
        <header className="relative z-[21] flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
          <h2 id="board-title" className="font-voice text-xs tracking-[0.22em] text-ghost-night uppercase">
            The case files
          </h2>
          {canClose && (
            <Link
              to={`${base}/verdict`}
              className="inline-flex min-h-11 items-center rounded-sm border border-brass px-5 font-voice text-sm tracking-[0.14em] text-brass uppercase transition-[scale,background-color,color] duration-150 ease-out hover:bg-brass hover:text-night focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass active:scale-[0.97]"
            >
              Close the case
            </Link>
          )}
        </header>

        <div className="relative mt-6 lg:mt-10">
          <TheoryBoard caseData={caseData} layout={layout} filesHref={`${base}/files`} />

          {/* The lower desk: the pile on the left with the progress line, the tray on the right. */}
          <div className="relative mt-6 grid gap-6 lg:mt-12 lg:grid-cols-[1fr_17rem] lg:items-start">
            {/* min-w-0: the phone strip scrolls inside its column instead of widening it. */}
            <div className="min-w-0">
              {/* Above the lamp's shadow, so it can always be read. */}
              <p data-board="progress" className="relative z-[21] font-voice text-[0.9375rem] leading-snug text-night-ink tabular-nums">
                {progressLine(layout.openedCount, caseData.evidence.length, caseData.closeThreshold)}
              </p>
              <Pile layout={layout} filesHref={`${base}/files`} />
            </div>
            <SetAsideTray layout={layout} filesHref={`${base}/files`} />
          </div>
        </div>
      </div>
      <Lamp />
    </main>
    <Outlet />
    </>
  );
}
