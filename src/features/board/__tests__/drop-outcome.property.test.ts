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
  fc.constant({ from: 'open-file' } as const)
);
const targets: fc.Arbitrary<DropTarget> = fc.oneof(
  theoryId.map(id => ({ kind: 'theory', theoryId: id }) as const),
  fc.constant({ kind: 'board' } as const),
  fc.constant({ kind: 'tray' } as const),
  fc.record({ kind: fc.constant('floor' as const), x: fc.integer({ min: 0, max: 2000 }), y: fc.integer({ min: 0, max: 600 }) }),
  fc.constant({ kind: 'nothing' } as const)
);

describe('Property 7: every drop has exactly one outcome', () => {
  /**
   * Feature: fix-pack, Property 7: Every drop has exactly one outcome
   * **Validates: Requirements 17.2, 17.3, 17.4, 17.5, 17.6**
   */
  test('there is always one outcome, and the same drop always gives it', () => {
    fc.assert(
      fc.property(sources, targets, (source, target) => {
        const first = dropOutcome(source, target);
        expect(['reveal-then-pin', 'pin', 'open', 'unpin', 'settle', 'return']).toContain(first.kind);
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
        if (outcome.kind === 'pin' || outcome.kind === 'reveal-then-pin') {
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
  test('a drop on the source\'s own note or the tray it came from, or on nothing, goes back', () => {
    fc.assert(
      fc.property(theoryId, fc.constantFrom('board', 'tray'), (id, from) => {
        const source: DragSource = from === 'board' ? { from, theoryId: id } : { from };
        const own: DropTarget = from === 'board' ? { kind: 'theory', theoryId: id } : { kind: 'tray' };
        expect(dropOutcome(source, own)).toEqual({ kind: 'return' });
      }),
      { numRuns: 100 }
    );
    fc.assert(
      fc.property(sources, source => {
        expect(dropOutcome(source, { kind: 'nothing' })).toEqual({ kind: 'return' });
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: fix-pack, Property 7: Every drop has exactly one outcome
   * **Validates: Requirements 17.2, 17.3, 17.4**
   */
  test('only a sealed floor file is read before it is pinned; only floor files open or settle', () => {
    fc.assert(
      fc.property(sources, targets, (source, target) => {
        const outcome = dropOutcome(source, target);
        if (outcome.kind === 'reveal-then-pin') {
          expect(source).toEqual({ from: 'floor', sealed: true });
        }
        if (outcome.kind === 'open' || outcome.kind === 'settle') {
          expect(source.from).toBe('floor');
        }
        if (outcome.kind === 'unpin') {
          expect(['board', 'tray']).toContain(source.from);
          expect(target.kind).toBe('floor');
        }
      }),
      { numRuns: 300 }
    );
  });
});
