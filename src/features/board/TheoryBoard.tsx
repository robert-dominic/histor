// src/features/board/TheoryBoard.tsx
// The board of theories, across the top of the desk: a dark felt strip with a paper note per theory, and the files
// pinned to each theory hanging beneath it on threads.
// Small phones keep the compact row: title and pin count; tapping a theory shows its claim and its pinned files.
// Where every file hangs comes from deskLayout(); nothing here is stored.

import { useId, useRef, useState } from 'react';
import HangingTab, { type SlipReading } from '@/features/board/HangingTab';
import TheoryCard from '@/features/board/TheoryCard';
import TheoryNote from '@/features/board/TheoryNote';
import TheoryCascade from '@/features/board/TheoryCascade';
import Threads, { type Thread } from '@/features/board/Threads';
import type { DeskLayout } from '@/lib/desk';
import { theoryWeights } from '@/lib/theory-weight';
import { SMALL_PHONE_QUERY, useMediaQuery } from '@/lib/use-media-query';
import type { Case } from '@/types/case';

/** The historians' slips on the desk's tabs: what each says, which one is open, and how to open another. */
export interface DeskSlips {
  readings: Map<string, SlipReading>;
  open: string | null;
  onToggle: (evidenceId: string) => void;
  /** The thread of the file just pinned draws in. `token` changes with every pin, so a re-pin draws again. */
  fresh: { evidenceId: string; token: string } | null;
}

interface TheoryBoardProps {
  caseData: Case;
  layout: DeskLayout;
  /** e.g. "/case/mary-celeste/files". */
  filesHref: string;
  slips: DeskSlips;
  /** The one-screen desk: the board fills the row it is given, and the files pinned to a theory lie in a tidy pile
   * under its note as a cascade of strips that scrolls inside itself (TheoryCascade), so the board never grows. */
  fitted?: boolean;
}

export default function TheoryBoard({ caseData, layout, filesHref, slips, fitted = false }: TheoryBoardProps) {
  const isSmallPhone = useMediaQuery(SMALL_PHONE_QUERY);
  const feltRef = useRef<HTMLElement>(null);
  // Small phones: the theory whose claim and files are shown. Until the user taps one, the theory of an open
  // slip is shown, so the slip of a file just pinned can be seen.
  const [chosen, setChosen] = useState<string | null | undefined>(undefined);
  const slipPlace = layout.folders.find(folder => folder.evidence.id === slips.open)?.place;
  const shown = chosen !== undefined ? chosen : slipPlace?.kind === 'board' ? slipPlace.theoryId : null;
  const setShown = (update: (current: string | null) => string | null) => setChosen(update(shown));
  const claimId = useId();
  const numberOf = new Map(layout.folders.map(folder => [folder.evidence.id, folder.number]));
  // The board answers back to the player's own pins (theory-weight.ts), on the desk.
  const weights = theoryWeights(
    new Map(caseData.theories.map(theory => [theory.id, (layout.byTheory.get(theory.id) ?? []).length])),
    layout.folders.filter(folder => folder.place.opened).length
  );
  // The desktop desk: one thread per theory with files, to the top of its pile. The phone desk: one per file.
  const threads: Thread[] = fitted
    ? caseData.theories
        .filter(theory => (layout.byTheory.get(theory.id) ?? []).length > 0)
        .map(theory => ({
          id: theory.id,
          theoryId: theory.id,
          evidenceIds: (layout.byTheory.get(theory.id) ?? []).map(evidence => evidence.id),
        }))
    : caseData.theories.flatMap(theory =>
        (layout.byTheory.get(theory.id) ?? []).map(evidence => ({ id: evidence.id, theoryId: theory.id, evidenceIds: [evidence.id] }))
      );

  const tabsOf = (theoryId: string) => {
    const files = layout.byTheory.get(theoryId) ?? [];
    return files.length === 0 ? null : (
      <ul data-board="tabs" data-theory-id={theoryId} aria-label="Pinned files" className="relative z-[2] mt-4 flex flex-col gap-0 [&>li+li]:-mt-[var(--tab-overlap,0.375rem)]">
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
    );
  };

  if (isSmallPhone) {
    const theory = caseData.theories.find(item => item.id === shown);
    return (
      <section aria-labelledby="theories-title" data-board="board" className="sticky top-[var(--case-header)] z-[21] -mx-4">
        <h3 id="theories-title" className="sr-only">
          Theories
        </h3>
        <div className="desk-felt">
          <div className="overflow-x-auto px-4 py-3">
            <div className="flex snap-x snap-mandatory gap-3">
              {caseData.theories.map(item => (
                <TheoryCard
                  key={item.id}
                  theory={item}
                  pinnedCount={layout.byTheory.get(item.id)?.length ?? 0}
                  compact
                  expanded={shown === item.id}
                  claimId={claimId}
                  onToggle={() => setShown(current => (current === item.id ? null : item.id))}
                />
              ))}
            </div>
          </div>
          {/* The tapped theory: its claim, and the files pinned to it. Tapping it again hides them. */}
          <div id={claimId} aria-live="polite">
            {theory !== undefined && (
              <div data-board="claim" className="mx-4 mb-3 rounded-sm bg-paper px-3.5 py-2.5 text-ink">
                <p className="font-record text-[0.9375rem] leading-snug">
                  <span className="font-legend text-[1.0625rem] leading-none">{theory.title}: </span>
                  {theory.claim}
                </p>
                {tabsOf(theory.id)}
              </div>
            )}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      ref={feltRef}
      aria-labelledby="theories-title"
      data-board="board"
      data-fitted={fitted}
      // The board outside the notes is a place to drop a folder too: it opens it.
      data-drop-target={fitted ? 'board' : undefined}
      className={`desk-felt relative rounded-sm ${
        fitted ? 'h-full min-h-0 px-6 pt-6 pb-3 lg:px-8' : '-mx-4 px-4 pt-6 pb-8 sm:mx-0 sm:px-6 lg:px-8'
      }`}
    >
      {/* The one-screen desk: a small, quiet label above the theories. Elsewhere it is for screen readers only. */}
      <h3
        id="theories-title"
        data-board="label"
        className={
          fitted
            ? 'absolute top-1.5 left-8 font-voice text-[0.6875rem] tracking-[0.2em] text-night-ink/65 uppercase'
            : 'sr-only'
        }
      >
        Theories
      </h3>
      {/* The threads run behind the paper, so they show in the gaps between a note and its files. */}
      <Threads threads={threads} perTheory={fitted} fresh={slips.fresh} />
      <div
        className={`relative flex snap-x gap-5 overflow-x-auto pb-2 lg:grid lg:grid-cols-5 lg:overflow-visible lg:pb-0 ${fitted ? 'lg:h-full lg:min-h-0' : ''}`}
      >
        {caseData.theories.map(theory => (
          <div
            key={theory.id}
            data-board="column"
            className={`w-[15rem] shrink-0 snap-start lg:w-auto ${fitted ? 'lg:flex lg:min-h-0 lg:flex-col' : ''}`}
          >
            <TheoryNote theory={theory} className="relative z-[2]" fitted={fitted} weight={weights.get(theory.id)} />
            {fitted ? (
              <TheoryCascade
                theoryId={theory.id}
                theoryTitle={theory.title}
                files={layout.byTheory.get(theory.id) ?? []}
                numberOf={numberOf}
                filesHref={filesHref}
                slips={slips}
              />
            ) : (
              tabsOf(theory.id)
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
