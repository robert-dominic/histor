// src/lib/sound/levels.ts
// Every level and timing of the generated sound, in one place, to tune (polish brief, part B). Gains are linear
// (1 = full scale); times are in seconds. Quieter is better: the aim is atmosphere and weight, never a cartoon.

export const SOUND = {
  /** The whole mix. Modest: nothing loud or sudden except the stamps. */
  master: 0.55,
  /** Each bus's own level, under the master. */
  bus: {
    /** The music: under everything. */
    music: 0.5,
    ambience: 0.32,
    /** The score has its own level, so it can be turned down without losing the effects. */
    score: 0.16,
    effects: 0.62,
  },
  /** How far the ambience and the score dip (a multiplier) for each kind of moment, and for how long. */
  duck: {
    hook: { to: 0.45, hold: 4 },
    stamp: { to: 0.4, hold: 1.4 },
    /** Under the narrator, the music drops to about 12%. */
    voice: { to: 0.12, hold: 0 },
  },
  /** How quickly a duck comes in, and goes back out. */
  duckIn: 0.25,
  duckOut: 1.8,
  /** Everything fades out when the tab is hidden, and back in when it returns. */
  hiddenFade: 0.8,
  /** Turning the music or the effects off or on, or changing a volume. */
  toggleFade: 0.35,
  /** Each control's volume until the player moves its slider. */
  defaultVolume: 0.8,
  /** No more one-shot sounds than this at once; another is simply skipped. */
  maxVoices: 14,
  /** The pen's scratch: never more ticks a second than this, however fast it writes. */
  penTicksPerSecond: 12,
  /** The brush of a file on the floor: never more than this a second. */
  brushesPerSecond: 4,
  /** The hook's drone: its level under a hook, its level held low under the question, and its release. */
  drone: { level: 0.22, low: 0.1, release: 2.6 },
  /** The ship's bell rings this long after its chapter enters: far away, after the swell. */
  bellAfter: 1.4,
} as const;

/**
 * The generated ambience and score (ambience.ts, score.ts) are kept, but do not play: real music tracks replace
 * them (music brief, 2). True brings them back.
 */
export const AMBIENCE_ENABLED = false;

/** The music (music.ts): playlists of real tracks, streamed, shuffled and crossfaded. */
export const MUSIC = {
  /** One track into the next, and one place's playlist into the other's, over this. */
  crossfade: 3,
  /** Each place's own level (under the music bus): the desk a little quieter than the story. */
  level: { story: 1, desk: 0.78 },
  /** The next track starts loading once the current one has played this long. */
  preloadAfter: 5,
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

/** Narration (narration.ts): the voice's level, and the beat "Play the story" waits after a clip ends. */
export const NARRATION = { volume: 0.9, beat: 0.8 } as const;

/**
 * Where the player's choices are kept: music and effects each on or off (absent means on), and each one's volume
 * (0 to 1; absent means `SOUND.defaultVolume`). `histor:sound` is the old single switch: read once, if the new ones
 * are absent.
 */
export const SOUND_KEYS = {
  music: 'histor:music',
  effects: 'histor:effects',
  musicVolume: 'histor:music-volume',
  effectsVolume: 'histor:effects-volume',
  legacy: 'histor:sound',
} as const;
