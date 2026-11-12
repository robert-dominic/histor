// src/cases/__tests__/index.property.test.ts
import { describe, test, expect } from 'vitest';
import * as fc from 'fast-check';
import { getCaseById, registry } from '@/cases/index';

describe('Registry - Property Tests', () => {
  test('Property 1: Registry ID Uniqueness', () => {
    // Feature: histor-data-foundation, Property 1: Registry ID Uniqueness
    // Test that all entries in the real registry have unique IDs
    const ids = registry.map(entry => entry.id);
    const uniqueIds = new Set(ids);
    
    // Every ID should be unique (no duplicates)
    expect(ids.length).toBe(uniqueIds.size);
  });

  test('Property 2: Registry Lookup Correctness', () => {
    // Feature: histor-data-foundation, Property 2: Registry Lookup Correctness
    // For any registry entry, getCaseById(entry.id) returns that entry
    fc.assert(
      fc.property(
        fc.constantFrom(...registry),
        (entry) => {
          const result = getCaseById(entry.id);
          return result === entry;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 3: Registry Lookup Returns Undefined for Non-Existent IDs', () => {
    // Feature: histor-data-foundation, Property 3: Registry Lookup Returns Undefined for Non-Existent IDs
    // For any random string not in the registry, getCaseById returns undefined
    const registryIds = new Set(registry.map(entry => entry.id));
    
    fc.assert(
      fc.property(
        fc.string().filter(id => !registryIds.has(id) && id.length > 0),
        (randomId) => {
          const result = getCaseById(randomId);
          return result === undefined;
        }
      ),
      { numRuns: 100 }
    );
  });
});
