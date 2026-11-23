// src/features/board/FileDocument.tsx
// The document inside a folder: a sheet of paper held by a paper clip, with the file's number, its title, its
// status stamp and its detail (through PortalText, so the references in it open portals).
// It starts as plain paper. When the stamp lands (OpenFile sets data-revealed on the sheet), the paper becomes
// its status (effects.css):
//   Record: crisp official paper, a letterhead in record ink, and an embossed seal beside the stamp.
//   Disputed: sheet one holds "The claim", underlined wavy in rust (never struck through) with a hand-drawn "?"
//   and a note in the margin; a second sheet, askew, holds "The challenge".
//   Legend: the paper yellows and turns faintly see-through, the ink fades to ghost ink, and a typed slip,
//   "Where this came from", slides out from under it.
// Whatever follows the paper (the question, the links) is passed in as children. Motion is applied from outside.

import type { ReactNode, Ref } from 'react';
import Nib from '@/components/Nib';
import Stamp from '@/components/Stamp';
import { STAMP_NOTE } from '@/lib/ui-copy';
import PortalText from '@/features/portals/PortalText';
import { STATUS_LABEL } from '@/lib/case-files';
import { firstSentence } from '@/lib/desk';
import type { Evidence } from '@/types/case';

interface FileDocumentProps {
  evidence: Evidence;
  /** e.g. "07". */
  number: string;
  headingRef: Ref<HTMLHeadingElement>;
  /** Already shown as its status: a file opened before. Otherwise OpenFile reveals it when the stamp lands. */
  revealed: boolean;
  children?: ReactNode;
}

/** A paper clip, drawn: one wire bent into two loops. */
function PaperClip() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 72"
      className="pointer-events-none absolute -top-6 left-8 h-[3.75rem] w-5 rotate-[6deg] text-muted drop-shadow-[0_1px_1px_rgb(0_0_0/0.35)]"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M8 22 V54 a5 5 0 0 0 10 0 V12 a8 8 0 0 0 -16 0 V58 a10 10 0 0 0 20 0 V26" />
    </svg>
  );
}

/** The record's seal: two rings in record ink around an eight-pointed star, pressed into the paper. */
function RecordSeal() {
  const star = Array.from({ length: 16 }, (_, index) => {
    const angle = (Math.PI * index) / 8 - Math.PI / 2;
    const radius = index % 2 === 0 ? 11 : 4.6;
    return `${(28 + radius * Math.cos(angle)).toFixed(2)},${(28 + radius * Math.sin(angle)).toFixed(2)}`;
  }).join(' ');
  return (
    <svg aria-hidden="true" viewBox="0 0 56 56" className="record-seal h-12 w-12 text-record sm:h-14 sm:w-14">
      <circle cx="28" cy="28" r="25.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="28" cy="28" r="21.5" fill="none" stroke="currentColor" strokeWidth="0.8" strokeDasharray="1.4 1.8" />
      <circle cx="28" cy="28" r="17" fill="currentColor" fillOpacity="0.1" stroke="currentColor" strokeWidth="0.8" />
      <polygon points={star} fill="currentColor" fillOpacity="0.75" />
    </svg>
  );
}

/** A question mark, drawn by hand in the margin: a hook and a dot. */
function QueryMark() {
  return (
    <svg
      data-file="query"
      aria-hidden="true"
      viewBox="0 0 16 26"
      className="query-mark absolute top-6 -left-[1.1rem] h-6 w-3.5 text-rust sm:-left-8 sm:h-7 sm:w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path pathLength={1} d="M3.2 7.5 C2.6 2.6, 12.8 1.4, 13.2 7.2 C13.5 11.4, 8.2 11.6, 7.9 17.2" />
      <path pathLength={1} d="M7.8 21.6 L8.1 22.4" />
    </svg>
  );
}

export default function FileDocument({ evidence, number, headingRef, revealed, children }: FileDocumentProps) {
  return (
    <div data-file="document" className="relative">
      <article
        data-file="sheet"
        data-status={evidence.status}
        data-revealed={revealed ? 'true' : undefined}
        aria-labelledby="file-title"
        // A disputed sheet keeps room at its foot, where the second sheet overlaps it.
        className={`relative z-[1] px-5 pt-8 text-ink shadow-xl shadow-black/40 sm:px-10 sm:pt-10 ${
          evidence.status === 'record' ? 'rounded-none' : 'rounded-[2px]'
        } ${evidence.status === 'disputed' ? 'pb-12 sm:pb-14' : 'pb-8'}`}
      >
        {/* The paper itself, under the text: plain at first; a legend's yellows into the aged sheet. */}
        <div aria-hidden="true" data-paper="plain" className="absolute inset-0 -z-10 rounded-[inherit] bg-paper" />
        {evidence.status === 'legend' && (
          <div aria-hidden="true" data-paper="aged" className="absolute inset-0 -z-10 rounded-[inherit]" />
        )}
        <PaperClip />

        <div className="flex items-start justify-between gap-4">
          {/* The nib that writes the title on a first opening is placed in this positioned box. */}
          <div className="relative">
            <p
              data-file="number"
              className="inline-block border-b border-transparent pb-1 font-voice text-[0.8125rem] tracking-[0.18em] text-ink/75 tabular-nums"
            >
              File {number}
            </p>
            <h2
              id="file-title"
              ref={headingRef}
              tabIndex={-1}
              className="mt-1 font-legend text-[clamp(2rem,1.5rem+2vw,3rem)] leading-[1.02] text-balance outline-none"
            >
              {evidence.title}
            </h2>
            <Nib attribute="data-file-nib" />
          </div>
          {/* The stamp, and for a record the seal pressed in just below it. */}
          <div className="flex shrink-0 flex-col items-end gap-1.5 pt-1">
            <div data-file="stamp">
              <Stamp label={STATUS_LABEL[evidence.status]} tone={evidence.status} size="lg" />
            </div>
            {evidence.status === 'record' && (
              <span data-file="seal" className="mr-3 inline-block">
                <RecordSeal />
              </span>
            )}
            {/* The app's word on the stamp, typed under it as it lands (a legend's is written at the foot instead). */}
            {evidence.status !== 'legend' && (
              <p data-file="stamp-note" className="max-w-[11rem] text-right font-voice text-[0.75rem] leading-snug text-ink/80">
                {STAMP_NOTE[evidence.status]}
              </p>
            )}
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 font-record text-[1.125rem] leading-[1.6]">
          {evidence.detail.map((paragraph, paragraphIndex) => (
            <p key={paragraphIndex} data-file-ink>
              <PortalText text={paragraph} />
            </p>
          ))}
        </div>

        {/* Legend: once the ink has drained, the pen writes the app's word at the foot of the page. */}
        {evidence.status === 'legend' && (
          <div className="relative mt-7 text-right">
            <p data-file="legend-pen" className="inline-block font-record text-[1.125rem] text-ink italic">
              {STAMP_NOTE.legend}
            </p>
            <Nib attribute="data-file-pen" />
          </div>
        )}

        {evidence.status === 'disputed' && (
          <section
            data-file="claim"
            aria-labelledby="file-claim"
            className="relative mt-7 grid gap-x-5 gap-y-2 sm:grid-cols-[1fr_8.5rem]"
          >
            <div className="relative">
              <QueryMark />
              <h3 id="file-claim" className="font-voice text-xs tracking-[0.18em] text-rust uppercase">
                The claim
              </h3>
              <p
                data-file="claim-line"
                data-text={evidence.dispute.claim}
                className="claim-underline relative mt-1.5 font-record text-[1.0625rem] leading-[1.75]"
              >
                {evidence.dispute.claim}
              </p>
            </div>
            {/* A note in the margin: the first full sentence of the challenge, read in full on sheet two. */}
            <p
              data-file="margin-note"
              aria-hidden="true"
              className="justify-self-end text-right font-voice text-[0.75rem] leading-snug text-rust sm:self-center sm:justify-self-start sm:text-left"
            >
              <span className="inline-block -rotate-2">{firstSentence(evidence.dispute.challenge)}</span>
            </p>
          </section>
        )}
      </article>

      {/* Disputed: the second sheet, laid askew over the foot of the first. The tilt is on the paper inside,
          so the slide in (on the wrapper) never resets it. */}
      {evidence.status === 'disputed' && (
        <div data-file="sheet-two" className="relative z-[2] -mt-5 ml-5 sm:-mt-6 sm:ml-12">
          <section
            aria-labelledby="file-challenge"
            className="rotate-[1.4deg] rounded-[2px] bg-paper px-5 pt-4 pb-5 text-ink shadow-lg shadow-black/40 sm:px-7"
          >
            <h3 id="file-challenge" className="font-voice text-xs tracking-[0.18em] text-record uppercase">
              The challenge
            </h3>
            <p data-file="challenge" className="mt-1.5 font-record text-[1.0625rem] leading-normal">
              {evidence.dispute.challenge}
            </p>
          </section>
        </div>
      )}

      {/* Legend: a typed slip that slides out from under the sheet. */}
      {evidence.status === 'legend' && (
        <div className="relative z-0 mx-4 sm:mx-8">
          <section
            data-file="slip"
            aria-labelledby="file-origin"
            className="rounded-b-[2px] bg-paper px-4 pt-3 pb-4 text-ink shadow-md shadow-black/35 sm:px-6"
          >
            <h3 id="file-origin" className="font-voice text-xs tracking-[0.18em] text-ink/75 uppercase">
              Where this came from
            </h3>
            <p className="mt-1.5 font-voice text-[1.0625rem] leading-normal">{evidence.origin}</p>
          </section>
        </div>
      )}

      {children}
    </div>
  );
}
