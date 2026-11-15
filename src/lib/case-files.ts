// src/lib/case-files.ts
// Small helpers the investigation screens share: file numbers, labels for statuses, standings and readings,
// and which file to open next. Nothing here is about any one case.

import type { HistoriansReading } from '@/lib/case-report';
import type { Case, EvidenceStatus, PinTarget, TheoryStanding } from '@/types/case';

/** The number on a folder, from its place in the case: 0 → "01". */
export function fileNumber(index: number): string {
  return String(index + 1).padStart(2, '0');
}

/** The stamp on a file. */
export const STATUS_LABEL: Record<EvidenceStatus, string> = {
  record: 'Record',
  disputed: 'Disputed',
  legend: 'Legend',
};

/** The stamp on a theory in the report. */
export const STANDING_LABEL: Record<TheoryStanding, string> = {
  leading: 'Leading',
  considered: 'Considered',
  rejected: 'Rejected',
};

/** How historians read a pin, in the app's voice. */
export const READING_LABEL: Record<HistoriansReading, string> = {
  agree: 'Historians agree',
  disagree: 'Historians disagree',
  'no-link': 'Historians see no link',
};

/** The label for "None of them" wherever a pin is shown. */
export const NO_THEORY = 'None of them';

/** The title of the theory a pin points to, or "None of them". */
export function pinTargetTitle(caseData: Case, target: PinTarget): string {
  if (target === 'none') {
    return NO_THEORY;
  }
  return caseData.theories.find(theory => theory.id === target)?.title ?? NO_THEORY;
}

/**
 * The next file to open: the first unopened one after `currentId` in case order, wrapping round to the start.
 * Null when every other file is open.
 */
export function nextUnopenedId(caseData: Case, opened: string[], currentId: string): string | null {
  const ids = caseData.evidence.map(evidence => evidence.id);
  const start = ids.indexOf(currentId);
  for (let step = 1; step <= ids.length; step += 1) {
    const id = ids[(start + step) % ids.length];
    if (id !== currentId && !opened.includes(id)) {
      return id;
    }
  }
  return null;
}
