// src/lib/__tests__/parse-refs.test.ts
// Task 1.2: unit tests for the portal markup parser (Requirements 2, 6.1, 6.2, 6.3).
import { describe, expect, test } from 'vitest';
import { isRefId, isRefLabel, parseRefs, serializeSegments } from '@/lib/parse-refs';
import type { Segment } from '@/lib/parse-refs';

const text = (t: string): Segment => ({ kind: 'text', text: t });
const ref = (id: string, label: string): Segment => ({
  kind: 'ref',
  id,
  label,
  raw: `{{ref:${id}|${label}}}`,
});

describe('parseRefs: malformed markup stays as plain text (Requirement 2)', () => {
  const plainCases: Array<[string, string]> = [
    ['unclosed (2.1)', 'She was {{ref:briggs|the captain and more'],
    ['unclosed with no prefix (2.1)', 'Open {{ forever'],
    ['missing label (2.2)', '{{ref:briggs}}'],
    ['empty id (2.3)', '{{ref:|the captain}}'],
    ['empty label (2.4)', '{{ref:briggs|}}'],
    ['whitespace-only label (2.4)', '{{ref:briggs|   }}'],
    ['wrong prefix (2.5)', '{{foo:x|y}}'],
    ['uppercase prefix (2.5)', '{{REF:x|y}}'],
    ['space before prefix (2.5)', '{{ ref:x|y}}'],
    ['invalid id: uppercase (2.6)', '{{ref:Briggs|the captain}}'],
    ['invalid id: space (2.6)', '{{ref:dei gratia|Dei Gratia}}'],
    ['invalid id: underscore (2.6)', '{{ref:dei_gratia|Dei Gratia}}'],
    ['label containing | (2.7)', '{{ref:a|b|c}}'],
  ];

  test.each(plainCases)('%s', (_name, input) => {
    expect(parseRefs(input)).toEqual([text(input)]);
  });

  test('nested markup keeps the outer characters as text (2.8)', () => {
    expect(parseRefs('{{ref:a|b {{ref:c|d}}}}')).toEqual([
      text('{{ref:a|b '),
      ref('c', 'd'),
      text('}}'),
    ]);
  });

  test('extra leading { before a ref stays as text (2.9)', () => {
    expect(parseRefs('{{{ref:a|b}}')).toEqual([text('{'), ref('a', 'b')]);
  });

  test('malformed markup next to a valid ref keeps both (2.1, 1.6)', () => {
    expect(parseRefs('{{ref:a|}} then {{ref:b|B}}')).toEqual([
      text('{{ref:a|}} then '),
      ref('b', 'B'),
    ]);
  });
});

describe('parseRefs: basic examples (6.2)', () => {
  test('empty string gives an empty list (1.7)', () => {
    expect(parseRefs('')).toEqual([]);
  });

  test('text, ref, text', () => {
    expect(parseRefs('The {{ref:dei-gratia|Dei Gratia}} found her drifting.')).toEqual([
      text('The '),
      ref('dei-gratia', 'Dei Gratia'),
      text(' found her drifting.'),
    ]);
  });

  test('label whitespace is kept as written', () => {
    expect(parseRefs('{{ref:briggs| the captain }}')).toEqual([ref('briggs', ' the captain ')]);
  });
});

describe('parseRefs: ref positions (6.3)', () => {
  test('ref at the start', () => {
    expect(parseRefs('{{ref:briggs|Briggs}} gave the order.')).toEqual([
      ref('briggs', 'Briggs'),
      text(' gave the order.'),
    ]);
  });

  test('ref at the end', () => {
    expect(parseRefs('The order came from {{ref:briggs|the captain}}')).toEqual([
      text('The order came from '),
      ref('briggs', 'the captain'),
    ]);
  });

  test('refs back to back', () => {
    expect(parseRefs('{{ref:a|A}}{{ref:b|B}}')).toEqual([ref('a', 'A'), ref('b', 'B')]);
  });

  test('a ref alone', () => {
    expect(parseRefs('{{ref:e-lifeboat|the yawl}}')).toEqual([ref('e-lifeboat', 'the yawl')]);
  });
});

describe('serializeSegments', () => {
  test('joins raw text in order', () => {
    const input = '{{{ref:a|b}} and {{ref:a|b {{ref:c|d}}}} end';
    expect(serializeSegments(parseRefs(input))).toBe(input);
  });

  test('empty list gives empty string', () => {
    expect(serializeSegments([])).toBe('');
  });
});

describe('isRefId (glossary)', () => {
  test.each(['briggs', 'dei-gratia', 'e-lifeboat', 'ref1'])('accepts %j', (s) => {
    expect(isRefId(s)).toBe(true);
  });

  test.each(['Briggs', 'dei gratia', '-briggs', 'briggs-', 'dei--gratia', 'dei_gratia', ''])(
    'rejects %j',
    (s) => {
      expect(isRefId(s)).toBe(false);
    },
  );
});

describe('isRefLabel (glossary)', () => {
  test.each(['Dei Gratia', 'x', ' the captain ', 'she'])('accepts %j', (s) => {
    expect(isRefLabel(s)).toBe(true);
  });

  test.each(['', '   ', '\n\t', 'a|b', 'a{b', 'a}b'])('rejects %j', (s) => {
    expect(isRefLabel(s)).toBe(false);
  });
});
