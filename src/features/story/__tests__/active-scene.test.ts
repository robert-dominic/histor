// src/features/story/__tests__/active-scene.test.ts
// Only the scene on screen takes clicks. Scenes lie on top of each other in one stage, so an invisible scene
// above the visible one would swallow the tap meant for a portal name.
import { describe, expect, test } from 'vitest';
import { activeSceneIndex } from '@/features/story/active-scene';

describe('activeSceneIndex', () => {
  const starts = [0, 20, 45, 80];

  test('the first scene is active at the start', () => {
    expect(activeSceneIndex(starts, 0)).toBe(0);
  });

  test('a scene is active from its start until the next one starts', () => {
    expect(activeSceneIndex(starts, 19.99)).toBe(0);
    expect(activeSceneIndex(starts, 20)).toBe(1);
    expect(activeSceneIndex(starts, 44)).toBe(1);
    expect(activeSceneIndex(starts, 45)).toBe(2);
    expect(activeSceneIndex(starts, 500)).toBe(3);
  });

  test('before the first start, and with no scenes, the first scene is the answer', () => {
    expect(activeSceneIndex([5, 10], 2)).toBe(0);
    expect(activeSceneIndex([], 3)).toBe(0);
  });
});
