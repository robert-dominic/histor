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

  test('onto the board\'s empty space, or nothing: back to the floor, where it was let go (review-fixes 4)', () => {
    expect(dropOutcome(pinned, { kind: 'board' }, { x: 40, y: -90 })).toEqual({ kind: 'unpin', x: 40, y: -90 });
    expect(dropOutcome(pinned, { kind: 'nothing' }, { x: 9999, y: 9999 })).toEqual({ kind: 'unpin', x: 9999, y: 9999 });
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

  test('onto the tray again: back where it was', () => {
    expect(dropOutcome(aside, { kind: 'tray' })).toEqual({ kind: 'return' });
  });

  test('onto the board\'s empty space or nothing: back to the floor (review-fixes 4)', () => {
    expect(dropOutcome(aside, { kind: 'board' }, { x: 300, y: -20 })).toEqual({ kind: 'unpin', x: 300, y: -20 });
    expect(dropOutcome(aside, { kind: 'nothing' }, { x: 5, y: 5 })).toEqual({ kind: 'unpin', x: 5, y: 5 });
  });
});

describe('dropOutcome: from the open file (review-fixes 4)', () => {
  const open: DragSource = { from: 'open-file', pinned: false };
  const openPinned: DragSource = { from: 'open-file', pinned: true };

  test('onto a theory or the tray: pinned', () => {
    expect(dropOutcome(open, onNote('t-mutiny'))).toEqual({ kind: 'pin', target: 't-mutiny' });
    expect(dropOutcome(open, { kind: 'tray' })).toEqual({ kind: 'pin', target: 'none' });
    expect(dropOutcome(openPinned, { kind: 'tray' })).toEqual({ kind: 'pin', target: 'none' });
  });

  test('onto the floor: it goes back to the floor where it was let go; never a pin', () => {
    expect(dropOutcome(open, onFloor)).toEqual({ kind: 'settle', x: 120, y: 80 });
    // A pinned file comes off its theory.
    expect(dropOutcome(openPinned, onFloor)).toEqual({ kind: 'unpin', x: 120, y: 80 });
  });

  test('onto the board\'s empty space: the floor too, at the release point', () => {
    expect(dropOutcome(open, { kind: 'board' }, { x: 600, y: -140 })).toEqual({ kind: 'settle', x: 600, y: -140 });
    expect(dropOutcome(openPinned, { kind: 'board' }, { x: 600, y: -140 })).toEqual({ kind: 'unpin', x: 600, y: -140 });
  });

  test('onto nothing (past the edges): the floor, at the release point (the floor keeps it inside)', () => {
    expect(dropOutcome(open, { kind: 'nothing' }, { x: -50, y: 2000 })).toEqual({ kind: 'settle', x: -50, y: 2000 });
  });
});
