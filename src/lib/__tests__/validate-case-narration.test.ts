// src/lib/__tests__/validate-case-narration.test.ts
// validateCase and the optional narration (Requirement 3.20): a chapter's narration and the central question's,
// each { src, credit } with both non-empty. A case without them is valid.
import { describe, expect, test } from 'vitest';
import maryCeleste from '@/cases/mary-celeste/case';
import { validateCase } from '@/lib/validate-case';
import type { Case, Narration } from '@/types/case';

/** A minimal valid case. The content is test data, not history. */
function createCase(extra: Partial<Record<'narration' | 'centralQuestionNarration', unknown>> = {}): Case {
  return {
    id: 'test-case',
    title: 'Test case',
    year: 1900,
    teaser: 'Test teaser',
    legendIntro: { lines: ['Test line'], stamp: 'Test stamp', debunk: 'Test debunk' },
    story: [{ id: 's-one', heading: 'Test heading', body: ['Test paragraph'], ...(extra.narration === undefined ? {} : { narration: extra.narration as Narration }) }],
    centralQuestion: 'Test question?',
    fork: { prompt: 'Test prompt', investigateLabel: 'Investigate', leaveLabel: 'Leave' },
    theories: [
      { id: 't-one', title: 'Theory one', claim: 'Claim one', standing: 'leading', standingReason: 'Reason one' },
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
    ],
    sources: [{ id: 'src-one', title: 'Source one', kind: 'official', citation: 'Test citation' }],
    references: [],
    historiansSummary: ['Test summary'],
    closeThreshold: 1,
    theme: { id: 'test-theme' },
    ...(extra.centralQuestionNarration === undefined ? {} : { centralQuestionNarration: extra.centralQuestionNarration as Narration }),
  };
}

const clip: Narration = { src: '/audio/s-one.mp3', credit: 'Read by a test voice' };

describe('validateCase: narration', () => {
  test('a case without narration is valid (the Mary Celeste has none yet)', () => {
    expect(validateCase(createCase())).toEqual([]);
    expect(maryCeleste.story.every(section => section.narration === undefined)).toBe(true);
    expect(maryCeleste.centralQuestionNarration).toBeUndefined();
  });

  test('a chapter, and the question, with a complete narration are valid', () => {
    expect(validateCase(createCase({ narration: clip, centralQuestionNarration: clip }))).toEqual([]);
  });

  test.each(['src', 'credit'] as const)('reports an empty or missing %s', part => {
    expect(validateCase(createCase({ narration: { ...clip, [part]: '  ' } }))).toEqual([`Field story[0].narration.${part}: Must be a non-empty string`]);
    const partial: Record<string, string> = { ...clip };
    delete partial[part];
    expect(validateCase(createCase({ centralQuestionNarration: partial }))).toEqual([`Field centralQuestionNarration.${part}: Must be a non-empty string`]);
  });

  test('reports a narration that is not an object', () => {
    expect(validateCase(createCase({ narration: 'clip.mp3' }))).toEqual([
      'Field story[0].narration.src: Must be a non-empty string',
      'Field story[0].narration.credit: Must be a non-empty string',
    ]);
  });
});
