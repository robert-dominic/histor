// src/lib/__tests__/music-import.test.ts
// The pure parts of `npm run music:import` (music brief, 3): titles from file names, where tracks go, the ffmpeg
// command, and the music.ts module, which keeps credits already filled in.
import { describe, expect, test } from 'vitest';
import maryCeleste from '@/cases/mary-celeste/case';
import { MUSIC_IMPORT, ffmpegArgs, formatSize, isAudioFile, musicModule, readCredits, trackFileName, trackSrc, trackTitle } from '@/lib/music-import';

describe('music:import', () => {
  test('a track\'s title comes from its file name, without a trailing Pixabay number', () => {
    expect(trackTitle('dark-sea-at-night-187452.mp3')).toBe('Dark Sea At Night');
    expect(trackTitle('Lamp_Light.flac')).toBe('Lamp Light');
    expect(trackTitle('the  long   watch.wav')).toBe('The Long Watch');
    expect(trackTitle('.mp3')).toBe('Untitled');
  });

  test('converted to a tidy .mp3 name, served from public/audio/music/{caseId}/{place}/', () => {
    expect(trackFileName('Dark Sea At Night (Remix) 187452.WAV')).toBe('dark-sea-at-night-remix.mp3');
    expect(trackSrc('mary-celeste', 'desk', 'lamp-light.mp3')).toBe('/audio/music/mary-celeste/desk/lamp-light.mp3');
  });

  test('only audio files are converted', () => {
    expect(['a.mp3', 'b.WAV', 'c.flac', 'notes.txt', '.DS_Store', 'cover.jpg'].filter(isAudioFile)).toEqual(['a.mp3', 'b.WAV', 'c.flac']);
  });

  test('ffmpeg: MP3 at 128 kbps stereo, silence trimmed at both ends, loudness matched near −18 LUFS', () => {
    const args = ffmpegArgs('in.wav', 'out.mp3');
    expect(args).toEqual(expect.arrayContaining(['-i', 'in.wav', '-c:a', 'libmp3lame', '-b:a', '128k', '-ac', '2', 'out.mp3']));
    const filters = args[args.indexOf('-af') + 1];
    expect(filters.match(/silenceremove/g)).toHaveLength(2);
    expect(filters.match(/areverse/g)).toHaveLength(2);
    expect(filters).toContain(`loudnorm=I=${MUSIC_IMPORT.loudness.integrated}`);
    expect(MUSIC_IMPORT.loudness.integrated).toBe(-18);
  });

  test('music.ts lists the playlists, a TODO above each default credit; credits already filled in are kept', () => {
    const text = musicModule('test-case', {
      story: [{ src: '/audio/music/test-case/story/a.mp3', title: "Captain's Log", credit: 'Pixabay', todo: true }],
      desk: [],
    });
    expect(text).toContain("export const playlists: NonNullable<CaseTheme['playlists']> = {");
    expect(text).toContain("// TODO: the artist's name");
    expect(text).toContain("title: 'Captain\\'s Log'");
    expect(text).toContain('desk: [],');
    const edited = text.replace("credit: 'Pixabay'", "credit: 'Someone O\\'Brien (Pixabay)'");
    expect(readCredits(edited).get('/audio/music/test-case/story/a.mp3')).toBe("Someone O'Brien (Pixabay)");
  });

  test('sizes for the report', () => {
    expect(formatSize(512 * 1024)).toBe('512 KB');
    expect(formatSize(3.2 * 1024 * 1024)).toBe('3.2 MB');
  });

  test('the Mary Celeste picks up music.ts when it exists; until then it has no playlists', () => {
    const playlists = maryCeleste.theme.playlists;
    if (playlists === undefined) {
      expect('playlists' in maryCeleste.theme).toBe(false);
    } else {
      expect([...(playlists.story ?? []), ...(playlists.desk ?? [])].every(track => track.src.startsWith('/audio/music/mary-celeste/'))).toBe(true);
    }
  });
});
