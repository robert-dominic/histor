// @vitest-environment jsdom
// src/lib/__tests__/closed-on.test.ts
// The day a case was closed (quick fixes, 5): kept as YYYY-MM-DD when it closes; today when it was not kept. And the
// certificate's number: the same for the same name and day.
import { afterEach, describe, expect, test } from 'vitest';
import { caseNumber, formatCertDate } from '@/lib/certificate';
import { dayAsDate, loadClosedOn, saveClosedOn } from '@/lib/closed-on';

afterEach(() => localStorage.clear());

describe('the day a case closed', () => {
  test('saved as it closes, read back; today when nothing was kept or it is not a day', () => {
    const today = new Date(2026, 10, 25, 9);
    expect(loadClosedOn('c', today)).toBe('2026-11-25');
    saveClosedOn('c', new Date(2026, 0, 3, 23));
    expect(loadClosedOn('c', today)).toBe('2026-01-03');
    localStorage.setItem('histor:closed-on:c', 'yesterday');
    expect(loadClosedOn('c', today)).toBe('2026-11-25');
    expect(dayAsDate('2026-01-03').getDate()).toBe(3);
  });

  test('the certificate dates it; its number is stable, four digits, and changes with the name or the day', () => {
    expect(formatCertDate('2026-11-25')).toBe('25 November 2026');
    expect(formatCertDate('2026-02-30')).toBeNull();
    expect(caseNumber('Ann Lee', '2026-11-25')).toMatch(/^No\. \d{4}$/);
    expect(caseNumber(' ann lee ', '2026-11-25')).toBe(caseNumber('Ann Lee', '2026-11-25'));
    expect(caseNumber('Ann Lee', '2026-11-26')).not.toBe(caseNumber('Ann Lee', '2026-11-25'));
  });
});
