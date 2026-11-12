// src/lib/__tests__/storage.property.test.ts
// Task 5.3: property tests for storage serialization and for validating loaded state.
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import * as fc from 'fast-check';
import { loadInvestigationState, saveInvestigationState } from '@/lib/storage';
import type { Case, InvestigationState, PinTarget } from '@/types/case';

const CASE_ID = 'property-case';
const STORAGE_KEY = `histor:case:${CASE_ID}`;
const DEFAULT_STATE: InvestigationState = { opened: [], pins: {}, verdict: null };

// ---------- Fake localStorage ----------

let items: Map<string, string>;

beforeEach(() => {
  items = new Map();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => {
      items.set(key, value);
    },
    removeItem: (key: string) => {
      items.delete(key);
    },
    clear: () => {
      items.clear();
    },
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// ---------- Arbitraries ----------

// Built once and reused: building a regex-based arbitrary inside every run is slow.
const idSuffixArbitrary = fc.stringMatching(/^[a-z0-9]{1,8}$/);

/** An id with a fixed prefix, e.g. "e-4kq". Different prefixes can never collide. */
const idArbitrary = (prefix: string): fc.Arbitrary<string> =>
  idSuffixArbitrary.map(suffix => `${prefix}${suffix}`);

/** Builds a case that has exactly these evidence and theory ids. The content is test data, not history. */
function buildCase(evidenceIds: string[], theoryIds: string[]): Case {
  return {
    id: CASE_ID,
    title: 'Test case',
    year: 1900,
    teaser: 'Test teaser',
    legendIntro: { lines: ['Test line'], stamp: 'Test stamp', debunk: 'Test debunk' },
    story: [{ id: 's-one', heading: 'Test heading', body: ['Test paragraph'] }],
    centralQuestion: 'Test question?',
    fork: { prompt: 'Test prompt', investigateLabel: 'Investigate', leaveLabel: 'Leave' },
    theories: theoryIds.map(id => ({
      id,
      title: `Theory ${id}`,
      claim: `Claim ${id}`,
      standing: 'considered' as const,
      standingReason: `Reason ${id}`,
    })),
    evidence: evidenceIds.map(id => ({
      id,
      title: `Evidence ${id}`,
      detail: [`Detail ${id}`],
      sources: ['src-one'] as [string],
      reading: { supports: [], weakens: [], note: `Note ${id}` },
      status: 'record' as const,
    })),
    sources: [{ id: 'src-one', title: 'Source one', kind: 'official', citation: 'Test citation' }],
    references: [],
    historiansSummary: ['Test summary'],
    closeThreshold: 0,
    theme: { id: 'test-theme' },
  };
}

interface CaseIds {
  evidenceIds: string[];
  theoryIds: string[];
}

/** The ids of a random case: 1 to 10 evidence ids ("e-...") and 1 to 5 theory ids ("t-..."). */
const caseIdsArbitrary = (): fc.Arbitrary<CaseIds> =>
  fc.record({
    evidenceIds: fc.uniqueArray(idArbitrary('e-'), { minLength: 1, maxLength: 10 }),
    theoryIds: fc.uniqueArray(idArbitrary('t-'), { minLength: 1, maxLength: 5 }),
  });

/** A state in which every id exists in the case. */
const validStateArbitrary = ({ evidenceIds, theoryIds }: CaseIds): fc.Arbitrary<InvestigationState> =>
  fc.record({
    opened: fc.shuffledSubarray(evidenceIds),
    pins: fc
      .shuffledSubarray(evidenceIds)
      .chain(pinned =>
        fc.tuple(...pinned.map(() => fc.constantFrom<PinTarget>('none', ...theoryIds))).map(targets => {
          const pins: Record<string, PinTarget> = {};
          pinned.forEach((evidenceId, index) => {
            pins[evidenceId] = targets[index];
          });
          return pins;
        })
      ),
    verdict: fc.option(fc.constantFrom(...theoryIds), { nil: null }),
  });

/** A random case together with a state that is valid for it. */
const caseAndValidStateArbitrary = () =>
  caseIdsArbitrary().chain(ids => fc.record({ ids: fc.constant(ids), state: validStateArbitrary(ids) }));

/** True when the string cannot be parsed as JSON. */
function isInvalidJson(text: string): boolean {
  try {
    JSON.parse(text);
    return false;
  } catch {
    return true;
  }
}

// ---------- Properties ----------

describe('Storage - Property Tests', () => {
  test('Property 16: Investigation State Serialization Round Trip', () => {
    // Feature: histor-data-foundation, Property 16: Investigation State Serialization Round Trip
    // Saving a state and loading it back gives the same opened ids in the same order,
    // the same pins and the same verdict.
    fc.assert(
      fc.property(caseAndValidStateArbitrary(), ({ ids, state }) => {
        items.clear();
        const caseData = buildCase(ids.evidenceIds, ids.theoryIds);

        saveInvestigationState(CASE_ID, state);
        const loaded = loadInvestigationState(CASE_ID, caseData);

        expect(loaded.opened).toEqual(state.opened);
        expect(loaded.pins).toEqual(state.pins);
        expect(loaded.verdict).toBe(state.verdict);

        // The stored text itself is plain JSON that parses back to the same state.
        expect(JSON.parse(items.get(STORAGE_KEY) as string)).toEqual(state);
      }),
      { numRuns: 100 }
    );
  });

  test('Property 17: Storage Manager Handles Invalid JSON Gracefully', () => {
    // Feature: histor-data-foundation, Property 17: Storage Manager Handles Invalid JSON Gracefully
    // For any stored string that is not valid JSON, loading returns the default state and never throws.
    fc.assert(
      fc.property(caseIdsArbitrary(), fc.string().filter(isInvalidJson), (ids, invalidJson) => {
        items.clear();
        items.set(STORAGE_KEY, invalidJson);
        const caseData = buildCase(ids.evidenceIds, ids.theoryIds);

        let loaded: InvestigationState | undefined;
        expect(() => {
          loaded = loadInvestigationState(CASE_ID, caseData);
        }).not.toThrow();
        expect(loaded).toEqual(DEFAULT_STATE);
      }),
      { numRuns: 100 }
    );
  });

  test('Property 23: Loaded State Validation Removes Invalid Evidence IDs', () => {
    // Feature: histor-data-foundation, Property 23: Loaded State Validation Removes Invalid Evidence IDs
    // Evidence ids that are not in the case are removed from opened and from pins.
    // Everything that was valid is kept, with opened still in its original order.
    const arbitrary = caseAndValidStateArbitrary().chain(({ ids, state }) =>
      fc.record({
        ids: fc.constant(ids),
        state: fc.constant(state),
        // "x-" ids can never match the "e-" ids of the case.
        invalidOpened: fc.uniqueArray(idArbitrary('x-'), { minLength: 1, maxLength: 5 }),
        invalidPins: fc.dictionary(idArbitrary('x-'), fc.constantFrom<PinTarget>('none', ...ids.theoryIds), {
          minKeys: 1,
          maxKeys: 5,
        }),
        // Decides where the invalid ids are mixed into the opened array.
        mixSeed: fc.array(fc.nat(), { minLength: 5, maxLength: 5 }),
      })
    );

    fc.assert(
      fc.property(arbitrary, ({ ids, state, invalidOpened, invalidPins, mixSeed }) => {
        items.clear();
        const caseData = buildCase(ids.evidenceIds, ids.theoryIds);
        const validEvidenceIds = new Set(ids.evidenceIds);

        const mixedOpened = [...state.opened];
        invalidOpened.forEach((id, index) => {
          mixedOpened.splice(mixSeed[index] % (mixedOpened.length + 1), 0, id);
        });
        const stale = { opened: mixedOpened, pins: { ...state.pins, ...invalidPins }, verdict: state.verdict };
        items.set(STORAGE_KEY, JSON.stringify(stale));

        const loaded = loadInvestigationState(CASE_ID, caseData);

        expect(loaded.opened.every(id => validEvidenceIds.has(id))).toBe(true);
        expect(Object.keys(loaded.pins).every(id => validEvidenceIds.has(id))).toBe(true);
        expect(loaded).toEqual(state);
      }),
      { numRuns: 100 }
    );
  });

  test('Property 24: Loaded State Validation Removes Invalid Theory IDs', () => {
    // Feature: histor-data-foundation, Property 24: Loaded State Validation Removes Invalid Theory IDs
    // Pins that point to a theory that is not in the case (and is not "none") are removed,
    // and a verdict that is not a theory in the case becomes null. Valid pins and verdicts are kept.
    const arbitrary = caseAndValidStateArbitrary().chain(({ ids, state }) =>
      fc.record({
        ids: fc.constant(ids),
        state: fc.constant(state),
        // Evidence ids from the case whose pin will be pointed at a theory that does not exist.
        // "z-" ids can never match the "t-" ids of the case.
        badPins: fc
          .shuffledSubarray(ids.evidenceIds, { minLength: 1 })
          .chain(evidenceIds =>
            fc
              .tuple(...evidenceIds.map(() => idArbitrary('z-')))
              .map(targets => evidenceIds.map((evidenceId, index) => [evidenceId, targets[index]] as const))
          ),
        // Either keep the valid verdict, or replace it with a theory that does not exist.
        badVerdict: fc.option(idArbitrary('z-'), { nil: null }),
      })
    );

    fc.assert(
      fc.property(arbitrary, ({ ids, state, badPins, badVerdict }) => {
        items.clear();
        const caseData = buildCase(ids.evidenceIds, ids.theoryIds);
        const validTheoryIds = new Set(ids.theoryIds);

        const stalePins: Record<string, PinTarget> = { ...state.pins };
        const expectedPins: Record<string, PinTarget> = { ...state.pins };
        for (const [evidenceId, target] of badPins) {
          stalePins[evidenceId] = target;
          delete expectedPins[evidenceId];
        }
        const stale = { opened: state.opened, pins: stalePins, verdict: badVerdict ?? state.verdict };
        items.set(STORAGE_KEY, JSON.stringify(stale));

        const loaded = loadInvestigationState(CASE_ID, caseData);

        expect(Object.values(loaded.pins).every(target => target === 'none' || validTheoryIds.has(target))).toBe(true);
        expect(loaded.pins).toEqual(expectedPins);
        expect(loaded.verdict).toBe(badVerdict === null ? state.verdict : null);
        expect(loaded.opened).toEqual(state.opened);
      }),
      { numRuns: 100 }
    );
  });
});
