// @vitest-environment jsdom
// src/lib/sound/__tests__/ui-sounds.test.tsx
// The interface's sounds (music brief, 4): the table's rows, the one click listener (never twice where a component
// has a sound of its own), the guide's and the modals' moments, and the dev page that plays every sound.
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import DeskGuide from '@/features/board/DeskGuide';
import PlayChoice from '@/features/story/PlayChoice';
import { startSound, sound } from '@/lib/sound';
import { SoundEngine } from '@/lib/sound/engine';
import { SAMPLES } from '@/lib/sound/levels';
import { freshMemory, soundFor, type SoundRow } from '@/lib/sound/sound-map';
import { SAMPLE_NAMES } from '@/lib/sound/samples';
import { onStoryEvent, type StoryEvent } from '@/lib/story-events';
import DevSound from '@/pages/DevSound';
import { stubMatchMedia } from '@/test/match-media';

const sounds = (row: SoundRow | null) => row?.cues?.map(cue => cue.sound) ?? [];
function listen() {
  const events: StoryEvent[] = [];
  const stop = onStoryEvent(event => events.push(event));
  return { events, stop, types: () => events.map(event => event.type) };
}

beforeEach(() => {
  localStorage.clear();
  stubMatchMedia({ reducedMotion: true });
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('the interface\'s rows', () => {
  test('a button or link, and a toggle: the click (sound-files 2)', () => {
    expect(sounds(soundFor({ type: 'ui-click' }, freshMemory()))).toEqual(['click']);
    expect(sounds(soundFor({ type: 'ui-toggle' }, freshMemory()))).toEqual(['click']);
  });

  test('the ? guide and the modals: the modal sound, opening and closing', () => {
    const open = soundFor({ type: 'guide', open: true }, freshMemory())!.cues![0];
    const close = soundFor({ type: 'guide', open: false }, freshMemory())!.cues![0];
    expect([open.sound, close.sound]).toEqual(['modal', 'modal']);
    expect(sounds(soundFor({ type: 'modal', name: 'play-choice', open: true }, freshMemory()))).toEqual(['modal']);
    expect(sounds(soundFor({ type: 'modal', name: 'play-choice', open: false }, freshMemory()))).toEqual(['modal']);
  });

  test('hovering is silent now: hover sounds are cut (sound-files 3)', () => {
    expect(soundFor({ type: 'file-hover' }, freshMemory(), 1000)).toBeNull();
    expect(soundFor({ type: 'pile-hover' }, freshMemory(), 1000)).toBeNull();
  });
});

describe('one click listener', () => {
  test('a button or link ticks; a switch, a checkbox or a pressed button clicks; a marked, disabled or plain element is silent', () => {
    const stopSound = startSound(new SoundEngine({ createContext: () => null }));
    const { types, stop } = listen();
    render(
      <div>
        <button type="button">Plain</button>
        <a href="/x">Link</a>
        <button type="button" role="switch" aria-checked="true">
          Switch
        </button>
        <button type="button" aria-pressed="true">
          Pressed
        </button>
        <div data-ui-sound="off">
          <button type="button">Own sound</button>
        </div>
        <button type="button" disabled>
          Disabled
        </button>
        <p>Text</p>
      </div>
    );
    const click = (name: string) => fireEvent.click(screen.getByText(name));
    ['Plain', 'Link', 'Switch', 'Pressed', 'Own sound', 'Disabled', 'Text'].forEach(click);
    expect(types()).toEqual(['ui-click', 'ui-click', 'ui-toggle', 'ui-toggle']);
    stop();
    stopSound();
  });
});

describe('the moments the interface sends', () => {
  test('the ? guide: opened and closed (its buttons have no tick of their own)', () => {
    const { events, stop } = listen();
    render(<DeskGuide caseId="test" threshold={3} startOpen={false} onShown={() => undefined} />);
    const opener = screen.getByRole('button', { name: 'How the desk works' });
    expect(opener.dataset.uiSound).toBe('off');
    fireEvent.click(opener);
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    stop();
    expect(events.filter(event => event.type === 'guide')).toEqual([
      { type: 'guide', open: true },
      { type: 'guide', open: false },
    ]);
  });

  test('the play choice: a modal opening, then closing as the reader chooses', () => {
    const { events, stop } = listen();
    render(<PlayChoice title="Test Case" onChoose={() => undefined} />);
    fireEvent.click(screen.getByRole('button', { name: 'Read at my pace' }));
    stop();
    expect(events.filter(event => event.type === 'modal')).toEqual([
      { type: 'modal', name: 'play-choice', open: true },
      { type: 'modal', name: 'play-choice', open: false },
    ]);
    sound.setOn('music', true);
    sound.setOn('effects', true);
  });
});

describe('/dev/sound', () => {
  test('every sound file has a button that plays it, with its level from the tune table (sound-files 4)', () => {
    render(<DevSound />);
    for (const name of SAMPLE_NAMES) {
      const button = document.querySelector(`[data-dev-sound="${name}"]`);
      expect(button, name).not.toBeNull();
      expect(button!.querySelector('[data-dev-level]')!.textContent).toContain(String(SAMPLES[name].level));
    }
  });
});
