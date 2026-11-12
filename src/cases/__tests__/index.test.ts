// src/cases/__tests__/index.test.ts
import { describe, test, expect } from 'vitest';
import { getCaseById, registry } from '../index';
import type { RegistryEntry } from '../../types/case';

describe('getCaseById - Task 4.3', () => {
  test('returns correct open entry for valid ID "mary-celeste"', () => {
    const result = getCaseById('mary-celeste');

    expect(result).toBeDefined();
    expect(result?.id).toBe('mary-celeste');
    expect(result?.title).toBe('The Mystery of the Mary Celeste');
    expect(result?.year).toBe(1872);
    expect(result?.sealed).toBe(false);
    expect((result as any)?.data).toBeDefined();
    expect((result as any)?.data?.id).toBe('mary-celeste');
  });

  test('returns correct sealed entry for valid ID "jack-the-ripper"', () => {
    const result = getCaseById('jack-the-ripper');

    expect(result).toBeDefined();
    expect(result?.id).toBe('jack-the-ripper');
    expect(result?.title).toBe('Jack the Ripper');
    expect(result?.year).toBe(1888);
    expect(result?.sealed).toBe(true);
    // Sealed entries should not have a data field
    expect((result as any)?.data).toBeUndefined();
  });

  test('returns undefined for invalid ID', () => {
    const result = getCaseById('non-existent-case');

    expect(result).toBeUndefined();
  });

  test('returns undefined for null', () => {
    const result = getCaseById(null);

    expect(result).toBeUndefined();
  });

  test('returns undefined for undefined', () => {
    const result = getCaseById(undefined);

    expect(result).toBeUndefined();
  });

  test('returns undefined for empty string', () => {
    const result = getCaseById('');

    expect(result).toBeUndefined();
  });

  test('open entry has correct structure with sealed flag and data field', () => {
    const result = getCaseById('mary-celeste') as Extract<RegistryEntry, { sealed: false }>;

    // Check required base fields
    expect(result.id).toBeDefined();
    expect(typeof result.id).toBe('string');
    expect(result.title).toBeDefined();
    expect(typeof result.title).toBe('string');
    expect(result.year).toBeDefined();
    expect(typeof result.year).toBe('number');
    expect(result.teaser).toBeDefined();
    expect(typeof result.teaser).toBe('string');

    // Check sealed flag is false for open case
    expect(result.sealed).toBe(false);

    // Check data field exists and is an object
    expect(result.data).toBeDefined();
    expect(typeof result.data).toBe('object');

    // Check case data structure
    expect(result.data.id).toBeDefined();
    expect(result.data.title).toBeDefined();
    expect(result.data.year).toBeDefined();
  });

  test('sealed entry has correct structure with sealed flag and no data field', () => {
    const result = getCaseById('jack-the-ripper') as Extract<RegistryEntry, { sealed: true }>;

    // Check required base fields
    expect(result.id).toBeDefined();
    expect(typeof result.id).toBe('string');
    expect(result.title).toBeDefined();
    expect(typeof result.title).toBe('string');
    expect(result.year).toBeDefined();
    expect(typeof result.year).toBe('number');
    expect(result.teaser).toBeDefined();
    expect(typeof result.teaser).toBe('string');

    // Check sealed flag is true for sealed case
    expect(result.sealed).toBe(true);

    // Check data field does not exist
    expect((result as any).data).toBeUndefined();
  });

  test('case IDs are exact matches (case-sensitive)', () => {
    // Should not find uppercase versions
    expect(getCaseById('MARY-CELESTE')).toBeUndefined();
    expect(getCaseById('Mary-Celeste')).toBeUndefined();

    // Should find exact lowercase
    expect(getCaseById('mary-celeste')).toBeDefined();
  });

  test('returns the first matching entry in registry order', () => {
    // Mary Celeste is first in the registry
    const firstEntry = registry[0];
    const result = getCaseById(firstEntry.id);

    expect(result).toBe(firstEntry);
  });

  test('handles whitespace-only strings as falsy', () => {
    const result = getCaseById('   ');

    // Whitespace-only strings should not match any ID
    expect(result).toBeUndefined();
  });
});
