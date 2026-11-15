// src/lib/__tests__/case-report.test.ts
// Task 1.2 of .kiro/specs/case-report: buildCaseReport against the real Mary Celeste case, with hand-built states.
// Titles, notes and origins are read from the case data, so these tests check the rules, not the wording.
import { describe, expect, test } from 'vitest';
import maryCeleste from '@/cases/mary-celeste/case';
import { buildCaseReport } from '@/lib/case-report';
import type { Evidence, InvestigationState, PinTarget, Theory } from '@/types/case';

const evidence = (id: string): Evidence => {
  const found = maryCeleste.evidence.find(item => item.id === id);
  if (found === undefined) {
    throw new Error(`Test setup: no evidence "${id}" in the Mary Celeste case`);
  }
  return found;
};

const theory = (id: string): Theory => {
  const found = maryCeleste.theories.find(item => item.id === id);
  if (found === undefined) {
    throw new Error(`Test setup: no theory "${id}" in the Mary Celeste case`);
  }
  return found;
};

const legendOrigin = (id: string): string => {
  const item = evidence(id);
  if (item.status !== 'legend') {
    throw new Error(`Test setup: "${id}" is not a legend`);
  }
  return item.origin;
};

const state = (
  opened: string[],
  pins: Record<string, PinTarget>,
  verdict: string | null
): InvestigationState => ({ opened, pins, verdict });

const ids = (entries: { evidenceId: string }[]) => entries.map(entry => entry.evidenceId);

/** The design's worked example. */
const workedExample = state(
  ['e-water', 'e-lifeboat'],
  { 'e-sword': 't-mutiny', 'e-legend-breakfast': 't-sinking', 'e-lifeboat': 't-sinking', 'e-findings': 'none' },
  't-sinking'
);

describe('buildCaseReport: the worked example (verdict "She was sinking")', () => {
  const report = buildCaseReport(maryCeleste, workedExample);

  test('the verdict reveals the chosen theory with its standing and reason', () => {
    const sinking = theory('t-sinking');
    expect(report.verdict).toStrictEqual({
      theoryId: 't-sinking',
      title: sinking.title,
      claim: sinking.claim,
      standing: sinking.standing,
      standingReason: sinking.standingReason,
    });
  });

  test('every pin, in case order, with how historians read it', () => {
    expect(report.pins).toStrictEqual([
      {
        evidenceId: 'e-lifeboat',
        title: evidence('e-lifeboat').title,
        status: 'record',
        target: 't-sinking',
        reading: 'agree',
        note: evidence('e-lifeboat').reading.note,
      },
      {
        evidenceId: 'e-findings',
        title: evidence('e-findings').title,
        status: 'record',
        target: 'none',
        // It supports no theory, so "None of them" agrees.
        reading: 'agree',
        note: evidence('e-findings').reading.note,
      },
      {
        evidenceId: 'e-sword',
        title: evidence('e-sword').title,
        status: 'disputed',
        target: 't-mutiny',
        reading: 'disagree',
        note: evidence('e-sword').reading.note,
      },
      {
        evidenceId: 'e-legend-breakfast',
        title: evidence('e-legend-breakfast').title,
        status: 'legend',
        target: 't-sinking',
        reading: 'no-link',
        note: evidence('e-legend-breakfast').reading.note,
      },
    ]);
  });

  test('relied on: the files pinned to the verdict', () => {
    expect(report.reliedOn).toStrictEqual([
      { evidenceId: 'e-lifeboat', title: evidence('e-lifeboat').title, status: 'record', reading: 'agree' },
      {
        evidenceId: 'e-legend-breakfast',
        title: evidence('e-legend-breakfast').title,
        status: 'legend',
        reading: 'no-link',
      },
    ]);
  });

  test('against your verdict: nothing in the case weakens this theory', () => {
    expect(report.againstVerdict).toStrictEqual([]);
  });

  test('never opened: the unopened files linked to the verdict, in case order', () => {
    expect(report.neverOpened).toStrictEqual(
      ['e-instruments', 'e-last-note', 'e-pump', 'e-belongings', 'e-course-change'].map(id => ({
        evidenceId: id,
        title: evidence(id).title,
        link: 'supports',
      }))
    );
  });

  test('legends trusted: the legend pinned to a theory, with where it came from', () => {
    expect(report.legendsTrusted).toStrictEqual([
      {
        evidenceId: 'e-legend-breakfast',
        title: evidence('e-legend-breakfast').title,
        theoryId: 't-sinking',
        origin: legendOrigin('e-legend-breakfast'),
      },
    ]);
  });
});

describe('buildCaseReport: a verdict the evidence counts against ("Drunken mutiny")', () => {
  const report = buildCaseReport(maryCeleste, state(['e-sword', 'e-cargo-food'], {}, 't-mutiny'));

  test('against your verdict: the opened files that weaken it, in case order', () => {
    expect(report.againstVerdict).toStrictEqual(
      ['e-cargo-food', 'e-sword'].map(id => ({
        evidenceId: id,
        title: evidence(id).title,
        status: evidence(id).status,
        note: evidence(id).reading.note,
      }))
    );
  });

  test('never opened: files that support it and files that weaken it, in case order', () => {
    expect(report.neverOpened).toStrictEqual([
      { evidenceId: 'e-lifeboat', title: evidence('e-lifeboat').title, link: 'supports' },
      { evidenceId: 'e-findings', title: evidence('e-findings').title, link: 'weakens' },
      { evidenceId: 'e-bow-marks', title: evidence('e-bow-marks').title, link: 'weakens' },
    ]);
  });

  test('a file that was opened is never listed as never opened', () => {
    expect(ids(report.neverOpened)).not.toContain('e-sword');
    expect(ids(report.neverOpened)).not.toContain('e-cargo-food');
  });
});

describe('buildCaseReport: no verdict', () => {
  const pins: Record<string, PinTarget> = { 'e-lifeboat': 't-sinking', 'e-legend-towed': 't-fraud' };

  test.each([
    ['no verdict yet', null],
    ['a verdict that is not in the case', 't-not-in-case'],
  ])('%s: the verdict parts are empty, the rest is still filled', (_label, verdict) => {
    const report = buildCaseReport(maryCeleste, state(['e-lifeboat'], pins, verdict));

    expect(report.verdict).toBeNull();
    expect(report.reliedOn).toStrictEqual([]);
    expect(report.againstVerdict).toStrictEqual([]);
    expect(report.neverOpened).toStrictEqual([]);

    expect(ids(report.pins)).toStrictEqual(['e-lifeboat', 'e-legend-towed']);
    expect(report.legendsTrusted).toStrictEqual([
      {
        evidenceId: 'e-legend-towed',
        title: evidence('e-legend-towed').title,
        theoryId: 't-fraud',
        origin: legendOrigin('e-legend-towed'),
      },
    ]);
    expect(report.historiansStand.theories).toHaveLength(maryCeleste.theories.length);
  });
});

describe('buildCaseReport: legends and ignored ids', () => {
  test('a legend pinned to "None of them" is a pin, but not a legend trusted', () => {
    const report = buildCaseReport(maryCeleste, state([], { 'e-legend-cat': 'none' }, 't-sinking'));

    expect(report.pins).toHaveLength(1);
    expect(report.pins[0]).toMatchObject({ evidenceId: 'e-legend-cat', target: 'none', reading: 'agree' });
    expect(report.legendsTrusted).toStrictEqual([]);
  });

  test('pins to an unknown theory, pins on unknown evidence, and unknown or repeated opened ids are ignored', () => {
    const messy = buildCaseReport(
      maryCeleste,
      state(
        ['e-water', 'e-water', 'e-not-in-case', 'e-lifeboat'],
        {
          'e-lifeboat': 't-sinking',
          'e-sword': 't-not-in-case',
          'e-not-in-case': 't-sinking',
        },
        't-sinking'
      )
    );
    const clean = buildCaseReport(
      maryCeleste,
      state(['e-water', 'e-lifeboat'], { 'e-lifeboat': 't-sinking' }, 't-sinking')
    );

    expect(messy).toStrictEqual(clean);
    expect(ids(messy.pins)).toStrictEqual(['e-lifeboat']);
  });
});

describe('buildCaseReport: where historians stand', () => {
  const report = buildCaseReport(maryCeleste, workedExample);

  test('every theory, in case order, with its standing and reason', () => {
    expect(report.historiansStand.theories).toStrictEqual(
      maryCeleste.theories.map(item => ({
        theoryId: item.id,
        title: item.title,
        standing: item.standing,
        standingReason: item.standingReason,
      }))
    );
    expect(report.historiansStand.theories.map(item => item.theoryId)).toStrictEqual([
      't-sinking',
      't-explosion',
      't-mutiny',
      't-salvage-murder',
      't-fraud',
    ]);
  });

  test("the historians' summary, unchanged, in its own copy", () => {
    expect(report.historiansStand.summary).toStrictEqual(maryCeleste.historiansSummary);
    expect(report.historiansStand.summary).toHaveLength(3);
    expect(report.historiansStand.summary).not.toBe(maryCeleste.historiansSummary);
  });
});

describe('buildCaseReport: a mirror, not a grade', () => {
  test('a file never opened does not reveal its status', () => {
    const report = buildCaseReport(maryCeleste, state([], {}, 't-sinking'));

    expect(report.neverOpened.length).toBeGreaterThan(0);
    for (const entry of report.neverOpened) {
      expect(Object.hasOwn(entry, 'status')).toBe(false);
    }
  });

  test('no value anywhere in the report is a number or a boolean: no score, no right or wrong', () => {
    const report = buildCaseReport(maryCeleste, workedExample);
    const found: string[] = [];
    const walk = (value: unknown, path: string) => {
      if (typeof value === 'number' || typeof value === 'boolean') {
        found.push(path);
      } else if (Array.isArray(value)) {
        value.forEach((item, index) => walk(item, `${path}[${index}]`));
      } else if (typeof value === 'object' && value !== null) {
        Object.entries(value).forEach(([key, item]) => walk(item, `${path}.${key}`));
      }
    };
    walk(report, 'report');

    expect(found).toStrictEqual([]);
  });
});
