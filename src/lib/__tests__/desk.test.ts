// src/lib/__tests__/desk.test.ts
// Task 2 of .kiro/specs/desk: the pure desk helpers, against the Mary Celeste case.
import { describe, expect, test } from 'vitest';
import maryCeleste from '@/cases/mary-celeste/case';
import { deskLayout, firstSentence, hashUnit, scatter } from '@/lib/desk';
import type { InvestigationState } from '@/types/case';

const state = (opened: string[], pins: Record<string, string>, verdict: string | null = null): InvestigationState => ({
  opened,
  pins,
  verdict,
});
const ids = (list: { id: string }[]) => list.map(item => item.id);

describe('hashUnit and scatter', () => {
  test('the same for the same id, different for different ids, always in range', () => {
    expect(hashUnit('e-galley')).toBe(hashUnit('e-galley'));
    expect(hashUnit('e-galley')).not.toBe(hashUnit('e-sword'));
    expect(hashUnit('e-galley', 'x')).not.toBe(hashUnit('e-galley', 'y'));
    for (const evidence of maryCeleste.evidence) {
      const value = hashUnit(evidence.id);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  test('scatter stays within its limits', () => {
    for (const evidence of maryCeleste.evidence) {
      const { rotate, x, y } = scatter(evidence.id, 4, 6);
      expect(Math.abs(rotate)).toBeLessThanOrEqual(4);
      expect(Math.abs(x)).toBeLessThanOrEqual(6);
      expect(Math.abs(y)).toBeLessThanOrEqual(6);
    }
  });
});

describe('deskLayout', () => {
  test('a fresh investigation: every file sealed in the pile, nothing on the board', () => {
    const layout = deskLayout(maryCeleste, state([], {}));

    expect(ids(layout.pile)).toEqual(ids(maryCeleste.evidence));
    expect([...layout.byTheory.values()].every(list => list.length === 0)).toBe(true);
    expect([...layout.byTheory.keys()]).toEqual(ids(maryCeleste.theories));
    expect(layout.aside).toEqual([]);
    expect(layout.folders.map(folder => folder.number)).toEqual(maryCeleste.evidence.map((_, i) => String(i + 1).padStart(2, '0')));
    expect(layout.folders.every(folder => folder.place.kind === 'pile' && !folder.place.opened)).toBe(true);
    expect(layout.canClose).toBe(false);
  });

  test('opened and pinned to a theory: on the board; to "none": aside; opened only: on top of the pile', () => {
    const layout = deskLayout(
      maryCeleste,
      state(['e-galley', 'e-lifeboat', 'e-sword', 'e-findings'], { 'e-lifeboat': 't-sinking', 'e-sword': 't-mutiny', 'e-findings': 'none' })
    );

    expect(ids(layout.byTheory.get('t-sinking') ?? [])).toEqual(['e-lifeboat']);
    expect(ids(layout.byTheory.get('t-mutiny') ?? [])).toEqual(['e-sword']);
    expect(ids(layout.aside)).toEqual(['e-findings']);
    expect(layout.pile[layout.pile.length - 1].id).toBe('e-galley');
    expect(layout.folders.find(folder => folder.evidence.id === 'e-galley')?.place).toEqual({ kind: 'pile', opened: true });
    expect(layout.openedCount).toBe(4);
  });

  test('a pin on a file that was never opened leaves it sealed in the pile', () => {
    const layout = deskLayout(maryCeleste, state([], { 'e-lifeboat': 't-sinking' }));

    expect(layout.byTheory.get('t-sinking')).toEqual([]);
    expect(layout.folders.find(folder => folder.evidence.id === 'e-lifeboat')?.place).toEqual({ kind: 'pile', opened: false });
  });

  test('unknown ids are ignored, and the threshold opens the seal', () => {
    const opened = maryCeleste.evidence.slice(0, maryCeleste.closeThreshold).map(evidence => evidence.id);
    const layout = deskLayout(maryCeleste, state([...opened, 'e-unknown'], { 'e-unknown': 't-sinking', [opened[0]]: 't-unknown' }));

    expect(layout.openedCount).toBe(maryCeleste.closeThreshold);
    expect(layout.canClose).toBe(true);
    expect(layout.folders.find(folder => folder.evidence.id === opened[0])?.place).toEqual({ kind: 'pile', opened: true });
  });
});

describe('firstSentence', () => {
  test('the first full sentence, never cut in the middle', () => {
    expect(firstSentence('The nine were red oak. The consul saw nothing unusual.')).toBe('The nine were red oak.');
    expect(firstSentence("The turn is in Solly-Flood's copy of the log. Why he made it is a modern guess.")).toBe(
      "The turn is in Solly-Flood's copy of the log."
    );
  });

  test('a challenge of one sentence comes back whole', () => {
    expect(firstSentence('Tests found the stains were not blood.')).toBe('Tests found the stains were not blood.');
    expect(firstSentence('No full stop')).toBe('No full stop');
  });

  test('every disputed file of the Mary Celeste gets a whole sentence that the challenge starts with', () => {
    for (const evidence of maryCeleste.evidence) {
      if (evidence.status !== 'disputed') {
        continue;
      }
      const note = firstSentence(evidence.dispute.challenge);
      expect(evidence.dispute.challenge.startsWith(note)).toBe(true);
      expect(/[.?!]$/.test(note)).toBe(true);
    }
  });
});
