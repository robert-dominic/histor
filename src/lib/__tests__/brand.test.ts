// src/lib/__tests__/brand.test.ts
// The mark, as data, is the one in public/brand (quick fixes, 4).
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';
import { MARK_INK, MARK_PATH, MARK_VIEWBOX } from '@/lib/brand';

const read = (name: string) => readFileSync(resolve(__dirname, `../../../public/brand/${name}`), 'utf8');

describe('the Histor mark', () => {
  test('the same path, viewBox and inks as public/brand', () => {
    for (const [file, ink] of [['histor-mark-cream.svg', MARK_INK.cream], ['histor-mark-ink.svg', MARK_INK.ink]] as const) {
      const svg = read(file);
      expect(svg).toContain(`d="${MARK_PATH}"`);
      expect(svg).toContain(`viewBox="${MARK_VIEWBOX.join(' ')}"`);
      expect(svg).toContain(`fill="${ink}"`);
    }
  });
});
