// src/lib/music-import.ts
// The pure parts of `npm run music:import` (scripts/music-import.mjs; music brief, 3): what a track is called, where
// it goes, the ffmpeg command that makes it, and the `music.ts` module that lists the playlists. No Node or browser
// APIs here, so the script and the tests share it (Node runs this file with its types stripped: keep it erasable).

/** The kinds of audio file the script converts. */
export const AUDIO_EXTENSIONS = ['.mp3', '.wav', '.ogg', '.oga', '.flac', '.m4a', '.aac', '.opus', '.webm'] as const;

/** The conversion, to tune: MP3 at 128 kbps stereo, silence trimmed at both ends, loudness matched near −18 LUFS. */
export const MUSIC_IMPORT = {
  bitrate: '128k',
  sampleRate: 44100,
  /** Below this level, a track's opening or closing is silence to trim. */
  silenceThreshold: '-50dB',
  loudness: { integrated: -18, truePeak: -1.5, range: 11 },
  /** The credit a track gets until the owner names its artist. */
  defaultCredit: 'Pixabay',
} as const;

export type MusicPlace = 'story' | 'desk';

export interface ImportedTrack {
  src: string;
  title: string;
  credit: string;
  /** True when the credit is still the default (the module marks it TODO). */
  todo: boolean;
}

/** True for a file the script converts. */
export function isAudioFile(fileName: string): boolean {
  const lower = fileName.toLowerCase();
  return !lower.startsWith('.') && AUDIO_EXTENSIONS.some(extension => lower.endsWith(extension));
}

function stem(fileName: string): string {
  return fileName.replace(/\.[^.]+$/, '');
}

/**
 * A track's title, from its file name: no extension, no trailing Pixabay number ("…-123456"), dashes and underscores
 * as spaces, each word capitalised. "dark-sea-at-night-187452.mp3" → "Dark Sea At Night".
 */
export function trackTitle(fileName: string): string {
  const words = stem(fileName)
    .replace(/[-_ ]+\d{4,}$/, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const title = words.replace(/(^|\s)(\p{L})/gu, (_match, space: string, letter: string) => space + letter.toUpperCase());
  return title === '' ? 'Untitled' : title;
}

/** The converted file's name: the title as lower-case words joined by dashes, as .mp3. */
export function trackFileName(fileName: string): string {
  const slug = trackTitle(fileName)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `${slug === '' ? 'track' : slug}.mp3`;
}

/** Where a converted track is served from. */
export function trackSrc(caseId: string, place: MusicPlace, fileName: string): string {
  return `/audio/music/${caseId}/${place}/${fileName}`;
}

/** The ffmpeg arguments that convert `input` into `output`. */
export function ffmpegArgs(input: string, output: string): string[] {
  const { silenceThreshold, loudness, bitrate, sampleRate } = MUSIC_IMPORT;
  const trim = `silenceremove=start_periods=1:start_duration=0.05:start_threshold=${silenceThreshold}`;
  const filters = [trim, 'areverse', trim, 'areverse', `loudnorm=I=${loudness.integrated}:TP=${loudness.truePeak}:LRA=${loudness.range}`];
  return ['-hide_banner', '-loglevel', 'error', '-y', '-i', input, '-vn', '-af', filters.join(','), '-ac', '2', '-ar', String(sampleRate), '-c:a', 'libmp3lame', '-b:a', bitrate, output];
}

/** The credits already written in a `music.ts` (by src), so running the script again keeps the owner's edits. */
export function readCredits(moduleText: string): Map<string, string> {
  const credits = new Map<string, string>();
  const entry = /src:\s*'([^']+)'[^}]*?credit:\s*'((?:\\'|[^'])*)'/g;
  for (const match of moduleText.matchAll(entry)) {
    credits.set(match[1], match[2].replace(/\\'/g, "'"));
  }
  return credits;
}

const quote = (value: string) => `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;

/** The `src/cases/{caseId}/music.ts` module listing the playlists. */
export function musicModule(caseId: string, playlists: Record<MusicPlace, ImportedTrack[]>): string {
  const list = (tracks: ImportedTrack[]) =>
    tracks.length === 0
      ? '[]'
      : `[\n${tracks
          .map(
            track =>
              `${track.todo ? "    // TODO: the artist's name, e.g. 'Artist Name (Pixabay)'.\n" : ''}    { src: ${quote(track.src)}, title: ${quote(track.title)}, credit: ${quote(track.credit)} },`
          )
          .join('\n')}\n  ]`;
  return `// src/cases/${caseId}/music.ts
// Written by \`npm run music:import -- ${caseId}\` (scripts/music-import.mjs) from the tracks in
// histor-media/music/story and histor-media/music/desk. Running it again rewrites this file, keeping every credit
// already filled in. Fill in each TODO credit with the track's artist.
import type { CaseTheme } from '@/types/case';

export const playlists: NonNullable<CaseTheme['playlists']> = {
  story: ${list(playlists.story)},
  desk: ${list(playlists.desk)},
};
`;
}

/** A size in KB or MB, for the script's report. */
export function formatSize(bytes: number): string {
  return bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;
}
