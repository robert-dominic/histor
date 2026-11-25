// src/lib/sound/levels.ts
// Every level and timing of the sound, in one place, to tune. Gains are linear (1 = full scale); times are in
// seconds. Quieter is better: the aim is atmosphere and weight, never a cartoon. The sounds are files now
// (sound-files brief, 2): each one's level is in `SAMPLES`; the music is off (`MUSIC_ENABLED`).

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
  /** The typewriter's keys (review-fixes brief, 8): never more than this many a second. */
  typeKeysPerSecond: 14,
} as const;

/**
 * The music is off (sound-files brief, 3): no playlist plays, and there is no Music control. The playlist player
 * (music.ts) and the case's playlists are kept, unused, in case it comes back.
 */
export const MUSIC_ENABLED = false;

/** The music (music.ts): playlists of real tracks, streamed, shuffled and crossfaded. */
export const MUSIC = {
  /** One track into the next, and one place's playlist into the other's, over this. */
  crossfade: 3,
  /** Each place's own level (under the music bus): the desk a little quieter than the story. */
  level: { story: 1, desk: 0.78 },
  /** The next track starts loading once the current one has played this long. */
  preloadAfter: 5,
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

/**
 * Every sound file's level (a gain on the effects bus; the files are loudness-matched at about −18 LUFS, so these
 * set the mix), and whether it varies a little each time it plays (sound-files brief, 2). Quieter is better.
 */
export const SAMPLES = {
  click: { level: 0.32, vary: true },
  modal: { level: 0.4, vary: false },
  pen: { level: 0.3, vary: true },
  'pen-legend': { level: 0.34, vary: true },
  'typewriter-key': { level: 0.3, vary: true },
  'typewriter-ding': { level: 0.42, vary: false },
  stamp: { level: 0.85, vary: false },
  chapter: { level: 0.5, vary: false },
  'dread-1': { level: 0.62, vary: false },
  'dread-2': { level: 0.62, vary: false },
  'dread-3': { level: 0.62, vary: false },
  'dread-4': { level: 0.62, vary: false },
  question: { level: 0.4, vary: false },
  'question-pulse': { level: 0.45, vary: false },
  'room-tone': { level: 0.18, vary: false },
  'file-pickup': { level: 0.42, vary: true },
  'file-open': { level: 0.45, vary: true },
  pin: { level: 0.45, vary: true },
  'file-drop': { level: 0.42, vary: true },
  heartbeat: { level: 0.45, vary: false },
  murmur: { level: 0.3, vary: false },
  eye: { level: 0.4, vary: false },
  creak: { level: 0.4, vary: false },
  'jump-sting': { level: 0.95, vary: false },
} as const satisfies Record<string, { level: number; vary: boolean }>;
