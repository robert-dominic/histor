// src/lib/__tests__/motion-audit.test.ts
// The rule "no tween writes its own ease or duration" (motion.md), made checkable: outside src/lib/motion.ts,
// no source file may write a literal ease name, or a literal number as a duration. Use a token from motion.ts
// (`...tween('hover')`), a duration step (`STEP.fast`), or `LINEAR` for scrubbed and constant motion.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, test } from 'vitest';

const SRC = join(process.cwd(), 'src');

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap(name => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      return name === '__tests__' || name === 'test' || name === 'cases' ? [] : sourceFiles(path);
    }
    return /\.(ts|tsx)$/.test(name) && !/\.test\./.test(name) ? [path] : [];
  });
}

/** The patterns that write an ease or a duration by hand. */
const OWN_MOTION = [
  { what: 'a literal ease name', pattern: /\bease(?:Each)?:\s*['"`]/ },
  { what: 'an old EASE constant', pattern: /\bEASE\.[a-zA-Z]+/ },
  { what: 'a literal duration', pattern: /\bduration:\s*[0-9.]+(?![0-9.]*\s*[*/+-]\s*[A-Za-z])/ },
];

describe('motion audit', () => {
  const files = sourceFiles(SRC).filter(path => !path.endsWith(join('lib', 'motion.ts')));

  test('there are source files to check', () => {
    expect(files.length).toBeGreaterThan(30);
  });

  test.each(OWN_MOTION)('no source file outside motion.ts writes $what', ({ what, pattern }) => {
    const offenders = files.flatMap(path =>
      readFileSync(path, 'utf8')
        .split('\n')
        .map((line, index) => ({ line, number: index + 1 }))
        .filter(({ line }) => !line.trim().startsWith('//') && !line.trim().startsWith('*') && pattern.test(line))
        .map(({ line, number }) => `${relative(process.cwd(), path)}:${number}: ${line.trim()}`)
    );
    expect(offenders, `${what} found. Use a token from src/lib/motion.ts.`).toEqual([]);
  });
});
