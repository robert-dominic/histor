// src/lib/story-pages.ts
// Story v3: one page per chapter, written by the pen (night-run brief). The pace of the story, in one place, to be
// tuned by feel. Seconds of the scrubbed timeline are seconds of scroll: one of them is `pxPerSecond()` pixels.

export const STORY_PACE = {
  /**
   * The hold before a hook: how much scroll the written page holds, in timeline seconds, before the hook can begin.
   */
  pageHold: 3,
} as const;
