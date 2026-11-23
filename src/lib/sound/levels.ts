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

/** The ambience's layers (ambience.ts): each one's level, and how the story's darkness moves them. */
export const AMBIENCE = {
  /** A layer fades in, and out, over these. */
  fadeIn: 3,
  fadeOut: 2.2,
  sea: { level: 0.9, cutoff: 420, swell: 0.28, darkCutoff: 280, darkLevel: 0.7 },
  wind: { level: 0.16, centre: 750, darkLevel: 0.3, gust: { every: [25, 60], rise: 1.8, fall: 4.5, by: 0.14 } },
  timber: { level: 0.5, every: [8, 20] },
  'room-tone': { level: 0.22, cutoff: 520 },
  'lamp-hum': { level: 0.018 },
  'distant-sea': { level: 0.42, cutoff: 230 },
  /** How quickly the ambience follows the story's darkness. */
  darkGlide: 6,
} as const;

/** The score (score.ts): a quiet pad of long minor chords. Its bus level is `SOUND.bus.score`. */
export const SCORE = {
  /** The pad's low-pass, at day and deep in the night. */
  cutoff: 560,
  darkCutoff: 330,
  /** How many semitones lower the chords sit at the darkest chapter. */
  darkSemitones: 2,
  /** A new chord every 10 to 20 seconds, crossfaded over `crossfade`. */
  change: [10, 20],
  crossfade: 5,
  /** At the desk: one low tone that moves rarely. */
  deskChange: [20, 40],
  /** Each voice of a chord (root, root detuned, third, fifth), and the detune between the two roots, in cents. */
  voices: [0.3, 0.3, 0.2, 0.17],
  detune: 7,
  /** The whole pad's level in each mood. */
  mood: { story: 1, hook: 0.75, question: 0.12, desk: 0.6 },
  /** How quickly the pad moves to a new mood. */
  moodGlide: 2.5,
} as const;

/** Where the choice to have sound on or off is kept. Absent means on. */
export const SOUND_STORAGE_KEY = 'histor:sound';
