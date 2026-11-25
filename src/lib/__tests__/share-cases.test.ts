// src/lib/__tests__/share-cases.test.ts
// The shared certificate's catalogue (quick fixes, 5) is the registry's own data: every open case, its title, years
// and theories, each theory's title and whether it was ruled out.
import { describe, expect, test } from 'vitest';
import { registry } from '@/cases';
import { formatCaseYears } from '@/lib/case-years';
import { SHARE_CASES } from '@/lib/share-cases';

describe('the share catalogue', () => {
  test('matches every open case in the registry', () => {
    const open = registry.flatMap(entry => (entry.sealed || entry.data === undefined ? [] : [entry.data]));
    expect(Object.keys(SHARE_CASES).sort()).toEqual(open.map(caseData => caseData.id).sort());
    for (const caseData of open) {
      expect(SHARE_CASES[caseData.id]).toEqual({
        title: caseData.title,
        years: formatCaseYears(caseData.year, caseData.yearEnd),
        theories: Object.fromEntries(caseData.theories.map(theory => [theory.id, { title: theory.title, rejected: theory.standing === 'rejected' }])),
      });
    }
  });
});
