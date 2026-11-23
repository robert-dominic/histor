// src/features/board/TheoryCascade.tsx
// The files pinned to one theory on the desktop desk, always in view under its note: a cascade of strips, each with
// its number and label, slightly overlapping like cards laid down one after another. Nothing to hover to see them.
// When there are more than fit above the floor, the cascade scrolls inside itself (a thin scrollbar), so the board
// never grows. Each strip is a tab as before: it can be dragged out (the cascade stops clipping while one is carried:
// pile.ts `carryOut`), and a click shows its historians' slip, with a link that opens the file.
// The theory's one thread ends at the brass pin at the top of the cascade, which stays put when the cascade scrolls.
import HangingTab from '@/features/board/HangingTab';
import type { DeskSlips } from '@/features/board/TheoryBoard';
import type { Evidence } from '@/types/case';

interface TheoryCascadeProps {
  theoryId: string;
  theoryTitle: string;
  files: Evidence[];
  numberOf: Map<string, string>;
  filesHref: string;
  slips: DeskSlips;
}

export default function TheoryCascade({ theoryId, theoryTitle, files, numberOf, filesHref, slips }: TheoryCascadeProps) {
  if (files.length === 0) {
    return null;
  }
  return (
    <div data-board="cascade" data-theory-id={theoryId} className="relative z-[2] mt-3 flex min-h-0 flex-1 flex-col">
      {/* Where the theory's thread ends: the top of the cascade, still while it scrolls. */}
      <span aria-hidden="true" data-board="cascade-pin" className="desk-pin absolute -top-1 left-4 z-[3] size-2 rounded-full" />
      <div data-board="cascade-scroll" data-lenis-prevent className="thin-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain pt-1 pr-1">
        <ul
          data-board="tabs"
          data-theory-id={theoryId}
          aria-label={`Files pinned to ${theoryTitle}`}
          className="flex flex-col [&>li+li]:-mt-2.5"
        >
          {files.map(evidence => (
            <HangingTab
              key={evidence.id}
              evidence={evidence}
              number={numberOf.get(evidence.id) ?? ''}
              href={`${filesHref}/${evidence.id}`}
              reading={slips.readings.get(evidence.id)}
              slipOpen={slips.open === evidence.id}
              onToggleSlip={slips.onToggle}
            />
          ))}
        </ul>
      </div>
    </div>
  );
}
