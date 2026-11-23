// src/lib/sound/sound-map.ts
// What each moment sounds like: the one table from events (story-events.ts) to sounds, so it is easy to tune
// (polish brief, B1). Components never call sounds: they emit their moments, and this table answers. Each row is a
// pure function of the event (and what the sound has heard so far), giving the cues to play and what the ambience
// does. Levels are multipliers on each recipe's own (voices.ts); the buses' levels are in levels.ts.

import type { DuckName } from '@/lib/sound/engine';
import type { SoundName } from '@/lib/sound/voices';
import type { StoryEvent } from '@/lib/story-events';

export interface SoundCue {
  sound: SoundName;
  /** A multiplier on the recipe's level. */
  gain?: number;
  /** A multiplier on the recipe's pitch. */
  pitch?: number;
  /** Seconds after the moment. */
  delay?: number;
}

/** What a moment does to the sound. */
export interface SoundRow {
  cues?: SoundCue[];
  /** The ambience and the score dip under it. */
  duck?: DuckName;
}

/** What the sound has heard so far, for the rows that depend on it. */
export interface SoundMemory {
  /** When the pen last scratched, in ms (performance time). */
  lastPen: number;
}

export function freshMemory(): SoundMemory {
  return { lastPen: Number.NEGATIVE_INFINITY };
}

type Rows = { [K in StoryEvent['type']]?: (event: Extract<StoryEvent, { type: K }>, memory: SoundMemory) => SoundRow | null };

/** The table. A moment with no row is silent. */
export const SOUND_TABLE: Rows = {
  // The story
  hook: event => (event.direction === 'forward' ? { duck: 'hook' } : null),
  // The desk
  'stamp:record': () => ({ duck: 'stamp' }),
  'stamp:disputed': () => ({ duck: 'stamp' }),
  'stamp:legend': () => ({ duck: 'stamp' }),
};

/** The row for one event, or null when it is silent. */
export function soundFor(event: StoryEvent, memory: SoundMemory): SoundRow | null {
  const row = SOUND_TABLE[event.type] as ((event: StoryEvent, memory: SoundMemory) => SoundRow | null) | undefined;
  return row === undefined ? null : row(event, memory);
}
