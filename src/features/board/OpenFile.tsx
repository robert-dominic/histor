// src/features/board/OpenFile.tsx
// One case file, open over the desk. On a desktop the folder rises from where it lay, flies to the centre and
// grows (GSAP Flip), then its cover flips open around its left edge: the inside of the cover on the left (a
// typed label and the index card of sources), the document on the right, held by a paper clip. The file counts
// as opened as the cover opens. After a short beat its status stamps onto it, and the app asks which theory it
// points to. On phones the file fills the screen, the cover's inside above the document. With reduced motion
// it fades in, with no flight and no flip. Every opening plays the full reveal, a file read before as well (review-fixes
// brief, 3): the pen writes the title, the text settles, the stamp has its moment. A click or a key skips it.
// Escape, a click outside it and the "Back to the floor" button close it; the desk flies the folder home and gives it
// the focus back. Dragged by its manila edge, it is pinned when let go on a theory or the tray, and anywhere else it
// goes back to the floor, where it was let go (review-fixes brief, 4): opening a file never forces a pin.

import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type MouseEvent } from 'react';
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
import { Draggable, canDrag, clearHotTargets, dropOutcome, dropTargetFor, dropTargets, markHotTarget } from '@/features/board/drag';
import { Flip, canFly, flightFor, recordFlight, settleOpenFolder } from '@/features/board/flight';
import { READING_LABEL, fileNumber, nextUnopenedId, pinTargetTitle } from '@/lib/case-files';
import { buildCaseReport } from '@/lib/case-report';
import { coverLabel } from '@/lib/desk';
import { INK_RISE, MOTION, MOTION_QUERIES, STEP, ghostDuration, stampHit, tween } from '@/lib/motion';
import { createQuillWriter } from '@/lib/quill-writing';
import { typeLetters } from '@/lib/typewriter';
import { useDeskOutlet } from '@/features/board/desk-outlet';
import { emitStoryEvent } from '@/lib/story-events';
import { DESKTOP_QUERY, useMediaQuery } from '@/lib/use-media-query';
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

/** The writing reveal of every opening, in seconds. */
const REVEAL = {
  /** The nib writes the title in about this long. */
  title: 1.2,
  /** A breath between the title and the text settling in. */
  pause: 0.15,
} as const;
/**
 * A legend's drifting ink: each word dims to `dim` and returns over `wave` seconds, in `waves` slow waves. Slower
 * and deeper than it was, so the reader sees the ink drain (investigation brief, item 1).
 */
const DRIFT = {
  dim: 0.45,
  each: 0.1,
  rest: 4,
  waves: 3,
} as const;

/** The stamp's moments, on every opening (investigation brief, item 1; review-fixes brief, 3). */
const STAMP_MOMENT = {
  /** A record's folder shakes this far, in px. */
  shake: 2,
  /** A record's ink spreads to this scale as it settles. */
  spread: 1.015,
  /** A disputed stamp lands this crooked, in degrees (effects.css keeps it so). */
  crooked: -4,
  /** The app's note under the stamp is typed at this many letters a second. */
  typeRate: 30,
  /** A legend's pen line: written this long after the stamp lands (the ink has drained), at this many letters a second. */
  legendPenAfter: 2.6,
  /** About 25% faster than the first 14 (polish brief, A2): still slow enough to creep, no longer a wait. */
  penRate: 17.5,
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
  const isDesktop = useMediaQuery(DESKTOP_QUERY);
  const rootRef = useRef<HTMLDivElement>(null);
  const folderRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  /** Set while a pin is being carried out (the cover closing), so a second choice does nothing. */
  const [pinning, setPinning] = useState(false);
  /** Set once the file has been marked opened, so a re-run of the animation never says so twice. */
  const markedRef = useRef(false);
  /** True from the moment a pin begins, so a second choice (or a waiting drop) does nothing. */
  const pinningRef = useRef(false);
  /** Always the latest `pin`, for the timeline and the key handler. */
  const pinRef = useRef<(target: PinTarget) => void>(() => undefined);
  /** Finishes the writing reveal at once, once it is under way; nothing before that, nothing after. */
  const skipRef = useRef<(() => void) | null>(null);
  // Every opening plays the whole reveal (review-fixes brief, 3). Only where nothing can animate (no matchMedia) is a
  // file read before shown stamped at once. "Opened" is still kept for the case, as before.
  const [shownStamped] = useState(() => typeof window.matchMedia !== 'function' && state.opened.includes(evidence.id));
  const board = `/case/${caseData.id}/files`;
  const number = fileNumber(index);

  const target: PinTarget | undefined = state.pins[evidence.id];
  /** Whether the file is pinned now, for the drag (set up once). */
  const pinnedRef = useRef(target !== undefined);
  useEffect(() => {
    pinnedRef.current = target !== undefined;
  }, [target]);
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
        return;
      }
      // Any other key finishes the writing reveal (a modifier on its own is not a key press that means anything).
      if (event.key !== 'Escape' && !['Shift', 'Control', 'Alt', 'Meta'].includes(event.key)) {
        skipRef.current?.();
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
        if (desktop && !reduced) {
          // Every opening on a desktop is the full one, a file read before as well: the folder rises from where it lay
          // (a floor place or a tab), straightens as it flies, and lands closed; then its cover swings open. A file
          // reached by a link, with nowhere to fly from, grows in where it lands.
          gsap.set(cover, { rotationY: 0 });
          const flight = flightFor(evidence.id, 'in');
          let flipAt: number = TIMING.arrive;
          if (flight?.state != null && folder !== null) {
            // The end of the flight is the folder's own place: full size, straight. Anything left on it from an
            // earlier run (StrictMode runs this twice) would be measured as the end, so it is cleared first, and
            // cleared again when the flight lands, so no scale or tilt from the Flip is left behind.
            gsap.set(folder, { clearProps: 'transform' });
            timeline.add(
              Flip.from(flight.state, {
                targets: folder,
                scale: true,
                ...tween('paper.move'),
                onComplete: () => settleOpenFolder(folder),
              }),
              0
            );
            flipAt = TIMING.flight;
          } else {
            timeline.fromTo(
              folder,
              { opacity: 0, scale: 0.95, rotation: 0 },
              { opacity: 1, scale: 1, duration: TIMING.arrive, onComplete: () => settleOpenFolder(folder) },
              0
            );
          }
          // Then the cover swings open around its left edge, and the writing reveal below plays, every time.
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

        // The writing reveal. Full motion: the nib writes the title letter by letter, then the rest of the text settles
        // in line by line, from a slight blur to sharp, with a fade and a small rise (the blur is only on these text
        // lines, only while they arrive). Reduced motion: the text is simply there.
        let readAt = revealAt;
        const parts: SplitText[] = [];
        const heading = headingRef.current;
        const point = rootRef.current?.querySelector<HTMLElement>('[data-file-nib="quill"]');
        const body = rootRef.current?.querySelector<HTMLElement>('[data-file-nib="quill-body"]');
        if (!reduced && heading !== null && point != null && body != null) {
          const title = SplitText.create(heading, { type: 'words,chars' });
          const paragraphs = gsap.utils.toArray<HTMLElement>('[data-file-ink]', rootRef.current);
          const text = SplitText.create(paragraphs, { type: 'lines', aria: 'none' });
          parts.push(title, text);
          const claim = rootRef.current?.querySelector<HTMLElement>('[data-file="claim"]');
          const settling = [...(text.lines as HTMLElement[]), ...(claim == null ? [] : [claim])];
          gsap.set(title.chars, { opacity: 0 });
          gsap.set(settling, { opacity: 0 });
          const letters = title.chars as HTMLElement[];
          const written = createQuillWriter(point, body).write(timeline, letters, readAt, letters.length / REVEAL.title);
          readAt += written + REVEAL.pause;
          timeline.fromTo(
            settling,
            { opacity: 0, y: INK_RISE, filter: 'blur(2px)' },
            {
              opacity: 1,
              y: 0,
              filter: 'blur(0px)',
              ...tween('ink.in'),
              stagger: STEP.fast / 2,
              clearProps: 'filter,transform,opacity',
              immediateRender: false,
            },
            readAt
          );
          readAt += MOTION['ink.in'].duration + (settling.length - 1) * (STEP.fast / 2);
          // Everything is in: give the title and the text back as plain markup.
          timeline.call(() => parts.forEach(part => part.revert()), undefined, readAt);
        }
        // Clicking the document, or any key but Escape, finishes the reveal at once, with every moment still played
        // (the stamp, the status, the event), each once.
        const revealStart = revealAt;
        skipRef.current = () => {
          if (timeline.time() >= revealStart && timeline.progress() < 1) {
            timeline.progress(1, false);
          }
        };
        // Plain paper first; after a beat the stamp presses in (motion.md).
        const stampAt = readAt + TIMING.stampBeat;
        const landed = stampAt + TIMING.stamp;
        timeline.add(stampHit('[data-file="stamp"]', { reduced }), stampAt);
        // As it lands, the paper becomes its status. The end states live in effects.css, keyed on data-revealed;
        // written to the element, never to React state.
        timeline.call(
          () => {
            rootRef.current?.querySelector('[data-file="sheet"]')?.setAttribute('data-revealed', 'true');
            emitStoryEvent({ type: 'stamp', evidence: evidence.id, status: evidence.status });
            emitStoryEvent({ type: `stamp:${evidence.status}`, evidence: evidence.id });
          },
          undefined,
          landed
        );

        // Every stamp is a moment (investigation brief, item 1). Under reduced motion the stamp and its note simply
        // appear (effects.css, keyed on data-revealed).
        const stamp = rootRef.current?.querySelector<HTMLElement>('[data-file="stamp"]') ?? null;
        /** The letters of the app's lines, split to be typed or written: put back when the file closes. */
        const momentParts: SplitText[] = [];
        /** Types a line of the app's voice, letter by letter, from `at`. Returns when it is done. */
        const type = (element: HTMLElement | null | undefined, at: number) => {
          if (element == null || reduced) {
            return at;
          }
          const typed = SplitText.create(element, { type: 'chars', aria: 'none' });
          momentParts.push(typed);
          const letters = typed.chars as HTMLElement[];
          gsap.set(letters, { opacity: 0 });
          return typeLetters(timeline, letters, at, STAMP_MOMENT.typeRate, (element.textContent ?? '').trim().length);
        };
        const note = rootRef.current?.querySelector<HTMLElement>('[data-file="stamp-note"]');
        if (evidence.status === 'record' && !reduced) {
          // It lands heavy: the folder gives a tiny shake, and the ink spreads a little as it settles.
          timeline.to(
            '[data-file="grip"]',
            { keyframes: { x: [0, -STAMP_MOMENT.shake, STAMP_MOMENT.shake, -STAMP_MOMENT.shake / 2, 0] }, ...tween('stamp.shake') },
            stampAt + MOTION['stamp.hit'].duration
          );
          if (stamp !== null) {
            timeline.fromTo(stamp, { scale: 1 }, { scale: STAMP_MOMENT.spread, ...tween('stamp.spread') }, landed);
          }
        }
        if (evidence.status === 'disputed' && !reduced && stamp !== null) {
          // It lands a little crooked.
          timeline.fromTo(stamp, { rotation: 0 }, { rotation: STAMP_MOMENT.crooked, ...tween('paper.land') }, landed - STEP.fast);
        }
        if (evidence.status !== 'legend') {
          type(note, landed + STEP.base);
        }

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
          // Once the ink has drained, the pen writes the app's word at the foot of the page.
          const line = rootRef.current?.querySelector<HTMLElement>('[data-file="legend-pen"]');
          const penPoint = rootRef.current?.querySelector<HTMLElement>('[data-file-pen="quill"]');
          const penBody = rootRef.current?.querySelector<HTMLElement>('[data-file-pen="quill-body"]');
          if (!reduced && line != null && penPoint != null && penBody != null) {
            const written = SplitText.create(line, { type: 'chars', aria: 'none' });
            momentParts.push(written);
            const letters = written.chars as HTMLElement[];
            gsap.set(letters, { opacity: 0 });
            timeline.call(() => emitStoryEvent({ type: 'legend-pen', evidence: evidence.id }), undefined, landed + STAMP_MOMENT.legendPenAfter);
            createQuillWriter(penPoint, penBody).write(timeline, letters, landed + STAMP_MOMENT.legendPenAfter, letters.length / STAMP_MOMENT.penRate);
          }
        }
        return () => {
          skipRef.current = null;
          parts.forEach(part => part.revert());
          momentParts.forEach(part => part.revert());
          split?.revert();
        };
      });
    },
    { scope: rootRef }
  );

  /** A click outside the folder (on the dimmed desk) closes the file, like Escape. */
  const closeOnOutsideClick = (event: MouseEvent<HTMLDivElement>) => {
    // A portal card opened inside the file is not "outside" it (its clicks bubble through React).
    if ((event.target as Element).closest('[data-file="folder"], [data-portal="root"]') === null) {
      close();
    }
  };
  /**
   * "Back to the floor": the file comes off the board (or the tray) and goes back to the floor, still opened, to its
   * own spot (not to where it was last dropped).
   */
  const desk = useDeskOutlet();
  /**
   * The folder let go over the floor (or anywhere that is not a theory or the tray): it lies there, taken off its
   * theory if it was pinned, and the file closes; the desk flies the folder from the hand to its new spot.
   */
  const putOnFloor = (point: { x: number; y: number }, unpinIt: boolean) => {
    recordFlight(evidence.id, 'out', folderRef.current);
    if (desk !== null) {
      desk.dropOnFloor(evidence.id, point, unpinIt);
    } else if (unpinIt) {
      dispatch({ type: 'UNPIN_EVIDENCE', evidenceId: evidence.id });
    }
    navigate(board);
  };
  const putOnFloorRef = useRef(putOnFloor);
  useEffect(() => {
    putOnFloorRef.current = putOnFloor;
  });
  const unpin = () => {
    desk?.forgetFloorSpot(evidence.id);
    dispatch({ type: 'UNPIN_EVIDENCE', evidenceId: evidence.id });
  };
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
  // the desk shows through. Let go anywhere else (the floor, the board's empty space, past the edges), it goes back
  // to the floor where it was let go, kept inside it (review-fixes brief, 4). Never required: the Pin menu and
  // "Back to the floor" do the same.
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
          targets = dropTargets();
          root.dataset.dragging = 'true';
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
          // Where it was let go: the folder's centre on the screen.
          const box = folder.getBoundingClientRect();
          const at = { x: box.left + box.width / 2, y: box.top + box.height / 2 };
          const outcome = dropOutcome({ from: 'open-file', pinned: pinnedRef.current }, dropTargetFor(hot, caseData.theories, at), at);
          hot = null;
          if (outcome.kind === 'pin') {
            finishPin(outcome.target);
            return;
          }
          if (outcome.kind === 'settle' || outcome.kind === 'unpin') {
            putOnFloorRef.current(at, outcome.kind === 'unpin');
            return;
          }
          // (No other outcome for the open file; should one come, it opens again where it was.)
          delete root.dataset.dragging;
          emitStoryEvent({ type: 'flip', evidence: evidence.id, direction: 'open' });
          gsap.to(folder, { x: 0, y: 0, scale: 1, ...tween('paper.lift'), overwrite: 'auto' });
          gsap.to(cover, { rotationY: COVER_OPEN, ...tween('paper.move'), delay: STEP.fast / 2, overwrite: true });
          gsap.to(backdrop, { opacity: 1, ...tween('hover'), overwrite: true });
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
    if (pinning || pinningRef.current) {
      return;
    }
    pinningRef.current = true;
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

  useEffect(() => {
    pinRef.current = pin;
  });
  return (
    <div
      ref={rootRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="file-title"
      data-page="case"
      onKeyDown={trapFocus}
      data-lenis-prevent
      onClick={closeOnOutsideClick}
      // On a desktop the open file fits the screen and the page never scrolls behind it: the document scrolls
      // inside its paper. On a phone the whole file scrolls.
      className="group/file fixed inset-0 z-40 overflow-x-hidden overflow-y-auto overscroll-contain px-3 pt-[calc(var(--case-header)+1.75rem)] pb-12 sm:px-6 lg:grid lg:place-items-center lg:overflow-hidden lg:px-10 lg:pt-[var(--case-header)] lg:pb-6"
    >
      {/* The desk dims behind the open file. */}
      <div data-file="backdrop" aria-hidden="true" className="fixed inset-0 bg-night/90" />

      {/* Desktop: two halves, the cover swings open into the left one. */}
      {/* Desktop: big and straight. Both covers together are 80% of the screen wide (at most 75rem), and the folder
          is between 70% and 86% of the screen high; a long document scrolls inside the paper. */}
      <div
        data-file="frame"
        className="relative mx-auto max-w-3xl lg:grid lg:w-[min(80vw,75rem)] lg:max-w-none lg:grid-cols-2"
      >
        {/* The clear way back (review-fixes brief, 4): a file from the floor goes back to the floor; a pinned one back
            to its place on the board. Escape and a click outside the file do the same. On a desktop it sits on the open
            cover's top corner; it steps aside while the folder is carried. */}
        <div className="mb-3 flex justify-end lg:pointer-events-none lg:absolute lg:inset-x-0 lg:top-0 lg:z-20 lg:mb-0 lg:justify-start lg:p-3">
          <button
            type="button"
            data-file="back-to-floor"
            onClick={close}
            className="inline-flex min-h-10 items-center gap-2 rounded-sm border border-night-ink/35 bg-night/85 px-3.5 font-voice text-[0.8125rem] tracking-[0.12em] text-night-ink uppercase transition-[scale,background-color,border-color,opacity] duration-(--motion-hover-duration) ease-(--motion-hover-ease) hover:border-night-ink hover:bg-night focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass active:scale-[0.97] group-data-[dragging=true]/file:pointer-events-none group-data-[dragging=true]/file:opacity-0 lg:pointer-events-auto lg:border-ink/30 lg:bg-paper/85 lg:text-ink lg:hover:border-ink lg:hover:bg-paper"
          >
            <span aria-hidden="true">↓</span>
            {target === undefined && isDesktop ? 'Back to the floor' : 'Back to the board'}
          </button>
        </div>
        <div
          ref={folderRef}
          data-file="folder"
          data-flip-id={`file-${evidence.id}`}
          className="lg:col-start-2 lg:grid lg:min-h-[70svh] lg:max-h-[86svh] lg:grid-rows-[minmax(0,1fr)] lg:[perspective-origin:0%_50%] lg:[perspective:1800px]"
        >
          {/* The front cover. Its outside shows only while it is closed; its inside is the inner cover. */}
          <div
            data-file="cover"
            className="relative z-10 lg:min-h-0 lg:origin-left lg:[grid-area:1/1] lg:[transform-style:preserve-3d]"
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
              className="desk-manila rounded-t-[3px] lg:h-full lg:overflow-hidden lg:rounded-[3px] lg:shadow-[0_8px_30px] lg:shadow-black/50 lg:[backface-visibility:hidden] lg:[transform:rotateY(180deg)]"
            >
              <InnerCover label={coverLabel(number, evidence.title)} sources={sources} />
            </div>
          </div>

          {/* The back of the folder, manila: the document lies on it, clipped in place. On a desktop its edge is
              where the folder is grabbed to drag it (data-file="grip"). */}
          {/* The document scrolls inside its paper (a thin scrollbar), while the folder stays still. */}
          <div
            data-file="grip"
            onClick={() => skipRef.current?.()}
            data-lenis-prevent
            className="thin-scroll desk-manila rounded-b-[3px] px-2.5 pt-5 pb-5 shadow-[0_8px_30px] shadow-black/50 sm:px-5 sm:pt-7 sm:pb-7 lg:min-h-0 lg:overflow-y-auto lg:overscroll-contain lg:rounded-[3px] lg:[grid-area:1/1]"
          >
            <FileDocument evidence={evidence} number={number} headingRef={headingRef} revealed={shownStamped}>
              <section aria-labelledby="pin-question" className="mx-2.5 mt-8 border-t border-ink/20 pt-6 sm:mx-5">
                <h3 id="pin-question" className="font-voice text-[1.0625rem] text-ink">
                  Which theory does this point to?
                </h3>
                <PinHint />
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
                  <PinMenu
                    theories={caseData.theories}
                    current={target}
                    onPin={pin}
                    onUnpin={isDesktop ? unpin : undefined}
                    busy={pinning}
                  />
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
                  <Link
                    to={`${board}/${nextId}`}
                    className={`${LINK_CLASSES} text-record underline hover:text-ink`}
                  >
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
