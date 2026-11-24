// src/lib/__tests__/validate-case-hook-sound.test.ts
// validateCase and a chapter's optional dread sound (review-fixes brief, 7): `StorySection.hookSound`, one of the
// pool, on a chapter that has a hook. A case without it is valid (each hook then picks from the pool).
import { describe, expect, test } from 'vitest';
import maryCeleste from '@/cases/mary-celeste/case';
import { validateCase } from '@/lib/validate-case';
import { HOOK_SOUNDS, type Case, type HookSound } from '@/types/case';

/** A minimal valid case. The content is test data, not history. */
function createCase(section: { hook?: string; hookSound?: unknown }): Case {
  return {
    id: 'test-case',
    title: 'Test case',
    year: 1900,
    teaser: 'Test teaser',
    legendIntro: { lines: ['Test line'], stamp: 'Test stamp', debunk: 'Test debunk' },
    story: [
      {
        id: 's-one',
        heading: 'Test heading',
        body: ['Test paragraph'],
        ...(section.hook === undefined ? {} : { hook: section.hook }),
        ...(section.hookSound === undefined ? {} : { hookSound: section.hookSound as HookSound }),
      },
    ],
    centralQuestion: 'Test question?',
    fork: { prompt: 'Test prompt', investigateLabel: 'Investigate', leaveLabel: 'Leave' },
    theories: [{ id: 't-one', title: 'Theory one', claim: 'Claim one', standing: 'leading', standingReason: 'Reason one' }],
    evidence: [
      {
        id: 'e-one',
        title: 'Evidence one',
        detail: ['Detail one'],
        sources: ['src-one'],
        reading: { supports: ['t-one'], weakens: [], note: 'Note one' },
        status: 'record',
      },
    ],
    sources: [{ id: 'src-one', title: 'Source one', kind: 'official', citation: 'Test citation' }],
    references: [],
    historiansSummary: ['Test summary'],
    closeThreshold: 1,
    theme: { id: 'test-theme' },
  };
}

const hookSoundErrors = (caseData: Case) => validateCase(caseData).filter(error => error.includes('hookSound'));

describe('validateCase: StorySection.hookSound', () => {
  test('optional: a hook without one is valid, and so is the Mary Celeste', () => {
    expect(hookSoundErrors(createCase({ hook: 'Test hook' }))).toEqual([]);
    expect(validateCase(maryCeleste)).toEqual([]);
  });

  test('each of the six pool sounds is accepted on a chapter with a hook', () => {
    for (const hookSound of HOOK_SOUNDS) {
      expect(hookSoundErrors(createCase({ hook: 'Test hook', hookSound }))).toEqual([]);
    }
  });

  test('anything else is an error', () => {
    for (const hookSound of ['bang', '', 3, null]) {
      expect(hookSoundErrors(createCase({ hook: 'Test hook', hookSound }))).toEqual([
        `Field story[0].hookSound: Must be one of ${HOOK_SOUNDS.join(', ')}`,
      ]);
    }
  });

  test('a hook sound on a chapter with no hook is an error', () => {
    expect(hookSoundErrors(createCase({ hookSound: 'thunder' }))).toEqual(['Field story[0].hookSound: The section must have a hook']);
  });
});
