// src/lib/__tests__/parse-refs.property.test.ts
// Task 1.2: property tests for the portal markup parser (Properties 1 to 6).
import { expect, test } from 'vitest';
import * as fc from 'fast-check';
import { parseRefs, serializeSegments } from '@/lib/parse-refs';
import type { RefSegment } from '@/lib/parse-refs';

const NUM_RUNS = 100;

// ---------- Generators (design, Testing Strategy) ----------

/** Ref_Id: lowercase ASCII letters and digits, joined by single hyphens. */
const refIdArb = fc.stringMatching(/^[a-z0-9]+(-[a-z0-9]+)*$/, { maxLength: 20 });

/** Ref_Label: non-empty, no '{', '}' or '|', at least one non-whitespace character. */
const refLabelArb = fc
  .string({ unit: 'grapheme', minLength: 1, maxLength: 20 })
  .filter((s) => !/[{}|]/.test(s) && /\S/.test(s));

/** Full Unicode strings (never half surrogates). */
const fullUnicodeArb = fc.string({ unit: 'binary' });

/** Any JS string, including lone surrogates. */
const utf16Arb = fc.string({
  unit: fc.integer({ min: 0, max: 0xffff }).map((c) => String.fromCharCode(c)),
});

/** Strings built from markup fragments, so well-formed and malformed refs are common. */
const fragmentArb = fc.string({
  unit: fc.oneof(
    fc.constantFrom('{{', '}}', '{', '}', 'ref:', 'REF:', ' ref:', '|', ' ', '\n', '-', '_'),
    refIdArb,
    refLabelArb,
    fc.string({ maxLength: 3 }),
  ),
  maxLength: 30,
});

/** Same fragments, plus ready-made Well_Formed_Refs so Ref_Segments appear often. */
const wellFormedRefArb = fc
  .tuple(refIdArb, refLabelArb)
  .map(([id, label]) => `{{ref:${id}|${label}}}`);

const fragmentWithRefsArb = fc.string({
  unit: fc.oneof(fragmentArb, wellFormedRefArb),
  maxLength: 10,
});

const anyStringArb = fc.oneof(fullUnicodeArb, utf16Arb, fragmentArb, fragmentWithRefsArb);

/** Regex written here, independent of isRefId. */
const REF_ID_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

// ---------- Properties ----------

// Feature: story-engine, Property 1: parseRefs(s) returns an array of text/ref segments without throwing for any string s
// **Validates: Requirements 1.1, 1.2, 5.2**
test('Property 1: Parser is total', () => {
  fc.assert(
    fc.property(anyStringArb, (s) => {
      const segments = parseRefs(s);
      expect(Array.isArray(segments)).toBe(true);
      for (const seg of segments) {
        expect(['text', 'ref']).toContain(seg.kind);
      }
    }),
    { numRuns: NUM_RUNS },
  );
});

// Feature: story-engine, Property 2: serializeSegments(parseRefs(s)) === s for any string s
// **Validates: Requirements 1.4, 1.6, 1.12, 3.1, 3.2, 3.3, 5.3**
test('Property 2: Lossless round trip', () => {
  fc.assert(
    fc.property(anyStringArb, (s) => {
      const first = parseRefs(s);
      expect(serializeSegments(first)).toBe(s);
      expect(parseRefs(s)).toEqual(first);
      expect(parseRefs(serializeSegments(first))).toEqual(first);
    }),
    { numRuns: NUM_RUNS },
  );
});

// Feature: story-engine, Property 3: a non-empty string with no '{{' parses to exactly one Text_Segment equal to it
// **Validates: Requirements 1.8, 5.4**
test('Property 3: Text without markup is one segment', () => {
  fc.assert(
    fc.property(
      anyStringArb.filter((s) => s.length > 0 && !s.includes('{{')),
      (s) => {
        expect(parseRefs(s)).toEqual([{ kind: 'text', text: s }]);
      },
    ),
    { numRuns: NUM_RUNS },
  );
});

// Feature: story-engine, Property 4: every Ref_Segment has a Ref_Id id, a Ref_Label label, and raw === '{{ref:' + id + '|' + label + '}}'
// **Validates: Requirements 1.3, 1.11, 5.5**
test('Property 4: Every Ref_Segment is well formed', () => {
  fc.assert(
    fc.property(anyStringArb, (s) => {
      for (const seg of parseRefs(s)) {
        if (seg.kind !== 'ref') continue;
        expect(seg.id).toMatch(REF_ID_PATTERN);
        expect(seg.label.length).toBeGreaterThan(0);
        expect(seg.label).not.toMatch(/[{}|]/);
        expect(seg.label).toMatch(/\S/);
        expect(seg.raw).toBe('{{ref:' + seg.id + '|' + seg.label + '}}');
      }
    }),
    { numRuns: NUM_RUNS },
  );
});

// Feature: story-engine, Property 5: no Text_Segment is empty and no two Text_Segments are adjacent
// **Validates: Requirements 1.9, 1.10, 5.6**
test('Property 5: Segment list is in normal form', () => {
  fc.assert(
    fc.property(anyStringArb, (s) => {
      const segments = parseRefs(s);
      segments.forEach((seg, i) => {
        if (seg.kind === 'text') {
          expect(seg.text.length).toBeGreaterThanOrEqual(1);
          if (i > 0) expect(segments[i - 1].kind).not.toBe('text');
        }
      });
    }),
    { numRuns: NUM_RUNS },
  );
});

// Feature: story-engine, Property 6: joining plain text (no '{') with generated Well_Formed_Refs parses to exactly those refs, in order
// **Validates: Requirements 1.3, 1.4, 1.5, 5.7**
type Part = { kind: 'text'; text: string } | { kind: 'ref'; id: string; label: string };

const plainTextArb = fc.string({ unit: 'grapheme' }).filter((s) => !s.includes('{'));

const partArb: fc.Arbitrary<Part> = fc.oneof(
  plainTextArb.map((text): Part => ({ kind: 'text', text })),
  fc.tuple(refIdArb, refLabelArb).map(([id, label]): Part => ({ kind: 'ref', id, label })),
);

test('Property 6: Constructed refs are recovered in order', () => {
  fc.assert(
    fc.property(fc.array(partArb, { maxLength: 10 }), (parts) => {
      const input = parts
        .map((p) => (p.kind === 'text' ? p.text : `{{ref:${p.id}|${p.label}}}`))
        .join('');
      const expected = parts
        .filter((p): p is Extract<Part, { kind: 'ref' }> => p.kind === 'ref')
        .map((p) => ({ id: p.id, label: p.label }));
      const actual = parseRefs(input)
        .filter((seg): seg is RefSegment => seg.kind === 'ref')
        .map((seg) => ({ id: seg.id, label: seg.label }));
      expect(actual).toEqual(expected);
    }),
    { numRuns: NUM_RUNS },
  );
});
