// src/lib/__tests__/desk.property.test.ts
// Task 2 of .kiro/specs/desk: properties of deskLayout and scatter. Pure logic, so they run in Node.
import { describe, expect, test } from 'vitest';
import * as fc from 'fast-check';
import { deskLayout, scatter } from '@/lib/desk';
import type { Case, InvestigationState, PinTarget } from '@/types/case';

const suffix = fc.stringMatching(/^[a-z0-9]{1,8}$/);
const idArbitrary = (prefix: string) => suffix.map(value => `${prefix}${value}`);

/** A case with these ids. Test data, not history. */
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
    theories: theoryIds.map(id => ({ id, title: `T ${id}`, claim: `C ${id}`, standing: 'considered' as const, standingReason: 'R' })),
    evidence: evidenceIds.map(id => ({
      id,
      title: `E ${id}`,
      detail: ['D'],
      sources: ['src-one'] as [string],
      reading: { supports: [], weakens: [], note: 'N' },
      status: 'record' as const,
    })),
    sources: [{ id: 'src-one', title: 'S', kind: 'official', citation: 'C' }],
    references: [],
    historiansSummary: ['H'],
    closeThreshold,
    theme: { id: 'test-theme' },
  };
}

const caseArbitrary = fc
  .record({
    evidenceIds: fc.uniqueArray(idArbitrary('e-'), { minLength: 1, maxLength: 15 }),
    theoryIds: fc.uniqueArray(idArbitrary('t-'), { minLength: 1, maxLength: 5 }),
  })
  .chain(({ evidenceIds, theoryIds }) =>
    fc.nat({ max: evidenceIds.length }).map(threshold => buildCase(evidenceIds, theoryIds, threshold))
  );

/** A state from the case's own ids, mixed with unknown ids and duplicates. */
const caseAndState = caseArbitrary.chain(caseData => {
  const evidenceId = fc.oneof(fc.constantFrom(...caseData.evidence.map(e => e.id)), idArbitrary('x-'));
  const target = fc.oneof(
    fc.constantFrom<PinTarget>(...caseData.theories.map(t => t.id)),
    fc.constant<PinTarget>('none'),
    idArbitrary('z-')
  );
  return fc
    .record(
      {
        opened: fc.array(evidenceId, { maxLength: 25 }),
        pins: fc.dictionary(evidenceId, target, { maxKeys: 15, noNullPrototype: true }),
        verdict: fc.constant(null),
      },
      { noNullPrototype: true }
    )
    .map(state => ({ caseData, state: state as InvestigationState }));
});

const placeIds = (layout: ReturnType<typeof deskLayout>) => [
  ...layout.pile.map(e => e.id),
  ...layout.aside.map(e => e.id),
  ...[...layout.byTheory.values()].flatMap(list => list.map(e => e.id)),
];

describe('deskLayout: properties', () => {
  // Feature: desk, Property 1: Every file has exactly one place
  test('Property 1: every file has exactly one place', () => {
    fc.assert(
      fc.property(caseAndState, ({ caseData, state }) => {
        const places = placeIds(deskLayout(caseData, state));
        expect([...places].sort()).toEqual(caseData.evidence.map(e => e.id).sort());
      })
    );
  });

  // Feature: desk, Property 2: Places follow the state
  test('Property 2: places follow the state', () => {
    fc.assert(
      fc.property(caseAndState, ({ caseData, state }) => {
        const layout = deskLayout(caseData, state);
        const opened = new Set(state.opened);
        const theories = new Set(caseData.theories.map(t => t.id));
        for (const folder of layout.folders) {
          const id = folder.evidence.id;
          const target = Object.hasOwn(state.pins, id) ? state.pins[id] : undefined;
          if (target !== undefined && theories.has(target)) {
            expect(folder.place).toEqual({ kind: 'board', theoryId: target, opened: opened.has(id) });
          } else if (target === 'none') {
            expect(folder.place).toEqual({ kind: 'aside', opened: opened.has(id) });
          } else {
            expect(folder.place).toEqual({ kind: 'pile', opened: opened.has(id) });
          }
        }
      })
    );
  });

  // Feature: desk, Property 3: Sealed files are in the pile
  test('Property 3: unpinned sealed files are in the pile, below the opened ones', () => {
    fc.assert(
      fc.property(caseAndState, ({ caseData, state }) => {
        const layout = deskLayout(caseData, state);
        const opened = new Set(state.opened);
        const pinned = (id: string) => layout.folders.find(folder => folder.evidence.id === id)?.place.kind !== 'pile';
        const sealed = caseData.evidence.filter(e => !opened.has(e.id) && !pinned(e.id)).map(e => e.id);
        expect(layout.pile.slice(0, sealed.length).map(e => e.id)).toEqual(sealed);
      })
    );
  });

  // Feature: desk, Property 4: Scatter is deterministic and bounded
  test('Property 4: scatter is deterministic and bounded', () => {
    fc.assert(
      fc.property(fc.string(), fc.double({ min: 0, max: 30, noNaN: true }), fc.double({ min: 0, max: 40, noNaN: true }), (id, d, o) => {
        const first = scatter(id, d, o);
        expect(scatter(id, d, o)).toEqual(first);
        expect(Math.abs(first.rotate)).toBeLessThanOrEqual(d + 0.01);
        expect(Math.abs(first.x)).toBeLessThanOrEqual(o + 0.01);
        expect(Math.abs(first.y)).toBeLessThanOrEqual(o + 0.01);
      })
    );
  });

  // Feature: desk, Property 5: deskLayout never throws
  test('Property 5: never throws on any state, and still places every file', () => {
    fc.assert(
      fc.property(caseArbitrary, fc.anything(), (caseData, garbage) => {
        const layout = deskLayout(caseData, garbage as InvestigationState);
        expect(placeIds(layout)).toHaveLength(caseData.evidence.length);
      })
    );
  });
});
