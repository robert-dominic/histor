// src/test/match-media.ts
// jsdom has no window.matchMedia. Tests that render animated components install this stand-in.

import { vi } from 'vitest';

/**
 * Installs a fake window.matchMedia.
 * @param reducedMotion - true to act like a visitor who asked for reduced motion
 * @param desktop - true to act like a screen 1024px wide or more (the investigation's desktop layout)
 */
export function stubMatchMedia({
  reducedMotion = false,
  desktop = false,
}: { reducedMotion?: boolean; desktop?: boolean } = {}): void {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => {
      const asksForReduced = query.includes('prefers-reduced-motion: reduce');
      const asksForFull = query.includes('prefers-reduced-motion: no-preference');
      return {
        matches: asksForReduced
          ? reducedMotion
          : asksForFull
            ? !reducedMotion
            : query.includes('min-width: 1024px')
              ? desktop
              : false,
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(() => false),
      };
    })
  );
}
