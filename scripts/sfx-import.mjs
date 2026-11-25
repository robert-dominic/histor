// scripts/sfx-import.mjs
// `npm run sfx:import` (sound-files brief, 2). Converts the owner's sound files, from ~/histor-media/sfx/ (outside the
// repo; HISTOR_MEDIA overrides the folder), into public/audio/sfx/<name>.mp3, as src/lib/sfx-import.ts says: 96 kbps,
// mono effects and stereo loops, leading silence trimmed, loudness matched. It prints
// each file's size before and after. Needs ffmpeg (and Node 22.18+ for the TypeScript helpers); installs nothing.
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const fail = message => {
  console.error(`sfx:import: ${message}`);
  process.exit(1);
};
const [major, minor] = process.versions.node.split('.').map(Number);
if (major < 22 || (major === 22 && minor < 18)) {
  fail(`this needs Node 22.18 or newer (this is Node ${process.versions.node}).`);
}
const { SFX_FILES, SFX_SOURCE_EXTENSIONS, sfxFfmpegArgs } = await import('../src/lib/sfx-import.ts');
const { formatSize } = await import('../src/lib/music-import.ts');

const ffmpeg = spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' });
if (ffmpeg.error !== undefined || ffmpeg.status !== 0) {
  fail('ffmpeg is not installed, so nothing was converted. Install ffmpeg (e.g. `sudo apt install ffmpeg`), then run this again.');
}
const from = join(process.env.HISTOR_MEDIA ?? join(homedir(), 'histor-media'), 'sfx');
if (!existsSync(from)) {
  fail(`there is no folder ${from}.`);
}
const to = join(root, 'public', 'audio', 'sfx');
mkdirSync(to, { recursive: true });

const sourceOf = name => SFX_SOURCE_EXTENSIONS.map(extension => join(from, `${name}${extension}`)).find(path => existsSync(path));
let missing = 0;
let failed = 0;
let before = 0;
let after = 0;
for (const spec of SFX_FILES) {
  const input = sourceOf(spec.name);
  if (input === undefined) {
    missing += 1;
    console.log(`${spec.name}: no source file in ${from}.`);
    continue;
  }
  const output = join(to, `${spec.name}.mp3`);
  const result = spawnSync('ffmpeg', sfxFfmpegArgs(spec, input, output), { encoding: 'utf8' });
  if (result.status !== 0) {
    failed += 1;
    console.error(`${spec.name}: ffmpeg failed. ${(result.stderr ?? '').trim()}`);
    continue;
  }
  before += statSync(input).size;
  after += statSync(output).size;
  console.log(`${spec.name.padEnd(16)} ${spec.kind.padEnd(6)} ${formatSize(statSync(input).size).padStart(9)} → ${formatSize(statSync(output).size)}`);
}
console.log(`\n${SFX_FILES.length - missing - failed} files written to public/audio/sfx/: ${formatSize(before)} → ${formatSize(after)}.` + (missing > 0 ? ` ${missing} missing.` : '') + (failed > 0 ? ` ${failed} failed.` : ''));
if (failed > 0) {
  process.exit(1);
}
