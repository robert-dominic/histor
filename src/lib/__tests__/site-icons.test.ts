// src/lib/__tests__/site-icons.test.ts
// The logo in the site's head (quick fixes, 4): the favicons, the touch icon, the manifest (with its two icons, the
// name Histor and the night colour) and the default preview image.
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';

const root = resolve(__dirname, '../../..');
const html = readFileSync(resolve(root, 'index.html'), 'utf8');

describe('the site icons', () => {
  test('index.html links every favicon, the touch icon and the manifest; each file exists', () => {
    for (const href of ['/favicon.svg', '/favicon.ico', '/apple-touch-icon.png', '/manifest.webmanifest', '/og-default.png']) {
      expect(html).toContain(href);
      expect(existsSync(resolve(root, `public${href}`)), href).toBe(true);
    }
    expect(html).toContain('<link rel="manifest" href="/manifest.webmanifest" />');
  });

  test('the manifest: Histor, the night colour, icons at 192 and 512', () => {
    const manifest = JSON.parse(readFileSync(resolve(root, 'public/manifest.webmanifest'), 'utf8'));
    expect(manifest).toMatchObject({ name: 'Histor', background_color: '#0D1317', theme_color: '#0D1317' });
    expect(manifest.icons).toEqual([
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ]);
    for (const icon of manifest.icons) {
      expect(existsSync(resolve(root, `public${icon.src}`))).toBe(true);
    }
  });
});
