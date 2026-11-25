// @vitest-environment node
// src/lib/__tests__/api-imports.test.ts
// The edge functions (api/) are bundled without the app's "@/" alias: every module they reach imports by relative path.
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { describe, expect, test } from 'vitest';

const root = resolve(__dirname, '../../..');

function reach(file: string, seen = new Set<string>()): Set<string> {
  if (seen.has(file)) {
    return seen;
  }
  seen.add(file);
  const source = readFileSync(file, 'utf8');
  for (const [, from] of source.matchAll(/^import[^'"]*from '(\.[^']+)'/gm)) {
    reach(resolve(dirname(file), `${from.replace(/\.ts$/, '')}.ts`), seen);
  }
  return seen;
}

describe('the edge functions\' imports', () => {
  test.each(['api/og.ts', 'api/r.ts'])('%s and everything it reaches use relative imports (types aside)', entry => {
    for (const file of reach(resolve(root, entry))) {
      const aliased = readFileSync(file, 'utf8').match(/^import (?!type )[^'"]*from '@\/[^']+'/gm) ?? [];
      expect(aliased, file).toEqual([]);
    }
  });
});
