// @vitest-environment jsdom
// src/features/dread/__tests__/GhostLines.test.tsx
// Ghost text from the floor (dread pass, 3): a phrase from a file's own detail, every 4 to 8 seconds, at most two at
// once, from any file (opened or sealed), never while a file is open; the murmur told how many are on screen; none
// under reduced motion.
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import maryCeleste from '@/cases/mary-celeste/case';
import GhostLines from '@/features/dread/GhostLines';
import { GHOST, ghostPhrase } from '@/lib/ghost-lines';
import { onStoryEvent, type StoryEvent } from '@/lib/story-events';
import { stubMatchMedia } from '@/test/match-media';

const files = maryCeleste.evidence.slice(0, 3);

function renderFloor(paused = false) {
  return render(
    <div data-floor-test="">
      {files.map(file => (
        <div key={file.id} data-board="folder" data-evidence-id={file.id} data-opened={file === files[0]} />
      ))}
      <GhostLines evidence={files} paused={paused} />
    </div>
  );
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('the phrase', () => {
  test('a clause of the file\'s own detail, 3 to 8 words, markup read as its label', () => {
    const phrase = ghostPhrase(['The {{ref:briggs|captain}} kept a careful log, every day, until the last entry on the 25th of November.'], () => 0.99)!;
    const words = phrase.split(' ');
    expect(words.length).toBeGreaterThanOrEqual(GHOST.words[0]);
    expect(words.length).toBeLessThanOrEqual(GHOST.words[1]);
    expect(phrase).not.toContain('{{');
    expect(ghostPhrase(['Too short.'])).toBeNull();
    for (const file of maryCeleste.evidence) {
      const line = ghostPhrase(file.detail);
      if (line !== null) {
        expect(file.detail.join(' ').replace(/\{\{ref:[^|]+\|([^}]+)\}\}/g, '$1')).toContain(line);
      }
    }
  });
});

describe('the rhythm', () => {
  test('a new line every 4 to 8 seconds, at most two at once; the murmur hears how many', () => {
    stubMatchMedia();
    const heard: number[] = [];
    const stop = onStoryEvent((event: StoryEvent) => event.type === 'ghosts' && heard.push(event.count));
    const { container } = renderFloor();
    act(() => {
      vi.advanceTimersByTime(GHOST.everyMs[0] - 100);
    });
    expect(container.querySelectorAll('[data-ghost-line]')).toHaveLength(0);
    act(() => {
      vi.advanceTimersByTime(GHOST.everyMs[1] * 3);
    });
    const count = container.querySelectorAll('[data-ghost-line]').length;
    expect(count).toBeGreaterThan(0);
    expect(count).toBeLessThanOrEqual(GHOST.max);
    expect(heard.at(-1)).toBe(count);
    expect(container.querySelector('[data-ghosts]')!.getAttribute('aria-hidden')).toBe('true');
    stop();
  });

  test('none while a file is open, and none under reduced motion', () => {
    stubMatchMedia();
    const open = renderFloor(true);
    act(() => {
      vi.advanceTimersByTime(GHOST.everyMs[1] * 4);
    });
    expect(open.container.querySelectorAll('[data-ghost-line]')).toHaveLength(0);
    open.unmount();
    vi.unstubAllGlobals();
    stubMatchMedia({ reducedMotion: true });
    const reduced = renderFloor();
    act(() => {
      vi.advanceTimersByTime(GHOST.everyMs[1] * 4);
    });
    expect(reduced.container.querySelectorAll('[data-ghost-line]')).toHaveLength(0);
  });
});
