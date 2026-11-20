// src/lib/tab-fit.ts
// The desk never scrolls, so the files hanging under a theory note (or lying in the tray) must fit the room they
// have. They overlap more as they grow in number. This works out by how much. Pure.

/** The least a tab overlaps the one above it, in px: the gap the desk always has. */
export const MIN_TAB_OVERLAP = 6;
/** The most of a tab's height that may be hidden: its number and title always stay readable. */
export const MIN_TAB_VISIBLE = 16;

/**
 * How far each tab overlaps the one above it, in px, for `count` tabs of height `tabHeight` to fit `available`.
 * Never below `MIN_TAB_OVERLAP`, and never so much that less than `MIN_TAB_VISIBLE` of a tab shows.
 */
export function tabOverlap(count: number, tabHeight: number, available: number): number {
  if (count < 2 || tabHeight <= 0) {
    return MIN_TAB_OVERLAP;
  }
  const needed = (count * tabHeight - available) / (count - 1);
  const most = Math.max(MIN_TAB_OVERLAP, tabHeight - MIN_TAB_VISIBLE);
  return Math.min(most, Math.max(MIN_TAB_OVERLAP, needed));
}
