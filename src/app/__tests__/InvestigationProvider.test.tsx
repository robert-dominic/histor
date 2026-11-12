// @vitest-environment jsdom
// src/app/__tests__/InvestigationProvider.test.tsx
// Task 6.2: unit tests for the investigation reducer and the InvestigationProvider.
import { act, cleanup, render, renderHook, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import {
  InvestigationProvider,
  MAX_OPENED,
  MAX_PINS,
  createEmptyInvestigationState,
  investigationReducer,
  useInvestigation,
} from '@/app/InvestigationProvider';
import type { Case, InvestigationState } from '@/types/case';

const CASE_ID = 'test-case';
const STORAGE_KEY = `histor:case:${CASE_ID}`;
const EMPTY_STATE: InvestigationState = { opened: [], pins: {}, verdict: null };

/** Builds a valid case with `evidenceCount` evidence files: e-1, e-2, ... The content is test data, not history. */
function buildCase(evidenceCount: number, closeThreshold: number): Case {
  return {
    id: CASE_ID,
    title: 'Test case',
    year: 1900,
    teaser: 'Test teaser',
    legendIntro: { lines: ['Test line'], stamp: 'Test stamp', debunk: 'Test debunk' },
    story: [{ id: 's-one', heading: 'Test heading', body: ['Test paragraph'] }],
    centralQuestion: 'Test question?',
    fork: { prompt: 'Test prompt', investigateLabel: 'Investigate', leaveLabel: 'Leave' },
    theories: [
      { id: 't-one', title: 'Theory one', claim: 'Claim one', standing: 'leading', standingReason: 'Reason one' },
      { id: 't-two', title: 'Theory two', claim: 'Claim two', standing: 'rejected', standingReason: 'Reason two' },
    ],
    evidence: Array.from({ length: evidenceCount }, (_, index) => ({
      id: `e-${index + 1}`,
      title: `Evidence ${index + 1}`,
      detail: [`Detail ${index + 1}`],
      sources: ['src-one'] as [string],
      reading: { supports: [], weakens: [], note: `Note ${index + 1}` },
      status: 'record' as const,
    })),
    sources: [{ id: 'src-one', title: 'Source one', kind: 'official', citation: 'Test citation' }],
    references: [],
    historiansSummary: ['Test summary'],
    closeThreshold,
    theme: { id: 'test-theme' },
  };
}

/** Three evidence files; two must be opened before the case can be closed. */
const testCase = buildCase(3, 2);
/** More evidence files than the state is allowed to hold. */
const bigCase = buildCase(MAX_OPENED + 5, 0);

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

// ---------- Reducer ----------

describe('investigationReducer: OPEN_EVIDENCE', () => {
  test('adds the evidence id to the opened array', () => {
    const next = investigationReducer(EMPTY_STATE, { type: 'OPEN_EVIDENCE', evidenceId: 'e-1' }, testCase);

    expect(next.opened).toEqual(['e-1']);
  });

  test('adds new ids to the end, keeping the order they were opened in', () => {
    let state = EMPTY_STATE;
    for (const evidenceId of ['e-3', 'e-1', 'e-2']) {
      state = investigationReducer(state, { type: 'OPEN_EVIDENCE', evidenceId }, testCase);
    }

    expect(state.opened).toEqual(['e-3', 'e-1', 'e-2']);
  });

  test('is idempotent: opening the same evidence again returns the same state', () => {
    const state: InvestigationState = { opened: ['e-1', 'e-2'], pins: {}, verdict: null };

    const next = investigationReducer(state, { type: 'OPEN_EVIDENCE', evidenceId: 'e-1' }, testCase);

    expect(next).toBe(state);
    expect(next.opened).toEqual(['e-1', 'e-2']);
  });

  test('rejects an evidence id that is not in the case, returning the same state', () => {
    const state: InvestigationState = { opened: ['e-1'], pins: {}, verdict: null };

    const next = investigationReducer(state, { type: 'OPEN_EVIDENCE', evidenceId: 'e-not-in-case' }, testCase);

    expect(next).toBe(state);
    expect(next.opened).toEqual(['e-1']);
  });

  test('rejects an empty evidence id', () => {
    const next = investigationReducer(EMPTY_STATE, { type: 'OPEN_EVIDENCE', evidenceId: '' }, testCase);

    expect(next).toBe(EMPTY_STATE);
  });

  test(`holds at most ${MAX_OPENED} entries`, () => {
    let state = EMPTY_STATE;
    for (const evidence of bigCase.evidence) {
      state = investigationReducer(state, { type: 'OPEN_EVIDENCE', evidenceId: evidence.id }, bigCase);
    }

    expect(state.opened).toHaveLength(MAX_OPENED);
    expect(state.opened).toEqual(bigCase.evidence.slice(0, MAX_OPENED).map(evidence => evidence.id));
  });

  test('returns the same state when the opened array is already full', () => {
    const full: InvestigationState = {
      opened: bigCase.evidence.slice(0, MAX_OPENED).map(evidence => evidence.id),
      pins: {},
      verdict: null,
    };

    const next = investigationReducer(full, { type: 'OPEN_EVIDENCE', evidenceId: `e-${MAX_OPENED + 1}` }, bigCase);

    expect(next).toBe(full);
  });
});

describe('investigationReducer: PIN_EVIDENCE', () => {
  test('records a pin to a valid theory id', () => {
    const next = investigationReducer(
      EMPTY_STATE,
      { type: 'PIN_EVIDENCE', evidenceId: 'e-1', target: 't-one' },
      testCase
    );

    expect(next.pins).toEqual({ 'e-1': 't-one' });
  });

  test('records a pin to "none"', () => {
    const next = investigationReducer(
      EMPTY_STATE,
      { type: 'PIN_EVIDENCE', evidenceId: 'e-1', target: 'none' },
      testCase
    );

    expect(next.pins).toEqual({ 'e-1': 'none' });
  });

  test('replaces an existing pin and keeps the other pins', () => {
    const state: InvestigationState = { opened: [], pins: { 'e-1': 't-one', 'e-2': 'none' }, verdict: null };

    const next = investigationReducer(state, { type: 'PIN_EVIDENCE', evidenceId: 'e-1', target: 't-two' }, testCase);

    expect(next.pins).toEqual({ 'e-1': 't-two', 'e-2': 'none' });
  });

  test('rejects an invalid theory id when there is no existing pin', () => {
    const next = investigationReducer(
      EMPTY_STATE,
      { type: 'PIN_EVIDENCE', evidenceId: 'e-1', target: 't-not-in-case' },
      testCase
    );

    expect(next).toBe(EMPTY_STATE);
    expect(next.pins).toEqual({});
  });

  test('rejects an invalid theory id and preserves the existing pin', () => {
    const state: InvestigationState = { opened: [], pins: { 'e-1': 't-one' }, verdict: null };

    const next = investigationReducer(
      state,
      { type: 'PIN_EVIDENCE', evidenceId: 'e-1', target: 't-not-in-case' },
      testCase
    );

    expect(next).toBe(state);
    expect(next.pins).toEqual({ 'e-1': 't-one' });
  });

  test(`holds at most ${MAX_PINS} entries`, () => {
    let state = EMPTY_STATE;
    for (const evidence of bigCase.evidence) {
      state = investigationReducer(state, { type: 'PIN_EVIDENCE', evidenceId: evidence.id, target: 't-one' }, bigCase);
    }

    expect(Object.keys(state.pins)).toHaveLength(MAX_PINS);
    expect(state.pins[`e-${MAX_PINS + 1}`]).toBeUndefined();
  });

  test('still allows changing an existing pin when the pins object is full', () => {
    let state = EMPTY_STATE;
    for (const evidence of bigCase.evidence.slice(0, MAX_PINS)) {
      state = investigationReducer(state, { type: 'PIN_EVIDENCE', evidenceId: evidence.id, target: 't-one' }, bigCase);
    }

    const next = investigationReducer(state, { type: 'PIN_EVIDENCE', evidenceId: 'e-1', target: 'none' }, bigCase);

    expect(Object.keys(next.pins)).toHaveLength(MAX_PINS);
    expect(next.pins['e-1']).toBe('none');
  });
});

describe('investigationReducer: CLOSE_CASE', () => {
  test('records the verdict for a valid theory when enough evidence has been opened', () => {
    const state: InvestigationState = { opened: ['e-1', 'e-2'], pins: {}, verdict: null };

    const next = investigationReducer(state, { type: 'CLOSE_CASE', theoryId: 't-two' }, testCase);

    expect(next.verdict).toBe('t-two');
    expect(next.opened).toEqual(['e-1', 'e-2']);
  });

  test('fails below the close threshold: the verdict stays null', () => {
    const state: InvestigationState = { opened: ['e-1'], pins: {}, verdict: null };

    const next = investigationReducer(state, { type: 'CLOSE_CASE', theoryId: 't-one' }, testCase);

    expect(next).toBe(state);
    expect(next.verdict).toBeNull();
  });

  test('rejects an invalid theory id: the verdict stays null', () => {
    const state: InvestigationState = { opened: ['e-1', 'e-2', 'e-3'], pins: {}, verdict: null };

    const next = investigationReducer(state, { type: 'CLOSE_CASE', theoryId: 't-not-in-case' }, testCase);

    expect(next).toBe(state);
    expect(next.verdict).toBeNull();
  });

  test('rejects "none" as a verdict', () => {
    const state: InvestigationState = { opened: ['e-1', 'e-2'], pins: {}, verdict: null };

    const next = investigationReducer(state, { type: 'CLOSE_CASE', theoryId: 'none' }, testCase);

    expect(next.verdict).toBeNull();
  });

  test('allows closing with nothing opened when the threshold is 0', () => {
    const next = investigationReducer(EMPTY_STATE, { type: 'CLOSE_CASE', theoryId: 't-one' }, bigCase);

    expect(next.verdict).toBe('t-one');
  });
});

describe('investigationReducer: REOPEN_CASE', () => {
  test('resets opened, pins and verdict', () => {
    const state: InvestigationState = {
      opened: ['e-1', 'e-2'],
      pins: { 'e-1': 't-one', 'e-2': 'none' },
      verdict: 't-one',
    };

    const next = investigationReducer(state, { type: 'REOPEN_CASE' }, testCase);

    expect(next).toEqual({ opened: [], pins: {}, verdict: null });
  });
});

describe('investigationReducer: immutability', () => {
  test('never mutates the state it is given', () => {
    const state: InvestigationState = { opened: ['e-1', 'e-2'], pins: { 'e-1': 't-one' }, verdict: null };
    Object.freeze(state);
    Object.freeze(state.opened);
    Object.freeze(state.pins);

    // Frozen objects throw on mutation in strict mode, so any mutation fails the test.
    investigationReducer(state, { type: 'OPEN_EVIDENCE', evidenceId: 'e-3' }, testCase);
    investigationReducer(state, { type: 'PIN_EVIDENCE', evidenceId: 'e-2', target: 't-two' }, testCase);
    investigationReducer(state, { type: 'CLOSE_CASE', theoryId: 't-one' }, testCase);
    investigationReducer(state, { type: 'REOPEN_CASE' }, testCase);

    expect(state).toEqual({ opened: ['e-1', 'e-2'], pins: { 'e-1': 't-one' }, verdict: null });
  });

  test('createEmptyInvestigationState returns a new object every time', () => {
    const first = createEmptyInvestigationState();
    const second = createEmptyInvestigationState();

    expect(first).toEqual({ opened: [], pins: {}, verdict: null });
    expect(first).not.toBe(second);
    expect(first.opened).not.toBe(second.opened);
    expect(first.pins).not.toBe(second.pins);
  });
});

// ---------- Provider ----------

function renderInvestigation(caseData: Case = testCase) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <InvestigationProvider caseData={caseData}>{children}</InvestigationProvider>
  );
  return renderHook(() => useInvestigation(), { wrapper });
}

function readStored(): unknown {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw === null ? null : JSON.parse(raw);
}

describe('InvestigationProvider', () => {
  test('starts with an empty investigation when nothing is saved', () => {
    const { result } = renderInvestigation();

    expect(result.current.state).toEqual(EMPTY_STATE);
  });

  test('provides the case data it was given', () => {
    const { result } = renderInvestigation();

    expect(result.current.caseData).toBe(testCase);
  });

  test('renders its children', () => {
    render(
      <InvestigationProvider caseData={testCase}>
        <p>inside the provider</p>
      </InvestigationProvider>
    );

    expect(screen.getByText('inside the provider')).toBeDefined();
  });

  test('starts from the investigation saved in localStorage', () => {
    const saved: InvestigationState = { opened: ['e-2', 'e-1'], pins: { 'e-2': 't-one' }, verdict: null };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));

    const { result } = renderInvestigation();

    expect(result.current.state).toEqual(saved);
  });

  test('drops saved ids that are no longer in the case', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ opened: ['e-1', 'e-gone'], pins: { 'e-1': 't-gone' }, verdict: 't-gone' })
    );

    const { result } = renderInvestigation();

    expect(result.current.state).toEqual({ opened: ['e-1'], pins: {}, verdict: null });
  });

  test('reads localStorage only once, on mount', () => {
    const getItem = vi.spyOn(Storage.prototype, 'getItem');
    const { result } = renderInvestigation();

    act(() => result.current.dispatch({ type: 'OPEN_EVIDENCE', evidenceId: 'e-1' }));
    act(() => result.current.dispatch({ type: 'OPEN_EVIDENCE', evidenceId: 'e-2' }));

    expect(getItem.mock.calls.filter(([key]) => key === STORAGE_KEY)).toHaveLength(1);
  });

  test('dispatch updates the state', () => {
    const { result } = renderInvestigation();

    act(() => result.current.dispatch({ type: 'OPEN_EVIDENCE', evidenceId: 'e-1' }));
    act(() => result.current.dispatch({ type: 'PIN_EVIDENCE', evidenceId: 'e-1', target: 't-one' }));

    expect(result.current.state).toEqual({ opened: ['e-1'], pins: { 'e-1': 't-one' }, verdict: null });
  });

  test('saves the state to localStorage after each action', () => {
    const { result } = renderInvestigation();

    act(() => result.current.dispatch({ type: 'OPEN_EVIDENCE', evidenceId: 'e-1' }));
    expect(readStored()).toEqual({ opened: ['e-1'], pins: {}, verdict: null });

    act(() => result.current.dispatch({ type: 'PIN_EVIDENCE', evidenceId: 'e-1', target: 'none' }));
    expect(readStored()).toEqual({ opened: ['e-1'], pins: { 'e-1': 'none' }, verdict: null });

    act(() => result.current.dispatch({ type: 'OPEN_EVIDENCE', evidenceId: 'e-2' }));
    act(() => result.current.dispatch({ type: 'CLOSE_CASE', theoryId: 't-two' }));
    expect(readStored()).toEqual({ opened: ['e-1', 'e-2'], pins: { 'e-1': 'none' }, verdict: 't-two' });
  });

  test('REOPEN_CASE clears the saved investigation', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ opened: ['e-1', 'e-2'], pins: { 'e-1': 't-one' }, verdict: 't-one' })
    );
    const { result } = renderInvestigation();

    act(() => result.current.dispatch({ type: 'REOPEN_CASE' }));

    expect(result.current.state).toEqual(EMPTY_STATE);
    expect(readStored()).toEqual(EMPTY_STATE);
  });

  test('ignores invalid actions: the state object does not change', () => {
    const { result } = renderInvestigation();
    const before = result.current.state;

    act(() => result.current.dispatch({ type: 'OPEN_EVIDENCE', evidenceId: 'e-not-in-case' }));
    act(() => result.current.dispatch({ type: 'PIN_EVIDENCE', evidenceId: 'e-1', target: 't-not-in-case' }));
    act(() => result.current.dispatch({ type: 'CLOSE_CASE', theoryId: 't-one' }));

    expect(result.current.state).toBe(before);
  });

  test('a new provider picks up where the last one left off', () => {
    const first = renderInvestigation();
    act(() => first.result.current.dispatch({ type: 'OPEN_EVIDENCE', evidenceId: 'e-3' }));
    act(() => first.result.current.dispatch({ type: 'PIN_EVIDENCE', evidenceId: 'e-3', target: 't-two' }));
    first.unmount();

    const second = renderInvestigation();

    expect(second.result.current.state).toEqual({ opened: ['e-3'], pins: { 'e-3': 't-two' }, verdict: null });
  });

  test('keeps working in memory when saving to localStorage fails', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    const { result } = renderInvestigation();

    act(() => result.current.dispatch({ type: 'OPEN_EVIDENCE', evidenceId: 'e-1' }));

    expect(result.current.state.opened).toEqual(['e-1']);
  });

  test('starts empty and keeps working when localStorage is unavailable', () => {
    vi.stubGlobal('localStorage', undefined);
    const { result } = renderInvestigation();

    expect(result.current.state).toEqual(EMPTY_STATE);

    act(() => result.current.dispatch({ type: 'OPEN_EVIDENCE', evidenceId: 'e-1' }));

    expect(result.current.state.opened).toEqual(['e-1']);
  });
});

describe('useInvestigation', () => {
  test('throws when used outside an InvestigationProvider', () => {
    // React logs the render error to the console; keep the test output clean.
    vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => renderHook(() => useInvestigation())).toThrow(
      'useInvestigation must be used inside an InvestigationProvider'
    );
  });
});
