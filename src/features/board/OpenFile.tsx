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
import { SplitText } from 'gsap/SplitText';
import { useGSAP } from '@gsap/react';
import { useInvestigation } from '@/app/InvestigationProvider';
import FileDocument from '@/features/board/FileDocument';
import InnerCover from '@/features/board/InnerCover';
import PinHint from '@/features/board/PinHint';
import PinMenu from '@/features/board/PinMenu';
import { useDeskHints } from '@/features/board/hints';
import type { PinnedState } from '@/features/board/Desk';
import { Draggable, canDrag, clearHotTargets, dropOnto, markHotTarget } from '@/features/board/drag';
import { Flip, canFly, flightFor, recordFlight } from '@/features/board/flight';
import { READING_LABEL, fileNumber, nextUnopenedId, pinTargetTitle } from '@/lib/case-files';
import { buildCaseReport } from '@/lib/case-report';
import { coverLabel } from '@/lib/desk';
import { MOTION, MOTION_QUERIES, STEP, ghostDuration, stampHit, tween } from '@/lib/motion';
import { emitStoryEvent } from '@/lib/story-events';
import { DESKTOP_QUERY } from '@/lib/use-media-query';
import type { Evidence, PinTarget, Source } from '@/types/case';

gsap.registerPlugin(useGSAP, Flip, SplitText, Draggable);

/** Seconds. Opening a file happens many times: the flight and the flip are quick, the stamp waits a short beat. */
const TIMING = {
  backdrop: MOTION['paper.lift'].duration,
  flight: MOTION['paper.move'].duration,
  arrive: MOTION['paper.lift'].duration,
  flip: MOTION['paper.move'].duration,
  enter: MOTION['paper.lift'].duration,
  stampBeat: STEP.fast,
  /** A stamp's press and settle (motion.ts `stampHit`). */
  stamp: MOTION['stamp.hit'].duration + STEP.fast,
  close: MOTION['paper.lift'].duration,
  seal: MOTION['paper.lift'].duration,
  sheet: MOTION['paper.lift'].duration,
  slip: MOTION['paper.move'].duration,
} as const;

/** A legend's drifting ink: each word dims to `dim` and returns over `wave` seconds, in `waves` slow waves. */
const DRIFT = {
  dim: 0.72,
  each: 0.07,
  rest: 3.5,
  waves: 3,
} as const;

/** How far the cover swings open: almost flat, still lifted a little off the desk. */
const COVER_OPEN = -165;

/** The size of a folder in the hand, while it is dragged across the desk. */
const HELD_SCALE = 0.42;

/** Where a press never starts a drag: the paper, its links and buttons, and the menu. */
const NOT_A_HANDLE =
  'a, button, input, [role="menu"], [data-file="sheet"], [data-file="sheet-two"], [data-file="slip"], [data-file="reveal"], [data-file="index-card"], [data-file="label"], [data-file="pinned-to"], h3';

/** What Tab can reach inside the open file. Menu items are reached with the arrow keys instead. */
const TAB_STOPS = 'a[href]:not([tabindex="-1"]), button:not(:disabled):not([tabindex="-1"])';

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
  /** Set while a pin is being carried out (the cover closing), so a second choice does nothing. */
  const [pinning, setPinning] = useState(false);
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

  // The first visit's hints: a file is open, so the Pin menu's hint is next.
  const hints = useDeskHints();
  const reachPinMenu = hints?.reachPinMenu;
  useEffect(() => reachPinMenu?.(), [reachPinMenu]);
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
        const timeline = gsap.timeline({ defaults: { ease: MOTION['paper.lift'].ease } });
        let split: SplitText | null = null;
        timeline.fromTo('[data-file="backdrop"]', { opacity: 0 }, { opacity: 1, duration: TIMING.backdrop }, 0);

        let revealAt: number = TIMING.enter;
        if (desktop && !reduced && !openedBefore) {
          // The folder arrives closed: flown from where it lay, or, from a link, grown in where it lands.
          gsap.set(cover, { rotationY: 0 });
          const flight = flightFor(evidence.id, 'in');
          let flipAt: number = TIMING.arrive;
          if (flight?.state != null && folder !== null) {
            timeline.add(
              Flip.from(flight.state, { targets: folder, scale: true, ...tween('paper.move') }),
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
          timeline.to(cover, { rotationY: COVER_OPEN, ...tween('paper.move') }, flipAt);
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
        // Plain paper first; after a short beat the stamp presses in: it shrinks onto the paper as its ink is
        // uncovered (motion.md).
        const stampAt = revealAt + TIMING.stampBeat;
        const landed = stampAt + TIMING.stamp;
        timeline.add(stampHit('[data-file="stamp"]', { reduced }), stampAt);
        // As it lands, the paper becomes its status. The end states live in effects.css, keyed on data-revealed;
        // written to the element, never to React state.
        timeline.call(
          () => {
            rootRef.current?.querySelector('[data-file="sheet"]')?.setAttribute('data-revealed', 'true');
            emitStoryEvent({ type: 'stamp', evidence: evidence.id, status: evidence.status });
          },
          undefined,
          landed
        );

        if (evidence.status === 'record') {
          // The seal presses in beside the stamp.
          timeline.fromTo(
            '[data-file="seal"]',
            reduced ? { opacity: 0 } : { opacity: 0, scale: 1.1 },
            { opacity: 1, scale: 1, duration: TIMING.seal },
            landed
          );
        }

        if (evidence.status === 'disputed') {
          // The second sheet slides in askew, over the foot of the first.
          timeline.fromTo(
            '[data-file="sheet-two"]',
            reduced ? { opacity: 0 } : { opacity: 0, x: 56, rotation: 5 },
            { opacity: 1, x: 0, rotation: 0, ...tween('paper.lift') },
            landed + 0.15
          );
        }

        if (evidence.status === 'legend') {
          // Full motion: the ink swims into ghost ink out of a slight blur (≤2px), then rests crisp and readable.
          if (!reduced) {
            timeline.fromTo(
              '[data-file-ink]',
              { filter: 'blur(2px)' },
              // Not before the stamp lands: until then the text is plain and sharp.
              { filter: 'blur(0px)', ...tween('ink.in'), clearProps: 'filter', immediateRender: false },
              landed
            );
          }
          // The slip slides out from under the sheet.
          timeline.fromTo(
            '[data-file="slip"]',
            reduced ? { opacity: 0 } : { opacity: 0, yPercent: -100 },
            { opacity: 1, yPercent: 0, ...tween('paper.move') },
            landed + 0.5
          );
          if (!reduced) {
            // Then the ink drifts: words fade a little and return, in a few slow waves, and the text comes to rest
            // at full strength. Opacity only. Started from the timeline, so it is added to this context.
            const drift = context.add('drift', () => {
              const paragraphs = gsap.utils.toArray<HTMLElement>('[data-file-ink]', rootRef.current);
              split = SplitText.create(paragraphs, { type: 'words', tag: 'span', aria: 'none', wordsClass: 'ink-word' });
              const words = split.words;
              gsap.to(words, {
                keyframes: { opacity: [1, DRIFT.dim, 1], easeEach: MOTION.ghost.ease },
                duration: ghostDuration(evidence.id),
                stagger: { each: DRIFT.each, repeat: DRIFT.waves - 1, repeatDelay: DRIFT.rest },
                // At rest the words are whole again: put the text back as it was.
                onComplete: () => split?.revert(),
              });
            });
            timeline.call(() => drift(), undefined, landed + 1.2);
          }
        }
        return () => split?.revert();
      });
    },
    { scope: rootRef }
  );

  /** Tab stays inside the open file. */
  const trapFocus = (event: KeyboardEvent<HTMLDivElement>) => {
    const root = event.currentTarget;
    if (event.key !== 'Tab' || !root.contains(document.activeElement)) {
      return;
    }
    // Sorted into document order by hand: not every DOM returns a selector list's matches that way.
    const stops = [...root.querySelectorAll<HTMLElement>(TAB_STOPS)].filter(stop => !stop.closest('[hidden]')).sort((a, b) =>
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

  /** The pin itself: the desk takes over from here, flying the folder to its place. */
  const finishPin = useCallback(
    (choice: PinTarget) => {
      recordFlight(evidence.id, 'out', folderRef.current);
      dispatch({ type: 'PIN_EVIDENCE', evidenceId: evidence.id, target: choice });
      emitStoryEvent({ type: 'pin', evidence: evidence.id, target: choice });
      const pinned: PinnedState = { pinned: evidence.id };
      navigate(board, { state: pinned });
    },
    [board, dispatch, evidence.id, navigate]
  );

  // Desktop, fine pointer, full motion: the folder can be grabbed by its manila edge (or the inside of its cover)
  // and dragged onto a theory note or the tray. It closes in the hand as it lifts, and shrinks to a held size;
  // the desk shows through. Dropped on nothing, it goes back to the centre and opens again. Never required:
  // the Pin menu does the same.
  useGSAP(
    () => {
      const root = rootRef.current;
      const folder = folderRef.current;
      if (root === null || folder === null || !canDrag()) {
        return;
      }
      const cover = root.querySelector('[data-file="cover"]');
      const backdrop = root.querySelector('[data-file="backdrop"]');
      const triggers = [...root.querySelectorAll('[data-file="grip"], [data-file="cover-inside"]')];
      let targets: Element[] = [];
      let hot: Element | null = null;

      const [draggable] = Draggable.create(folder, {
        type: 'x,y',
        trigger: triggers,
        minimumMovement: 6,
        zIndexBoost: false,
        // The paper and everything on it stay readable, selectable and usable: only the manila is a handle.
        clickableTest: (element: Element) =>
          element instanceof Element && element.closest(NOT_A_HANDLE) !== null,
        onPress(event: PointerEvent) {
          // The folder shrinks around the point where it was grabbed, so that point stays under the pointer.
          const box = folder.getBoundingClientRect();
          gsap.set(folder, { transformOrigin: `${event.clientX - box.left}px ${event.clientY - box.top}px` });
        },
        onDragStart() {
          targets = [...document.querySelectorAll('main [data-drop-target]')];
          root.dataset.dragging = 'true';
          // The theories are at the top of the desk: bring them into view under the lifted folder.
          window.scrollTo({ top: 0, behavior: 'smooth' });
          emitStoryEvent({ type: 'flip', evidence: evidence.id, direction: 'close' });
          gsap.to(cover, { rotationY: 0, ...tween('paper.lift'), overwrite: true });
          gsap.to(folder, { scale: HELD_SCALE, ...tween('paper.lift'), overwrite: 'auto' });
          gsap.to(backdrop, { opacity: 0.2, ...tween('hover'), overwrite: true });
        },
        onDrag() {
          hot = markHotTarget(draggable, targets);
        },
        onDragEnd() {
          clearHotTargets(targets);
          dropOnto(hot, caseData.theories, finishPin, () => {
            // Back to the centre, open again, the desk dimmed again.
            delete root.dataset.dragging;
            emitStoryEvent({ type: 'flip', evidence: evidence.id, direction: 'open' });
            gsap.to(folder, { x: 0, y: 0, scale: 1, ...tween('paper.lift'), overwrite: 'auto' });
            gsap.to(cover, { rotationY: COVER_OPEN, ...tween('paper.move'), delay: STEP.fast / 2, overwrite: true });
            gsap.to(backdrop, { opacity: 1, ...tween('hover'), overwrite: true });
          });
          hot = null;
        },
      });
      return () => {
        clearHotTargets(targets);
        draggable.kill();
      };
    },
    { scope: rootRef }
  );

  /**
   * Pins the file. On a desktop with full motion the cover closes first (the reverse flip), so the folder is in the
   * hand; then the desk flies it to its place under the note or into the tray, draws its thread and opens its
   * historians' slip. Elsewhere it goes straight back to the desk, the folder already in its new place.
   */
  const pin = (choice: PinTarget) => {
    if (pinning) {
      return;
    }
    const finish = () => finishPin(choice);
    const cover = rootRef.current?.querySelector('[data-file="cover"]');
    if (!canFly() || cover == null) {
      finish();
      return;
    }
    setPinning(true);
    emitStoryEvent({ type: 'flip', evidence: evidence.id, direction: 'close' });
    gsap.to(cover, { rotationY: 0, ...tween('paper.lift'), overwrite: true, onComplete: finish });
  };

  return (
    <div
      ref={rootRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="file-title"
      data-page="case"
      onKeyDown={trapFocus}
      data-lenis-prevent
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

          {/* The back of the folder, manila: the document lies on it, clipped in place. On a desktop its edge is
              where the folder is grabbed to drag it (data-file="grip"). */}
          <div data-file="grip" className="desk-manila rounded-b-[3px] px-2.5 pt-5 pb-5 shadow-[0_8px_30px] shadow-black/50 sm:px-5 sm:pt-7 sm:pb-7 lg:rounded-[3px] lg:[grid-area:1/1]">
            <FileDocument evidence={evidence} number={number} headingRef={headingRef} revealed={openedBefore}>
              <section aria-labelledby="pin-question" className="mx-2.5 mt-8 border-t border-ink/20 pt-6 sm:mx-5">
                <h3 id="pin-question" className="font-voice text-[1.0625rem] text-ink">
                  Which theory does this point to?
                </h3>
                <PinHint />
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
                  <PinMenu theories={caseData.theories} current={target} onPin={pin} busy={pinning} />
                  {target !== undefined && (
                    <p data-file="pinned-to" className="font-voice text-sm text-ink/80">
                      Pinned to {pinTargetTitle(caseData, target)}
                    </p>
                  )}
                </div>

                {/* A file pinned before: the historians' slip stays clipped to it. */}
                {pinReading !== undefined && (
                  <div data-file="reveal" className="desk-slip mt-5 max-w-xl -rotate-[0.6deg] rounded-[2px] px-4 py-3.5 shadow-md shadow-black/30">
                    <p className="font-voice text-[0.9375rem] text-ink">
                      <span data-file="reading" data-reading={pinReading.reading}>
                        {READING_LABEL[pinReading.reading]}
                      </span>
                      <span className="text-ink/75"> · you chose {pinTargetTitle(caseData, pinReading.target)}</span>
                    </p>
                    <p className="mt-1.5 font-record text-[1.0625rem] leading-normal">{pinReading.note}</p>
                  </div>
                )}
              </section>

              <nav aria-label="Case files" className="mx-2.5 mt-8 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 sm:mx-5">
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
