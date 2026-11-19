// src/components/Stamp.tsx
// An ink stamp on paper: a file's status (Record, Disputed, Legend) or a theory's standing in the report.
// The look encodes trust (design.md): record is crisp official ink, disputed lands smudged, legend is ghost ink.
// It is drawn for paper backgrounds. Callers animate it from outside by its `data-stamp` attribute.

import type { EvidenceStatus, TheoryStanding } from '@/types/case';

export type StampTone = EvidenceStatus | TheoryStanding;

const TONE_CLASSES: Record<StampTone, string> = {
  record: 'border-record text-record',
  disputed: 'stamp-smudged border-rust text-rust',
  // Faint border, readable lettering: ghost-ink reaches 4.5:1 on paper.
  legend: 'border-ghost-day text-ghost-ink',
  leading: 'border-record text-record',
  considered: 'border-muted text-muted',
  rejected: 'border-rust text-rust',
};

const SIZE_CLASSES = {
  sm: 'border-[0.12em] px-[0.5em] pt-[0.4em] pb-[0.25em] text-[0.625rem] tracking-[0.16em]',
  lg: 'border-[0.14em] px-[0.6em] pt-[0.42em] pb-[0.28em] text-[clamp(1rem,0.8rem+1vw,1.5rem)] tracking-[0.14em]',
} as const;

interface StampProps {
  label: string;
  tone: StampTone;
  size?: keyof typeof SIZE_CLASSES;
  className?: string;
}

export default function Stamp({ label, tone, size = 'sm', className = '' }: StampProps) {
  return (
    <span
      data-stamp={tone}
      className={`inline-block -rotate-3 rounded-[0.14em] font-voice leading-none uppercase ${SIZE_CLASSES[size]} ${TONE_CLASSES[tone]} ${className}`}
    >
      {label}
    </span>
  );
}
