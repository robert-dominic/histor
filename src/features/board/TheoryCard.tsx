// src/features/board/TheoryCard.tsx
// One theory on the board: its title, its one-line claim, and how many files the user has pinned to it.
// Its historians' standing is never shown here: that is revealed only in the case report.
// Compact (small phones): only the title and the pin count, as a button. The board shows the claim of the
// card that was tapped, below the row, so the sticky row stays short.

import type { Theory } from '@/types/case';

interface TheoryCardProps {
  theory: Theory;
  pinnedCount: number;
  /** Small phones: title and pin count only; tapping the card shows its claim. */
  compact?: boolean;
  /** Compact only: true while this card's claim is shown. */
  expanded?: boolean;
  /** Compact only: the id of the element that shows the claim. */
  claimId?: string;
  onToggle?: () => void;
}

function pinnedLine(count: number): string {
  if (count === 0) {
    return 'No files pinned yet';
  }
  return count === 1 ? '1 file pinned' : `${count} files pinned`;
}

const CARD_CLASSES =
  'relative flex shrink-0 snap-start flex-col rounded-sm bg-paper text-ink shadow-lg shadow-night/50';

/** A brass pin holds the card to the desk. Threads end here. */
function Pin() {
  return (
    <span
      aria-hidden="true"
      data-board="pin"
      className="absolute top-1.5 left-1/2 size-2.5 -translate-x-1/2 rounded-full bg-brass shadow-[0_1px_2px] shadow-night/60"
    />
  );
}

export default function TheoryCard({ theory, pinnedCount, compact = false, expanded = false, claimId, onToggle }: TheoryCardProps) {
  const pinned = (
    <span data-board="pinned" className="font-voice text-[0.6875rem] tracking-[0.12em] text-ink/75 tabular-nums uppercase">
      {pinnedLine(pinnedCount)}
    </span>
  );

  if (compact) {
    return (
      <article data-board="theory" data-theory-id={theory.id} className={`${CARD_CLASSES} w-[11.5rem]`}>
        <Pin />
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={claimId}
          onClick={onToggle}
          className="relative flex h-full flex-col gap-1.5 rounded-sm px-3.5 pt-4 pb-2.5 text-left transition-[scale] duration-150 ease-out focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brass active:scale-[0.97]"
        >
          {/* The brass underline of an open claim: a layer whose opacity changes. */}
          <span
            aria-hidden="true"
            data-board="expanded-mark"
            data-on={expanded}
            className="pointer-events-none absolute inset-x-0 bottom-0 h-[3px] bg-brass opacity-0 transition-opacity duration-(--motion-hover-duration) ease-(--motion-hover-ease) data-[on=true]:opacity-100"
          />
          <span className="font-legend text-[1.1875rem] leading-[1.05] text-ink">{theory.title}</span>
          {pinned}
        </button>
      </article>
    );
  }

  return (
    <article data-board="theory" data-theory-id={theory.id} className={`${CARD_CLASSES} w-[15.5rem] gap-2 px-4 pt-5 pb-4 lg:w-auto`}>
      <Pin />
      <h3 className="font-legend text-[1.375rem] leading-[1.05] text-ink">{theory.title}</h3>
      <p data-board="claim" className="font-record text-[0.9375rem] leading-snug text-ink/85">
        {theory.claim}
      </p>
      <p className="mt-auto pt-1">{pinned}</p>
    </article>
  );
}
