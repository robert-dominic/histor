// src/lib/__tests__/storage.test.ts
// Task 5.2: unit tests for the storage functions, with localStorage mocked.
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { loadInvestigationState, saveInvestigationState } from '@/lib/storage';
import type { Case, InvestigationState } from '@/types/case';

const CASE_ID = 'test-case';
const STORAGE_KEY = `histor:case:${CASE_ID}`;
const DEFAULT_STATE: InvestigationState = { opened: [], pins: {}, verdict: null };

/** A small valid case. The content is test data, not history. */
const testCase: Case = {
  id: CASE_ID,
  title: 'Test case',
  year: 1900,
  teaser: 'Test teaser',
  legendIntro: { lines: ['Test line'], stamp: 'Test stamp', debunk: 'Test debunk' },
  story: [{ id: 's-one', heading: 'Test heading', body: ['Test paragraph'] }],
  centralQuestion: 'Test question?',
  fork: { prompt: 'Test prompt', investigateLabel: 'Investigate', leaveLabel: 'Leave' },
  theories: [
    { id: 't-one', title: 'Theory one', claim: 'Claim one', standing: 'leading', standingReason: 'Reason one' },
    { id: 't-two', title: 'Theory two', claim: 'Claim two', standing: 'rejected', standingReason: 'Reason two' },
  ],
  evidence: [
    {
      id: 'e-one',
      title: 'Evidence one',
      detail: ['Detail one'],
      sources: ['src-one'],
      reading: { supports: ['t-one'], weakens: [], note: 'Note one' },
      status: 'record',
    },
    {
      id: 'e-two',
      title: 'Evidence two',
      detail: ['Detail two'],
      sources: ['src-one'],
      reading: { supports: [], weakens: ['t-two'], note: 'Note two' },
      status: 'record',
    },
    {
      id: 'e-three',
      title: 'Evidence three',
      detail: ['Detail three'],
      sources: ['src-one'],
      reading: { supports: [], weakens: [], note: 'Note three' },
      status: 'record',
    },
  ],
  sources: [{ id: 'src-one', title: 'Source one', kind: 'official', citation: 'Test citation' }],
  references: [],
  historiansSummary: ['Test summary'],
  closeThreshold: 2,
  theme: { id: 'test-theme' },
};

/** An in-memory stand-in for window.localStorage. */
function createFakeStorage() {
  const items = new Map<string, string>();
  return {
    items,
    getItem: vi.fn((key: string) => items.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      items.set(key, value);
    }),
    removeItem: vi.fn((key: string) => {
      items.delete(key);
    }),
    clear: vi.fn(() => {
      items.clear();
    }),
  };
}

let fakeStorage: ReturnType<typeof createFakeStorage>;

beforeEach(() => {
  fakeStorage = createFakeStorage();
  vi.stubGlobal('localStorage', fakeStorage);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('saveInvestigationState', () => {
  test('writes the state as JSON under the key "histor:case:<caseId>"', () => {
    const state: InvestigationState = { opened: ['e-one'], pins: { 'e-one': 't-one' }, verdict: null };

    saveInvestigationState(CASE_ID, state);

    expect(fakeStorage.setItem).toHaveBeenCalledTimes(1);
    expect(fakeStorage.setItem).toHaveBeenCalledWith(STORAGE_KEY, JSON.stringify(state));
  });

  test('uses a separate key for each case', () => {
    saveInvestigationState('case-a', { opened: ['e-one'], pins: {}, verdict: null });
    saveInvestigationState('case-b', { opened: ['e-two'], pins: {}, verdict: null });

    expect([...fakeStorage.items.keys()]).toEqual(['histor:case:case-a', 'histor:case:case-b']);
  });

  test('does not throw when setItem fails (for example, quota exceeded)', () => {
    fakeStorage.setItem.mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });

    expect(() => saveInvestigationState(CASE_ID, DEFAULT_STATE)).not.toThrow();
  });

  test('does not throw when localStorage is unavailable', () => {
    vi.stubGlobal('localStorage', undefined);

    expect(() => saveInvestigationState(CASE_ID, DEFAULT_STATE)).not.toThrow();
  });
});

describe('loadInvestigationState', () => {
  test('save then load returns the same state (round trip)', () => {
    const state: InvestigationState = {
      opened: ['e-two', 'e-one', 'e-three'],
      pins: { 'e-two': 't-two', 'e-one': 'none' },
      verdict: 't-one',
    };

    saveInvestigationState(CASE_ID, state);
    const loaded = loadInvestigationState(CASE_ID, testCase);

    expect(loaded).toEqual(state);
    expect(fakeStorage.getItem).toHaveBeenCalledWith(STORAGE_KEY);
  });

  test('round trip keeps the order in which evidence was opened', () => {
    const state: InvestigationState = { opened: ['e-three', 'e-one', 'e-two'], pins: {}, verdict: null };

    saveInvestigationState(CASE_ID, state);

    expect(loadInvestigationState(CASE_ID, testCase).opened).toEqual(['e-three', 'e-one', 'e-two']);
  });

  test('does not read the state saved for another case', () => {
    saveInvestigationState('other-case', { opened: ['e-one'], pins: {}, verdict: null });

    expect(loadInvestigationState(CASE_ID, testCase)).toEqual(DEFAULT_STATE);
  });

  test('returns the default state when the key does not exist', () => {
    expect(loadInvestigationState(CASE_ID, testCase)).toEqual(DEFAULT_STATE);
  });

  test.each([
    ['plain text', 'not json'],
    ['truncated JSON', '{"opened":["e-one"],'],
    ['an empty string', ''],
  ])('returns the default state when the stored value is invalid JSON: %s', (_label, raw) => {
    fakeStorage.items.set(STORAGE_KEY, raw);

    expect(() => loadInvestigationState(CASE_ID, testCase)).not.toThrow();
    expect(loadInvestigationState(CASE_ID, testCase)).toEqual(DEFAULT_STATE);
  });

  test.each([
    ['null', 'null'],
    ['a number', '42'],
    ['a string', '"hello"'],
    ['an array', '[]'],
    ['an empty object', '{}'],
    ['missing opened', '{"pins":{},"verdict":null}'],
    ['missing pins', '{"opened":[],"verdict":null}'],
    ['missing verdict', '{"opened":[],"pins":{}}'],
    ['opened is not an array', '{"opened":"e-one","pins":{},"verdict":null}'],
    ['pins is null', '{"opened":[],"pins":null,"verdict":null}'],
    ['pins is an array', '{"opened":[],"pins":[],"verdict":null}'],
    ['verdict is a number', '{"opened":[],"pins":{},"verdict":7}'],
  ])('returns the default state when required fields are missing or wrong: %s', (_label, raw) => {
    fakeStorage.items.set(STORAGE_KEY, raw);

    expect(loadInvestigationState(CASE_ID, testCase)).toEqual(DEFAULT_STATE);
  });

  test('returns the default state when localStorage is unavailable', () => {
    vi.stubGlobal('localStorage', undefined);

    expect(() => loadInvestigationState(CASE_ID, testCase)).not.toThrow();
    expect(loadInvestigationState(CASE_ID, testCase)).toEqual(DEFAULT_STATE);
  });

  test('returns the default state when getItem throws', () => {
    fakeStorage.getItem.mockImplementation(() => {
      throw new Error('SecurityError');
    });

    expect(() => loadInvestigationState(CASE_ID, testCase)).not.toThrow();
    expect(loadInvestigationState(CASE_ID, testCase)).toEqual(DEFAULT_STATE);
  });

  test('returns a fresh default state object on every call', () => {
    const first = loadInvestigationState(CASE_ID, testCase);
    first.opened.push('e-one');
    first.pins['e-one'] = 't-one';

    expect(loadInvestigationState(CASE_ID, testCase)).toEqual(DEFAULT_STATE);
  });
});

describe('loadInvestigationState: validating loaded state against the case', () => {
  function store(state: unknown) {
    fakeStorage.items.set(STORAGE_KEY, JSON.stringify(state));
  }

  test('drops opened evidence ids that are not in the case, keeping the order of the rest', () => {
    store({ opened: ['e-two', 'e-gone', 'e-one', 'e-old'], pins: {}, verdict: null });

    expect(loadInvestigationState(CASE_ID, testCase).opened).toEqual(['e-two', 'e-one']);
  });

  test('drops pins whose evidence id is not in the case', () => {
    store({ opened: [], pins: { 'e-one': 't-one', 'e-gone': 't-one' }, verdict: null });

    expect(loadInvestigationState(CASE_ID, testCase).pins).toEqual({ 'e-one': 't-one' });
  });

  test('drops pins whose target is not "none" and not a theory in the case', () => {
    store({ opened: [], pins: { 'e-one': 't-gone', 'e-two': 't-two' }, verdict: null });

    expect(loadInvestigationState(CASE_ID, testCase).pins).toEqual({ 'e-two': 't-two' });
  });

  test('keeps pins whose target is "none"', () => {
    store({ opened: [], pins: { 'e-one': 'none' }, verdict: null });

    expect(loadInvestigationState(CASE_ID, testCase).pins).toEqual({ 'e-one': 'none' });
  });

  test('sets the verdict to null when it is not a theory in the case', () => {
    store({ opened: ['e-one'], pins: {}, verdict: 't-gone' });

    expect(loadInvestigationState(CASE_ID, testCase).verdict).toBeNull();
  });

  test('sets the verdict to null when it is "none"', () => {
    store({ opened: ['e-one'], pins: {}, verdict: 'none' });

    expect(loadInvestigationState(CASE_ID, testCase).verdict).toBeNull();
  });

  test('keeps a verdict that is a theory in the case', () => {
    store({ opened: ['e-one', 'e-two'], pins: {}, verdict: 't-two' });

    expect(loadInvestigationState(CASE_ID, testCase).verdict).toBe('t-two');
  });

  test('cleans every part of a stale state in one pass', () => {
    store({
      opened: ['e-gone', 'e-one'],
      pins: { 'e-one': 't-gone', 'e-two': 'none', 'e-gone': 't-one', 'e-three': 't-one' },
      verdict: 't-gone',
    });

    expect(loadInvestigationState(CASE_ID, testCase)).toEqual({
      opened: ['e-one'],
      pins: { 'e-two': 'none', 'e-three': 't-one' },
      verdict: null,
    });
  });
});
