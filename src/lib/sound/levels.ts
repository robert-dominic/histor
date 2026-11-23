// src/lib/sound/levels.ts
// Every level and timing of the generated sound, in one place, to tune (polish brief, part B). Gains are linear
// (1 = full scale); times are in seconds. Quieter is better: the aim is atmosphere and weight, never a cartoon.

export const SOUND = {
  /** The whole mix. Modest: nothing loud or sudden except the stamps. */
  master: 0.55,
  /** Each bus's own level, under the master. */
  bus: {
    ambience: 0.32,
    /** The score has its own level, so it can be turned down without losing the effects. */
    score: 0.16,
    effects: 0.62,
  },
  /** How far the ambience and the score dip (a multiplier) for each kind of moment, and for how long. */
  duck: {
    hook: { to: 0.45, hold: 4 },
    stamp: { to: 0.4, hold: 1.4 },
    voice: { to: 0.22, hold: 0 },
  },
  /** How quickly a duck comes in, and goes back out. */
  duckIn: 0.25,
  duckOut: 1.8,
  /** Everything fades out when the tab is hidden, and back in when it returns. */
  hiddenFade: 0.8,
  /** Turning the sound off or on. */
  toggleFade: 0.35,
  /** No more one-shot sounds than this at once; another is simply skipped. */
  maxVoices: 14,
  /** The pen's scratch: never more ticks a second than this, however fast it writes. */
  penTicksPerSecond: 12,
} as const;

/** Where the choice to have sound on or off is kept. Absent means on. */
export const SOUND_STORAGE_KEY = 'histor:sound';
