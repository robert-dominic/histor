// scripts/music-import.mjs
// `npm run music:import -- <caseId>` (music brief, 3). Converts the owner's chosen tracks for a case:
//   1. each file in ~/histor-media/music/story/ and .../desk/ (outside the repo; HISTOR_MEDIA overrides the folder) is
//      converted with ffmpeg to MP3, 128 kbps stereo, silence trimmed at both ends and loudness matched (loudnorm,
//      about −18 LUFS), into public/audio/music/<caseId>/story/ and .../desk/;
//   2. src/cases/<caseId>/music.ts is written with the playlists (titles from the file names; credits default to
//      "Pixabay" with a TODO, and credits already filled in are kept);
//   3. each file's size, before and after, is printed.
// Needs ffmpeg, and installs nothing: without it, it says so and stops.
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const fail = message => {
  console.error(`music:import: ${message}`);
  process.exit(1);
};

// The helpers are TypeScript (src/lib/music-import.ts, shared with the tests): Node runs them with their types
// stripped, which needs Node 22.18 or newer (or 23.6).
const [major, minor] = process.versions.node.split('.').map(Number);
if (major < 22 || (major === 22 && minor < 18) || (major === 23 && minor < 6)) {
  fail(`this needs Node 22.18 or newer (this is Node ${process.versions.node}).`);
}
const { MUSIC_IMPORT, ffmpegArgs, formatSize, isAudioFile, musicModule, readCredits, trackFileName, trackSrc, trackTitle } = await import(
  '../src/lib/music-import.ts'
);

const caseId = process.argv[2];
if (caseId === undefined || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(caseId)) {
  fail('name the case, e.g. `npm run music:import -- mary-celeste`.');
}
const caseDir = join(root, 'src', 'cases', caseId);
if (!existsSync(caseDir)) {
  fail(`there is no case "${caseId}" (no folder src/cases/${caseId}).`);
}
const ffmpeg = spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' });
if (ffmpeg.error !== undefined || ffmpeg.status !== 0) {
  fail('ffmpeg is not installed, so nothing was converted. Install ffmpeg (e.g. `sudo apt install ffmpeg`), then run this again.');
}

const media = process.env.HISTOR_MEDIA ?? join(homedir(), 'histor-media');
const modulePath = join(caseDir, 'music.ts');
const credits = existsSync(modulePath) ? readCredits(readFileSync(modulePath, 'utf8')) : new Map();
const playlists = { story: [], desk: [] };
let failed = 0;

for (const place of ['story', 'desk']) {
  const from = join(media, 'music', place);
  if (!existsSync(from)) {
    console.log(`${place}: no folder ${from}, so no ${place} playlist.`);
    continue;
  }
  const to = join(root, 'public', 'audio', 'music', caseId, place);
  mkdirSync(to, { recursive: true });
  const files = readdirSync(from).filter(isAudioFile).sort();
  if (files.length === 0) {
    console.log(`${place}: no audio files in ${from}.`);
  }
  const used = new Set();
  for (const file of files) {
    let name = trackFileName(file);
    for (let n = 2; used.has(name); n += 1) {
      name = trackFileName(file).replace(/\.mp3$/, `-${n}.mp3`);
    }
    used.add(name);
    const input = join(from, file);
    const output = join(to, name);
    const result = spawnSync('ffmpeg', ffmpegArgs(input, output), { encoding: 'utf8' });
    if (result.status !== 0) {
      failed += 1;
      console.error(`${place}/${file}: ffmpeg failed. ${(result.stderr ?? '').trim()}`);
      continue;
    }
    const src = trackSrc(caseId, place, name);
    const kept = credits.get(src);
    const credit = kept ?? MUSIC_IMPORT.defaultCredit;
    playlists[place].push({ src, title: trackTitle(file), credit, todo: credit === MUSIC_IMPORT.defaultCredit });
    console.log(`${place}/${file} → ${name}: ${formatSize(statSync(input).size)} → ${formatSize(statSync(output).size)}`);
  }
}

writeFileSync(modulePath, musicModule(caseId, playlists));
console.log(
  `\nWrote src/cases/${caseId}/music.ts: ${playlists.story.length} story and ${playlists.desk.length} desk tracks.` +
    (failed > 0 ? ` ${failed} file(s) failed.` : '') +
    ' Fill in each TODO credit with the artist.'
);
