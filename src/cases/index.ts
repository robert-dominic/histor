// src/cases/index.ts
import type { RegistryEntry } from '../types/case';
import maryCeleste from './mary-celeste/case';

/**
 * Registry of all historical cases available in Histor.
 * Open cases include full case data (sealed: false).
 * Sealed cases are placeholders (sealed: true) without data.
 */
export const registry: RegistryEntry[] = [
  {
    id: 'mary-celeste',
    title: 'The Mystery of the Mary Celeste',
    year: 1872,
    teaser: 'TODO: real content - one line teaser for home page',
    sealed: false,
    data: maryCeleste,
  },
  {
    id: 'jack-the-ripper',
    title: 'Jack the Ripper',
    year: 1888,
    teaser: 'A sealed case about Jack the Ripper mysteries',
    sealed: true,
  },
];

/**
 * Look up a case in the registry by ID.
 *
 * Returns the matching RegistryEntry if found, or undefined if:
 * - The ID does not exist in the registry
 * - The ID is null, undefined, or an empty string
 *
 * @param id - The case ID to look up
 * @returns The RegistryEntry with matching ID, or undefined
 */
export function getCaseById(id: string | undefined | null): RegistryEntry | undefined {
  // Handle null, undefined, or empty string
  if (!id) {
    return undefined;
  }

  // Find and return the matching entry
  return registry.find((entry) => entry.id === id);
}

export default registry;
