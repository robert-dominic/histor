// src/lib/__tests__/evidence-piece.test.ts
// Each case's piece of evidence (dreadful frames): its angle, its tape and its tear, fixed per case.
import { describe, expect, test } from 'vitest';
import { exhibits } from '@/cases';
import { pieceOf } from '@/lib/evidence-piece';

describe('pieceOf', () => {
  test('the same every visit, a little crooked (-2° to 2°), one or two strips of tape at slightly different angles', () => {
    for (const exhibit of exhibits) {
      const piece = pieceOf(exhibit.id);
      expect(pieceOf(exhibit.id)).toEqual(piece);
      expect(piece.tilt).toBeGreaterThanOrEqual(-2);
      expect(piece.tilt).toBeLessThanOrEqual(2);
      expect(piece.tapes.length).toBeGreaterThanOrEqual(1);
      expect(piece.tapes.length).toBeLessThanOrEqual(2);
      if (piece.tapes.length === 2) {
        expect(piece.tapes[0].angle).not.toBe(piece.tapes[1].angle);
        expect([piece.tapes[0].left, piece.tapes[0].top]).not.toEqual([piece.tapes[1].left, piece.tapes[1].top]);
      }
      // A tear is never across the corner a sealed tape crosses.
      expect(piece.tear).not.toBe('tr');
    }
  });

  test('varies from case to case', () => {
    const pieces = exhibits.map(exhibit => pieceOf(exhibit.id));
    expect(new Set(pieces.map(piece => piece.tilt)).size).toBeGreaterThan(3);
    expect(new Set(pieces.map(piece => JSON.stringify(piece.tapes))).size).toBeGreaterThan(2);
  });
});
