// src/features/board/DeskGuide.tsx
// A small "?" in the corner of the desk. It opens a three-step guide, any time, for anyone who missed the hints.
// A dialog: the focus stays inside, Escape closes it and gives the focus back to the button.
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { numberWord } from '@/features/board/hints';
import { DESKTOP_QUERY, useMediaQuery } from '@/lib/use-media-query';
import { MOTION_QUERIES, QUICK_OUT, tween } from '@/lib/motion';

gsap.registerPlugin(useGSAP);

interface DeskGuideProps {
  /** How many files must be opened to close the case. */
  threshold: number;
}

export default function DeskGuide({ threshold }: DeskGuideProps) {
  const [open, setOpen] = useState(false);
  const desktop = useMediaQuery(DESKTOP_QUERY);
  const overlayRef = useRef<HTMLDivElement>(null);
  const closingRef = useRef(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  const steps = [
    { title: 'Open a file', text: `Take a folder from the ${desktop ? 'floor' : 'pile'}. Read what is inside.` },
    {
      title: 'Pin it',
      text: 'Choose the theory you think it points to, with “Pin to…”. On a desktop you can also drag the folder onto a note. “None of them” is an answer too.',
    },
    { title: 'Close the case', text: `Open ${numberWord(threshold)} files, and the seal appears.` },
  ];

  /** Closes the guide: it fades out (quicker than it came in), and the focus goes back to the button at once. */
  const close = () => {
    buttonRef.current?.focus();
    const overlay = overlayRef.current;
    if (overlay === null || typeof window.matchMedia !== 'function') {
      setOpen(false);
      return;
    }
    if (closingRef.current) {
      return;
    }
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

  // The panel takes the focus when it opens.
  useEffect(() => {
    if (open) {
      closeRef.current?.focus();
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
        gsap.fromTo(
          panel,
          reduced ? { opacity: 0 } : { opacity: 0, scale: 0.95 },
          { opacity: 1, scale: 1, ...tween('hover') }
        );
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
    if (event.key !== 'Tab') {
      return;
    }
    // Only the close button can take the focus inside: it stays there.
    event.preventDefault();
    closeRef.current?.focus();
  };

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-label="How the desk works"
        aria-haspopup="dialog"
        aria-expanded={open}
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
            className="w-full max-w-md rounded-[2px] bg-paper px-6 pt-6 pb-5 text-ink shadow-2xl shadow-black/70"
          >
            <h2 id="desk-guide-title" className="font-legend text-3xl leading-none">
              How the desk works
            </h2>
            <ol className="mt-5 flex flex-col gap-4">
              {steps.map((step, index) => (
                <li key={step.title} className="flex gap-4">
                  <span aria-hidden="true" className="font-voice text-lg text-rust tabular-nums">
                    {index + 1}
                  </span>
                  <div>
                    <p className="font-voice text-[1.0625rem]">{step.title}</p>
                    <p className="mt-1 font-record text-[1.0625rem] leading-normal">{step.text}</p>
                  </div>
                </li>
              ))}
            </ol>
            <button
              ref={closeRef}
              type="button"
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
