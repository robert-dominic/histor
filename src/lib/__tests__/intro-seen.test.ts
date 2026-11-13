// src/lib/__tests__/intro-seen.test.ts
// Remembering that a case's legend intro has been seen, with localStorage mocked.
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { hasSeenIntro, markIntroSeen } from '@/lib/intro-seen';

let items: Map<string, string>;

beforeEach(() => {
  items = new Map();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => {
      items.set(key, value);
    },
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('intro-seen', () => {
  test('a case that was never marked has not been seen', () => {
    expect(hasSeenIntro('case-a')).toBe(false);
  });

  test('markIntroSeen stores "1" under "histor:intro-seen:<caseId>"', () => {
    markIntroSeen('case-a');

    expect([...items.entries()]).toEqual([['histor:intro-seen:case-a', '1']]);
  });

  test('a marked case has been seen', () => {
    markIntroSeen('case-a');

    expect(hasSeenIntro('case-a')).toBe(true);
  });

  test('each case is remembered separately', () => {
    markIntroSeen('case-a');

    expect(hasSeenIntro('case-b')).toBe(false);
  });

  test('any other stored value does not count as seen', () => {
    items.set('histor:intro-seen:case-a', 'true');

    expect(hasSeenIntro('case-a')).toBe(false);
  });

  test('does not touch the investigation saved for the same case', () => {
    items.set('histor:case:case-a', '{"opened":[],"pins":{},"verdict":null}');

    markIntroSeen('case-a');

    expect(items.get('histor:case:case-a')).toBe('{"opened":[],"pins":{},"verdict":null}');
  });

  test('hasSeenIntro returns false and does not throw when localStorage is unavailable', () => {
    vi.stubGlobal('localStorage', undefined);

    expect(() => hasSeenIntro('case-a')).not.toThrow();
    expect(hasSeenIntro('case-a')).toBe(false);
  });

  test('hasSeenIntro returns false when reading throws', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('SecurityError');
      },
    });

    expect(hasSeenIntro('case-a')).toBe(false);
  });

  test('markIntroSeen does not throw when writing fails or localStorage is unavailable', () => {
    vi.stubGlobal('localStorage', {
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
    });
    expect(() => markIntroSeen('case-a')).not.toThrow();

    vi.stubGlobal('localStorage', undefined);
    expect(() => markIntroSeen('case-a')).not.toThrow();
  });
});
