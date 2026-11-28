// src/lib/__tests__/validate-case-roll-call-voyage.test.ts
// validateCase and the fields added for the cinematic story (data-foundation requirements 3.14 and 3.15):
// - StorySection.rollCall: when present, every name and role is a non-empty string
// - Case.voyage: when present, points with unique ids, labels, valid positions, a chapter in the story and a kind
import { describe, expect, test } from 'vitest';
import maryCeleste from '@/cases/mary-celeste/case';
import { storyFixture } from '@/test/story-fixture';
import { validateCase } from '@/lib/validate-case';
import type { Case, RollCallEntry, VoyagePoint } from '@/types/case';

/** A minimal valid case. The content is test data, not history. */
function createCase(overrides: Partial<Case> = {}): Case {
  return {
    id: 'test-case',
    title: 'Test case',
    year: 1900,
    teaser: 'Test teaser',
    legendIntro: { lines: ['Test line'], stamp: 'Test stamp', debunk: 'Test debunk' },
    story: [
      { id: 's-one', heading: 'Heading one', body: ['Paragraph one'] },
      { id: 's-two', heading: 'Heading two', body: ['Paragraph two'] },
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
    sources: [{ id: 'src-one', title: 'Source one', kind: 'official', citation: 'Citation one' }],
    references: [],
    historiansSummary: ['Summary one'],
    closeThreshold: 1,
    theme: { id: 'test-theme' },
    ...overrides,
  };
}

const withRollCall = (rollCall: unknown) =>
  createCase({
    story: [
      { id: 's-one', heading: 'Heading one', body: ['Paragraph one'], rollCall: rollCall as RollCallEntry[] },
      { id: 's-two', heading: 'Heading two', body: ['Paragraph two'] },
    ],
  });

const point = (overrides: Partial<VoyagePoint> = {}): VoyagePoint => ({
  id: 'port-one',
  label: 'Test port',
  lat: 10,
  lon: -20,
  chapter: 's-one',
  kind: 'port',
  ...overrides,
});

const withPoints = (points: unknown) => createCase({ voyage: { points: points as VoyagePoint[] } });

describe('validateCase: roll call', () => {
  test('accepts a section without a roll call, and a roll call with names and roles', () => {
    expect(validateCase(createCase())).toEqual([]);
    expect(validateCase(withRollCall([{ name: 'Test person', role: 'test role' }]))).toEqual([]);
  });

  test.each(['name', 'role'] as const)('reports an empty %s, with where it is', field => {
    const entry = { name: 'Test person', role: 'test role', [field]: '  ' };
    expect(validateCase(withRollCall([{ name: 'First', role: 'first role' }, entry]))).toEqual([
      `Field story[0].rollCall[1].${field}: Must be a non-empty string`,
    ]);
  });

  test.each(['name', 'role'] as const)('reports a missing %s', field => {
    const entry: Record<string, string> = { name: 'Test person', role: 'test role' };
    delete entry[field];
    expect(validateCase(withRollCall([entry]))).toEqual([`Field story[0].rollCall[0].${field}: Must be a non-empty string`]);
  });

  test('reports a roll call that is not an array', () => {
    expect(validateCase(withRollCall('Test person'))).toEqual(['Field story[0].rollCall: Must be an array']);
  });

  test('the Mary Celeste roll call has ten people, all named, in order', () => {
    const rollCall = storyFixture.story[0].rollCall ?? [];
    expect(rollCall.map(entry => entry.name)).toEqual([
      'Benjamin Briggs',
      'Sarah Briggs',
      'Sophia Briggs',
      'Albert Richardson',
      'Andrew Gilling',
      'William Head',
      'Volkert Lorenzen',
      'Boz Lorenzen',
      'Arian Martens',
      'Gottlieb Goodschaal',
    ]);
    expect(rollCall.every(entry => entry.role.trim() !== '')).toBe(true);
  });
});

describe('validateCase: voyage', () => {
  test('accepts a case without a voyage, and a voyage with valid points', () => {
    expect(validateCase(createCase())).toEqual([]);
    expect(
      validateCase(withPoints([point(), point({ id: 'port-two', chapter: 's-two', kind: 'found', unreached: true })]))
    ).toEqual([]);
  });

  test('reports a voyage with no points', () => {
    expect(validateCase(withPoints([]))).toEqual(['Field voyage.points: Must contain at least one point']);
    expect(validateCase(withPoints(undefined))).toEqual(['Field voyage.points: Must contain at least one point']);
  });

  test('reports an empty id and an empty label', () => {
    expect(validateCase(withPoints([point({ id: '' })]))).toEqual(['Field voyage.points[0].id: Must be a non-empty string']);
    expect(validateCase(withPoints([point({ label: ' ' })]))).toEqual([
      'Field voyage.points[0].label: Must be a non-empty string',
    ]);
  });

  test('reports a duplicate id', () => {
    expect(validateCase(withPoints([point(), point()]))).toEqual(["Field voyage.points: duplicate ID 'port-one' found"]);
  });

  test.each([
    ['lat', 90.5, 'Field voyage.points[0].lat: Must be a number from -90 to 90'],
    ['lat', -91, 'Field voyage.points[0].lat: Must be a number from -90 to 90'],
    ['lat', Number.NaN, 'Field voyage.points[0].lat: Must be a number from -90 to 90'],
    ['lon', 180.1, 'Field voyage.points[0].lon: Must be a number from -180 to 180'],
    ['lon', '-20', 'Field voyage.points[0].lon: Must be a number from -180 to 180'],
  ] as const)('reports %s = %s', (field, value, message) => {
    expect(validateCase(withPoints([point({ [field]: value } as Partial<VoyagePoint>)]))).toEqual([message]);
  });

  test('accepts the edges of the globe', () => {
    expect(validateCase(withPoints([point({ lat: -90, lon: 180 }), point({ id: 'p2', lat: 90, lon: -180 })]))).toEqual([]);
  });

  test('reports a chapter that is not in the story', () => {
    expect(validateCase(withPoints([point({ chapter: 's-missing' })]))).toEqual([
      "Field voyage.points[0].chapter: reference ID 's-missing' not found in story",
    ]);
  });

  test('reports an unknown kind, and an unreached flag that is not a boolean', () => {
    expect(validateCase(withPoints([point({ kind: 'harbour' as VoyagePoint['kind'] })]))).toEqual([
      'Field voyage.points[0].kind: Must be one of: port, record, found',
    ]);
    expect(validateCase(withPoints([point({ unreached: 'yes' as unknown as boolean })]))).toEqual([
      'Field voyage.points[0].unreached: Must be a boolean',
    ]);
  });

  test('reports a point that is not an object, field by field', () => {
    expect(validateCase(withPoints([null]))).toEqual([
      'Field voyage.points[0].id: Must be a non-empty string',
      'Field voyage.points[0].label: Must be a non-empty string',
      'Field voyage.points[0].lat: Must be a number from -90 to 90',
      'Field voyage.points[0].lon: Must be a number from -180 to 180',
      "Field voyage.points[0].chapter: reference ID 'undefined' not found in story",
      'Field voyage.points[0].kind: Must be one of: port, record, found',
    ]);
  });

  test('the Mary Celeste voyage: six points, Genoa never reached', () => {
    const points = maryCeleste.voyage?.points ?? [];
    expect(points.map(item => item.id)).toEqual(['new-york', 'last-log', 'last-slate', 'found', 'gibraltar', 'genoa']);
    expect(points.filter(item => item.unreached).map(item => item.id)).toEqual(['genoa']);
    expect(validateCase(maryCeleste)).toEqual([]);
  });
});
