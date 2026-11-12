// src/lib/storage.ts
// localStorage persistence for InvestigationState

import type { Case, InvestigationState } from '@/types/case';

/**
 * Generates the storage key for a case's investigation state.
 */
function getStorageKey(caseId: string): string {
  return `histor:case:${caseId}`;
}

/**
 * Saves investigation state to localStorage for a specific case.
 * Fails silently if localStorage is unavailable or quota is exceeded.
 *
 * @param caseId - The ID of the case
 * @param state - The investigation state to save
 */
export function saveInvestigationState(caseId: string, state: InvestigationState): void {
  try {
    const key = getStorageKey(caseId);
    const json = JSON.stringify(state);
    localStorage.setItem(key, json);
  } catch {
    // Silently fail - investigation continues in-memory
    // This handles: localStorage unavailable, quota exceeded, or other storage errors
  }
}

/**
 * Loads investigation state from localStorage for a specific case.
 * Returns default state if loading fails for any reason.
 * Validates loaded state against case data to remove invalid references.
 *
 * @param caseId - The ID of the case
 * @param caseData - The complete case data, used for validation
 * @returns Investigation state with valid data, or default empty state
 */
export function loadInvestigationState(caseId: string, caseData: Case): InvestigationState {
  const defaultState: InvestigationState = { opened: [], pins: {}, verdict: null };

  try {
    const key = getStorageKey(caseId);
    const json = localStorage.getItem(key);

    // Key doesn't exist
    if (json === null) {
      return defaultState;
    }

    // Parse JSON
    let state: unknown;
    try {
      state = JSON.parse(json);
    } catch {
      // Invalid JSON
      return defaultState;
    }

    // Validate structure
    if (typeof state !== 'object' || state === null) {
      // Invalid data structure
      return defaultState;
    }
    const candidate = state as Record<string, unknown>;
    if (
      !Array.isArray(candidate.opened) ||
      typeof candidate.pins !== 'object' ||
      candidate.pins === null ||
      Array.isArray(candidate.pins) ||
      (candidate.verdict !== null && typeof candidate.verdict !== 'string')
    ) {
      // Invalid data structure
      return defaultState;
    }

    const loaded = state as InvestigationState;

    // Build sets of valid IDs for quick lookup
    const validEvidenceIds = new Set(caseData.evidence.map(e => e.id));
    const validTheoryIds = new Set(caseData.theories.map(t => t.id));

    // Validate and filter opened evidence IDs
    const validatedOpened = loaded.opened.filter(id => validEvidenceIds.has(id));

    // Validate and filter pins
    const validatedPins: Record<string, string> = {};
    for (const [evidenceId, target] of Object.entries(loaded.pins)) {
      // Keep only if evidence ID exists
      if (!validEvidenceIds.has(evidenceId)) {
        continue;
      }
      // Keep only if target is "none" or a valid theory ID
      if (target === 'none' || validTheoryIds.has(target)) {
        validatedPins[evidenceId] = target;
      }
    }

    // Validate verdict
    let validatedVerdict: string | null = null;
    if (loaded.verdict !== null && validTheoryIds.has(loaded.verdict)) {
      validatedVerdict = loaded.verdict;
    }

    return {
      opened: validatedOpened,
      pins: validatedPins,
      verdict: validatedVerdict
    };
  } catch {
    // Any unexpected error - return default state
    return defaultState;
  }
}
