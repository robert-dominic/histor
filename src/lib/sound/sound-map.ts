// src/lib/sound/sound-map.ts
// What each moment sounds like: the one table from events (story-events.ts) to sounds, so it is easy to tune
// (polish brief, B1). Components never call sounds: they emit their moments, and this table answers. Each row is a
// pure function of the event (and what the sound has heard so far), giving the cues to play and what the ambience
// does. Levels are multipliers on each recipe's own (voices.ts); the buses' levels are in levels.ts.

import type { DuckName } from '@/lib/sound/engine';
import { SOUND } from '@/lib/sound/levels';
import type { SoundName } from '@/lib/sound/voices';
import type { StoryEvent } from '@/lib/story-events';
import type { AmbienceCue } from '@/types/case';

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
  /** The hook's drone: fades in, holds low (the question), or fades out. */
  drone?: 'in' | 'low' | 'out';
}

/** What the sound has heard so far, for the rows that depend on it. */
export interface SoundMemory {
  /** When the pen last scratched, in ms. */
  lastPen: number;
  /** The case's one-off cues (from its ambience), and the ones already played. */
  cues: AmbienceCue[];
  played: Set<AmbienceCue>;
  /** Now, in ms: the time the rows read (tests set it). */
  now: number;
}

export function freshMemory(): SoundMemory {
  return { lastPen: Number.NEGATIVE_INFINITY, cues: [], played: new Set(), now: 0 };
}

type Rows = { [K in StoryEvent['type']]?: (event: Extract<StoryEvent, { type: K }>, memory: SoundMemory) => SoundRow | null };

/** A cue's sound, as a one-shot sound's name. */
const CUE_SOUND = { 'ships-bell': 'bell' } as const;

/** The table. A moment with no row is silent. */
export const SOUND_TABLE: Rows = {
  // ---- The story (B3)
  // A chapter enters: a soft low swell; and its one-off cue, once (the Mary Celeste's ship's bell, far away).
  'chapter-enter': (event, memory) => {
    if (event.direction !== 'forward') {
      return { drone: 'out' };
    }
    const cues: SoundCue[] = [{ sound: 'swell' }];
    memory.cues
      .filter(cue => cue.chapter === event.chapter && !memory.played.has(cue))
      .forEach(cue => {
        memory.played.add(cue);
        cues.push({ sound: CUE_SOUND[cue.sound], delay: SOUND.bellAfter });
      });
    return { cues, drone: 'out' };
  },
  // The pen: a faint scratch, never more than about 12 a second.
  pen: (_event, memory) => {
    if (memory.now - memory.lastPen < 1000 / SOUND.penTicksPerSecond) {
      return null;
    }
    memory.lastPen = memory.now;
    return { cues: [{ sound: 'scratch' }] };
  },
  // The hook: a deep drone fades in under it, and one low, distant boom as the text snaps in.
  hook: event => (event.direction === 'forward' ? { duck: 'hook', drone: 'in', cues: [{ sound: 'boom' }] } : { drone: 'in' }),
  // The hook decays: a soft reversed whoosh, and the drone goes.
  'hook-out': event => (event.direction === 'forward' ? { cues: [{ sound: 'whoosh' }], drone: 'out' } : { drone: 'out' }),
  // Each name un-written: a breathy hiss, a little lower each time.
  'roll-call-out': event => ({ cues: [{ sound: 'hiss', pitch: 0.9 ** event.order }] }),
  // The question: the drone stays low and still; each line adds a faint, low pulse.
  'question-line': event => (event.direction === 'forward' ? { drone: 'low', cues: [{ sound: 'pulse' }] } : { drone: 'low' }),
  // The fork's modal: a paper slide.
  fork: () => ({ cues: [{ sound: 'paper-slide' }] }),
  // The desk
  'stamp:record': () => ({ duck: 'stamp' }),
  'stamp:disputed': () => ({ duck: 'stamp' }),
  'stamp:legend': () => ({ duck: 'stamp' }),
};

/** The row for one event, or null when it is silent. `now` is in ms. */
export function soundFor(event: StoryEvent, memory: SoundMemory, now: number = performance.now()): SoundRow | null {
  const row = SOUND_TABLE[event.type] as ((event: StoryEvent, memory: SoundMemory) => SoundRow | null) | undefined;
  memory.now = now;
  return row === undefined ? null : row(event, memory);
}
