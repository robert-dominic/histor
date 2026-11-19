// src/features/board/FileDocument.tsx
// The document inside a folder: a sheet of paper held by a paper clip, with the file's number, its title, its
// status stamp and its detail (through PortalText, so the references in it open portals). A disputed file
// adds the claim and the challenge; a legend adds where it came from. Whatever follows the paper's text
// (the question, the links) is passed in as children.
// The open file animates it from outside, by its data-file attributes.

import type { ReactNode, Ref } from 'react';
import Stamp from '@/components/Stamp';
import PortalText from '@/features/portals/PortalText';
import { STATUS_LABEL } from '@/lib/case-files';
import type { Evidence } from '@/types/case';

interface FileDocumentProps {
  evidence: Evidence;
  /** e.g. "07". */
  number: string;
  headingRef: Ref<HTMLHeadingElement>;
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

export default function FileDocument({ evidence, number, headingRef, children }: FileDocumentProps) {
  const isLegend = evidence.status === 'legend';

  return (
    <article
      data-file="sheet"
      data-status={evidence.status}
      aria-labelledby="file-title"
      className={`relative rounded-[2px] px-5 pt-8 pb-8 text-ink shadow-2xl shadow-black/60 sm:px-10 sm:pt-10 ${
        isLegend ? 'bg-paper/90' : 'bg-paper'
      }`}
    >
      <PaperClip />

      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-voice text-[0.8125rem] tracking-[0.18em] text-ink/75 tabular-nums">File {number}</p>
          <h2
            id="file-title"
            ref={headingRef}
            tabIndex={-1}
            className="mt-1 font-legend text-[clamp(2rem,1.5rem+2vw,3rem)] leading-[1.02] text-balance outline-none"
          >
            {evidence.title}
          </h2>
        </div>
        <div data-file="stamp" className="shrink-0 pt-2">
          <Stamp label={STATUS_LABEL[evidence.status]} tone={evidence.status} size="lg" />
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-3 font-record text-[1.125rem] leading-[1.6]">
        {evidence.detail.map((paragraph, paragraphIndex) => (
          <p key={paragraphIndex} data-file-ink>
            <PortalText text={paragraph} />
          </p>
        ))}
      </div>

      {evidence.status === 'disputed' && (
        <div data-file="after" className="mt-6 grid gap-4 xl:grid-cols-2">
          <section className="border-l-2 border-rust/60 pl-4">
            <h3 className="font-voice text-xs tracking-[0.18em] text-rust uppercase">The claim</h3>
            <p className="mt-1.5 font-record text-[1.0625rem] leading-normal">{evidence.dispute.claim}</p>
          </section>
          <section className="border-l-2 border-record/60 pl-4">
            <h3 className="font-voice text-xs tracking-[0.18em] text-record uppercase">The challenge</h3>
            <p className="mt-1.5 font-record text-[1.0625rem] leading-normal">{evidence.dispute.challenge}</p>
          </section>
        </div>
      )}

      {evidence.status === 'legend' && (
        <section data-file="after" className="mt-6 border-t border-ink/15 pt-4">
          <h3 className="font-voice text-xs tracking-[0.18em] text-ink/75 uppercase">Where it came from</h3>
          <p className="mt-1.5 font-record text-[1.0625rem] leading-normal">{evidence.origin}</p>
        </section>
      )}

      {children}
    </article>
  );
}
