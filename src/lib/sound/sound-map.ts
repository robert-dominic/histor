// src/lib/sound/sound-map.ts
// What each moment sounds like: the one table from events (story-events.ts) to sounds, so it is easy to tune
// (polish brief, B1). Components never call sounds: they emit their moments, and this table answers. Each row is a
// pure function of the event (and what the sound has heard so far), giving the sound files to play and what ducks
// under them. Each file's level is in levels.ts (`SAMPLES`); a cue's gain is a multiplier on it.

import type { DuckName } from '@/lib/sound/engine';
import { SOUND } from '@/lib/sound/levels';
import type { SampleName } from '@/lib/sound/samples';
import type { StoryEvent } from '@/lib/story-events';
import { HOOK_SOUNDS, type AmbienceCue, type HookSound } from '@/types/case';

export interface SoundCue {
  /** A sound file (sound-files brief, 2), or the pen's generated scratch (the fix list). */
  sound: SampleName | 'scratch';
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
  /** When the pen last scratched, in ms. */
  lastPen: number;
  /** When the typewriter's last key sounded, in ms. */
  lastKey: number;
  /** The case's one-off cues (from its ambience), and the ones already played. */
  cues: AmbienceCue[];
  played: Set<AmbienceCue>;
  /** Now, in ms: the time the rows read (tests set it). */
  now: number;
  /** The dread sound the last hook played, so the next is never the same (review-fixes brief, 7). */
  lastDread: HookSound | null;
  /** Where the pool's picks come from (tests set it). */
  random: () => number;
}

export function freshMemory(): SoundMemory {
  return { lastPen: Number.NEGATIVE_INFINITY, lastKey: Number.NEGATIVE_INFINITY, cues: [], played: new Set(), now: 0, lastDread: null, random: Math.random };
}

/**
 * A hook's dread sound (review-fixes brief, 7): the chapter's own when it names one, otherwise a pick from the pool,
 * never the same as the last.
 */
export function pickDread(own: HookSound | undefined, memory: SoundMemory): HookSound {
  if (own !== undefined) {
    memory.lastDread = own;
    return own;
  }
  const choices = HOOK_SOUNDS.filter(name => name !== memory.lastDread);
  const pick = choices[Math.floor(memory.random() * choices.length) % choices.length];
  memory.lastDread = pick;
  return pick;
}

type Rows = { [K in StoryEvent['type']]?: (event: Extract<StoryEvent, { type: K }>, memory: SoundMemory) => SoundRow | null };


/** The table. A moment with no row is silent. */
export const SOUND_TABLE: Rows = {
  // ---- The story
  // A chapter appears (forward, or back: its entrance plays again). (The ship's bell is cut: sound-files brief, 3.)
  'chapter-enter': () => ({ cues: [{ sound: 'chapter' }] }),
  // The pen: its generated scratch (the fix list), never more than about 12 a second, a little different each time.
  pen: (event, memory) => {
    if (memory.now - memory.lastPen < 1000 / SOUND.penTicksPerSecond) {
      return null;
    }
    memory.lastPen = memory.now;
    // The legend's own pen a little lower.
    return { cues: [{ sound: 'scratch', pitch: event.hand === 'legend' ? 0.82 : 1 }] };
  },
  // The typewriter: a key for each typed letter, never more than about 14 a second; the ding at the end of a long line.
  'type-key': (_event, memory) => {
    if (memory.now - memory.lastKey < 1000 / SOUND.typeKeysPerSecond) {
      return null;
    }
    memory.lastKey = memory.now;
    return { cues: [{ sound: 'typewriter-key' }] };
  },
  'type-return': () => ({ cues: [{ sound: 'typewriter-ding' }] }),
  // The hook: one dread sound as the text snaps in, forward or back (the chapter's own, or one from the pool, never
  // the same twice running).
  hook: (event, memory) => ({ duck: 'hook', cues: [{ sound: pickDread(event.sound, memory) }] }),
  // Each name un-written: the pen, backwards, a little quieter each time.
  'roll-call-out': event => ({ cues: [{ sound: 'scratch', gain: 0.85 ** event.order }] }),
  // Each line of the question: its pulse.
  'question-line': () => ({ cues: [{ sound: 'question-pulse' }] }),
  // A modal (the play choice, the fork) opening or closing; the ? guide too; and the popovers.
  modal: () => ({ cues: [{ sound: 'modal' }] }),
  guide: event => ({ cues: [{ sound: 'modal', gain: event.open ? 1 : 0.7 }] }),
  popover: event => ({ cues: [{ sound: 'modal', gain: event.open ? 0.7 : 0.5 }] }),
  // ---- The desk
  'folder-lift': () => ({ cues: [{ sound: 'file-pickup' }] }),
  'folder-land': () => ({ cues: [{ sound: 'file-drop' }] }),
  flip: event => (event.direction === 'open' ? { cues: [{ sound: 'file-open' }] } : { cues: [{ sound: 'file-open', gain: 0.6, pitch: 0.94 }] }),
  pin: () => ({ cues: [{ sound: 'pin' }] }),
  // Every stamp is one sound, as it presses in (stampHit says so); the moments around it duck the rest.
  'stamp-hit': () => ({ cues: [{ sound: 'stamp' }] }),
  'stamp:record': () => ({ duck: 'stamp' }),
  'stamp:disputed': () => ({ duck: 'stamp', cues: [{ sound: 'scratch' }] }),
  'stamp:legend': () => ({ duck: 'stamp' }),
  seal: event => (event.where === 'verdict' ? { duck: 'stamp' } : null),
  // ---- The dread pass
  // The eye opening: a barely audible wet blink and a low breath.
  eye: () => ({ cues: [{ sound: 'eye' }] }),
  // Too quiet for too long on the desk: a distant creak, or a door somewhere far off.
  quiet: () => ({ cues: [{ sound: 'creak' }] }),
  // The one jump scare: a sharp, short sting, the loudest moment in the app (still capped); everything else dips.
  'jump-sting': () => ({ duck: 'stamp', cues: [{ sound: 'jump-sting' }] }),
  // The rank revealed: the typewriter's bell.
  rank: () => ({ cues: [{ sound: 'typewriter-ding' }] }),

  // ---- The interface
  // Every button and toggle: the click.
  'ui-click': () => ({ cues: [{ sound: 'click' }] }),
  'ui-toggle': () => ({ cues: [{ sound: 'click', pitch: 1.08 }] }),
};

/** The row for one event, or null when it is silent. `now` is in ms. */
export function soundFor(event: StoryEvent, memory: SoundMemory, now: number = performance.now()): SoundRow | null {
  const row = SOUND_TABLE[event.type] as ((event: StoryEvent, memory: SoundMemory) => SoundRow | null) | undefined;
  memory.now = now;
  return row === undefined ? null : row(event, memory);
}
