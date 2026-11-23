// src/lib/__tests__/sealed-pin-report.test.ts
// A sealed file can be pinned without opening it (desk-fixes item 2). The case report is unchanged by that: a
// sealed pin is read the same way as an opened one, the file still counts as never opened, and it never counts
// against the verdict (only opened files do).
import { describe, expect, test } from 'vitest';
import maryCeleste from '@/cases/mary-celeste/case';
import { buildCaseReport } from '@/lib/case-report';
import type { InvestigationState } from '@/types/case';

const CASE = maryCeleste;
const threshold = CASE.evidence.slice(0, CASE.closeThreshold).map(evidence => evidence.id);

describe('the case report with a sealed pin', () => {
  // A file that bears on a theory, pinned to it while sealed, with that theory as the verdict.
  const sealed = CASE.evidence.find(
    evidence => !threshold.includes(evidence.id) && evidence.reading.supports.length + evidence.reading.weakens.length > 0
  )!;
  const theory = sealed.reading.supports[0] ?? sealed.reading.weakens[0];
  const sealedState: InvestigationState = { opened: threshold, pins: { [sealed.id]: theory }, verdict: theory };
  const openedState: InvestigationState = { ...sealedState, opened: [...threshold, sealed.id] };

  test('pinning does not open the file: it stays in "What you never opened"', () => {
    const report = buildCaseReport(CASE, sealedState);
    expect(report.neverOpened.map(entry => entry.evidenceId)).toContain(sealed.id);
    expect(report.againstVerdict.map(entry => entry.evidenceId)).not.toContain(sealed.id);
  });

  test('the pin is read by historians exactly as if the file had been opened', () => {
    const asSealed = buildCaseReport(CASE, sealedState);
    const asOpened = buildCaseReport(CASE, openedState);
    expect(asSealed.pins).toEqual(asOpened.pins);
    expect(asSealed.reliedOn).toEqual(asOpened.reliedOn);
    expect(asSealed.legendsTrusted).toEqual(asOpened.legendsTrusted);
  });

  test('a never-opened entry carries no status', () => {
    const entry = buildCaseReport(CASE, sealedState).neverOpened.find(item => item.evidenceId === sealed.id)!;
    expect(entry).not.toHaveProperty('status');
  });
});
