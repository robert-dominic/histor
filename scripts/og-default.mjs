// scripts/og-default.mjs
// Renders public/og-default.png, the site-wide link preview: the Histor title card, with the wordmark from
// public/brand (quick fixes, 4), with @vercel/og. The repo commits no font files (design.md), so pass a folder holding
// grenze-600.ttf (Grenze Gotisch 600) and special-elite.ttf (Special Elite), from Google Fonts:
//   node scripts/og-default.mjs ~/histor-media/fonts
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('..', import.meta.url)).replace(/\/$/, '');
const fontDir = process.argv[2];
if (fontDir === undefined) {
  throw new Error('Usage: node scripts/og-default.mjs <fonts folder>');
}
globalThis.require = createRequire(import.meta.url);
globalThis.__dirname = root + '/node_modules/@vercel/og/dist'; globalThis.__filename = globalThis.__dirname + '/index.node.js';
import { readFileSync, writeFileSync } from 'node:fs';
const { ImageResponse } = await import(`${root}/node_modules/@vercel/og/dist/index.node.js`);
const { createElement } = await import(`${root}/node_modules/react/index.js`);
const el = (type, style, ...children) => createElement(type, { style: { display: 'flex', ...style } }, ...children);
const logo = readFileSync(`${root}/public/brand/histor-logo-ink.svg`, 'utf8');
const [, , vw, vh] = /viewBox="([^"]+)"/.exec(logo)[1].split(' ').map(Number);
const logoH = 118, logoW = Math.round((logoH * vw) / vh);
const C = { paper: '#e2ddcf', ink: '#23211d', muted: '#6c6a62', rust: '#9e3326' };
const element = el('div', { width: '100%', height: '100%', backgroundColor: C.paper, backgroundImage: 'linear-gradient(135deg, rgba(255,255,255,0.18), rgba(255,255,255,0) 45%, rgba(0,0,0,0.08))', padding: 36 },
  el('div', { flex: 1, border: `3px solid ${C.ink}`, padding: 9 },
    el('div', { flex: 1, position: 'relative', flexDirection: 'column', alignItems: 'center', border: `1px solid ${C.ink}`, color: C.ink, paddingTop: 150 },
      createElement('img', { src: `data:image/svg+xml,${encodeURIComponent(logo)}`, width: logoW, height: logoH }),
      el('div', { fontFamily: 'Special Elite', fontSize: 40, marginTop: 52 }, 'Legend or history? You decide.'),
      el('div', { marginTop: 44, fontFamily: 'Special Elite', fontSize: 30, color: C.rust, border: `5px solid ${C.rust}`, padding: '10px 26px 4px 26px', transform: 'rotate(-2.3deg)' }, 'REAL HISTORICAL MYSTERIES'),
      el('div', { position: 'absolute', right: 48, bottom: 30, fontFamily: 'Special Elite', fontSize: 26, color: C.muted }, 'histor.space'),
    )));
const font = (file, name, weight) => ({ name, data: readFileSync(`${fontDir}/${file}`), weight, style: 'normal' });
const response = new ImageResponse(element, { width: 1200, height: 630, fonts: [font('grenze-600.ttf', 'Grenze Gotisch', 600), font('special-elite.ttf', 'Special Elite', 400)] });
writeFileSync(`${root}/public/og-default.png`, Buffer.from(await response.arrayBuffer()));
console.log('public/og-default.png written');
