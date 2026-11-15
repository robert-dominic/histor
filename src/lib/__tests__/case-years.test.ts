// src/lib/__tests__/case-years.test.ts
import { describe, expect, test } from 'vitest';
import { formatCaseYears } from '@/lib/case-years';

describe('formatCaseYears', () => {
  test('a case within one year shows that year', () => {
    expect(formatCaseYears(1888)).toBe('1888');
  });

  test('a case that spans years shows both, joined by an en dash', () => {
    expect(formatCaseYears(1872, 1873)).toBe('1872 – 1873');
  });

  test('an end year equal to the start shows one year', () => {
    expect(formatCaseYears(1872, 1872)).toBe('1872');
  });

  test('an end year before the start is ignored (the validator reports it)', () => {
    expect(formatCaseYears(1872, 1871)).toBe('1872');
  });
});
