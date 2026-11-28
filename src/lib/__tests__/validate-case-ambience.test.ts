// src/lib/__tests__/validate-case-ambience.test.ts
// validateCase and the optional ambience (Requirement 13.7, 13.8): when theme.ambience is present, story and desk are
// arrays of known ambience layers, none listed twice.
import { describe, expect, test } from 'vitest';
import maryCeleste from '@/cases/mary-celeste/case';
import { validateCase } from '@/lib/validate-case';
import type { Case, CaseAmbience } from '@/types/case';

/** A minimal valid case. The content is test data, not history. */
function createCase(ambience?: unknown): Case {
  return {
    id: 'test-case',
    title: 'Test case',
    year: 1900,
    teaser: 'Test teaser',
    hook: { lines: ['Test line'], dateline: 'Test dateline' },
    story: [{ id: 's-one', heading: 'Test heading', body: ['Test paragraph'] }],
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
    theme: { id: 'test-theme', ...(ambience === undefined ? {} : { ambience: ambience as CaseAmbience }) },
  };
}

describe('validateCase: theme.ambience', () => {
  test('a case without an ambience is valid (it is silent but for its effects)', () => {
    expect(validateCase(createCase())).toEqual([]);
  });

  test('a case with known layers is valid; an empty list is valid too', () => {
    expect(validateCase(createCase({ story: ['sea', 'wind', 'timber'], desk: [] }))).toEqual([]);
  });

  test('reports a layer the sound cannot make', () => {
    expect(validateCase(createCase({ story: ['sea', 'rain'], desk: [] }))).toEqual([
      'Field theme.ambience.story[1]: Must be one of sea, wind, timber, room-tone, lamp-hum, distant-sea',
    ]);
  });

  test('reports a layer listed twice', () => {
    expect(validateCase(createCase({ story: [], desk: ['lamp-hum', 'lamp-hum'] }))).toEqual([
      "Field theme.ambience.desk[1]: 'lamp-hum' is listed twice",
    ]);
  });

  test('reports a place that is not an array', () => {
    expect(validateCase(createCase({ story: 'sea' }))).toEqual([
      'Field theme.ambience.story: Must be an array of ambience layers',
      'Field theme.ambience.desk: Must be an array of ambience layers',
    ]);
  });

  test('the Mary Celeste: the sea, the wind and the timber under the story; a quiet room at the desk', () => {
    expect(maryCeleste.theme.ambience).toMatchObject({ story: ['sea', 'wind', 'timber'], desk: ['room-tone', 'lamp-hum', 'distant-sea'] });
  });

  test('cues: each names a story chapter and a known sound', () => {
    expect(validateCase(createCase({ story: [], desk: [], cues: [{ chapter: 's-one', sound: 'ships-bell' }] }))).toEqual([]);
    expect(validateCase(createCase({ story: [], desk: [], cues: [{ chapter: 's-none', sound: 'gong' }] }))).toEqual([
      'Field theme.ambience.cues[0].chapter: Must be the id of a story chapter',
      'Field theme.ambience.cues[0].sound: Must be one of ships-bell',
    ]);
    expect(validateCase(createCase({ story: [], desk: [], cues: 'bell' }))).toEqual(['Field theme.ambience.cues: Must be an array']);
  });

  test('the Mary Celeste: a ship\'s bell as the Dei Gratia sights her (s-found), and the case validates', () => {
    expect(maryCeleste.theme.ambience?.cues).toEqual([{ chapter: 's-found', sound: 'ships-bell' }]);
    expect(validateCase(maryCeleste)).toEqual([]);
  });
});
