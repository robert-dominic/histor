// src/lib/use-tab-fit.ts
// Writes `--tab-overlap` (px) on an element so that the tabs under it fit the room they have. Measured once per
// layout change (a resize, or a change in the number of tabs), written straight to the element, never to state.
import { useLayoutEffect, type RefObject } from 'react';
import { MIN_TAB_OVERLAP, tabOverlap } from '@/lib/tab-fit';

/**
 * @param ref - the element that gets the variable
 * @param measure - for that element, the tab lists to fit: how many tabs, their height, and the room they have
 * @param signature - changes when the number of tabs changes, so the room is measured again
 */
export function useTabFit(
  ref: RefObject<HTMLElement | null>,
  measure: (element: HTMLElement) => { count: number; tabHeight: number; available: number }[],
  signature: string
): void {
  useLayoutEffect(() => {
    const element = ref.current;
    if (element === null) {
      return;
    }
    const fit = () => {
      const overlap = Math.max(
        MIN_TAB_OVERLAP,
        ...measure(element).map(({ count, tabHeight, available }) => tabOverlap(count, tabHeight, available))
      );
      element.style.setProperty('--tab-overlap', `${overlap}px`);
    };
    fit();
    if (typeof ResizeObserver !== 'function') {
      return;
    }
    const observer = new ResizeObserver(fit);
    observer.observe(element);
    return () => observer.disconnect();
    // `measure` is a stable description of where to look; the signature says when the contents change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref, signature]);
}
