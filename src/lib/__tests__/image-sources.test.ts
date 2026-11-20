// src/lib/__tests__/image-sources.test.ts
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';
import maryCeleste from '@/cases/mary-celeste/case';
import { imageSources } from '@/lib/image-sources';

const IMAGES = join(process.cwd(), 'src/cases/mary-celeste/assets/images');
const withImage = maryCeleste.story.filter(section => section.image !== undefined);

describe('imageSources', () => {
  test('there are story images to check', () => {
    expect(withImage.length).toBe(maryCeleste.story.length);
  });

  test.each(withImage.map(section => [section.id, section.image!.src] as const))(
    'story image "%s" has a srcset with a 828w and a larger version',
    (_id, src) => {
      const { srcSet, sizes } = imageSources(src);
      expect(srcSet).toBeDefined();
      const widths = srcSet!.split(', ').map(candidate => Number(/ (\d+)w$/.exec(candidate)?.[1]));
      expect(widths[0]).toBe(828);
      expect(widths.length).toBeGreaterThanOrEqual(2);
      expect(Math.max(...widths)).toBeGreaterThan(828);
      expect(Math.max(...widths)).toBeLessThanOrEqual(1920);
      expect(widths).toEqual([...widths].sort((a, b) => a - b));
      expect(sizes).toBe('100vw');
    }
  );

  test('an image with no sized versions has no srcset', () => {
    expect(imageSources('/one.webp').srcSet).toBeUndefined();
  });

  test('every sized version is under 300 KB', () => {
    const sized = readdirSync(IMAGES).filter(name => /^s-.+-\d+\.webp$/.test(name));
    expect(sized.length).toBeGreaterThanOrEqual(withImage.length * 2);
    for (const name of sized) {
      expect(statSync(join(IMAGES, name)).size, name).toBeLessThan(300 * 1024);
    }
  });
});
