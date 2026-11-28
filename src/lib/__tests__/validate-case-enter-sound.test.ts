// src/lib/__tests__/validate-case-enter-sound.test.ts
// validateCase and a chapter's optional whoosh (quick fixes, 1): `StorySection.enterSound`, true or false. A case
// without it is valid (its chapters enter quietly).
import { describe, expect, test } from 'vitest';
import maryCeleste from '@/cases/mary-celeste/case';
import { validateCase } from '@/lib/validate-case';
import type { Case } from '@/types/case';

/** A minimal valid case. The content is test data, not history. */
function createCase(enterSound?: unknown): Case {
  return {
    id: 'test-case',
    title: 'Test case',
    year: 1900,
    teaser: 'Test teaser',
    hook: { lines: ['Test line'], dateline: 'Test dateline' },
    story: [
      {
        id: 's-one',
        heading: 'Test heading',
        body: ['Test paragraph'],
        ...(enterSound === undefined ? {} : { enterSound: enterSound as boolean }),
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

const errorsOf = (caseData: Case) => validateCase(caseData).filter(error => error.includes('enterSound'));

describe('validateCase: StorySection.enterSound', () => {
  test('optional; true or false is valid', () => {
    expect(errorsOf(createCase())).toEqual([]);
    expect(errorsOf(createCase(true))).toEqual([]);
    expect(errorsOf(createCase(false))).toEqual([]);
  });

  test('anything else is an error naming the chapter', () => {
    for (const bad of ['yes', 1, null, {}]) {
      expect(errorsOf(createCase(bad))).toEqual(['Field story[0].enterSound: Must be true or false']);
    }
  });

  test('the Mary Celeste marks no chapter (no whoosh)', () => {
    expect(maryCeleste.story.filter(section => section.enterSound === true).map(section => section.id)).toEqual([]);
    expect(errorsOf(maryCeleste)).toEqual([]);
  });
});
