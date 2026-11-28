// src/lib/sfx-import.ts
// The sound files (sound-files brief, 2): what `npm run sfx:import` makes of the owner's WAVs (from Mixkit, kept in
// ~/histor-media/sfx/, outside the repo), and how. Pure, shared by scripts/sfx-import.mjs and its tests.
// Each becomes an MP3 at 96 kbps, mono for a short effect and stereo for a loop, its leading silence trimmed, its
// loudness matched (loudnorm), with tiny fades so it never clicks. A sound played again and again (a typed letter, a
// pen stroke) keeps only its first key or stroke; a loop is capped so its file stays small. (The pen itself is
// generated now: src/lib/sound/scratch.ts.)

export const SFX_IMPORT = {
  bitrate: '96k',
  sampleRate: 44100,
  /** Below this a start is silence, and is trimmed. */
  silenceThreshold: '-50dB',
  /** The loudness every file is matched to (EBU R128); each sound's own level is set in the tune table. */
  loudness: { integrated: -18, truePeak: -1.5, range: 11 },
  /** A loop's longest length, in seconds: about 290 KB at 96 kbps. */
  loopMaxSeconds: 24,
  /** Fades at each end, in seconds, so nothing clicks (a loop's are longer, for its seam). */
  fade: { in: 0.004, out: 0.02, loop: 0.25 },
} as const;

export interface SfxSpec {
  /** The file's name, without its extension: also the sound's name. */
  name: string;
  /** A short effect (mono) or a loop held under something (stereo). */
  kind: 'effect' | 'loop';
  /** Keep only this many seconds from the start (one key). */
  maxSeconds?: number;
}

/** Every sound file, in the brief's order. */
export const SFX_FILES: readonly SfxSpec[] = [
  { name: 'click', kind: 'effect' },
  { name: 'modal', kind: 'effect' },
  { name: 'typewriter-ding', kind: 'effect' },
  { name: 'stamp', kind: 'effect' },
  { name: 'dread-1', kind: 'effect' },
  { name: 'dread-2', kind: 'effect' },
  { name: 'dread-3', kind: 'effect' },
  { name: 'dread-4', kind: 'effect' },
  { name: 'question', kind: 'loop' },
  { name: 'room-tone', kind: 'loop' },
  { name: 'file-pickup', kind: 'effect' },
  { name: 'file-open', kind: 'effect' },
  { name: 'pin', kind: 'effect' },
  { name: 'file-drop', kind: 'effect' },
  { name: 'heartbeat', kind: 'loop' },
  { name: 'murmur', kind: 'loop' },
  { name: 'eye', kind: 'effect' },
  { name: 'creak', kind: 'effect' },
  { name: 'jump-sting', kind: 'effect' },
];

/** The extensions a source may have, in the order they are looked for. */
export const SFX_SOURCE_EXTENSIONS = ['.wav', '.mp3', '.flac', '.ogg', '.aiff', '.aif'] as const;

/** Where a converted file is served from. */
export function sfxSrc(name: string): string {
  return `/audio/sfx/${name}.mp3`;
}

/** The ffmpeg audio filters for a file. */
export function sfxFilters(spec: SfxSpec): string[] {
  const { silenceThreshold, loudness, fade, loopMaxSeconds } = SFX_IMPORT;
  const filters = [`silenceremove=start_periods=1:start_duration=0.01:start_threshold=${silenceThreshold}`];
  const length = spec.maxSeconds ?? (spec.kind === 'loop' ? loopMaxSeconds : undefined);
  if (length !== undefined) {
    filters.push(`atrim=0:${length.toFixed(3)}`, 'asetpts=PTS-STARTPTS');
  }
  filters.push(`loudnorm=I=${loudness.integrated}:TP=${loudness.truePeak}:LRA=${loudness.range}`);
  filters.push(`afade=t=in:d=${spec.kind === 'loop' ? fade.loop : fade.in}`);
  // The fade out is applied at the end (areverse, fade in, areverse), so its length need not be known.
  filters.push('areverse', `afade=t=in:d=${spec.kind === 'loop' ? fade.loop : fade.out}`, 'areverse');
  return filters;
}

/** The ffmpeg arguments that turn `input` into `output` for `spec`. */
export function sfxFfmpegArgs(spec: SfxSpec, input: string, output: string): string[] {
  return [
    '-hide_banner', '-loglevel', 'error', '-y', '-i', input, '-vn',
    '-af', sfxFilters(spec).join(','),
    '-ac', spec.kind === 'loop' ? '2' : '1',
    '-ar', String(SFX_IMPORT.sampleRate),
    '-c:a', 'libmp3lame', '-b:a', SFX_IMPORT.bitrate,
    output,
  ];
}
