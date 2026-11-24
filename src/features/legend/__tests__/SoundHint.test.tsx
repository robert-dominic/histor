// @vitest-environment jsdom
// src/features/legend/__tests__/SoundHint.test.tsx
// Music from the first screen (review-fixes brief, 6): until the sound is unlocked, the legend intro shows a quiet
// "🔊 Click anywhere for sound" at its foot; the first click or key anywhere unlocks it, and the hint fades.
import { act, cleanup, render, screen } from '@testing-library/react';
import gsap from 'gsap';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import SoundHint, { SOUND_HINT } from '@/features/legend/SoundHint';
import { startSound } from '@/lib/sound';
import { SoundEngine } from '@/lib/sound/engine';
import { fakeContextMaker } from '@/test/fake-audio';
import { stubMatchMedia } from '@/test/match-media';

beforeEach(() => localStorage.clear());
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('the sound hint', () => {
  test('shows until the first click anywhere unlocks the sound, then fades', () => {
    stubMatchMedia({ reducedMotion: false });
    const engine = new SoundEngine({ createContext: fakeContextMaker().create });
    const stop = startSound(engine);
    render(<SoundHint engine={engine} />);
    const hint = screen.getByText(SOUND_HINT).closest('p')!;
    expect(hint.textContent).toContain('🔊');
    act(() => {
      document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(engine.running).toBe(true);
    const fade = gsap.getTweensOf(hint).find(tween => tween.vars.opacity === 0);
    expect(fade).toBeDefined();
    act(() => {
      fade!.progress(1);
    });
    expect(hint.style.visibility).toBe('hidden');
    stop();
  });

  test('not shown when there is nothing to unlock: both channels off, or the sound already running', () => {
    stubMatchMedia({ reducedMotion: false });
    const off = new SoundEngine({ createContext: fakeContextMaker().create });
    off.setOn('music', false);
    off.setOn('effects', false);
    const { unmount } = render(<SoundHint engine={off} />);
    expect(screen.queryByText(SOUND_HINT)).toBeNull();
    unmount();
    localStorage.clear();
    const running = new SoundEngine({ createContext: fakeContextMaker().create });
    running.unlock();
    render(<SoundHint engine={running} />);
    expect(screen.queryByText(SOUND_HINT)).toBeNull();
  });
});
