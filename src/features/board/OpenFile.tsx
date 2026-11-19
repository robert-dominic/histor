// src/features/board/OpenFile.tsx
// One case file, open over the desk. On a desktop the folder rises from where it lay, flies to the centre and
// grows (GSAP Flip), then its cover flips open around its left edge: the inside of the cover on the left (a
// typed label and the index card of sources), the document on the right, held by a paper clip. The file counts
// as opened as the cover opens. After a short beat its status stamps onto it, and the app asks which theory it
// points to. On phones the file fills the screen, the cover's inside above the document. With reduced motion
// it fades in, with no flight and no flip. A file opened before is shown at once, stamped, with the user's choice.
// Escape and "Back to the board" close it; the desk flies the folder home and gives it the focus back.

import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { useInvestigation } from '@/app/InvestigationProvider';
import FileDocument from '@/features/board/FileDocument';
import InnerCover from '@/features/board/InnerCover';
import { Flip, flightFor, recordFlight } from '@/features/board/flight';
import { NO_THEORY, READING_LABEL, fileNumber, nextUnopenedId, pinTargetTitle } from '@/lib/case-files';
import { buildCaseReport } from '@/lib/case-report';
import { coverLabel } from '@/lib/desk';
import { EASE, MOTION_QUERIES } from '@/lib/motion';
import { emitStoryEvent } from '@/lib/story-events';
import { DESKTOP_QUERY } from '@/lib/use-media-query';
import type { Evidence, PinTarget, Source } from '@/types/case';

gsap.registerPlugin(useGSAP, Flip);

/** Seconds. Opening a file happens many times: the flight and the flip are quick, the stamp waits a short beat. */
const TIMING = {
  backdrop: 0.3,
  flight: 0.5,
  arrive: 0.35,
  flip: 0.6,
  enter: 0.25,
  stampBeat: 0.3,
  stamp: 0.18,
  after: 0.35,
} as const;

/** How far the cover swings open: almost flat, still lifted a little off the desk. */
const COVER_OPEN = -165;

const BUTTON_CLASSES =
  'min-h-11 rounded-sm border px-4 py-2 text-left font-voice text-sm leading-snug transition-[scale,background-color,color,border-color] duration-150 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass active:scale-[0.97]';

const LINK_CLASSES =
  'inline-flex min-h-11 items-center font-voice text-sm tracking-[0.1em] uppercase underline-offset-4 transition-[color] duration-150 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass';

interface OpenFileProps {
  evidence: Evidence;
  index: number;
}

export default function OpenFile({ evidence, index }: OpenFileProps) {
  const { state, dispatch, caseData } = useInvestigation();
  const navigate = useNavigate();
  const rootRef = useRef<HTMLDivElement>(null);
  const folderRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const revealRef = useRef<HTMLDivElement>(null);
  /** Set once the file has been marked opened, so a re-run of the animation never says so twice. */
  const markedRef = useRef(false);
  // Only the value when the file is first shown counts: a file opened before is shown stamped at once.
  const [openedBefore] = useState(() => state.opened.includes(evidence.id));
  const board = `/case/${caseData.id}/files`;
  const number = fileNumber(index);

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

  /** Closing: remember where the open folder is, so the desk can fly it home, then go back to the desk. */
  const close = useCallback(() => {
    recordFlight(evidence.id, 'out', folderRef.current);
    navigate(board);
  }, [board, evidence.id, navigate]);

  // Escape closes the file. A portal open inside it takes Escape first (it stops the key at the document).
  useEffect(() => {
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape' && !event.defaultPrevented) {
        event.preventDefault();
        close();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [close]);

  // A file is a new screen: the focus starts on its title.
  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
  }, []);

  useGSAP(
    () => {
      /** The file counts as opened: as the cover opens, or at once where nothing flips. */
      const markOpened = () => {
        if (markedRef.current) {
          return;
        }
        markedRef.current = true;
        dispatch({ type: 'OPEN_EVIDENCE', evidenceId: evidence.id });
        emitStoryEvent({ type: 'folder-open', evidence: evidence.id });
      };
      if (typeof window.matchMedia !== 'function') {
        markOpened();
        return;
      }
      const mm = gsap.matchMedia();
      mm.add({ ...MOTION_QUERIES, desktop: DESKTOP_QUERY }, context => {
        const reduced = context.conditions?.reduced === true;
        const desktop = context.conditions?.desktop === true;
        const folder = folderRef.current;
        const cover = '[data-file="cover"]';
        const timeline = gsap.timeline({ defaults: { ease: EASE.out } });
        timeline.fromTo('[data-file="backdrop"]', { opacity: 0 }, { opacity: 1, duration: TIMING.backdrop }, 0);

        let revealAt: number = TIMING.enter;
        if (desktop && !reduced && !openedBefore) {
          // The folder arrives closed: flown from where it lay, or, from a link, grown in where it lands.
          gsap.set(cover, { rotationY: 0 });
          const flight = flightFor(evidence.id, 'in');
          let flipAt: number = TIMING.arrive;
          if (flight?.state != null && folder !== null) {
            timeline.add(
              Flip.from(flight.state, { targets: folder, scale: true, duration: TIMING.flight, ease: EASE.drawer }),
              0
            );
            flipAt = TIMING.flight;
          } else {
            timeline.fromTo(folder, { opacity: 0, scale: 0.95 }, { opacity: 1, scale: 1, duration: TIMING.arrive }, 0);
          }
          // Then the cover swings open around its left edge.
          timeline.call(
            () => {
              emitStoryEvent({ type: 'flip', evidence: evidence.id, direction: 'open' });
              markOpened();
            },
            undefined,
            flipAt
          );
          timeline.to(cover, { rotationY: COVER_OPEN, duration: TIMING.flip, ease: EASE.inOut }, flipAt);
          revealAt = flipAt + TIMING.flip;
        } else {
          // No flight: the open folder fades in (and grows a touch, with full motion), already open.
          if (desktop) {
            gsap.set(cover, { rotationY: COVER_OPEN });
          }
          timeline.fromTo(
            folder,
            reduced ? { opacity: 0 } : { opacity: 0, scale: 0.95 },
            { opacity: 1, scale: 1, duration: TIMING.enter },
            0
          );
          markOpened();
        }

        // Shown before: everything is simply there, already stamped.
        if (openedBefore) {
          return;
        }
        const stampAt = revealAt + TIMING.stampBeat;
        const stamp = '[data-file="stamp"]';
        const after = gsap.utils.toArray<HTMLElement>('[data-file="after"]');
        // The stamp presses in: it shrinks onto the paper as its ink is uncovered (motion.md).
        timeline.fromTo(
          stamp,
          reduced ? { opacity: 0 } : { opacity: 0, scale: 1.15, clipPath: 'inset(0% 50% 0% 50%)' },
          { opacity: 1, scale: 1, clipPath: 'inset(0% 0% 0% 0%)', duration: TIMING.stamp },
          stampAt
        );
        // A legend's text turns to ghost ink the moment the stamp lands. Written to the element, not to state.
        // Full motion: the ink swims in out of a slight blur (≤2px), then rests crisp and readable.
        if (isLegend) {
          const inkAt = stampAt + TIMING.stamp;
          timeline.call(() => rootRef.current?.setAttribute('data-ink', 'ghost'), undefined, inkAt);
          if (!reduced) {
            timeline.fromTo(
              '[data-file-ink]',
              { filter: 'blur(2px)' },
              // Not before the stamp lands: until then the text is plain and sharp.
              { filter: 'blur(0px)', duration: 0.7, clearProps: 'filter', immediateRender: false },
              inkAt
            );
          }
        }
        if (after.length > 0) {
          timeline.fromTo(
            after,
            reduced ? { opacity: 0 } : { opacity: 0, y: 6 },
            { opacity: 1, y: 0, duration: TIMING.after },
            stampAt + TIMING.stamp + 0.1
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

  /** Tab stays inside the open file. */
  const trapFocus = (event: KeyboardEvent<HTMLDivElement>) => {
    const root = event.currentTarget;
    if (event.key !== 'Tab' || !root.contains(document.activeElement)) {
      return;
    }
    // Sorted into document order by hand: not every DOM returns a selector list's matches that way.
    const stops = [...root.querySelectorAll<HTMLElement>('a[href], button:not(:disabled)')].sort((a, b) =>
      a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1
    );
    if (stops.length === 0) {
      return;
    }
    const first = stops[0];
    const last = stops[stops.length - 1];
    const active = document.activeElement;
    if (event.shiftKey && (active === first || active === headingRef.current)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const pin = (choice: PinTarget) => dispatch({ type: 'PIN_EVIDENCE', evidenceId: evidence.id, target: choice });
  const choices: { id: PinTarget; label: string }[] = [
    ...caseData.theories.map(theory => ({ id: theory.id, label: theory.title })),
    { id: 'none', label: NO_THEORY },
  ];

  return (
    <div
      ref={rootRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="file-title"
      data-page="case"
      data-ink={openedBefore && isLegend ? 'ghost' : undefined}
      onKeyDown={trapFocus}
      className="fixed inset-0 z-40 overflow-x-hidden overflow-y-auto overscroll-contain px-3 pt-[calc(var(--case-header)+1.75rem)] pb-12 sm:px-6 lg:px-10 lg:pt-[calc(var(--case-header)+3rem)]"
    >
      {/* The desk dims behind the open file. */}
      <div data-file="backdrop" aria-hidden="true" className="fixed inset-0 bg-night/90" />

      {/* Desktop: two halves, the cover swings open into the left one. */}
      <div className="relative mx-auto max-w-3xl lg:grid lg:max-w-6xl lg:grid-cols-2">
        <div
          ref={folderRef}
          data-file="folder"
          data-flip-id={`file-${evidence.id}`}
          className="lg:col-start-2 lg:grid lg:[perspective-origin:0%_50%] lg:[perspective:1800px]"
        >
          {/* The front cover. Its outside shows only while it is closed; its inside is the inner cover. */}
          <div
            data-file="cover"
            className="relative z-10 lg:origin-left lg:[grid-area:1/1] lg:[transform-style:preserve-3d]"
          >
            <div
              aria-hidden="true"
              className="desk-manila absolute inset-0 hidden rounded-[3px] shadow-[0_8px_30px] shadow-black/60 [backface-visibility:hidden] lg:block"
            >
              <span className="desk-manila absolute -top-4 left-6 flex h-4 items-center rounded-t-[3px] px-3 font-voice text-[0.75rem] tracking-[0.14em] text-ink/80 tabular-nums">
                {number}
              </span>
              <span className="absolute top-8 left-8 rounded-[1px] bg-paper/80 px-3 py-1.5 font-voice text-base leading-snug text-ink">
                {evidence.title}
              </span>
            </div>
            <div
              data-file="cover-inside"
              className="desk-manila rounded-t-[3px] lg:h-full lg:rounded-[3px] lg:shadow-[0_8px_30px] lg:shadow-black/50 lg:[backface-visibility:hidden] lg:[transform:rotateY(180deg)]"
            >
              <InnerCover label={coverLabel(number, evidence.title)} sources={sources} />
            </div>
          </div>

          <div className="lg:[grid-area:1/1]">
            <FileDocument evidence={evidence} number={number} headingRef={headingRef}>
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
                          chosen
                            ? 'border-ink bg-ink text-paper'
                            : 'border-ink/30 text-ink hover:border-ink hover:bg-ink/5'
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
                <Link
                  to={board}
                  onClick={() => recordFlight(evidence.id, 'out', folderRef.current)}
                  className={`${LINK_CLASSES} text-ink/80 underline hover:text-ink`}
                >
                  Back to the board
                </Link>
                {nextId !== null && (
                  <Link to={`${board}/${nextId}`} className={`${LINK_CLASSES} text-record underline hover:text-ink`}>
                    Next file
                  </Link>
                )}
              </nav>
            </FileDocument>
          </div>
        </div>
      </div>
    </div>
  );
}
