// src/lib/__tests__/case-report.property.test.ts
// Task 2.1 of .kiro/specs/case-report: property tests for buildCaseReport. Pure logic, so they run in Node.
import { describe, expect, test } from 'vitest';
import * as fc from 'fast-check';
import { buildCaseReport, type CaseReport } from '@/lib/case-report';
import type { Case, Evidence, EvidenceStatus, InvestigationState, PinTarget } from '@/types/case';

// ---------- Arbitraries ----------

// Built once and reused: building a regex-based arbitrary inside every run is slow.
const idSuffixArbitrary = fc.stringMatching(/^[a-z0-9]{1,8}$/);

/** An id with a fixed prefix. Different prefixes can never collide, and none of them make "none". */
const idArbitrary = (prefix: string): fc.Arbitrary<string> => idSuffixArbitrary.map(suffix => `${prefix}${suffix}`);

/** Ids that are never in a generated case: case evidence starts with "e-", case theories with "t-". */
const unknownEvidenceIdArbitrary = idArbitrary('x-');
const unknownTheoryIdArbitrary = idArbitrary('z-');

interface EvidenceShape {
  id: string;
  status: EvidenceStatus;
  supports: string[];
  weakens: string[];
}

/** Builds one evidence item. The content is test data, not history. */
function buildEvidence({ id, status, supports, weakens }: EvidenceShape): Evidence {
  const base = {
    id,
    title: `Evidence ${id}`,
    detail: [`Detail ${id}`],
    sources: ['src-one'] as [string],
    reading: { supports, weakens, note: `Note ${id}` },
  };
  if (status === 'legend') {
    return { ...base, status, origin: `Origin ${id}` };
  }
  if (status === 'disputed') {
    return { ...base, status, dispute: { claim: `Claim ${id}`, challenge: `Challenge ${id}` } };
  }
  return { ...base, status };
}

function buildCase(evidence: EvidenceShape[], theoryIds: string[]): Case {
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
    evidence: evidence.map(buildEvidence),
    sources: [{ id: 'src-one', title: 'Source one', kind: 'official', citation: 'Test citation' }],
    references: [],
    historiansSummary: ['Test summary one', 'Test summary two'],
    closeThreshold: 0,
    theme: { id: 'test-theme' },
  };
}

/**
 * A random case: 1 to 12 evidence files and 1 to 5 theories. Each file has a random status, and supports and
 * weakens random theories. The two lists may share a theory, to exercise the "agree wins" rule.
 */
const caseArbitrary: fc.Arbitrary<Case> = fc
  .record({
    evidenceIds: fc.uniqueArray(idArbitrary('e-'), { minLength: 1, maxLength: 12 }),
    theoryIds: fc.uniqueArray(idArbitrary('t-'), { minLength: 1, maxLength: 5 }),
  })
  .chain(({ evidenceIds, theoryIds }) =>
    fc
      .tuple(
        ...evidenceIds.map(id =>
          fc.record({
            id: fc.constant(id),
            status: fc.constantFrom<EvidenceStatus>('record', 'disputed', 'legend'),
            supports: fc.subarray(theoryIds),
            weakens: fc.subarray(theoryIds),
          })
        )
      )
      .map(evidence => buildCase(evidence, theoryIds))
  );

const evidenceIdsOf = (caseData: Case) => caseData.evidence.map(item => item.id);
const theoryIdsOf = (caseData: Case) => caseData.theories.map(item => item.id);

/**
 * A state built from the case's own ids, mixed with unknown ids, unknown theories and duplicates.
 * Plain objects only (no null prototype), so a structuredClone copy compares equal with toStrictEqual.
 */
const stateArbitrary = (caseData: Case): fc.Arbitrary<InvestigationState> => {
  const evidenceId = fc.oneof(fc.constantFrom(...evidenceIdsOf(caseData)), unknownEvidenceIdArbitrary);
  const theoryId = fc.oneof(fc.constantFrom(...theoryIdsOf(caseData)), unknownTheoryIdArbitrary);
  return fc.record({
    opened: fc.array(evidenceId, { maxLength: 20 }),
    pins: fc.dictionary(evidenceId, fc.oneof(theoryId, fc.constant<PinTarget>('none')), {
      maxKeys: 15,
      noNullPrototype: true,
    }),
    verdict: fc.option(theoryId),
  }, { noNullPrototype: true });
};

/** A case together with a state drawn from it. */
const caseAndStateArbitrary = caseArbitrary.chain(caseData =>
  stateArbitrary(caseData).map(state => ({ caseData, state }))
);

/** States that break the type at runtime: anything at all, or anything in each field. */
const garbageStateArbitrary: fc.Arbitrary<unknown> = fc.oneof(
  fc.anything(),
  fc.record({ opened: fc.anything(), pins: fc.anything(), verdict: fc.anything() })
);

// ---------- Helpers ----------

/** Valid_Pin, worked out here independently of the code under test. */
const isValidPin = (caseData: Case, evidenceId: string, target: unknown): boolean =>
  evidenceIdsOf(caseData).includes(evidenceId) &&
  typeof target === 'string' &&
  (target === 'none' || theoryIdsOf(caseData).includes(target));

const REPORT_PARTS: (keyof CaseReport)[] = [
  'verdict',
  'pins',
  'reliedOn',
  'againstVerdict',
  'neverOpened',
  'legendsTrusted',
  'historiansStand',
];

// ---------- Properties ----------

describe('buildCaseReport: properties', () => {
  // Feature: case-report, Property 1: Never throws
  test('Property 1: never throws, on any state, and always returns every part', () => {
    const check = (caseData: Case, state: unknown) => {
      const report = buildCaseReport(caseData, state as InvestigationState);
      expect(Object.keys(report).sort()).toStrictEqual([...REPORT_PARTS].sort());
      expect(Array.isArray(report.historiansStand.theories)).toBe(true);
      expect(report.historiansStand.theories).toHaveLength(caseData.theories.length);
    };

    fc.assert(fc.property(caseAndStateArbitrary, ({ caseData, state }) => check(caseData, state)));
    fc.assert(fc.property(caseArbitrary, garbageStateArbitrary, check));

    // A value a type check cannot see through: a state whose fields throw when read.
    const throwing = Object.defineProperty({}, 'opened', {
      enumerable: true,
      get() {
        throw new Error('broken state');
      },
    });
    fc.assert(fc.property(caseArbitrary, caseData => check(caseData, throwing)));
  });

  // Feature: case-report, Property 2: Every pinned legend is listed
  test('Property 2: every legend pinned to a theory is in legends trusted, with its theory', () => {
    fc.assert(
      fc.property(caseAndStateArbitrary, ({ caseData, state }) => {
        const expected = caseData.evidence
          .filter(item => item.status === 'legend')
          .filter(item => Object.hasOwn(state.pins, item.id))
          .map(item => ({ evidenceId: item.id, theoryId: state.pins[item.id] }))
          .filter(({ evidenceId, theoryId }) => isValidPin(caseData, evidenceId, theoryId) && theoryId !== 'none');

        const report = buildCaseReport(caseData, state);

        expect(report.legendsTrusted.map(({ evidenceId, theoryId }) => ({ evidenceId, theoryId }))).toStrictEqual(
          expected
        );
      })
    );
  });

  // Feature: case-report, Property 3: Opened and never opened do not overlap
  test('Property 3: no file is both opened and never opened', () => {
    fc.assert(
      fc.property(caseAndStateArbitrary, ({ caseData, state }) => {
        const report = buildCaseReport(caseData, state);
        const opened = new Set(state.opened);

        for (const entry of report.neverOpened) {
          expect(opened.has(entry.evidenceId)).toBe(false);
        }
      })
    );
  });

  // Feature: case-report, Property 4: Every id belongs to the case
  test('Property 4: every evidence id and theory id in the report belongs to the case', () => {
    const check = (caseData: Case, state: unknown) => {
      const evidenceIds = new Set(evidenceIdsOf(caseData));
      const theoryIds = new Set(theoryIdsOf(caseData));
      const report = buildCaseReport(caseData, state as InvestigationState);

      const reportEvidenceIds = [
        ...report.pins,
        ...report.reliedOn,
        ...report.againstVerdict,
        ...report.neverOpened,
        ...report.legendsTrusted,
      ].map(entry => entry.evidenceId);
      const reportTheoryIds = [
        ...(report.verdict === null ? [] : [report.verdict.theoryId]),
        ...report.pins.map(pin => pin.target).filter(target => target !== 'none'),
        ...report.legendsTrusted.map(entry => entry.theoryId),
        ...report.historiansStand.theories.map(entry => entry.theoryId),
      ];

      for (const id of reportEvidenceIds) {
        expect(evidenceIds.has(id)).toBe(true);
      }
      for (const id of reportTheoryIds) {
        expect(theoryIds.has(id)).toBe(true);
      }
    };

    fc.assert(fc.property(caseAndStateArbitrary, ({ caseData, state }) => check(caseData, state)));
    fc.assert(fc.property(caseArbitrary, garbageStateArbitrary, check));
  });

  // Feature: case-report, Property 5: Deterministic and non-mutating
  test('Property 5: equal inputs give equal reports, and the inputs are not changed', () => {
    fc.assert(
      fc.property(caseAndStateArbitrary, ({ caseData, state }) => {
        const caseBefore = structuredClone(caseData);
        const stateBefore = structuredClone(state);

        const first = buildCaseReport(caseData, state);
        const second = buildCaseReport(caseData, state);

        expect(second).toStrictEqual(first);
        expect(caseData).toStrictEqual(caseBefore);
        expect(state).toStrictEqual(stateBefore);
      })
    );
  });

  // Feature: case-report, Property 6: Order of the state does not matter
  test('Property 6: shuffling and repeating opened ids, and reordering pins, gives the same report', () => {
    const reorderedArbitrary = caseAndStateArbitrary.chain(({ caseData, state }) => {
      const pinEntries = Object.entries(state.pins);
      return fc
        .record({
          opened: fc.shuffledSubarray(state.opened, { minLength: state.opened.length }),
          repeats: fc.subarray(state.opened),
          pins: fc.shuffledSubarray(pinEntries, { minLength: pinEntries.length }),
        })
        .map(({ opened, repeats, pins }) => ({
          caseData,
          state,
          reordered: { opened: [...opened, ...repeats], pins: Object.fromEntries(pins), verdict: state.verdict },
        }));
    });

    fc.assert(
      fc.property(reorderedArbitrary, ({ caseData, state, reordered }) => {
        expect(buildCaseReport(caseData, reordered)).toStrictEqual(buildCaseReport(caseData, state));
      })
    );
  });

  // Feature: case-report, Property 7: The reading rules
  test('Property 7: every pin reading follows the agree, disagree and no-link rules', () => {
    fc.assert(
      fc.property(caseAndStateArbitrary, ({ caseData, state }) => {
        const report = buildCaseReport(caseData, state);

        for (const pin of report.pins) {
          const { supports, weakens } = caseData.evidence.find(item => item.id === pin.evidenceId)!.reading;
          let expected: string;
          if (pin.target === 'none') {
            expected = supports.length === 0 ? 'agree' : 'disagree';
          } else if (supports.includes(pin.target)) {
            expected = 'agree';
          } else if (weakens.includes(pin.target)) {
            expected = 'disagree';
          } else {
            expected = 'no-link';
          }
          expect(pin.reading).toBe(expected);
        }
      })
    );
  });
});
