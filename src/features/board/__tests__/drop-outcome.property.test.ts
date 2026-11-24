// src/features/board/__tests__/drop-outcome.property.test.ts
// Property 7 of .kiro/specs/fix-pack: every drop has exactly one outcome.
import * as fc from 'fast-check';
import { describe, expect, test } from 'vitest';
import { dropOutcome } from '@/features/board/drag';
import type { DragSource, DropTarget } from '@/features/board/drag';

const theoryId = fc.stringMatching(/^t-[a-z0-9]{1,8}$/);
const sources: fc.Arbitrary<DragSource> = fc.oneof(
  fc.boolean().map(sealed => ({ from: 'floor', sealed }) as const),
  theoryId.map(id => ({ from: 'board', theoryId: id }) as const),
  fc.constant({ from: 'tray' } as const),
  fc.boolean().map(pinned => ({ from: 'open-file', pinned }) as const)
);
const points = fc.record({ x: fc.integer({ min: -500, max: 2500 }), y: fc.integer({ min: -500, max: 1000 }) });
const targets: fc.Arbitrary<DropTarget> = fc.oneof(
  theoryId.map(id => ({ kind: 'theory', theoryId: id }) as const),
  fc.constant({ kind: 'board' } as const),
  fc.constant({ kind: 'tray' } as const),
  fc.record({ kind: fc.constant('floor' as const), x: fc.integer({ min: 0, max: 2000 }), y: fc.integer({ min: 0, max: 600 }) }),
  fc.constant({ kind: 'nothing' } as const)
);

describe('Property 7: every drop has exactly one outcome', () => {
  test('the open file never comes back to the centre: it is pinned, or it goes back to the floor (review-fixes 4)', () => {
    fc.assert(
      fc.property(fc.boolean(), targets, points, (pinned, target, at) => {
        const outcome = dropOutcome({ from: 'open-file', pinned }, target, at);
        expect(outcome.kind).not.toBe('return');
        expect(outcome.kind).not.toBe('open');
        if (target.kind !== 'theory' && target.kind !== 'tray') {
          expect(outcome.kind).toBe(pinned ? 'unpin' : 'settle');
        }
      }),
      { numRuns: 300 }
    );
  });

  /**
   * Feature: fix-pack, Property 7: Every drop has exactly one outcome
   * **Validates: Requirements 17.2, 17.3, 17.4, 17.5, 17.6**
   */
  test('there is always one outcome, and the same drop always gives it', () => {
    fc.assert(
      fc.property(sources, targets, (source, target) => {
        const first = dropOutcome(source, target);
        expect(['pin', 'open', 'unpin', 'settle', 'return']).toContain(first.kind);
        expect(dropOutcome(source, target)).toEqual(first);
      }),
      { numRuns: 300 }
    );
  });

  /**
   * Feature: fix-pack, Property 7: Every drop has exactly one outcome
   * **Validates: Requirements 17.2, 17.5, 17.6**
   */
  test('a pin outcome\'s target is the theory dropped on, or "none" for the tray', () => {
    fc.assert(
      fc.property(sources, targets, (source, target) => {
        const outcome = dropOutcome(source, target);
        if (outcome.kind === 'pin') {
          expect(outcome.target).toBe(target.kind === 'theory' ? target.theoryId : 'none');
          expect(target.kind === 'theory' || target.kind === 'tray').toBe(true);
        }
      }),
      { numRuns: 300 }
    );
  });

  /**
   * Feature: fix-pack, Property 7: Every drop has exactly one outcome
   * **Validates: Requirements 17.5, 17.6**
   */
  test('a drop on the source\'s own note or the tray it came from goes back; on nothing, only a floor file goes back', () => {
    fc.assert(
      fc.property(theoryId, fc.constantFrom('board', 'tray'), (id, from) => {
        const source: DragSource = from === 'board' ? { from, theoryId: id } : { from };
        const own: DropTarget = from === 'board' ? { kind: 'theory', theoryId: id } : { kind: 'tray' };
        expect(dropOutcome(source, own)).toEqual({ kind: 'return' });
      }),
      { numRuns: 100 }
    );
    fc.assert(
      fc.property(sources, points, (source, at) => {
        const outcome = dropOutcome(source, { kind: 'nothing' }, at);
        if (source.from === 'floor') {
          expect(outcome).toEqual({ kind: 'return' });
        } else {
          // Anything carried off the board, the tray or the open file goes back to the floor (review-fixes 4).
          expect(['unpin', 'settle']).toContain(outcome.kind);
          expect(outcome).toMatchObject(at);
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: fix-pack, Property 7: Every drop has exactly one outcome
   * **Validates: Requirements 17.2, 17.3, 17.4**
   */
  test('sealed or not, a floor file pins the same way; only floor files open or settle', () => {
    fc.assert(
      fc.property(sources, targets, (source, target) => {
        const outcome = dropOutcome(source, target);
        if (source.from === 'floor') {
          expect(dropOutcome({ from: 'floor', sealed: !source.sealed }, target)).toEqual(outcome);
        }
        if (outcome.kind === 'open') {
          expect(source.from).toBe('floor');
        }
        if (outcome.kind === 'settle') {
          // A floor file, or the open file that was not pinned.
          expect(source.from === 'floor' || (source.from === 'open-file' && !source.pinned)).toBe(true);
        }
        if (outcome.kind === 'unpin') {
          expect(source.from === 'board' || source.from === 'tray' || (source.from === 'open-file' && source.pinned)).toBe(true);
          expect(target.kind === 'theory' || target.kind === 'tray').toBe(false);
        }
      }),
      { numRuns: 300 }
    );
  });
});
