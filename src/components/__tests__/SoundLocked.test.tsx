// @vitest-environment jsdom
// src/components/__tests__/SoundLocked.test.tsx
// Sound after a reload (the fix list): while the sound is on but locked (a saved choice, so no play modal), the
// header's sound icon gently pulses with a small "Click anywhere for sound"; the first click or key anywhere unlocks
// it, and the pulse and the hint stop.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import SoundControls from '@/components/SoundControls';
import { startSound } from '@/lib/sound';
import { SoundEngine } from '@/lib/sound/engine';
import { SOUND_HINT } from '@/lib/sound-hint';
import { fakeContextMaker } from '@/test/fake-audio';
import { stubMatchMedia } from '@/test/match-media';

const effects = readFileSync(resolve(__dirname, '../../styles/effects.css'), 'utf8');
const toggle = () => document.querySelector<HTMLElement>('[data-sound="toggle"]')!;
const hint = () => document.querySelector<HTMLElement>('[data-sound="hint"]')!;

beforeEach(() => localStorage.clear());
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  localStorage.clear();
});

describe('the sound waiting for a gesture', () => {
  test.each([
    ['a click', () => document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }))],
    ['a key', () => document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true }))],
  ])('pulses with its hint until %s anywhere unlocks it', (_, gesture) => {
    stubMatchMedia({ reducedMotion: false });
    const engine = new SoundEngine({ createContext: fakeContextMaker().create });
    const stop = startSound(engine);
    render(<SoundControls engine={engine} />);
    expect(toggle().dataset.locked).toBe('true');
    expect(hint().dataset.shown).toBe('true');
    expect(hint().textContent).toBe(SOUND_HINT);
    act(() => {
      gesture();
    });
    expect(engine.running).toBe(true);
    expect(toggle().dataset.locked).toBe('false');
    expect(hint().dataset.shown).toBe('false');
    stop();
  });

  test('not while the play modal is up (its choice unlocks it), with the sound off, or under reduced motion', () => {
    stubMatchMedia({ reducedMotion: false });
    const engine = new SoundEngine({ createContext: fakeContextMaker().create });
    const { unmount } = render(<SoundControls engine={engine} hint={false} />);
    expect(hint().dataset.shown).toBe('false');
    unmount();
    engine.setOn('effects', false);
    const off = render(<SoundControls engine={engine} />);
    expect(toggle().dataset.locked).toBe('false');
    off.unmount();
    engine.setOn('effects', true);
    vi.unstubAllGlobals();
    stubMatchMedia({ reducedMotion: true });
    render(<SoundControls engine={engine} />);
    expect(hint().dataset.shown).toBe('false');
  });

  test('the pulse is gentle constant motion: opacity and scale, on the icon only', () => {
    const rules = effects.slice(effects.indexOf('/* ---- The sound waiting for a gesture'));
    expect(rules).toContain('.sound-locked[data-locked="true"] svg');
    expect(rules).toMatch(/opacity: 0\.45;\s*scale: 1\.12;/);
  });
});
