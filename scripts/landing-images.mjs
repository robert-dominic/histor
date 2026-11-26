// scripts/landing-images.mjs
// `npm run landing:images`. Converts the owner's pictures for the sealed cases' frames, from
// ~/histor-media/landing/<name>.jpg (outside the repo; HISTOR_MEDIA overrides the folder), into
// src/landing/images/<name>.webp: at most 1400px on the long side (a frame is at most about 60% of a laptop
// screen's height, so this is sharp at 2x), never enlarged, in colour space (a greyscale engraving too), WebP at
// quality 78; while the file is over 300 KB the quality is lowered to 60, then the size by steps (a fine engraving's
// grain is costly), never below 1000px on the long side. Prints each file's size before and after. Needs ffmpeg.
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const NAMES = ['ripper', 'cooper', 'princes', 'dancing', 'earhart'];
const LONG_SIDE = 1400;
const MAX_BYTES = 300 * 1024;

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const fail = message => {
  console.error(`landing:images: ${message}`);
  process.exit(1);
};
if (spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' }).status !== 0) {
  fail('ffmpeg is not installed, so nothing was converted.');
}
const from = join(process.env.HISTOR_MEDIA ?? join(homedir(), 'histor-media'), 'landing');
if (!existsSync(from)) {
  fail(`there is no folder ${from}.`);
}
const to = join(root, 'src', 'landing', 'images');
mkdirSync(to, { recursive: true });
const kb = bytes => `${Math.round(bytes / 1024)} KB`;

let failed = 0;
for (const name of NAMES) {
  const source = join(from, `${name}.jpg`);
  const target = join(to, `${name}.webp`);
  if (!existsSync(source)) {
    console.warn(`  ${name}: missing (${source})`);
    failed += 1;
    continue;
  }
  let quality = 78;
  let side = LONG_SIDE;
  for (;;) {
    const scale = `scale='if(gt(iw,ih),min(${side},iw),-2)':'if(gt(iw,ih),-2,min(${side},ih))':flags=lanczos,format=yuv420p`;
    const run = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', source, '-vf', scale, '-c:v', 'libwebp', '-quality', String(quality), '-compression_level', '6', target]);
    if (run.status !== 0) {
      console.warn(`  ${name}: ffmpeg failed\n${run.stderr}`);
      failed += 1;
      break;
    }
    const size = statSync(target).size;
    if (size <= MAX_BYTES || (quality <= 60 && side <= 1000)) {
      console.log(`  ${name}: ${kb(statSync(source).size)} -> ${kb(size)} (quality ${quality}, at most ${side}px)`);
      break;
    }
    if (quality > 60) {
      quality -= 6;
    } else {
      side -= 100;
    }
  }
}
process.exit(failed === 0 ? 0 : 1);
