// src/features/board/OpenedFile.tsx
// One opened case file, full screen, on paper. Opening it marks it opened. After a short beat its status stamps
// onto it: record lands crisp, disputed lands smudged and shows both sides, legend lands and the text fades to
// ghost ink, with where the legend came from. Then the app asks which theory it points to, and after the
// answer shows how historians read it. A file opened before is shown at once, stamped, with the user's choice.

import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { useInvestigation } from '@/app/InvestigationProvider';
import Stamp from '@/components/Stamp';
import PortalText from '@/features/portals/PortalText';
import { NO_THEORY, READING_LABEL, STATUS_LABEL, fileNumber, nextUnopenedId, pinTargetTitle } from '@/lib/case-files';
import { buildCaseReport } from '@/lib/case-report';
import { EASE, MOTION_QUERIES } from '@/lib/motion';
import type { Evidence, PinTarget, Source } from '@/types/case';

gsap.registerPlugin(useGSAP);

/** Seconds. Opening a file happens many times, so it is quick; the stamp waits a short beat. */
const TIMING = {
  enter: 0.25,
  stampAt: 0.55,
  stamp: 0.18,
  after: 0.35,
} as const;

const BUTTON_CLASSES =
  'min-h-11 rounded-sm border px-4 py-2 text-left font-voice text-sm leading-snug transition-[scale,background-color,color,border-color] duration-150 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass active:scale-[0.97]';

const LINK_CLASSES =
  'inline-flex min-h-11 items-center font-voice text-sm tracking-[0.1em] uppercase underline-offset-4 transition-[color] duration-150 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass';

interface OpenedFileProps {
  evidence: Evidence;
  index: number;
}

export default function OpenedFile({ evidence, index }: OpenedFileProps) {
  const { state, dispatch, caseData } = useInvestigation();
  const rootRef = useRef<HTMLElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const revealRef = useRef<HTMLDivElement>(null);
  // Only the value when the file is first shown counts: a file opened before is shown stamped at once.
  const [openedBefore] = useState(() => state.opened.includes(evidence.id));
  const board = `/case/${caseData.id}/files`;

  const target: PinTarget | undefined = state.pins[evidence.id];
  // How historians read the pin comes from the case report, so the board and the report always agree.
  const pinReading = useMemo(
    () => buildCaseReport(caseData, state).pins.find(pin => pin.evidenceId === evidence.id),
    [caseData, state, evidence.id]
  );
  const sources = evidence.sources
    .map(id => caseData.sources.find(source => source.id === id))
    .filter((source): source is Source => source !== undefined);
  const nextId = nextUnopenedId(caseData, state.opened, evidence.id);
  const isLegend = evidence.status === 'legend';

  // Opening the file marks it opened. Opening it again changes nothing.
  useEffect(() => {
    dispatch({ type: 'OPEN_EVIDENCE', evidenceId: evidence.id });
  }, [dispatch, evidence.id]);

  // A file is a new screen: start at its top, with the focus on its title.
  useEffect(() => {
    rootRef.current?.scrollIntoView?.({ block: 'start' });
    headingRef.current?.focus({ preventScroll: true });
  }, []);

  useGSAP(
    () => {
      // Shown before, or no way to honour reduced motion: everything is simply there, already stamped.
      if (openedBefore || typeof window.matchMedia !== 'function') {
        return;
      }
      const mm = gsap.matchMedia();
      mm.add(MOTION_QUERIES, context => {
        const reduced = context.conditions?.reduced === true;
        const sheet = '[data-file="sheet"]';
        const stamp = '[data-file="stamp"]';
        const after = gsap.utils.toArray<HTMLElement>('[data-file="after"]');
        const timeline = gsap.timeline({ defaults: { ease: EASE.out } });

        timeline.fromTo(
          sheet,
          reduced ? { opacity: 0 } : { opacity: 0, scale: 0.97 },
          { opacity: 1, scale: 1, duration: TIMING.enter }
        );
        // The stamp presses in: it shrinks onto the paper as its ink is uncovered (motion.md).
        timeline.fromTo(
          stamp,
          reduced ? { opacity: 0 } : { opacity: 0, scale: 1.15, clipPath: 'inset(0% 50% 0% 50%)' },
          { opacity: 1, scale: 1, clipPath: 'inset(0% 0% 0% 0%)', duration: TIMING.stamp },
          TIMING.stampAt
        );
        // A legend's text turns to ghost ink the moment the stamp lands. Written to the element, not to state.
        if (isLegend) {
          timeline.call(() => rootRef.current?.setAttribute('data-ink', 'ghost'), undefined, TIMING.stampAt + TIMING.stamp);
        }
        if (after.length > 0) {
          timeline.fromTo(
            after,
            reduced ? { opacity: 0 } : { opacity: 0, y: 6 },
            { opacity: 1, y: 0, duration: TIMING.after },
            TIMING.stampAt + TIMING.stamp + 0.1
          );
        }
      });
    },
    { scope: rootRef }
  );

  // The reveal fades in each time the answer changes.
  useGSAP(
    () => {
      if (target === undefined || typeof window.matchMedia !== 'function') {
        return;
      }
      const mm = gsap.matchMedia();
      mm.add(MOTION_QUERIES, context => {
        const reduced = context.conditions?.reduced === true;
        gsap.fromTo(
          revealRef.current,
          reduced ? { opacity: 0 } : { opacity: 0, y: 6 },
          { opacity: 1, y: 0, duration: 0.25, ease: EASE.out }
        );
      });
    },
    { scope: rootRef, dependencies: [target], revertOnUpdate: true }
  );

  const pin = (choice: PinTarget) => dispatch({ type: 'PIN_EVIDENCE', evidenceId: evidence.id, target: choice });
  const choices: { id: PinTarget; label: string }[] = [
    ...caseData.theories.map(theory => ({ id: theory.id, label: theory.title })),
    { id: 'none', label: NO_THEORY },
  ];

  return (
    <main
      ref={rootRef}
      data-page="case"
      data-ink={openedBefore && isLegend ? 'ghost' : undefined}
      className="min-h-svh scroll-mt-[var(--case-header)] bg-night px-3 pt-[calc(var(--case-header)+1.25rem)] pb-12 sm:px-6 lg:pt-[calc(var(--case-header)+2.5rem)]"
    >
      <article
        data-file="sheet"
        data-status={evidence.status}
        aria-labelledby="file-title"
        className={`relative mx-auto max-w-3xl rounded-sm px-5 pt-8 pb-8 text-ink shadow-2xl shadow-black/60 sm:px-10 sm:pt-10 ${
          isLegend ? 'bg-paper/90' : 'bg-paper'
        }`}
      >
        {/* The folder's tab. */}
        <span aria-hidden="true" className="absolute -top-3 left-6 h-3 w-24 rounded-t-sm bg-paper/90" />

        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-voice text-[0.8125rem] tracking-[0.18em] text-ink/75 tabular-nums">
              File {fileNumber(index)}
            </p>
            <h2
              id="file-title"
              ref={headingRef}
              tabIndex={-1}
              className="mt-1 font-legend text-[clamp(2rem,1.5rem+2vw,3rem)] leading-[1.02] text-balance outline-none"
            >
              {evidence.title}
            </h2>
          </div>
          <div data-file="stamp" className="shrink-0 pt-2">
            <Stamp label={STATUS_LABEL[evidence.status]} tone={evidence.status} size="lg" />
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 font-record text-[1.125rem] leading-[1.6]">
          {evidence.detail.map((paragraph, paragraphIndex) => (
            <p key={paragraphIndex} data-file-ink>
              <PortalText text={paragraph} />
            </p>
          ))}
        </div>

        {evidence.status === 'disputed' && (
          <div data-file="after" className="mt-6 grid gap-4 sm:grid-cols-2">
            <section className="border-l-2 border-rust/60 pl-4">
              <h3 className="font-voice text-xs tracking-[0.18em] text-rust uppercase">The claim</h3>
              <p className="mt-1.5 font-record text-[1.0625rem] leading-normal">{evidence.dispute.claim}</p>
            </section>
            <section className="border-l-2 border-record/60 pl-4">
              <h3 className="font-voice text-xs tracking-[0.18em] text-record uppercase">The challenge</h3>
              <p className="mt-1.5 font-record text-[1.0625rem] leading-normal">{evidence.dispute.challenge}</p>
            </section>
          </div>
        )}

        {evidence.status === 'legend' && (
          <section data-file="after" className="mt-6 border-t border-ink/15 pt-4">
            <h3 className="font-voice text-xs tracking-[0.18em] text-ink/75 uppercase">Where it came from</h3>
            <p className="mt-1.5 font-record text-[1.0625rem] leading-normal">{evidence.origin}</p>
          </section>
        )}

        {sources.length > 0 && (
          <section className="mt-6">
            <h3 className="font-voice text-[0.6875rem] tracking-[0.18em] text-ink/75 uppercase">Sources</h3>
            <ul className="mt-1.5 flex flex-col gap-1 font-record text-[0.9375rem] leading-snug">
              {sources.map(source => (
                <li key={source.id}>
                  {source.url !== undefined && source.url.trim() !== '' ? (
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-[0.12em] text-record underline decoration-record/45 underline-offset-[0.2em] transition-[text-decoration-color] duration-150 ease-out hover:decoration-record focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass"
                    >
                      {source.title}
                    </a>
                  ) : (
                    <span>{source.title}</span>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        <section aria-labelledby="pin-question" className="mt-8 border-t border-ink/15 pt-6">
          <h3 id="pin-question" className="font-voice text-[1.0625rem] text-ink">
            Which theory does this point to?
          </h3>
          <div role="group" aria-labelledby="pin-question" className="mt-3 flex flex-wrap gap-2">
            {choices.map(choice => {
              const chosen = target === choice.id;
              return (
                <button
                  key={choice.id}
                  type="button"
                  aria-pressed={chosen}
                  onClick={() => pin(choice.id)}
                  className={`${BUTTON_CLASSES} ${
                    chosen ? 'border-ink bg-ink text-paper' : 'border-ink/30 text-ink hover:border-ink hover:bg-ink/5'
                  }`}
                >
                  {choice.label}
                </button>
              );
            })}
          </div>

          <div aria-live="polite">
            {pinReading !== undefined && (
              <div ref={revealRef} data-file="reveal" className="mt-5 rounded-sm bg-ink/[0.06] px-4 py-3.5">
                <p className="font-voice text-[0.9375rem] text-ink">
                  <span data-file="reading" data-reading={pinReading.reading}>
                    {READING_LABEL[pinReading.reading]}
                  </span>
                  <span className="text-ink/75"> · you chose {pinTargetTitle(caseData, pinReading.target)}</span>
                </p>
                <p className="mt-1.5 font-record text-[1.0625rem] leading-normal">{pinReading.note}</p>
              </div>
            )}
          </div>
        </section>

        <nav aria-label="Case files" className="mt-8 flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
          <Link to={board} className={`${LINK_CLASSES} text-ink/80 underline hover:text-ink`}>
            Back to the board
          </Link>
          {nextId !== null && (
            <Link to={`${board}/${nextId}`} className={`${LINK_CLASSES} text-record underline hover:text-ink`}>
              Next file
            </Link>
          )}
        </nav>
      </article>
    </main>
  );
}
