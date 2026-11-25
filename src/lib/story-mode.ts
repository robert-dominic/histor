// src/lib/story-mode.ts
// The reader's choice in the play modal, remembered (ui-pass brief, 2): "Play the story" or "Read at my pace", and the
// Sound switch as it was set, under `histor:story-mode` (a choice saved with the old Music and Effects switches is
// read with Effects as Sound). Once chosen, the modal never shows again:
// the story starts in the saved mode. The reader can still switch at any time (the play bar plays; any gesture reads
// at their own pace). Every read and write is wrapped: without storage the modal simply shows each visit.
import type { PlayMode } from '@/features/story/PlayChoice';

export const STORY_MODE_KEY = 'histor:story-mode';

export interface StoryModeChoice {
  mode: PlayMode;
  sound: boolean;
}

/** The saved choice, or null for a reader who has never chosen (or a broken entry). */
export function loadStoryMode(): StoryModeChoice | null {
  try {
    const raw = localStorage.getItem(STORY_MODE_KEY);
    if (raw === null) {
      return null;
    }
    const value: unknown = JSON.parse(raw);
    if (typeof value !== 'object' || value === null) {
      return null;
    }
    const { mode, sound, effects } = value as Record<string, unknown>;
    const on = typeof sound === 'boolean' ? sound : effects;
    if ((mode !== 'play' && mode !== 'read') || typeof on !== 'boolean') {
      return null;
    }
    return { mode, sound: on };
  } catch {
    return null;
  }
}

/** Remembers the choice. Fails silently. */
export function saveStoryMode(choice: StoryModeChoice): void {
  try {
    localStorage.setItem(STORY_MODE_KEY, JSON.stringify(choice));
  } catch {
    // Storage unavailable or full: the modal shows again next visit.
  }
}
