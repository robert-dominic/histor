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
  /** Each place's own level (under the music bus): the desk at about half the story's, as it carries its own sound (dread pass, 7). */
  level: { story: 1, desk: 0.5 },
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
 * The mix (sound-files brief, 4): one thing in focus. Every file has a tier, in the brief's priority order: voice >
 * stamp > dread (and the jump sting) > question > file actions > pen and typewriter > UI clicks > loops. While a sound
 * plays, every tier below it dips to `focusDuck`, and comes back as it ends. The voice (narration) holds the dip for as
 * long as it speaks.
 */
export const TIERS = ['voice', 'stamp', 'dread', 'question', 'file', 'writing', 'ui', 'loop'] as const;
export type Tier = (typeof TIERS)[number];

/**
 * Every sound's category (dread pass, 7), for the mixer that stops sounds piling up: only one `dread` sound at a time,
 * with at least `MIX.dreadGapMs` between them (the one jump sting excepted: it is the moment); `ui` and `paper` sounds
 * each have their own cooldown (`cooldownMs`; the pen and the typewriter are throttled by the table instead).
 */
export type SoundCategory = 'ui' | 'paper' | 'dread' | 'ambience' | 'music';

export const MIX = {
  /** At least this long between two dread sounds (start to start), and never two at once. */
  dreadGapMs: 6000,
  /** Too quiet for too long on the desk (dread pass, 7): after this long without input, a distant creak, at most once every `creakEveryMs`. */
  quietMs: 25000,
  creakEveryMs: 90000,
  /** What a lower tier dips to while a higher one plays. */
  focusDuck: 0.4,
  /** How fast it dips, and comes back. */
  focusIn: 0.08,
  focusOut: 0.6,
  /** The desk's room tone: very low; under the murmur (ghost text on screen) it drops further, so one is in focus. */
  roomTone: { level: 1, underMurmur: 0.25, fade: 2.5 },
  /** The murmur: it grows a little with each ghost line on screen (at most `max`), and fades when they are gone. */
  murmur: { perLine: 0.55, max: 1, rise: 1.5, fall: 2.5 },
  /** The question's loop: fades in under the question, and out as the fork opens (or the reader goes back). */
  question: { fadeIn: 2, fadeOut: 1.2 },
  /** The heartbeat at the verdict: in and out over about half a second; it quickens, slowly, the longer the hover. */
  heartbeat: { fade: 0.5, quickenTo: 1.3, quickenOver: 12 },
} as const;

/**
 * Every sound file, in the one tune table (sound-files brief, 4): its level (a gain on the effects bus; the files are
 * loudness-matched at about −18 LUFS, so these set the mix), its tier, and whether it varies a little each time it
 * plays. Quieter is better.
 */
export const SAMPLES = {
  click: { level: 0.32, tier: 'ui', vary: true, category: 'ui', cooldownMs: 60 },
  modal: { level: 0.4, tier: 'ui', vary: false, category: 'ui', cooldownMs: 150 },
  pen: { level: 0.3, tier: 'writing', vary: true, category: 'paper', cooldownMs: 0 },
  'pen-legend': { level: 0.34, tier: 'writing', vary: true, category: 'paper', cooldownMs: 0 },
  'typewriter-key': { level: 0.3, tier: 'writing', vary: true, category: 'paper', cooldownMs: 0 },
  'typewriter-ding': { level: 0.42, tier: 'writing', vary: false, category: 'paper', cooldownMs: 0 },
  stamp: { level: 0.85, tier: 'stamp', vary: false, category: 'paper', cooldownMs: 0 },
  chapter: { level: 0.5, tier: 'question', vary: false, category: 'paper', cooldownMs: 0 },
  'dread-1': { level: 0.62, tier: 'dread', vary: false, category: 'dread', cooldownMs: 0 },
  'dread-2': { level: 0.62, tier: 'dread', vary: false, category: 'dread', cooldownMs: 0 },
  'dread-3': { level: 0.62, tier: 'dread', vary: false, category: 'dread', cooldownMs: 0 },
  'dread-4': { level: 0.62, tier: 'dread', vary: false, category: 'dread', cooldownMs: 0 },
  question: { level: 0.4, tier: 'question', vary: false, category: 'ambience', cooldownMs: 0 },
  'question-pulse': { level: 0.45, tier: 'question', vary: false, category: 'paper', cooldownMs: 0 },
  'room-tone': { level: 0.16, tier: 'loop', vary: false, category: 'ambience', cooldownMs: 0 },
  'file-pickup': { level: 0.42, tier: 'file', vary: true, category: 'paper', cooldownMs: 120 },
  'file-open': { level: 0.45, tier: 'file', vary: true, category: 'paper', cooldownMs: 150 },
  pin: { level: 0.45, tier: 'file', vary: true, category: 'paper', cooldownMs: 120 },
  'file-drop': { level: 0.42, tier: 'file', vary: true, category: 'paper', cooldownMs: 120 },
  heartbeat: { level: 0.45, tier: 'loop', vary: false, category: 'ambience', cooldownMs: 0 },
  murmur: { level: 0.3, tier: 'loop', vary: false, category: 'ambience', cooldownMs: 0 },
  eye: { level: 0.4, tier: 'dread', vary: false, category: 'dread', cooldownMs: 0 },
  creak: { level: 0.4, tier: 'dread', vary: false, category: 'dread', cooldownMs: 0 },
  'jump-sting': { level: 0.95, tier: 'dread', vary: false, category: 'dread', cooldownMs: 0 },
} as const satisfies Record<string, { level: number; tier: Tier; vary: boolean; category: SoundCategory; cooldownMs: number }>;
