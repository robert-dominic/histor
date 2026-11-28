// src/lib/__tests__/validate-case-playlists.test.ts
// validateCase and the optional playlists (Requirement 13.10): story and desk, each an optional array of tracks with
// non-empty src, title and credit. Without them, no music.
import { describe, expect, test } from 'vitest';
import maryCeleste from '@/cases/mary-celeste/case';
import { validateCase } from '@/lib/validate-case';
import type { Case, CaseTheme } from '@/types/case';

/** A minimal valid case. The content is test data, not history. */
function createCase(playlists?: unknown): Case {
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
    theme: { id: 'test-theme', ...(playlists === undefined ? {} : { playlists: playlists as CaseTheme['playlists'] }) },
  };
}

const track = { src: '/audio/music/test/story/one.mp3', title: 'One', credit: 'Pixabay' };

describe('validateCase: theme.playlists', () => {
  test('a case without playlists is valid (it has no music)', () => {
    expect(validateCase(createCase())).toEqual([]);
  });

  test('a story playlist, a desk playlist, or only one of them, is valid', () => {
    expect(validateCase(createCase({ story: [track], desk: [track] }))).toEqual([]);
    expect(validateCase(createCase({ desk: [track] }))).toEqual([]);
    expect(validateCase(createCase({}))).toEqual([]);
  });

  test.each(['src', 'title', 'credit'] as const)('reports a track with an empty or missing %s', part => {
    expect(validateCase(createCase({ story: [{ ...track, [part]: ' ' }] }))).toEqual([`Field theme.playlists.story[0].${part}: Must be a non-empty string`]);
    const partial: Record<string, string> = { ...track };
    delete partial[part];
    expect(validateCase(createCase({ desk: [partial] }))).toEqual([`Field theme.playlists.desk[0].${part}: Must be a non-empty string`]);
  });

  test('reports playlists that are not an object, and a playlist that is not an array', () => {
    expect(validateCase(createCase([track]))).toEqual(['Field theme.playlists: Must be an object with optional story and desk playlists']);
    expect(validateCase(createCase({ story: track }))).toEqual(['Field theme.playlists.story: Must be an array of tracks']);
  });

  test('the Mary Celeste validates, with or without its imported music', () => {
    expect(validateCase(maryCeleste)).toEqual([]);
  });
});
