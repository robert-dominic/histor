// src/features/board/Desk.tsx
// The board: a night investigation desk under a brass lamp. Theories across the top, the case files below.
// Desktop draws a thread from each pinned folder to its theory; phones swipe the theories and list the folders.
// Everything shown comes from the case data and the investigation.

import { useId, useMemo, useRef, useState } from 'react';
import { Link, Outlet, useParams } from 'react-router-dom';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { useInvestigation } from '@/app/InvestigationProvider';
import DeskSurface from '@/features/board/DeskSurface';
import Folder from '@/features/board/Folder';
import Lamp from '@/features/board/Lamp';
import TheoryCard from '@/features/board/TheoryCard';
import Threads from '@/features/board/Threads';
import { fileNumber, pinTargetTitle } from '@/lib/case-files';
import { EASE, MOTION_QUERIES } from '@/lib/motion';
import { DESKTOP_QUERY, SMALL_PHONE_QUERY, useMediaQuery } from '@/lib/use-media-query';

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
  const fileOpen = useParams().evidenceId !== undefined;
  const rootRef = useRef<HTMLElement>(null);
  const isDesktop = useMediaQuery(DESKTOP_QUERY);
  const isSmallPhone = useMediaQuery(SMALL_PHONE_QUERY);
  // Small phones: the theory whose claim is shown under the row, or null.
  const [shownClaim, setShownClaim] = useState<string | null>(null);
  const claimId = useId();
  const shownTheory = isSmallPhone ? caseData.theories.find(theory => theory.id === shownClaim) : undefined;
  const base = `/case/${caseData.id}`;

  const opened = useMemo(() => new Set(state.opened), [state.opened]);
  const pinnedCount = (theoryId: string) => Object.values(state.pins).filter(target => target === theoryId).length;
  const threads = useMemo(
    () =>
      caseData.evidence
        .filter(evidence => {
          const target = state.pins[evidence.id];
          return opened.has(evidence.id) && target !== undefined && target !== 'none';
        })
        .map(evidence => ({ evidenceId: evidence.id, theoryId: state.pins[evidence.id] })),
    [caseData.evidence, state.pins, opened]
  );
  const canClose = state.opened.length >= caseData.closeThreshold;

  useGSAP(
    () => {
      if (typeof window.matchMedia !== 'function') {
        return;
      }
      const mm = gsap.matchMedia();
      mm.add(MOTION_QUERIES, context => {
        const reduced = context.conditions?.reduced === true;
        const parts = gsap.utils.toArray<HTMLElement>('[data-board="theory"], [data-board="folder"]');
        gsap.fromTo(
          parts,
          reduced ? { opacity: 0 } : { opacity: 0, y: 10 },
          { opacity: 1, y: 0, duration: 0.4, ease: EASE.out, stagger: 0.03, clearProps: 'opacity,transform' }
        );
      });
    },
    { scope: rootRef }
  );

  return (
    <>
    <main
      ref={rootRef}
      data-page="case"
      inert={fileOpen}
      aria-labelledby="board-title"
      className="relative isolate min-h-svh bg-night pt-[var(--case-header)] text-night-ink"
    >
      <DeskSurface />

      <div className="mx-auto max-w-[90rem] px-4 pt-6 pb-16 lg:px-10 lg:pt-10">
        {/* Above the lamp's shadow: the progress line and the way to close the case are always readable. */}
        <header className="relative z-[21] flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
          <div>
            <h2 id="board-title" className="font-voice text-xs tracking-[0.22em] text-ghost-night uppercase">
              The case files
            </h2>
            <p data-board="progress" className="mt-2 font-voice text-[0.9375rem] leading-snug text-night-ink tabular-nums">
              {progressLine(state.opened.length, caseData.evidence.length, caseData.closeThreshold)}
            </p>
          </div>
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
          {/* The threads run behind the paper, so they show in the gaps and never cover any text. */}
          {isDesktop && <Threads threads={threads} />}

          {/* Phones: a row to swipe, stuck under the header while the folders scroll by. The board, not this
              section, bounds the sticking. Desktop: five cards across the desk. */}
          <section
            aria-labelledby="theories-title"
            className="sticky top-[var(--case-header)] z-20 lg:relative lg:top-auto lg:z-10"
          >
            <h3 id="theories-title" className="sr-only">
              Theories
            </h3>
            <div className="-mx-4 bg-night/92 backdrop-blur-sm lg:mx-0 lg:bg-transparent lg:backdrop-blur-none">
              <div className="overflow-x-auto px-4 py-3 lg:overflow-visible lg:p-0">
                <div className="flex snap-x snap-mandatory gap-3 lg:grid lg:grid-cols-5 lg:gap-5">
                  {caseData.theories.map(theory => (
                    <TheoryCard
                      key={theory.id}
                      theory={theory}
                      pinnedCount={pinnedCount(theory.id)}
                      compact={isSmallPhone}
                      expanded={shownClaim === theory.id}
                      claimId={claimId}
                      onToggle={() => setShownClaim(current => (current === theory.id ? null : theory.id))}
                    />
                  ))}
                </div>
              </div>
              {/* Small phones: the claim of the tapped card. Tapping the card again hides it. */}
              {isSmallPhone && (
                <div id={claimId} aria-live="polite">
                  {shownTheory !== undefined && (
                    <p data-board="claim" className="mx-4 mb-3 rounded-sm bg-paper px-3.5 py-2.5 font-record text-[0.9375rem] leading-snug text-ink">
                      <span className="font-legend text-[1.0625rem] leading-none">{shownTheory.title}: </span>
                      {shownTheory.claim}
                    </p>
                  )}
                </div>
              )}
            </div>
          </section>

          <section aria-labelledby="files-title" className="relative z-10 mt-6 lg:mt-24">
            <h3 id="files-title" className="sr-only">
              Files
            </h3>
            <ol className="flex flex-col gap-3 lg:grid lg:grid-cols-6 lg:gap-x-5 lg:gap-y-6">
              {caseData.evidence.map((evidence, index) => {
                const target = state.pins[evidence.id];
                return (
                  <Folder
                    key={evidence.id}
                    evidence={evidence}
                    number={fileNumber(index)}
                    href={`${base}/files/${evidence.id}`}
                    opened={opened.has(evidence.id)}
                    pinnedTo={opened.has(evidence.id) && target !== undefined ? pinTargetTitle(caseData, target) : undefined}
                  />
                );
              })}
            </ol>
          </section>
        </div>
      </div>
      <Lamp />
    </main>
    <Outlet />
    </>
  );
}
