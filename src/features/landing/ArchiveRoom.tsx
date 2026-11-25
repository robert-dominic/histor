// src/features/landing/ArchiveRoom.tsx
// "Walk the archive" (landing v3 brief): a full-screen dark wall with every case's frame hung together, salon-style, at
// varied sizes, as in a museum (src/lib/salon.ts). Hovering (or focusing) a frame lights it; clicking opens it: an open
// case goes to the case, a sealed one raises its plaque card. Escape or the close icon returns to the landing.
// A modal: focus goes in and is trapped, and returns to the button that opened it. Phones: a plain scrolling wrap.
// Reduced motion: fades only.
import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { CloseIcon } from '@/components/icons';
import IconButton from '@/components/IconButton';
import { exhibits } from '@/cases';
import Frame from '@/features/landing/Frame';
import { OpenFrame, SealedFrame } from '@/features/landing/FrameActions';
import { MOTION_QUERIES, QUICK_OUT, STEP, tween } from '@/lib/motion';
import { salonPlace } from '@/lib/salon';

gsap.registerPlugin(useGSAP);

interface ArchiveRoomProps {
  /** The room has gone: the page behind comes back. */
  onClose: () => void;
}

export default function ArchiveRoom({ onClose }: ArchiveRoomProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [closing, setClosing] = useState(false);

  useGSAP(
    () => {
      const root = rootRef.current;
      if (root === null || typeof window.matchMedia !== 'function') {
        return;
      }
      const reduced = window.matchMedia(MOTION_QUERIES.reduced).matches;
      const items = gsap.utils.toArray<HTMLElement>('[data-salon="item"]', root);
      gsap.fromTo(root, { opacity: 0 }, { opacity: 1, ...tween('paper.move') });
      if (!reduced) {
        gsap.fromTo(items, { opacity: 0, scale: 0.95, y: 14 }, { opacity: 1, scale: 1, y: 0, ...tween('ink.in'), stagger: STEP.fast / 2, delay: STEP.fast });
      }
    },
    { scope: rootRef }
  );

  const close = () => {
    const root = rootRef.current;
    if (closing) {
      return;
    }
    setClosing(true);
    if (root === null || typeof window.matchMedia !== 'function') {
      onClose();
      return;
    }
    gsap.to(root, { opacity: 0, ...QUICK_OUT, onComplete: onClose });
  };

  // Focus goes in; Escape closes (whatever has the focus).
  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape' && document.querySelector('[data-exhibit-part="plaque"][data-open="true"]') === null) {
        event.preventDefault();
        close();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- close only reads the current closing state
  }, [closing]);

  const trap = (event: KeyboardEvent<HTMLDivElement>) => {
    const root = rootRef.current;
    if (event.key !== 'Tab' || root === null) {
      return;
    }
    const focusable = [...root.querySelectorAll<HTMLElement>('a[href], button:not([disabled])')].filter(element => element.offsetParent !== null || element === document.activeElement);
    if (focusable.length === 0) {
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <div
      ref={rootRef}
      role="dialog"
      aria-modal="true"
      aria-label="The archive"
      data-landing="archive"
      onKeyDown={trap}
      className="salon-wall fixed inset-0 z-[55] overflow-y-auto overscroll-contain"
    >
      <div className="flex items-center justify-between px-4 pt-4 lg:px-8 lg:pt-5">
        <p className="font-voice text-[0.75rem] tracking-[0.3em] text-night-ink/60 uppercase">The archive</p>
        <IconButton ref={closeRef} label="Close the archive" icon={<CloseIcon />} onClick={close} />
      </div>
      <ul aria-label="Every case" className="flex flex-wrap items-end justify-center gap-x-8 gap-y-10 px-4 pt-6 pb-16 lg:block lg:p-0">
        {exhibits.map((exhibit, index) => {
          const place = salonPlace(index);
          const height = `min(${place.height}svh, 42vw)`;
          const frame = <Frame exhibit={exhibit} height={height} className="h-(--frame-h) w-auto" />;
          return (
            <li
              key={exhibit.id}
              data-salon="item"
              data-salon-case={exhibit.id}
              style={{ '--salon-left': `${place.left}vw`, '--salon-top': `${place.top}svh` } as CSSProperties}
              className="salon-item relative lg:absolute lg:top-(--salon-top) lg:left-(--salon-left)"
            >
              <div data-exhibit-part="rise" className="relative isolate">
                <span aria-hidden="true" className="haunted-frame-shadow" />
                <span aria-hidden="true" className="salon-light" />
                {exhibit.status === 'open' ? (
                  <OpenFrame exhibit={exhibit}>{frame}</OpenFrame>
                ) : (
                  <SealedFrame exhibit={exhibit} plaque={place.plaque}>
                    {frame}
                  </SealedFrame>
                )}
                <span aria-hidden="true" className="salon-dim" />
              </div>
              <p className="mt-3 font-voice text-[0.6875rem] tracking-[0.18em] text-night-ink/60 uppercase">
                {exhibit.title} · {exhibit.status === 'open' ? exhibit.years : 'Sealed'}
              </p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
