// src/features/story/active-scene.ts
// Which scene is on screen at a time on the story's timeline: the last one that has started. Pure.

/**
 * @param starts - when each scene starts on the timeline, in order
 * @returns the index of the scene on screen at `time`; the first scene before any has started
 */
export function activeSceneIndex(starts: readonly number[], time: number): number {
  let active = 0;
  starts.forEach((start, index) => {
    if (time >= start) {
      active = index;
    }
  });
  return active;
}
