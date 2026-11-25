// scripts/certificate-paper.mjs
// Draws the case certificate's paper (scripts/certificate-paper.html) with headless Chrome and saves it as
// public/cards/certificate-paper.jpg with ffmpeg (quick fixes, 5). Needs google-chrome (or CHROME=...) and ffmpeg.
//   node scripts/certificate-paper.mjs
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const chrome = process.env.CHROME ?? 'google-chrome';
const work = mkdtempSync(join(tmpdir(), 'histor-paper-'));
const png = join(work, 'paper.png');
const out = join(root, 'public/cards/certificate-paper.jpg');
try {
  execFileSync(chrome, [
    '--headless=new', '--disable-gpu', '--hide-scrollbars', '--allow-file-access-from-files', '--force-device-scale-factor=1',
    '--window-size=1200,630', '--virtual-time-budget=3000', `--screenshot=${png}`,
    pathToFileURL(join(root, 'scripts/certificate-paper.html')).href,
  ], { stdio: 'ignore' });
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', png, '-q:v', '3', out]);
  console.log(`public/cards/certificate-paper.jpg written (${Math.round(statSync(out).size / 1024)} KB)`);
} finally {
  rmSync(work, { recursive: true, force: true });
}
