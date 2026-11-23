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
