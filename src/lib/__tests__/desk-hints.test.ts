// @vitest-environment jsdom
// src/lib/__tests__/desk-hints.test.ts
// Task 3 of .kiro/specs/desk: the first-visit hints flag, and the desk events.
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { hasSeenDeskHints, markDeskHintsSeen } from '@/lib/desk-hints';
import { emitStoryEvent, onStoryEvent } from '@/lib/story-events';

beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());

describe('desk hints flag', () => {
  test('not seen at first; seen once marked; per case', () => {
    expect(hasSeenDeskHints('case-a')).toBe(false);
    markDeskHintsSeen('case-a');
    expect(hasSeenDeskHints('case-a')).toBe(true);
    expect(hasSeenDeskHints('case-b')).toBe(false);
    expect(localStorage.getItem('histor:desk-hints:case-a')).toBe('1');
  });

  test('never throws when storage is unavailable', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    expect(hasSeenDeskHints('case-a')).toBe(false);
    expect(() => markDeskHintsSeen('case-a')).not.toThrow();
  });
});

describe('desk events', () => {
  test('travel through the same module as the story', () => {
    const heard = vi.fn();
    const stop = onStoryEvent(heard);
    emitStoryEvent({ type: 'pin', evidence: 'e-one', target: 'none' });
    emitStoryEvent({ type: 'seal', where: 'desk' });
    stop();
    expect(heard.mock.calls.map(([event]) => event.type)).toEqual(['pin', 'seal']);
  });
});
