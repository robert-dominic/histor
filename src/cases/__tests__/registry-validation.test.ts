// src/cases/__tests__/registry-validation.test.ts
// Task 8 checkpoint: every open case in the registry must pass validateCase with zero errors.
// This is the guarantee that case content is sound. If a case fails here, fix the case, never the validator.
import { describe, expect, test } from 'vitest';
import { registry } from '@/cases';
import { validateCase } from '@/lib/validate-case';
import type { RegistryEntry } from '@/types/case';

type OpenEntry = Extract<RegistryEntry, { sealed: false }>;

const openEntries = registry.filter((entry): entry is OpenEntry => !entry.sealed);

describe('Registry: every open case is valid', () => {
  test('the registry has at least one open case', () => {
    expect(openEntries.length).toBeGreaterThan(0);
  });

  test.each(openEntries.map(entry => [entry.id, entry] as const))(
    'open case "%s" passes validateCase with zero errors',
    (_id, entry) => {
      // toEqual([]) prints every validation error when the case is invalid.
      expect(validateCase(entry.data)).toEqual([]);
    }
  );

  test.each(openEntries.map(entry => [entry.id, entry] as const))(
    'open case "%s": the registry entry matches its case data',
    (_id, entry) => {
      expect(entry.data.id).toBe(entry.id);
      expect(entry.data.title).toBe(entry.title);
      expect(entry.data.year).toBe(entry.year);
      expect(entry.data.teaser).toBe(entry.teaser);
    }
  );
});
