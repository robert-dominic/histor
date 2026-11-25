// src/features/landing/start-index.ts
// The case the landing page's address names (landing v2 brief, 2).
import { exhibits } from '@/cases';

/** The case an address names (`#mary-celeste`), or 0. */
export function startIndexOf(hash: string): number {
  let id = hash.replace(/^#/, '');
  try {
    id = decodeURIComponent(id);
  } catch {
    // Keep it as it is.
  }
  return Math.max(
    exhibits.findIndex(exhibit => exhibit.id === id),
    0
  );
}
