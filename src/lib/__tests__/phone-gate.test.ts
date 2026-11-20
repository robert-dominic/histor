// @vitest-environment jsdom
// src/lib/__tests__/phone-gate.test.ts
import { afterEach, describe, expect, test, vi } from 'vitest';
import { continuePastGate, hasContinuedPastGate, resetPhoneGate } from '@/lib/phone-gate';

afterEach(() => {
  resetPhoneGate();
  vi.unstubAllGlobals();
});

describe('phone gate memory', () => {
  test('starts as not continued', () => {
    expect(hasContinuedPastGate()).toBe(false);
  });

  test('round trip: continuing is remembered, in the session key', () => {
    continuePastGate();
    expect(hasContinuedPastGate()).toBe(true);
    expect(sessionStorage.getItem('histor:phone-gate')).toBe('1');
  });

  test('is read from storage, so a reload in the same session still continues', () => {
    sessionStorage.setItem('histor:phone-gate', '1');
    expect(hasContinuedPastGate()).toBe(true);
  });

  test('when storage throws, the choice is kept in memory and nothing throws', () => {
    const broken = {
      getItem: () => {
        throw new Error('no storage');
      },
      setItem: () => {
        throw new Error('no storage');
      },
      removeItem: () => {
        throw new Error('no storage');
      },
    };
    vi.stubGlobal('sessionStorage', broken);
    expect(hasContinuedPastGate()).toBe(false);
    expect(() => continuePastGate()).not.toThrow();
    expect(hasContinuedPastGate()).toBe(true);
    expect(() => resetPhoneGate()).not.toThrow();
    expect(hasContinuedPastGate()).toBe(false);
  });
});
