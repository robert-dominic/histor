// src/test/legend-intro.ts
// Test helper: gets past the legend intro the way a visitor would.

import { fireEvent, screen } from '@testing-library/react';

/** Presses Skip, which shows the end of the intro and the story below it, then the scroll cue. */
export function finishLegendIntro(): void {
  fireEvent.click(screen.getByRole('button', { name: 'Skip' }));
  fireEvent.click(screen.getByRole('button', { name: 'See what really happened' }));
}
