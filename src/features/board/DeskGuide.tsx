// src/features/board/DeskGuide.tsx
// The desk's guide, "How to investigate": what the case is, what the theories and the case files are, what the
// stamps mean, how to pin, and when the case can be closed. It is the first thing the player sees every time they
// arrive on the desk, until they close it; after the first visit it offers "Don't show this again" (remembered in
// storage). A small "?" in the corner opens it again any time. It always opens at the top.
// The case's own words come from the case data: its intro sentence and how many files close it. On a
// desktop the files lie on the floor; on the phone desk they are "the files below".
// A dialog: the focus stays inside, Escape closes it and gives the focus back to the button.
import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import gsap from 'gsap';
import { emitStoryEvent } from '@/lib/story-events';
import { useGSAP } from '@gsap/react';
import { numberWord } from '@/features/board/hints';
import { hasSeenDeskGuide, isDeskGuideOff, markDeskGuideSeen, setDeskGuideOff } from '@/lib/desk-guide-seen';
import { DESKTOP_QUERY, useMediaQuery } from '@/lib/use-media-query';
import { MOTION_QUERIES, QUICK_OUT, tween } from '@/lib/motion';
import { TYPEWRITER, typeElement } from '@/lib/typewriter';

gsap.registerPlugin(useGSAP);

/** The guide's lead-ins are typed quicker than a line on its own: there are several, and the guide is read often. */
const GUIDE_TYPE_RATE = TYPEWRITER.rate * 2;

interface DeskGuideProps {
  caseId: string;
  /** The case's own first sentence for the guide (`Case.deskGuideIntro`), if it has one. */
  intro?: string;
  /** How many files must be opened to close the case. */
  threshold: number;
  /** Open from the start: the player has just arrived on the desk, and has not asked for it to stay closed. */
  startOpen: boolean;
  /** Told once it has opened by itself, so it does not open again until the next arrival. */
  onShown?: () => void;
}

/** One part of the guide: a bold lead-in, then its text. */
function Part({ lead, children }: { lead: string; children: ReactNode }) {
  return (
    <p className="font-record text-[1.0625rem] leading-normal">
      <strong data-guide-typed="" className="font-voice font-normal text-ink">{lead}</strong> {children}
    </p>
  );
}

export default function DeskGuide({ caseId, intro, threshold, startOpen, onShown }: DeskGuideProps) {
  // Every arrival on the desk: the guide is the first thing the player sees, until they close it.
  const [open, setOpen] = useState(startOpen);
  // After the first visit it offers "Don't show this again".
  const [firstVisit] = useState(() => !hasSeenDeskGuide(caseId));
  const [off, setOff] = useState(() => isDeskGuideOff(caseId));
  const headingRef = useRef<HTMLHeadingElement>(null);
  const desktop = useMediaQuery(DESKTOP_QUERY);
  const overlayRef = useRef<HTMLDivElement>(null);
  const closingRef = useRef(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) {
      markDeskGuideSeen(caseId);
    }
  }, [open, caseId]);
  // Its sound: a page flip as it opens (a softer one as it starts to close, in `close`).
  useEffect(() => {
    if (open) {
      emitStoryEvent({ type: 'guide', open: true });
    }
  }, [open]);
  // Opening by itself on arrival happens once per arrival.
  useEffect(() => {
    if (startOpen) {
      onShown?.();
    }
    // Only the first render's value: an arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Closes the guide: it fades out (quicker than it came in), and the focus goes back to the button at once. */
  const close = () => {
    buttonRef.current?.focus();
    const overlay = overlayRef.current;
    if (overlay === null || typeof window.matchMedia !== 'function') {
      emitStoryEvent({ type: 'guide', open: false });
      setOpen(false);
      return;
    }
    if (closingRef.current) {
      return;
    }
    emitStoryEvent({ type: 'guide', open: false });
    closingRef.current = true;
    gsap.to(overlay, {
      opacity: 0,
      ...QUICK_OUT,
      onComplete: () => {
        closingRef.current = false;
        setOpen(false);
      },
    });
  };

  // It opens at the top: the focus goes to its heading (not the Close button at the bottom, which would scroll the
  // panel down to it), and its scroll is reset.
  useEffect(() => {
    if (open) {
      if (panelRef.current !== null) {
        panelRef.current.scrollTop = 0;
      }
      headingRef.current?.focus({ preventScroll: true });
    }
  }, [open]);

  useGSAP(
    () => {
      const panel = panelRef.current;
      if (!open || panel === null || typeof window.matchMedia !== 'function') {
        return;
      }
      const mm = gsap.matchMedia();
      mm.add(MOTION_QUERIES, context => {
        const reduced = context.conditions?.reduced === true;
        const timeline = gsap.timeline();
        timeline.fromTo(panel, reduced ? { opacity: 0 } : { opacity: 0, scale: 0.95 }, { opacity: 1, scale: 1, ...tween('hover') });
        if (reduced) {
          return;
        }
        // The app's own words in the guide, its lead-ins in Special Elite, are typed one after another with the
        // typewriter's keys (review-fixes brief, 8); the text around them is simply there.
        const splits: { revert: () => void }[] = [];
        let at = tween('hover').duration;
        panel.querySelectorAll<HTMLElement>('[data-guide-typed]').forEach(lead => {
          const typed = typeElement(timeline, lead, at, GUIDE_TYPE_RATE);
          if (typed !== null) {
            splits.push(typed.split);
            at = typed.end;
          }
        });
        timeline.call(() => splits.forEach(split => split.revert()), undefined, at);
        return () => {
          timeline.kill();
          splits.forEach(split => split.revert());
        };
      });
    },
    { dependencies: [open] }
  );

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      close();
      return;
    }
    if (event.key !== 'Tab' || panelRef.current === null) {
      return;
    }
    // The focus stays inside, on its controls.
    const stops = [...panelRef.current.querySelectorAll<HTMLElement>('input, button')];
    const at = stops.indexOf(document.activeElement as HTMLElement);
    event.preventDefault();
    const next = event.shiftKey ? (at <= 0 ? stops.length - 1 : at - 1) : (at + 1) % stops.length;
    stops[next]?.focus();
  };

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-label="How the desk works"
        aria-haspopup="dialog"
        aria-expanded={open}
        data-ui-sound="off"
        onClick={() => setOpen(true)}
        className="fixed right-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-30 grid size-11 place-items-center rounded-full border border-brass bg-night font-voice text-lg text-brass shadow-lg shadow-black/50 transition-[scale,background-color,color] duration-150 ease-out hover:bg-brass hover:text-night focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass active:scale-[0.97] lg:right-6 lg:bottom-6"
      >
        ?
      </button>
      {open && (
        <div
          ref={overlayRef}
          className="fixed inset-0 z-[45] grid place-items-center bg-night/80 px-4"
          onKeyDown={handleKeyDown}
          onPointerDown={event => {
            if (event.target === event.currentTarget) {
              close();
            }
          }}
        >
          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="desk-guide-title"
            data-hint="guide"
            data-lenis-prevent
            className="thin-scroll max-h-[88svh] w-full max-w-xl overflow-y-auto overscroll-contain rounded-[2px] bg-paper px-6 pt-6 pb-5 text-ink shadow-2xl shadow-black/70"
          >
            <h2 ref={headingRef} id="desk-guide-title" tabIndex={-1} className="font-legend text-3xl leading-none outline-none">
              How to investigate
            </h2>
            <div className="mt-4 flex flex-col gap-3.5">
              {intro !== undefined && (
                <p data-guide="intro" className="font-record text-[1.0625rem] leading-normal italic">
                  {intro}
                </p>
              )}
              <Part lead="The theories are on the board.">
                Each one is an explanation people have given for what happened. Some still hold up. Some fell apart long
                ago.
              </Part>
              <Part lead={desktop ? 'The case files are on the floor.' : 'The case files are below.'}>
                Each file is one thing we know, or think we know. Open one and read it.
              </Part>
              <div>
                <Part lead="Every file you open gets a stamp:">{null}</Part>
                <ul data-guide="stamps" className="mt-1.5 flex flex-col gap-1 pl-4 font-record text-[1.0625rem] leading-normal">
                  <li>
                    <strong data-guide-typed="" className="font-voice font-normal text-record">Record:</strong> written down at the time. The
                    logbook, sworn testimony, official papers. You can trust it.
                  </li>
                  <li>
                    <strong data-guide-typed="" className="font-voice font-normal text-rust">Disputed:</strong> real, but historians argue over
                    what it means.
                  </li>
                  <li>
                    <strong data-guide-typed="" className="font-voice font-normal text-ghost-ink">Legend:</strong> added later by storytellers.
                    Famous, and false.
                  </li>
                </ul>
              </div>
              <Part lead="Think a file points to a theory?">
                Drag it onto that theory. If it points to none of them, drop it on “None of them”. You can change your mind
                any time.
              </Part>
              <Part lead={`Open ${numberWord(threshold)} files and a “Close the case” stamp appears.`}>
                Use it to close the case: choose the theory you believe, and see where you agree with the historians.
              </Part>
              <p data-guide="warning" className="font-record text-[1.0625rem] leading-normal italic">
                One warning: the details everyone remembers are often the ones that never happened.
              </p>
            </div>
            {!firstVisit && (
              <label className="toggle-row mt-6 flex cursor-pointer font-voice text-[0.9375rem]">
                <input
                  type="checkbox"
                  data-guide="dont-show"
                  checked={off}
                  onChange={event => {
                    setOff(event.target.checked);
                    setDeskGuideOff(caseId, event.target.checked);
                  }}
                  className="size-4 accent-[var(--color-record)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-record"
                />
                <span className="toggle-text">Don’t show this again</span>
              </label>
            )}
            <button
              ref={closeRef}
              type="button"
              data-ui-sound="off"
              onClick={close}
              className="mt-6 inline-flex min-h-11 items-center rounded-sm border border-ink px-5 font-voice text-sm tracking-[0.14em] uppercase transition-[scale,background-color,color] duration-150 ease-out hover:bg-ink hover:text-paper focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-record active:scale-[0.97]"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
