// src/features/board/Desk.tsx
// The board: a night investigation desk under a brass lamp. Theories across the top, the case files below.
// Desktop draws a thread from each pinned folder to its theory; phones swipe the theories and list the folders.
// Everything shown comes from the case data and the investigation.

import { useMemo, useRef } from 'react';
import { Link, Outlet, useParams } from 'react-router-dom';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { useInvestigation } from '@/app/InvestigationProvider';
import DeskSurface from '@/features/board/DeskSurface';
import Folder from '@/features/board/Folder';
import Lamp from '@/features/board/Lamp';
import TheoryBoard from '@/features/board/TheoryBoard';
import { fileNumber, pinTargetTitle } from '@/lib/case-files';
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
  const fileOpen = useParams().evidenceId !== undefined;
  const rootRef = useRef<HTMLElement>(null);
  const base = `/case/${caseData.id}`;
  // Where every file lies, worked out from the investigation, never stored.
  const layout = useMemo(() => deskLayout(caseData, state), [caseData, state]);
  const opened = useMemo(() => new Set(state.opened), [state.opened]);
  const canClose = layout.canClose;

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
          <TheoryBoard caseData={caseData} layout={layout} filesHref={`${base}/files`} />

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
