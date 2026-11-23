// src/features/board/__tests__/drop-outcome.test.ts
// dropOutcome: every drop on the desk (Requirement 17), without a pointer.
import { describe, expect, test } from 'vitest';
import { dropOutcome } from '@/features/board/drag';
import type { DragSource, DropTarget } from '@/features/board/drag';

const onNote = (theoryId: string): DropTarget => ({ kind: 'theory', theoryId });
const onFloor: DropTarget = { kind: 'floor', x: 120, y: 80 };

describe('dropOutcome: from a sealed folder on the floor', () => {
  const sealed: DragSource = { from: 'floor', sealed: true };

  test('onto a theory note: pinned at once, still sealed, no reveal forced', () => {
    expect(dropOutcome(sealed, onNote('t-mutiny'))).toEqual({ kind: 'pin', target: 't-mutiny' });
  });

  test('onto the tray: set aside at once, still sealed', () => {
    expect(dropOutcome(sealed, { kind: 'tray' })).toEqual({ kind: 'pin', target: 'none' });
  });

  test('onto the board outside any note: it opens for reading (17.3)', () => {
    expect(dropOutcome(sealed, { kind: 'board' })).toEqual({ kind: 'open' });
  });

  test('back onto the floor: it settles where it was dropped (17.4)', () => {
    expect(dropOutcome(sealed, onFloor)).toEqual({ kind: 'settle', x: 120, y: 80 });
  });

  test('onto nothing: it goes back', () => {
    expect(dropOutcome(sealed, { kind: 'nothing' })).toEqual({ kind: 'return' });
  });
});

describe('dropOutcome: from an opened folder on the floor', () => {
  const opened: DragSource = { from: 'floor', sealed: false };

  test('onto a theory note: pinned at once, because its status is already revealed (Q6)', () => {
    expect(dropOutcome(opened, onNote('t-sinking'))).toEqual({ kind: 'pin', target: 't-sinking' });
  });

  test('onto the tray: set aside at once', () => {
    expect(dropOutcome(opened, { kind: 'tray' })).toEqual({ kind: 'pin', target: 'none' });
  });

  test('the board and the floor behave as for a sealed one', () => {
    expect(dropOutcome(opened, { kind: 'board' })).toEqual({ kind: 'open' });
    expect(dropOutcome(opened, onFloor)).toEqual({ kind: 'settle', x: 120, y: 80 });
  });
});

describe('dropOutcome: from a note on the board, without opening it (17.5)', () => {
  const pinned: DragSource = { from: 'board', theoryId: 't-sinking' };

  test('to another theory: re-pinned', () => {
    expect(dropOutcome(pinned, onNote('t-mutiny'))).toEqual({ kind: 'pin', target: 't-mutiny' });
  });

  test('to its own theory: back where it was', () => {
    expect(dropOutcome(pinned, onNote('t-sinking'))).toEqual({ kind: 'return' });
  });

  test('to the tray: set aside', () => {
    expect(dropOutcome(pinned, { kind: 'tray' })).toEqual({ kind: 'pin', target: 'none' });
  });

  test('to the floor: unpinned, and it lies where it was dropped', () => {
    expect(dropOutcome(pinned, onFloor)).toEqual({ kind: 'unpin', x: 120, y: 80 });
  });

  test('onto the board outside a note, or nothing: back where it was', () => {
    expect(dropOutcome(pinned, { kind: 'board' })).toEqual({ kind: 'return' });
    expect(dropOutcome(pinned, { kind: 'nothing' })).toEqual({ kind: 'return' });
  });
});

describe('dropOutcome: from the tray, the same way (17.6)', () => {
  const aside: DragSource = { from: 'tray' };

  test('to a theory: pinned to it', () => {
    expect(dropOutcome(aside, onNote('t-mutiny'))).toEqual({ kind: 'pin', target: 't-mutiny' });
  });

  test('to the floor: unpinned', () => {
    expect(dropOutcome(aside, onFloor)).toEqual({ kind: 'unpin', x: 120, y: 80 });
  });

  test('onto the tray again, the board or nothing: back where it was', () => {
    expect(dropOutcome(aside, { kind: 'tray' })).toEqual({ kind: 'return' });
    expect(dropOutcome(aside, { kind: 'board' })).toEqual({ kind: 'return' });
    expect(dropOutcome(aside, { kind: 'nothing' })).toEqual({ kind: 'return' });
  });
});

describe('dropOutcome: from the open file', () => {
  const open: DragSource = { from: 'open-file' };

  test('onto a theory or the tray: pinned', () => {
    expect(dropOutcome(open, onNote('t-mutiny'))).toEqual({ kind: 'pin', target: 't-mutiny' });
    expect(dropOutcome(open, { kind: 'tray' })).toEqual({ kind: 'pin', target: 'none' });
  });

  test('onto anything else: back to the centre, open again', () => {
    expect(dropOutcome(open, { kind: 'board' })).toEqual({ kind: 'return' });
    expect(dropOutcome(open, onFloor)).toEqual({ kind: 'return' });
    expect(dropOutcome(open, { kind: 'nothing' })).toEqual({ kind: 'return' });
  });
});
