// src/app/InvestigationProvider.tsx
// Investigation state for one case: React context + useReducer, saved to localStorage.

/* eslint-disable react-refresh/only-export-components -- design.md keeps the context, reducer, provider and hook together in this file */

import { createContext, useContext, useEffect, useMemo, useReducer } from 'react';
import type { Dispatch, ReactElement, ReactNode } from 'react';
import { loadInvestigationState, saveInvestigationState } from '@/lib/storage';
import type { Case, InvestigationAction, InvestigationState } from '@/types/case';

/** Most evidence ids kept in `opened`. */
export const MAX_OPENED = 100;
/** Most entries kept in `pins`. */
export const MAX_PINS = 100;

/** A fresh, empty investigation. */
export function createEmptyInvestigationState(): InvestigationState {
  return { opened: [], pins: {}, verdict: null };
}

/**
 * Applies one action to the investigation state.
 * Pure: never mutates `state`. An action that breaks a rule is ignored and the same state object is returned.
 *
 * @param state - The current investigation state
 * @param action - The action to apply
 * @param caseData - The case being investigated, used to check evidence ids, theory ids and the close threshold
 */
export function investigationReducer(
  state: InvestigationState,
  action: InvestigationAction,
  caseData: Case
): InvestigationState {
  switch (action.type) {
    case 'OPEN_EVIDENCE': {
      // Opening the same file twice changes nothing.
      if (state.opened.includes(action.evidenceId)) {
        return state;
      }
      // Only evidence that belongs to this case can be opened.
      if (!caseData.evidence.some(evidence => evidence.id === action.evidenceId)) {
        return state;
      }
      if (state.opened.length >= MAX_OPENED) {
        return state;
      }
      return { ...state, opened: [...state.opened, action.evidenceId] };
    }

    case 'PIN_EVIDENCE': {
      // Only evidence that belongs to this case can be pinned.
      if (!caseData.evidence.some(evidence => evidence.id === action.evidenceId)) {
        return state;
      }
      const targetIsValid =
        action.target === 'none' || caseData.theories.some(theory => theory.id === action.target);
      if (!targetIsValid) {
        return state;
      }
      // Changing an existing pin is always allowed. Only new entries count towards the limit.
      const isNewPin = !Object.hasOwn(state.pins, action.evidenceId);
      if (isNewPin && Object.keys(state.pins).length >= MAX_PINS) {
        return state;
      }
      if (!isNewPin && state.pins[action.evidenceId] === action.target) {
        return state;
      }
      return { ...state, pins: { ...state.pins, [action.evidenceId]: action.target } };
    }

    case 'CLOSE_CASE': {
      const theoryExists = caseData.theories.some(theory => theory.id === action.theoryId);
      if (!theoryExists) {
        return state;
      }
      if (state.opened.length < caseData.closeThreshold) {
        return state;
      }
      return { ...state, verdict: action.theoryId };
    }

    case 'REOPEN_CASE':
      return createEmptyInvestigationState();

    default:
      return state;
  }
}

export interface InvestigationContextValue {
  state: InvestigationState;
  dispatch: Dispatch<InvestigationAction>;
  caseData: Case;
}

export const InvestigationContext = createContext<InvestigationContextValue | undefined>(undefined);

/**
 * Holds the investigation for one case and makes it available to everything inside.
 * Loads the saved investigation once on mount, and saves it again after every change.
 */
export function InvestigationProvider({
  caseData,
  children,
}: {
  caseData: Case;
  children: ReactNode;
}): ReactElement {
  const [state, dispatch] = useReducer(
    (current: InvestigationState, action: InvestigationAction) =>
      investigationReducer(current, action, caseData),
    caseData,
    initialCase => loadInvestigationState(initialCase.id, initialCase)
  );

  useEffect(() => {
    saveInvestigationState(caseData.id, state);
  }, [state, caseData.id]);

  const value = useMemo<InvestigationContextValue>(
    () => ({ state, dispatch, caseData }),
    [state, dispatch, caseData]
  );

  return <InvestigationContext.Provider value={value}>{children}</InvestigationContext.Provider>;
}

/** Reads the investigation. Must be used inside an InvestigationProvider. */
export function useInvestigation(): InvestigationContextValue {
  const value = useContext(InvestigationContext);
  if (value === undefined) {
    throw new Error('useInvestigation must be used inside an InvestigationProvider');
  }
  return value;
}
