// src/lib/ui-copy.ts
// The app's own voice (product.md, "Voice"): lines the app says in every case, so they are shared UI copy, never
// case data. Short, dry, a little mischievous.
import type { EvidenceStatus } from '@/types/case';

/**
 * What the app says when a file's stamp lands on its first opening (investigation brief, item 1). Record and
 * Disputed are typed under the stamp; Legend is written by the pen at the foot of the page.
 */
export const STAMP_NOTE: Record<EvidenceStatus, string> = {
  record: 'Written down at the time.',
  disputed: 'Historians argue over this one.',
  legend: 'You almost believed this.',
};

/** The verdict's reveal (investigation brief, 3.1). */
export const REVEAL_COPY = {
  /** Typed before the leading theories are written in. */
  lead: 'Most historians lean toward…',
  /** When the case's theories have no leading one. */
  noLeading: 'Historians lean toward no single theory.',
  /** The player's theory is a leading one. */
  withHistorians: 'You stand with the historians.',
  /** The player's theory was ruled out; its standing reason follows. */
  ruledOut: 'Historians ruled this one out:',
  /** The player's theory is neither: considered, not leading. Its standing reason follows. */
  considered: 'Historians keep this one on the table, but few lean toward it:',
} as const;

/** The rank card under the reveal (3.2): a name and one line of the app's voice per rank. */
export const RANK_COPY = {
  historian: { name: 'Historian', line: 'You kept to the record. Not one story got past you.' },
  investigator: { name: 'Investigator', line: 'Good instincts, and a loose thread or two.' },
  deckhand: { name: 'Deckhand', line: 'You trusted the stories. The sea keeps its secrets.' },
} as const;
