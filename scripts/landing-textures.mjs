// scripts/landing-textures.mjs
// `npm run landing:textures`. Copies the landing's frame textures from ~/histor-media/frames/ (outside the repo;
// HISTOR_MEDIA overrides the folder) into src/landing/textures/: the pictures as WebP (keeping their transparency),
// at most `long` px on the long side and under 200 KB each (the quality, then the size, lowered until they fit); the
// SVGs as they are. The originals are never committed. Prints each file's size before and after. Needs ffmpeg.
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const PICTURES = [
  { from: 'paper-old.jpg', to: 'paper-old.webp', long: 960 },
  { from: 'paper-burnt.png', to: 'paper-burnt.webp', long: 1400 },
  { from: 'tear-line.png', to: 'tear-line.webp', long: 1200 },
  { from: 'frame-torn.png', to: 'frame-torn.webp', long: 1600 },
];
const SVGS = ['torn-edge.svg', 'tape.svg'];
const MAX_BYTES = 200 * 1024;

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const fail = message => {
  console.error(`landing:textures: ${message}`);
  process.exit(1);
};
if (spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' }).status !== 0) {
  fail('ffmpeg is not installed, so nothing was converted.');
}
const from = join(process.env.HISTOR_MEDIA ?? join(homedir(), 'histor-media'), 'frames');
if (!existsSync(from)) {
  fail(`there is no folder ${from}.`);
}
const to = join(root, 'src', 'landing', 'textures');
mkdirSync(to, { recursive: true });
const kb = bytes => `${Math.round(bytes / 1024)} KB`;

let failed = 0;
for (const { from: name, to: out, long } of PICTURES) {
  const source = join(from, name);
  const target = join(to, out);
  if (!existsSync(source)) {
    console.warn(`  ${name}: missing`);
    failed += 1;
    continue;
  }
  let quality = 80;
  let side = long;
  for (;;) {
    const scale = `scale='if(gt(iw,ih),min(${side},iw),-2)':'if(gt(iw,ih),-2,min(${side},ih))':flags=lanczos`;
    const run = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', source, '-vf', scale, '-c:v', 'libwebp', '-quality', String(quality), '-compression_level', '6', target]);
    if (run.status !== 0) {
      console.warn(`  ${name}: ffmpeg failed\n${run.stderr}`);
      failed += 1;
      break;
    }
    const size = statSync(target).size;
    if (size <= MAX_BYTES || side <= 400) {
      console.log(`  ${name}: ${kb(statSync(source).size)} -> ${out} ${kb(size)} (quality ${quality}, at most ${side}px)`);
      break;
    }
    if (quality > 55) {
      quality -= 8;
    } else {
      side -= 200;
    }
  }
}
for (const name of SVGS) {
  copyFileSync(join(from, name), join(to, name));
  console.log(`  ${name}: copied (${kb(statSync(join(to, name)).size)})`);
}
// The torn edge turned a quarter, for landscape pictures (the original is portrait, 270 by 360), so it is never
// stretched across a wide picture.
const torn = readFileSync(join(from, 'torn-edge.svg'), 'utf8');
const open = torn.match(/<svg[^>]*>/);
if (open !== null) {
  const inner = torn.slice(open.index + open[0].length, torn.lastIndexOf('</svg>'));
  writeFileSync(
    join(to, 'torn-edge-landscape.svg'),
    `<?xml version='1.0' encoding='utf-8'?>\n<!-- torn-edge.svg turned a quarter, for landscape pictures (scripts/landing-textures.mjs). -->\n<svg xmlns:xlink="http://www.w3.org/1999/xlink" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 270"><g transform="translate(360 0) rotate(90)">${inner}</g></svg>\n`
  );
  console.log('  torn-edge-landscape.svg: written');
}
process.exit(failed === 0 ? 0 : 1);
