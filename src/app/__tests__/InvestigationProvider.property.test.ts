// src/app/__tests__/InvestigationProvider.property.test.ts
// Task 6.3: property tests for investigation actions. These test the reducer directly, so they run in Node.
import { describe, expect, test } from 'vitest';
import * as fc from 'fast-check';
import { createEmptyInvestigationState, investigationReducer } from '@/app/InvestigationProvider';
import type { Case, InvestigationAction, InvestigationState, PinTarget } from '@/types/case';

// ---------- Arbitraries ----------

// Built once and reused: building a regex-based arbitrary inside every run is slow.
const idSuffixArbitrary = fc.stringMatching(/^[a-z0-9]{1,8}$/);

/** An id with a fixed prefix, e.g. "e-4kq". Different prefixes can never collide. */
const idArbitrary = (prefix: string): fc.Arbitrary<string> =>
  idSuffixArbitrary.map(suffix => `${prefix}${suffix}`);

/** An evidence id that is never in a generated case (those all start with "e-"). */
const unknownEvidenceIdArbitrary = idArbitrary('x-');
/** A theory id that is never in a generated case (those all start with "t-"), and is never "none". */
const unknownTheoryIdArbitrary = idArbitrary('z-');

/** Builds a case that has exactly these evidence and theory ids. The content is test data, not history. */
function buildCase(evidenceIds: string[], theoryIds: string[], closeThreshold: number): Case {
  return {
    id: 'property-case',
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
    closeThreshold,
    theme: { id: 'test-theme' },
  };
}

/** A random case: 1 to 10 evidence ids, 1 to 5 theory ids, and a close threshold from 0 to the number of evidence files. */
const caseArbitrary = (): fc.Arbitrary<Case> =>
  fc
    .record({
      evidenceIds: fc.uniqueArray(idArbitrary('e-'), { minLength: 1, maxLength: 10 }),
      theoryIds: fc.uniqueArray(idArbitrary('t-'), { minLength: 1, maxLength: 5 }),
    })
    .chain(({ evidenceIds, theoryIds }) =>
      fc.nat({ max: evidenceIds.length }).map(closeThreshold => buildCase(evidenceIds, theoryIds, closeThreshold))
    );

const evidenceIdsOf = (caseData: Case): string[] => caseData.evidence.map(evidence => evidence.id);
const theoryIdsOf = (caseData: Case): string[] => caseData.theories.map(theory => theory.id);

/** "none" or a theory id from the case. */
const validTargetArbitrary = (caseData: Case): fc.Arbitrary<PinTarget> =>
  fc.constantFrom<PinTarget>('none', ...theoryIdsOf(caseData));

/** A pins object in which every key is evidence from the case and every value is a valid target. */
const validPinsArbitrary = (caseData: Case): fc.Arbitrary<Record<string, PinTarget>> =>
  fc.shuffledSubarray(evidenceIdsOf(caseData)).chain(pinned =>
    fc.tuple(...pinned.map(() => validTargetArbitrary(caseData))).map(targets => {
      const pins: Record<string, PinTarget> = {};
      pinned.forEach((evidenceId, index) => {
        pins[evidenceId] = targets[index];
      });
      return pins;
    })
  );

/** A state in which every id exists in the case. The verdict may be set or null. */
const validStateArbitrary = (caseData: Case): fc.Arbitrary<InvestigationState> =>
  fc.record({
    opened: fc.shuffledSubarray(evidenceIdsOf(caseData)),
    pins: validPinsArbitrary(caseData),
    verdict: fc.option(fc.constantFrom(...theoryIdsOf(caseData)), { nil: null }),
  });

/** Any action: a mix of valid ones and ones that use ids that are not in the case. */
const actionArbitrary = (caseData: Case): fc.Arbitrary<InvestigationAction> => {
  const anyEvidenceId = fc.oneof(
    { weight: 4, arbitrary: fc.constantFrom(...evidenceIdsOf(caseData)) },
    { weight: 1, arbitrary: unknownEvidenceIdArbitrary }
  );
  const anyTarget = fc.oneof(
    { weight: 4, arbitrary: validTargetArbitrary(caseData) },
    { weight: 1, arbitrary: unknownTheoryIdArbitrary }
  );
  const anyTheoryId = fc.oneof(
    { weight: 4, arbitrary: fc.constantFrom(...theoryIdsOf(caseData)) },
    { weight: 1, arbitrary: fc.oneof(unknownTheoryIdArbitrary, fc.constant('none')) }
  );
  return fc.oneof(
    { weight: 5, arbitrary: fc.record({ type: fc.constant('OPEN_EVIDENCE' as const), evidenceId: anyEvidenceId }) },
    {
      weight: 5,
      arbitrary: fc.record({ type: fc.constant('PIN_EVIDENCE' as const), evidenceId: anyEvidenceId, target: anyTarget }),
    },
    { weight: 2, arbitrary: fc.record({ type: fc.constant('CLOSE_CASE' as const), theoryId: anyTheoryId }) },
    { weight: 1, arbitrary: fc.record({ type: fc.constant('REOPEN_CASE' as const) }) }
  );
};

/** Pairs a random case with something generated from that case. */
function withCase<T>(build: (caseData: Case) => fc.Arbitrary<T>): fc.Arbitrary<{ caseData: Case } & T> {
  return caseArbitrary().chain(caseData => build(caseData).map(rest => ({ caseData, ...rest })));
}

function applyAll(state: InvestigationState, actions: InvestigationAction[], caseData: Case): InvestigationState {
  return actions.reduce((current, action) => investigationReducer(current, action, caseData), state);
}

// ---------- Properties ----------

describe('Investigation actions - Property Tests', () => {
  test('Property 4: Evidence Opening Preserves Order', () => {
    // Feature: histor-data-foundation, Property 4: Evidence Opening Preserves Order
    // Opening a sequence of evidence ids gives an opened array with those ids in the order they were first opened.
    fc.assert(
      fc.property(
        withCase(caseData =>
          fc.record({
            // May contain repeats, so reopening is covered too.
            sequence: fc.array(fc.constantFrom(...evidenceIdsOf(caseData)), { maxLength: 30 }),
          })
        ),
        ({ caseData, sequence }) => {
          const actions = sequence.map(evidenceId => ({ type: 'OPEN_EVIDENCE' as const, evidenceId }));

          const result = applyAll(createEmptyInvestigationState(), actions, caseData);

          const firstOpenedOrder = [...new Set(sequence)];
          expect(result.opened).toEqual(firstOpenedOrder);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 5: Evidence Reopening is Idempotent', () => {
    // Feature: histor-data-foundation, Property 5: Evidence Reopening is Idempotent
    // Opening evidence that is already in the opened array does not modify the opened array.
    fc.assert(
      fc.property(
        withCase(caseData =>
          validStateArbitrary(caseData)
            .filter(state => state.opened.length > 0)
            .chain(state => fc.record({ state: fc.constant(state), evidenceId: fc.constantFrom(...state.opened) }))
        ),
        ({ caseData, state, evidenceId }) => {
          const openedBefore = [...state.opened];

          const result = investigationReducer(state, { type: 'OPEN_EVIDENCE', evidenceId }, caseData);

          expect(result).toBe(state);
          expect(result.opened).toEqual(openedBefore);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 6: Valid Pin Storage and Retrieval', () => {
    // Feature: histor-data-foundation, Property 6: Valid Pin Storage and Retrieval
    // Pinning evidence to a valid theory id or "none" stores that mapping, and leaves every other pin as it was.
    fc.assert(
      fc.property(
        withCase(caseData =>
          fc.record({
            state: validStateArbitrary(caseData),
            evidenceId: fc.constantFrom(...evidenceIdsOf(caseData)),
            target: validTargetArbitrary(caseData),
          })
        ),
        ({ caseData, state, evidenceId, target }) => {
          const result = investigationReducer(state, { type: 'PIN_EVIDENCE', evidenceId, target }, caseData);

          expect(result.pins[evidenceId]).toBe(target);
          expect(result.pins).toEqual({ ...state.pins, [evidenceId]: target });
          expect(result.opened).toEqual(state.opened);
          expect(result.verdict).toBe(state.verdict);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 7: Invalid Pin Rejection', () => {
    // Feature: histor-data-foundation, Property 7: Invalid Pin Rejection
    // Pinning to a theory id that is not in the case (and is not "none") is rejected: the pins stay unchanged.
    fc.assert(
      fc.property(
        withCase(caseData =>
          fc.record({
            state: validStateArbitrary(caseData),
            evidenceId: fc.constantFrom(...evidenceIdsOf(caseData)),
            target: unknownTheoryIdArbitrary,
          })
        ),
        ({ caseData, state, evidenceId, target }) => {
          const pinsBefore = { ...state.pins };

          const result = investigationReducer(state, { type: 'PIN_EVIDENCE', evidenceId, target }, caseData);

          expect(result).toBe(state);
          expect(result.pins).toEqual(pinsBefore);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 7 (evidence side): a pin on evidence that is not in the case is rejected', () => {
    // Feature: histor-data-foundation, Property 7: Invalid Pin Rejection
    // Added with the rule that PIN_EVIDENCE rejects an evidence id that is not in the case,
    // whatever the target is.
    fc.assert(
      fc.property(
        withCase(caseData =>
          fc.record({
            state: validStateArbitrary(caseData),
            evidenceId: unknownEvidenceIdArbitrary,
            target: fc.oneof(validTargetArbitrary(caseData), unknownTheoryIdArbitrary),
          })
        ),
        ({ caseData, state, evidenceId, target }) => {
          const pinsBefore = { ...state.pins };

          const result = investigationReducer(state, { type: 'PIN_EVIDENCE', evidenceId, target }, caseData);

          expect(result).toBe(state);
          expect(result.pins).toEqual(pinsBefore);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Evidence that is not in the case cannot be opened', () => {
    // Feature: histor-data-foundation, Property 4: Evidence Opening Preserves Order
    // Added with the rule that OPEN_EVIDENCE rejects an evidence id that is not in the case.
    fc.assert(
      fc.property(
        withCase(caseData =>
          fc.record({ state: validStateArbitrary(caseData), evidenceId: unknownEvidenceIdArbitrary })
        ),
        ({ caseData, state, evidenceId }) => {
          const result = investigationReducer(state, { type: 'OPEN_EVIDENCE', evidenceId }, caseData);

          expect(result).toBe(state);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 20: REOPEN_CASE Returns Empty State', () => {
    // Feature: histor-data-foundation, Property 20: REOPEN_CASE Returns Empty State
    // Whatever the state is, REOPEN_CASE gives {opened: [], pins: {}, verdict: null}.
    fc.assert(
      fc.property(
        withCase(caseData => fc.record({ actions: fc.array(actionArbitrary(caseData), { maxLength: 30 }) })),
        ({ caseData, actions }) => {
          const state = applyAll(createEmptyInvestigationState(), actions, caseData);

          const result = investigationReducer(state, { type: 'REOPEN_CASE' }, caseData);

          expect(result).toEqual({ opened: [], pins: {}, verdict: null });
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 21: Close Below Threshold Fails', () => {
    // Feature: histor-data-foundation, Property 21: Close Below Threshold Fails
    // When fewer files are open than the close threshold, CLOSE_CASE with any theory id leaves the verdict null.
    const belowThreshold = caseArbitrary()
      // A threshold of 0 can never be "below", so those cases are skipped.
      .filter(caseData => caseData.closeThreshold > 0)
      .chain(caseData =>
        fc.record({
          caseData: fc.constant(caseData),
          opened: fc.shuffledSubarray(evidenceIdsOf(caseData), { maxLength: caseData.closeThreshold - 1 }),
          pins: validPinsArbitrary(caseData),
          theoryId: fc.oneof(fc.constantFrom(...theoryIdsOf(caseData)), unknownTheoryIdArbitrary),
        })
      );

    fc.assert(
      fc.property(belowThreshold, ({ caseData, opened, pins, theoryId }) => {
        const state: InvestigationState = { opened, pins, verdict: null };

        const result = investigationReducer(state, { type: 'CLOSE_CASE', theoryId }, caseData);

        expect(result).toBe(state);
        expect(result.verdict).toBeNull();
      }),
      { numRuns: 100 }
    );
  });

  test('Property 22: All Pin Targets Are Valid', () => {
    // Feature: histor-data-foundation, Property 22: All Pin Targets Are Valid
    // After any sequence of actions, every pin target is "none" or a theory id from the case.
    fc.assert(
      fc.property(
        withCase(caseData => fc.record({ actions: fc.array(actionArbitrary(caseData), { maxLength: 50 }) })),
        ({ caseData, actions }) => {
          const validEvidenceIds = new Set(evidenceIdsOf(caseData));
          const validTheoryIds = new Set(theoryIdsOf(caseData));

          const result = applyAll(createEmptyInvestigationState(), actions, caseData);

          for (const target of Object.values(result.pins)) {
            expect(target === 'none' || validTheoryIds.has(target)).toBe(true);
          }
          // The same holds for everything else the state refers to.
          expect(Object.keys(result.pins).every(id => validEvidenceIds.has(id))).toBe(true);
          expect(result.opened.every(id => validEvidenceIds.has(id))).toBe(true);
          expect(new Set(result.opened).size).toBe(result.opened.length);
          expect(result.verdict === null || validTheoryIds.has(result.verdict)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });
});
