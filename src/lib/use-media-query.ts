// src/lib/use-media-query.ts
// Tells a component whether a media query matches, for choosing what to render
// (for example a bottom sheet on a phone and an anchored card on a desktop).

import { useCallback, useSyncExternalStore } from 'react';

/** The width from which the desktop layout applies. The same value as Tailwind's `lg`. */
export const DESKTOP_QUERY = '(min-width: 1024px)';

/** Small phones: below Tailwind's `sm` (640px). */
export const SMALL_PHONE_QUERY = '(max-width: 639.98px)';

export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
        return () => {};
      }
      const list = window.matchMedia(query);
      list.addEventListener('change', onChange);
      return () => list.removeEventListener('change', onChange);
    },
    [query]
  );

  const getSnapshot = useCallback(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return false;
    }
    return window.matchMedia(query).matches;
  }, [query]);

  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
