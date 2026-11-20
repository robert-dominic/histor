// src/features/portals/PortalCard.tsx
// The card a portal opens: what a name, place or term in the text means.
// On a desktop it is a card anchored next to the tapped word. On a phone it is a bottom sheet.
// Either way it grows from the tapped word (motion.md), takes the focus, and gives it back when it closes.

import { useCallback, useEffect, useId, useLayoutEffect, useRef, type KeyboardEvent, type PointerEvent } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import CreditInfo from '@/components/CreditInfo';
import PortalText from '@/features/portals/PortalText';
import { MOTION_QUERIES, tween } from '@/lib/motion';
import { DESKTOP_QUERY, useMediaQuery } from '@/lib/use-media-query';
import type { Reference, ReferenceKind, Source } from '@/types/case';

gsap.registerPlugin(useGSAP);

const KIND_LABEL: Record<ReferenceKind, string> = {
  person: 'Person',
  place: 'Place',
  ship: 'Ship',
  term: 'Term',
};

const LABEL_CLASSES =
  'bg-night/75 px-1.5 pt-1.5 pb-1 font-voice text-[0.625rem] leading-none tracking-[0.14em] text-night-ink uppercase';

/** Seconds. Opening a portal happens many times, so it is fast; closing is faster. */

/** Desktop: the gap between the word and the card, and the least distance to the edge of the screen. Pixels. */
const GAP = 10;
const MARGIN = 16;

/** Phone: the sheet closes when dragged this far down, or flicked faster than this (pixels per millisecond). */
const SWIPE_DISTANCE = 90;
const SWIPE_VELOCITY = 0.11;

interface PortalCardProps {
  reference: Reference;
  /** The sources this reference names, already looked up. */
  sources: Source[];
  /** The word that was tapped. The card grows from it and returns the focus to it. */
  trigger: HTMLElement;
  /** Called once the card has finished closing. */
  onClosed: () => void;
}

interface Drag {
  pointerId: number;
  startY: number;
  startTime: number;
  /** How far the sheet has been moved, in pixels. */
  offset: number;
}

export default function PortalCard({ reference, sources, trigger, onClosed }: PortalCardProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const closingRef = useRef(false);
  const dragRef = useRef<Drag | null>(null);
  const titleId = useId();
  const isDesktop = useMediaQuery(DESKTOP_QUERY);

  /** Places the card and aims its transform origin at the tapped word. */
  const place = useCallback(() => {
    const card = cardRef.current;
    if (card === null) {
      return;
    }
    const word = trigger.getBoundingClientRect();
    const wordX = word.left + word.width / 2;
    const width = card.offsetWidth;
    const height = card.offsetHeight;

    if (isDesktop) {
      const viewportWidth = document.documentElement.clientWidth;
      const left = Math.max(MARGIN, Math.min(word.left, viewportWidth - width - MARGIN));
      // Below the word when it fits there, above when it only fits there, and otherwise on the side with more room.
      const roomBelow = window.innerHeight - MARGIN - (word.bottom + GAP);
      const roomAbove = word.top - GAP - MARGIN - (document.querySelector('[data-case-header="bar"]')?.getBoundingClientRect().bottom ?? 0);
      const below = height <= roomBelow || (height > roomAbove && roomBelow >= roomAbove);
      // A card taller than the room it has is kept on the screen, even if that covers the word.
      const wanted = below ? word.bottom + GAP : word.top - GAP - height;
      // Never under the case header, when the page has one.
      const header = document.querySelector('[data-case-header="bar"]')?.getBoundingClientRect().bottom ?? 0;
      const top = Math.max(header + MARGIN, Math.min(wanted, window.innerHeight - MARGIN - height));
      // The card is positioned in the page, not the screen, so it stays with its word when the page scrolls.
      card.style.left = `${left + window.scrollX}px`;
      card.style.top = `${top + window.scrollY}px`;
      card.style.transformOrigin = `${wordX - left}px ${word.top + word.height / 2 - top}px`;
    } else {
      card.style.left = '';
      card.style.top = '';
      const sheetTop = window.innerHeight - height;
      card.style.transformOrigin = `${wordX}px ${word.top + word.height / 2 - sheetTop}px`;
    }
  }, [isDesktop, trigger]);

  // Before the first paint, so the card is never seen in the wrong place.
  useLayoutEffect(place, [place]);

  // The card grows with its content up to its maximum height, and only then scrolls. While there is more below,
  // `data-more` is set on the card and a soft fade shows at its bottom edge. Written to the element, not to state.
  useEffect(() => {
    const card = cardRef.current;
    if (card === null) {
      return;
    }
    const update = () => {
      const more = card.scrollHeight - card.scrollTop - card.clientHeight > 1;
      card.dataset.more = String(more);
    };
    update();
    card.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    // Late fonts can change the content's height after the card opens: watch the card and what is inside it.
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(update) : null;
    [card, ...card.children].forEach(element => observer?.observe(element));
    return () => {
      card.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
      observer?.disconnect();
    };
  }, []);

  // Focus moves into the card when it opens.
  useEffect(() => {
    cardRef.current?.focus({ preventScroll: true });
  }, []);

  useGSAP(
    () => {
      // Without matchMedia there is no way to honour a reduced-motion request, so the card simply appears.
      if (typeof window.matchMedia !== 'function') {
        return;
      }
      const mm = gsap.matchMedia();
      mm.add(MOTION_QUERIES, context => {
        const reduced = context.conditions?.reduced === true;
        gsap.fromTo(backdropRef.current, { opacity: 0 }, { opacity: 1, ...tween('paper.lift') });
        gsap.fromTo(
          cardRef.current,
          reduced ? { opacity: 0 } : { opacity: 0, scale: 0.95 },
          { opacity: 1, scale: 1, ...tween('paper.lift') }
        );
      });
    },
    { scope: rootRef }
  );

  // The closing and swiping animations start from event handlers, outside the GSAP context: stop them on unmount.
  useEffect(() => {
    const card = cardRef.current;
    const backdrop = backdropRef.current;
    return () => gsap.killTweensOf([card, backdrop]);
  }, []);

  /** Closes the card. `slide` sends a swiped sheet on down, the way it was already going. */
  const close = useCallback(
    (slide = false) => {
    if (closingRef.current) {
      return;
    }
    closingRef.current = true;
    // Focus goes back to the word at once, not after the exit animation.
    trigger.focus({ preventScroll: true });

    const card = cardRef.current;
    if (card === null || typeof window.matchMedia !== 'function') {
      onClosed();
      return;
    }
    const reduced = window.matchMedia(MOTION_QUERIES.reduced).matches;
    gsap.to(backdropRef.current, { opacity: 0, ...tween('hover'), overwrite: true });
    if (slide && !reduced) {
      gsap.to(card, { y: card.offsetHeight, ...tween('hover'), overwrite: true, onComplete: onClosed });
    } else {
      gsap.to(card, {
        opacity: 0,
        scale: reduced ? 1 : 0.97,
        ...tween('hover'),
        overwrite: true,
        onComplete: onClosed,
      });
    }
    },
    [onClosed, trigger]
  );

  // Escape closes the card, wherever the focus is.
  useEffect(() => {
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        close();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [close]);

  /** Tab stays inside the card while it is open. */
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Tab') {
      return;
    }
    const card = event.currentTarget;
    // Sorted into document order by hand: not every DOM returns a selector list's matches that way.
    const stops = [...card.querySelectorAll<HTMLElement>('a[href], button:not(:disabled)')].sort((a, b) =>
      a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1
    );
    if (stops.length === 0) {
      event.preventDefault();
      return;
    }
    const first = stops[0];
    const last = stops[stops.length - 1];
    const active = document.activeElement;
    if (event.shiftKey && (active === first || active === card)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  };

  // Swipe the sheet down to close it (phone only). The sheet follows the finger; the position never enters React state.
  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    // One finger at a time, and never a drag that starts on the close button.
    if (isDesktop || dragRef.current !== null || closingRef.current || (event.target as Element).closest('button')) {
      return;
    }
    event.currentTarget.setPointerCapture?.(event.pointerId);
    dragRef.current = { pointerId: event.pointerId, startY: event.clientY, startTime: event.timeStamp, offset: 0 };
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (drag === null || drag.pointerId !== event.pointerId) {
      return;
    }
    const distance = event.clientY - drag.startY;
    // Down follows the finger. Up meets friction instead of a hard stop.
    drag.offset = distance > 0 ? distance : distance * 0.15;
    gsap.set(cardRef.current, { y: drag.offset });
  };

  const handlePointerEnd = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (drag === null || drag.pointerId !== event.pointerId) {
      return;
    }
    dragRef.current = null;
    const velocity = drag.offset / Math.max(1, event.timeStamp - drag.startTime);
    // A quick flick is enough: it does not have to travel the whole distance.
    if (drag.offset > SWIPE_DISTANCE || (drag.offset > 8 && velocity > SWIPE_VELOCITY)) {
      close(true);
    } else {
      gsap.to(cardRef.current, { y: 0, ...tween('hover') });
    }
  };

  return (
    <div ref={rootRef} data-portal="root">
      {/* A tap outside closes the card. On a phone the page behind the sheet is dimmed as well. */}
      <div
        ref={backdropRef}
        data-portal="backdrop"
        aria-hidden="true"
        onClick={() => close()}
        className="fixed inset-0 z-40 bg-night/45 lg:bg-transparent"
      />

      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        data-portal="card"
        data-more="false"
        onKeyDown={handleKeyDown}
        className="group/card fixed inset-x-0 bottom-0 z-40 max-h-[85svh] overflow-y-auto overscroll-contain rounded-t-2xl border-t border-ink/15 bg-paper text-ink shadow-2xl shadow-night/60 outline-none lg:absolute lg:inset-x-auto lg:bottom-auto lg:max-h-[70vh] lg:w-[23rem] lg:rounded-sm lg:border"
      >
        <div
          data-portal="grab"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerEnd}
          onPointerCancel={handlePointerEnd}
          className="touch-none px-5 pt-3 lg:touch-auto lg:px-6 lg:pt-5"
        >
          <div aria-hidden="true" className="mx-auto mb-3 h-1 w-10 rounded-full bg-ink/25 lg:hidden" />
          <div className="flex items-start justify-between gap-4">
            <div>
              <p data-portal="kind" className="font-voice text-[0.6875rem] tracking-[0.18em] text-ink/75 uppercase">
                {KIND_LABEL[reference.kind]}
              </p>
              <h2 id={titleId} className="mt-1.5 font-legend text-[2rem] leading-none text-balance text-ink">
                {reference.label}
              </h2>
            </div>
            <button
              type="button"
              aria-label="Close"
              onClick={() => close()}
              className="-mt-1.5 -mr-2.5 grid size-11 shrink-0 place-items-center rounded-full text-ink/75 transition-[scale,color,background-color] duration-150 ease-out hover:bg-ink/10 hover:text-ink focus-visible:outline-2 focus-visible:outline-brass active:scale-[0.97]"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                className="size-4"
              >
                <path d="M3 3l10 10M13 3L3 13" />
              </svg>
            </button>
          </div>
        </div>

        <div className="px-5 pt-4 pb-[max(1.75rem,env(safe-area-inset-bottom))] lg:px-6 lg:pb-6">
          {reference.image !== undefined && (
            // A fixed frame: the card is the same height before and after the image loads. The image is shown whole,
            // never cropped; one smaller than the frame keeps its own size, centred.
            <figure
              data-portal="frame"
              className="relative mb-4 flex h-[180px] items-center justify-center overflow-hidden border border-ink/15 bg-ash/45 lg:h-[220px]"
            >
              <img
                src={reference.image.src}
                alt={reference.image.alt}
                decoding="async"
                className="block h-auto max-h-full w-auto max-w-full object-contain"
              />
              {/* Always visible: what the reader must know at a glance. The full credit is behind the ⓘ. */}
              {(reference.image.isIllustration || reference.image.caption !== undefined) && (
                <figcaption className="absolute top-1.5 left-1.5 flex max-w-[calc(100%-0.75rem)] flex-wrap gap-1">
                  {reference.image.isIllustration && (
                    <span data-portal="illustration" className={LABEL_CLASSES}>
                      Illustration
                    </span>
                  )}
                  {reference.image.caption !== undefined && (
                    <span data-portal="caption" className={LABEL_CLASSES}>
                      {reference.image.caption}
                    </span>
                  )}
                </figcaption>
              )}
              <CreditInfo
                credit={reference.image.credit}
                attribute="data-portal"
                placement="above"
                className="right-0 bottom-0"
              />
            </figure>
          )}

          <div data-portal="profile" className="flex flex-col gap-3 font-record text-[1.0625rem] leading-[1.55]">
            {reference.profile.map((paragraph, index) => (
              <p key={index}>
                {/* Labels inside a card are plain text: a card does not open another card. */}
                <PortalText text={paragraph} interactive={false} />
              </p>
            ))}
          </div>

          {sources.length > 0 && (
            <div className="mt-5 border-t border-ink/15 pt-3.5">
              <h3 className="font-voice text-[0.6875rem] tracking-[0.18em] text-ink/75 uppercase">Sources</h3>
              <ul data-portal="sources" className="mt-2 flex flex-col gap-1.5 font-record text-[0.9375rem] leading-snug">
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
                      <span>
                        {source.title}
                        {source.citation !== undefined && <span className="text-ink/75">. {source.citation}</span>}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* A soft fade at the bottom edge while there is more to read. It takes no room and never takes clicks. */}
        <div
          aria-hidden="true"
          data-portal="fade"
          className="pointer-events-none sticky bottom-0 -mt-12 h-12 bg-linear-to-t from-paper to-transparent opacity-0 transition-opacity duration-150 ease-out group-data-[more=true]/card:opacity-100"
        />
      </div>
    </div>
  );
}
