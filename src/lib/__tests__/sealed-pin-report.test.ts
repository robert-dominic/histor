// src/lib/__tests__/sealed-pin-report.test.ts
// A sealed file can be pinned without opening it (desk-fixes item 2). The case report is unchanged by that: a
// sealed pin is read by historians the same way, but its status stays sealed (night-run 2.4): the report shows it as
// unopened, the file still counts as never opened, and it never counts against the verdict or as a legend trusted.
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

  test('the pin is read by historians as if opened, but its status stays sealed: it shows as unopened', () => {
    const asSealed = buildCaseReport(CASE, sealedState);
    const asOpened = buildCaseReport(CASE, openedState);
    const strip = <T extends { status: unknown }>(entries: T[]) => entries.map(entry => ({ ...entry, status: undefined }));
    expect(strip(asSealed.pins)).toEqual(strip(asOpened.pins));
    expect(asSealed.pins.find(pin => pin.evidenceId === sealed.id)?.status).toBeNull();
    expect(asSealed.reliedOn.find(entry => entry.evidenceId === sealed.id)?.status).toBeNull();
    expect(asOpened.reliedOn.find(entry => entry.evidenceId === sealed.id)?.status).toBe(sealed.status);
  });

  test('a sealed legend is not counted as a legend trusted: that would give its status away', () => {
    const legend = CASE.evidence.find(evidence => evidence.status === 'legend' && !threshold.includes(evidence.id))!;
    const theory = CASE.theories[0].id;
    const report = buildCaseReport(CASE, { opened: threshold, pins: { [legend.id]: theory }, verdict: theory });
    expect(report.legendsTrusted).toEqual([]);
  });

  test('a never-opened entry carries no status', () => {
    const entry = buildCaseReport(CASE, sealedState).neverOpened.find(item => item.evidenceId === sealed.id)!;
    expect(entry).not.toHaveProperty('status');
  });
});
