// src/features/board/TheoryCard.tsx
// One theory on the board: its title, its one-line claim, and how many files the user has pinned to it.
// Its historians' standing is never shown here: that is revealed only in the case report.

import type { Theory } from '@/types/case';

interface TheoryCardProps {
  theory: Theory;
  pinnedCount: number;
}

function pinnedLine(count: number): string {
  if (count === 0) {
    return 'No files pinned yet';
  }
  return count === 1 ? '1 file pinned' : `${count} files pinned`;
}

export default function TheoryCard({ theory, pinnedCount }: TheoryCardProps) {
  return (
    <article
      data-board="theory"
      data-theory-id={theory.id}
      className="relative flex w-[15.5rem] shrink-0 snap-start flex-col gap-2 rounded-sm bg-paper px-4 pt-5 pb-4 text-ink shadow-lg shadow-night/50 lg:w-auto"
    >
      {/* A brass pin holds the card to the desk. Threads end here. */}
      <span
        aria-hidden="true"
        data-board="pin"
        className="absolute top-1.5 left-1/2 size-2.5 -translate-x-1/2 rounded-full bg-brass shadow-[0_1px_2px] shadow-night/60"
      />
      <h3 className="font-legend text-[1.375rem] leading-[1.05] text-ink">{theory.title}</h3>
      <p className="font-record text-[0.9375rem] leading-snug text-ink/85">{theory.claim}</p>
      <p data-board="pinned" className="mt-auto pt-1 font-voice text-[0.6875rem] tracking-[0.12em] text-ink/75 tabular-nums uppercase">
        {pinnedLine(pinnedCount)}
      </p>
    </article>
  );
}
