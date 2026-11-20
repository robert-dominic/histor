// src/features/board/Desk.tsx
// The board: a night investigation desk under a brass lamp. Theories across the top, the case files below.
// Desktop (1024px and up) is one fixed screen that never scrolls: a compact header, the board of theories on top
// (about 55% of the height) and the floor below (about 45%), with a thread from each pinned folder to its theory.
// Below that, the phone desk: the theories swipe, and the folders list.
// Everything shown comes from the case data and the investigation.

import { useEffect, useMemo, useRef, useState, type MouseEvent } from 'react';
import { Outlet, useLocation, useParams } from 'react-router-dom';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { useInvestigation } from '@/app/InvestigationProvider';
import DeskGuide from '@/features/board/DeskGuide';
import DeskHints from '@/features/board/DeskHints';
import DeskHintsProvider from '@/features/board/DeskHintsProvider';
import DeskSurface from '@/features/board/DeskSurface';
import Floor from '@/features/board/Floor';
import Pile from '@/features/board/Pile';
import SetAsideTray from '@/features/board/SetAsideTray';
import Lamp from '@/features/board/Lamp';
import WaxSeal from '@/features/board/WaxSeal';
import TheoryBoard, { type DeskSlips } from '@/features/board/TheoryBoard';
import type { SlipReading } from '@/features/board/HangingTab';
import { Flip, clearFlight, flightFor, recordFlight } from '@/features/board/flight';
import { MOTION_QUERIES, tween } from '@/lib/motion';
import { pauseSmoothScroll, resumeSmoothScroll } from '@/lib/smooth-scroll';
import { DESKTOP_QUERY, useMediaQuery } from '@/lib/use-media-query';
import { READING_LABEL } from '@/lib/case-files';
import { buildCaseReport } from '@/lib/case-report';
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

/** What the open file passes back to the desk when it pins: which file was just pinned. */
export interface PinnedState {
  pinned: string;
}

function pinnedFrom(state: unknown): string | null {
  const pinned = (state as Partial<PinnedState> | null)?.pinned;
  return typeof pinned === 'string' ? pinned : null;
}

export default function Desk() {
  return (
    <DeskHintsProvider>
      <DeskScreen />
    </DeskHintsProvider>
  );
}

function DeskScreen() {
  const { state, caseData } = useInvestigation();
  const desktop = useMediaQuery(DESKTOP_QUERY);
  // An open file is shown over the desk (the child route); the desk underneath cannot be reached meanwhile.
  const openId = useParams().evidenceId;
  const fileOpen = openId !== undefined;
  const rootRef = useRef<HTMLElement>(null);
  const base = `/case/${caseData.id}`;
  // Where every file lies, worked out from the investigation, never stored.
  const layout = useMemo(() => deskLayout(caseData, state), [caseData, state]);
  const canClose = layout.canClose;

  // The historians' slips. Their words come from the case report, so the desk and the report always agree.
  const readings = useMemo(() => {
    const map = new Map<string, SlipReading>();
    for (const pin of buildCaseReport(caseData, state).pins) {
      map.set(pin.evidenceId, { label: READING_LABEL[pin.reading], reading: pin.reading, note: pin.note });
    }
    return map;
  }, [caseData, state]);
  // Which slip is open: the one the user tapped on this visit to the desk, or else the file just pinned (D2).
  // Kept per visit (the location's key), so coming back from a pin opens that file's slip.
  const location = useLocation();
  const justPinned = fileOpen ? null : pinnedFrom(location.state);
  const [tapped, setTapped] = useState<{ key: string; id: string | null } | null>(null);
  const openSlip = tapped?.key === location.key ? tapped.id : justPinned;
  const slips: DeskSlips = {
    readings,
    open: openSlip,
    onToggle: id => setTapped({ key: location.key, id: openSlip === id ? null : id }),
    fresh: justPinned === null ? null : { evidenceId: justPinned, token: location.key },
  };

  // An open slip stays until the user's next action anywhere else on the desk. A press is not that action yet:
  // putting the slip away on pointerdown shifts the pile under the finger before the tap completes (seen on a
  // phone), so the tap is lost. The click is the action; a key press counts at once.
  useEffect(() => {
    if (openSlip === null || fileOpen) {
      return;
    }
    const key = location.key;
    const handleAction = (event: Event) => {
      const tab = (event.target as Element | null)?.closest?.('[data-board="tab"]');
      if (tab instanceof HTMLElement && tab.dataset.evidenceId === openSlip) {
        return;
      }
      setTapped({ key, id: null });
    };
    window.addEventListener('click', handleAction, true);
    window.addEventListener('keydown', handleAction, true);
    return () => {
      window.removeEventListener('click', handleAction, true);
      window.removeEventListener('keydown', handleAction, true);
    };
  }, [openSlip, fileOpen, location.key]);

  // The desktop desk never scrolls: the page's own scroll is off, and smooth scrolling steps aside, while it is here.
  useEffect(() => {
    if (!desktop) {
      return;
    }
    const html = document.documentElement;
    const before = html.style.overflow;
    html.style.overflow = 'hidden';
    pauseSmoothScroll();
    return () => {
      html.style.overflow = before;
      resumeSmoothScroll();
    };
  }, [desktop]);
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
          { opacity: 1, y: 0, ...tween('paper.lift'), stagger: 0.03, clearProps: 'opacity,transform' }
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
      home.querySelector<HTMLElement>('[data-focus-home]')?.focus({ preventScroll: true });
      if (flight.state !== null) {
        // It flies back to its floor place or its tab (paper.move), then settles there with a small overshoot (paper.land).
        Flip.from(flight.state, {
          targets: home,
          scale: true,
          ...tween('paper.move'),
          zIndex: 30,
          onComplete: () => {
            const scale = Number(gsap.getProperty(home, 'scale')) || 1;
            gsap.fromTo(home, { scale: scale * 1.05 }, { scale, ...tween('paper.land') });
          },
        });
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
        data-desk={desktop ? 'fixed' : 'scrolling'}
        inert={fileOpen}
        onClickCapture={handleClickCapture}
        aria-labelledby="board-title"
        className={
          desktop
            ? 'relative isolate grid h-svh grid-rows-[auto_minmax(0,55fr)_minmax(0,45fr)] overflow-hidden bg-night pt-[var(--case-header)] text-night-ink'
            : 'relative isolate min-h-svh bg-night pt-[var(--case-header)] text-night-ink'
        }
      >
        <DeskSurface />
        {desktop ? (
          <>
            {/* The compact header: the title, the progress line, the hints and the way to close the case. Above the
                lamp's shadow, so all of it is always readable. */}
            <header className="relative z-[21] flex items-center gap-x-6 px-8 pt-2 pb-1">
              <h2 id="board-title" className="font-voice text-xs tracking-[0.22em] text-ghost-night uppercase">
                The case files
              </h2>
              <p data-board="progress" className="font-voice text-[0.9375rem] leading-snug text-night-ink tabular-nums">
                {progressLine(layout.openedCount, caseData.evidence.length, caseData.closeThreshold)}
              </p>
              <div className="min-w-0 flex-1 [&_[data-hint=desk]]:mt-0 [&_[data-hint=desk]]:min-h-6">
                <DeskHints />
              </div>
              {canClose && <WaxSeal to={`${base}/verdict`} />}
            </header>
            {/* The board: above the floor, so a slip hanging below a tab can lie over it. */}
            <div data-desk="board-row" className="relative z-[3] min-h-0 px-4 pb-2">
              <TheoryBoard caseData={caseData} layout={layout} filesHref={`${base}/files`} slips={slips} fitted />
            </div>
            {/* The floor, with the tray beside it. */}
            <div data-desk="floor-row" className="relative min-h-0 px-4 pb-3">
              <div className="grid h-full min-h-0 grid-cols-[minmax(0,1fr)_16rem] gap-4">
                <div className="min-h-0 min-w-0">
                  <Floor layout={layout} filesHref={`${base}/files`} />
                </div>
                <SetAsideTray layout={layout} filesHref={`${base}/files`} slips={slips} fitted />
              </div>
            </div>
          </>
        ) : (
          <div className="mx-auto max-w-[90rem] px-4 pt-6 pb-16 lg:px-10 lg:pt-10">
            {/* Above the lamp's shadow: the way to close the case is always readable. */}
            <header className="relative z-[21] flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
              <h2 id="board-title" className="font-voice text-xs tracking-[0.22em] text-ghost-night uppercase">
                The case files
              </h2>
              {canClose && <WaxSeal to={`${base}/verdict`} />}
            </header>
            <div className="relative mt-6 lg:mt-10">
              <TheoryBoard caseData={caseData} layout={layout} filesHref={`${base}/files`} slips={slips} />
              {/* The lower desk: the pile with the progress line, then the tray. */}
              <div className="relative mt-6 grid gap-6 lg:mt-12 lg:grid-cols-[1fr_17rem] lg:items-start">
                {/* min-w-0: the phone strip scrolls inside its column instead of widening it. */}
                <div className="min-w-0">
                  {/* Above the lamp's shadow, so it can always be read. */}
                  <p data-board="progress" className="relative z-[21] font-voice text-[0.9375rem] leading-snug text-night-ink tabular-nums">
                    {progressLine(layout.openedCount, caseData.evidence.length, caseData.closeThreshold)}
                  </p>
                  <DeskHints />
                  <Pile layout={layout} filesHref={`${base}/files`} />
                </div>
                <SetAsideTray layout={layout} filesHref={`${base}/files`} slips={slips} />
              </div>
            </div>
          </div>
        )}
        <Lamp />
      </main>
      {!fileOpen && <DeskGuide threshold={caseData.closeThreshold} />}
      <Outlet />
    </>
  );
}
