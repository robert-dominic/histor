// src/lib/__tests__/case-rank.test.ts
// The rank and the reveal's comparison, from the case report only (investigation brief, 3.1 and 3.2).
import { describe, expect, test } from 'vitest';
import maryCeleste from '@/cases/mary-celeste/case';
import { buildCaseReport } from '@/lib/case-report';
import { caseRank, leadingTheories, legendsTrustedCount, verdictComparison } from '@/lib/case-rank';
import { RANK_COPY, REVEAL_COPY } from '@/lib/ui-copy';
import type { InvestigationState } from '@/types/case';

const CASE = maryCeleste;
const leading = CASE.theories.find(theory => theory.standing === 'leading')!;
const rejected = CASE.theories.find(theory => theory.standing === 'rejected')!;
const legends = CASE.evidence.filter(evidence => evidence.status === 'legend');

/** A closed case: `legendCount` legends opened and pinned to the chosen theory. */
function reportFor(verdict: string, legendCount: number) {
  const trusted = legends.slice(0, legendCount);
  const state: InvestigationState = {
    opened: trusted.map(evidence => evidence.id),
    pins: Object.fromEntries(trusted.map(evidence => [evidence.id, verdict])),
    verdict,
  };
  return buildCaseReport(CASE, state);
}

describe('caseRank', () => {
  test('the case has the legends these tests need', () => {
    expect(legends.length).toBeGreaterThanOrEqual(2);
  });

  test('Historian: no legends trusted, and a leading theory chosen', () => {
    expect(caseRank(reportFor(leading.id, 0))).toBe('historian');
  });

  test('Investigator: a leading theory with one legend, or with several', () => {
    expect(caseRank(reportFor(leading.id, 1))).toBe('investigator');
    expect(caseRank(reportFor(leading.id, 2))).toBe('investigator');
  });

  test('Investigator: a theory ruled out, with no legend or with one', () => {
    expect(caseRank(reportFor(rejected.id, 0))).toBe('investigator');
    expect(caseRank(reportFor(rejected.id, 1))).toBe('investigator');
  });

  test('Deckhand: a theory ruled out, and two legends or more trusted', () => {
    expect(caseRank(reportFor(rejected.id, 2))).toBe('deckhand');
  });

  test('a legend pinned without being opened was never trusted: it does not count', () => {
    const state: InvestigationState = { opened: [], pins: { [legends[0].id]: rejected.id, [legends[1].id]: rejected.id }, verdict: rejected.id };
    const report = buildCaseReport(CASE, state);
    expect(legendsTrustedCount(report)).toBe(0);
    expect(caseRank(report)).toBe('investigator');
  });

  test('every rank has a name and one short line', () => {
    for (const rank of Object.values(RANK_COPY)) {
      expect(rank.name.length).toBeGreaterThan(0);
      expect(rank.line.split(' ').length).toBeLessThanOrEqual(12);
    }
  });
});

describe('verdictComparison and leadingTheories', () => {
  test('the leading theories, in the case order', () => {
    expect(leadingTheories(reportFor(leading.id, 0)).map(theory => theory.theoryId)).toEqual(
      CASE.theories.filter(theory => theory.standing === 'leading').map(theory => theory.id)
    );
  });

  test('a leading theory: "You stand with the historians."', () => {
    expect(verdictComparison(reportFor(leading.id, 0))).toEqual({ kind: 'with', line: REVEAL_COPY.withHistorians });
  });

  test('a theory ruled out: the line, then its standing reason', () => {
    expect(verdictComparison(reportFor(rejected.id, 0))).toEqual({ kind: 'ruled-out', line: REVEAL_COPY.ruledOut, reason: rejected.standingReason });
  });

  test('a theory only considered: a neutral line, then its reason', () => {
    const report = reportFor(rejected.id, 0);
    const considered = { ...report, verdict: { ...report.verdict!, standing: 'considered' as const, standingReason: 'Test reason.' } };
    expect(verdictComparison(considered)).toEqual({ kind: 'considered', line: REVEAL_COPY.considered, reason: 'Test reason.' });
  });

  test('no verdict: nothing to compare', () => {
    const report = buildCaseReport(CASE, { opened: [], pins: {}, verdict: null });
    expect(verdictComparison(report).kind).toBe('none');
  });
});
