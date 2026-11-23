// @vitest-environment jsdom
// src/lib/__tests__/floor-positions.test.ts
// The floor as the player left it, kept under its own key and apart from the investigation.
import { afterEach, describe, expect, test, vi } from 'vitest';
import { floorKey, loadFloorPositions, saveFloorPositions } from '@/lib/floor-positions';

const IDS = ['e-a', 'e-b', 'e-c'];

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('floor positions', () => {
  test('saved under histor:case:{caseId}:floor, never the investigation key', () => {
    saveFloorPositions('mary-celeste', new Map([['e-a', { fx: 0.2, fy: 0.4 }]]));
    expect(floorKey('mary-celeste')).toBe('histor:case:mary-celeste:floor');
    expect(localStorage.getItem('histor:case:mary-celeste:floor')).not.toBeNull();
    expect(localStorage.getItem('histor:case:mary-celeste')).toBeNull();
  });

  test('a reload gets them back, in the order they were dropped', () => {
    saveFloorPositions('c', new Map([['e-b', { fx: 0.1, fy: 0.2 }], ['e-a', { fx: 0.5, fy: 0.5 }]]));
    const loaded = loadFloorPositions('c', IDS);
    expect([...loaded.keys()]).toEqual(['e-b', 'e-a']);
    expect(loaded.get('e-a')).toEqual({ fx: 0.5, fy: 0.5 });
  });

  test('unknown files, broken spots and broken JSON are left out', () => {
    localStorage.setItem(floorKey('c'), JSON.stringify([['e-x', { fx: 0.1, fy: 0.1 }], ['e-a', { fx: 2, fy: 0 }], ['e-b', { fx: 0.3, fy: 0.3 }], 'junk']));
    expect([...loadFloorPositions('c', IDS).keys()]).toEqual(['e-b']);
    localStorage.setItem(floorKey('c'), '{not json');
    expect(loadFloorPositions('c', IDS).size).toBe(0);
  });

  test('works without storage: nothing is thrown', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(() => saveFloorPositions('c', new Map([['e-a', { fx: 0, fy: 0 }]]))).not.toThrow();
    expect(loadFloorPositions('c', IDS).size).toBe(0);
  });
});
