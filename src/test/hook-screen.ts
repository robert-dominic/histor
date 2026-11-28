// src/test/hook-screen.ts
// Test helper: gets past the hook screen the way a visitor would.

import { act, fireEvent, screen } from '@testing-library/react';
import gsap from 'gsap';

/** Presses Skip, then lets the dissolve finish: the story is up and the play choice has opened. */
export function finishHook(): void {
  fireEvent.click(screen.getByRole('button', { name: 'Skip' }));
  act(() => {
    gsap.globalTimeline.getChildren(true, true, true).forEach(child => child.progress(1));
  });
}
