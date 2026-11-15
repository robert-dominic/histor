// src/components/CreditInfo.tsx
// The credit of an image, behind a small ⓘ button in a corner of the image (design.md, "Images and video").
// Hovering (on mouse devices), keyboard focus or a tap shows the credit in a small tooltip.
// Place it inside the positioned element that wraps the image; `className` puts it in its corner.

import { useEffect, useId, useRef, useState } from 'react';

interface CreditInfoProps {
  /** The credit line. */
  credit: string;
  /** Attribute that marks the credit text, so tests and tools can find it, e.g. `data-story`. */
  attribute: string;
  /** Where the tooltip opens from the button. It always grows towards the middle of the image. */
  placement: 'below' | 'above';
  /** Tailwind classes that position the button in its corner. */
  className?: string;
}

export default function CreditInfo({ credit, attribute, placement, className = '' }: CreditInfoProps) {
  // Pinned open by a tap or a click. Hover and keyboard focus show it without pinning.
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLSpanElement>(null);
  const tooltipId = useId();

  // While pinned open: a tap anywhere else, or Escape, closes it.
  useEffect(() => {
    if (!open) {
      return;
    }
    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  return (
    <span ref={rootRef} data-open={open} className={`group/credit absolute z-10 inline-flex ${className}`}>
      <button
        type="button"
        aria-label="Image credit"
        aria-expanded={open}
        aria-describedby={tooltipId}
        onClick={() => setOpen(value => !value)}
        // The visible disc is small; the button around it is a full-size touch target.
        className="grid size-11 place-items-center rounded-full text-night-ink/85 transition-[scale,color] duration-150 ease-out hover:text-night-ink focus-visible:outline-2 focus-visible:-outline-offset-8 focus-visible:outline-brass active:scale-[0.97]"
      >
        <span className="grid size-6 place-items-center rounded-full bg-night/70">
          <svg
            aria-hidden="true"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinecap="round"
            className="size-4"
          >
            <circle cx="8" cy="8" r="6.4" />
            <path d="M8 7.3v3.9" />
            <path d="M8 4.9v.1" strokeWidth="1.6" />
          </svg>
        </span>
      </button>
      {/* The tooltip grows from the button (motion.md). It is always in the page, so screen readers can read it. */}
      <span
        id={tooltipId}
        role="tooltip"
        className={`pointer-events-none absolute right-2.5 w-max max-w-[min(17rem,calc(100vw-2.5rem))] scale-[0.97] bg-night/90 px-2.5 pt-2 pb-1.5 text-left font-voice text-[0.6875rem] leading-snug tracking-[0.04em] text-night-ink opacity-0 transition-[opacity,scale] duration-150 ease-out group-hover/credit:scale-100 group-hover/credit:opacity-100 group-has-[:focus-visible]/credit:scale-100 group-has-[:focus-visible]/credit:opacity-100 group-data-[open=true]/credit:scale-100 group-data-[open=true]/credit:opacity-100 motion-reduce:scale-100 ${
          placement === 'below' ? 'top-[calc(100%-0.375rem)] origin-top-right' : 'bottom-[calc(100%-0.375rem)] origin-bottom-right'
        }`}
      >
        <span {...{ [attribute]: 'credit' }}>{credit}</span>
      </span>
    </span>
  );
}
