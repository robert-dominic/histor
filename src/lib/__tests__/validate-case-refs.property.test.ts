// src/lib/__tests__/validate-case-refs.property.test.ts
// Task 3.1: property tests for the portal markup checks in validateCase (Properties 7 to 11).
// Uses its own markup-safe valid case generator, independent of validate-case.property.test.ts.
import { expect, test } from 'vitest';
import * as fc from 'fast-check';
import { validateCase } from '@/lib/validate-case';
import type {
  Case,
  CaseTheme,
  Evidence,
  ImageAsset,
  LegendIntro,
  NonEmptyArray,
  Reference,
  Source,
  StorySection,
  Theory,
} from '@/types/case';

const NUM_RUNS = 100;

// ---------- Primitive generators ----------

/** Non-empty, not only whitespace, and no '{' or '}' anywhere. */
const safeString = fc
  .string({ minLength: 1 })
  .filter((s) => s.trim().length > 0 && !/[{}]/.test(s));

/** Ref_Id: lowercase ASCII letters and digits, joined by single hyphens. */
const refIdArb = fc.stringMatching(/^[a-z0-9]+(-[a-z0-9]+)*$/, { maxLength: 20 });

/** Ref_Label: non-empty, no '{', '}' or '|', at least one non-whitespace character. */
const refLabelArb = fc
  .string({ unit: 'grapheme', minLength: 1, maxLength: 20 })
  .filter((s) => !/[{}|]/.test(s) && /\S/.test(s));

/** Text with no '{' or '}' (may be empty). */
const braceFreeText = fc.string({ unit: 'grapheme', maxLength: 30 }).filter((s) => !/[{}]/.test(s));

/** Only whitespace, possibly empty. */
const whitespaceArb = fc.stringMatching(/^\s*$/, { maxLength: 4 });

// ---------- Markup-safe valid case generator ----------

const imageArb: fc.Arbitrary<ImageAsset> = fc.record({
  src: safeString,
  alt: safeString,
  credit: safeString,
  isIllustration: fc.boolean(),
});

const sourceArb: fc.Arbitrary<Source> = fc
  .tuple(
    safeString,
    safeString,
    fc.constantFrom('testimony', 'official', 'secondary', 'fiction' as const),
    fc.option(safeString, { nil: undefined }),
    fc.option(fc.integer({ min: 1, max: 2100 }), { nil: undefined }),
    fc.constantFrom('url', 'citation', 'both'),
    safeString
  )
  .map(([id, title, kind, author, year, link, citation]): Source => {
    const base = { id, title, kind, author, year };
    if (link === 'url') return { ...base, url: 'https://example.com/source' };
    if (link === 'citation') return { ...base, citation };
    return { ...base, url: 'https://example.com/source', citation };
  });

const theoryArb: fc.Arbitrary<Theory> = fc.record({
  id: safeString,
  title: safeString,
  claim: safeString,
  standing: fc.constantFrom('leading', 'considered', 'rejected' as const),
  standingReason: safeString,
});

function evidenceArb(sourceIds: string[], theoryIds: string[]): fc.Arbitrary<Evidence> {
  const base = fc.record({
    id: safeString,
    title: safeString,
    detail: fc.array(safeString, { minLength: 1, maxLength: 3 }),
    sources: fc.subarray(sourceIds, { minLength: 1 }).map((s) => s as NonEmptyArray<string>),
    reading: fc.record({
      supports: fc.subarray(theoryIds),
      weakens: fc.subarray(theoryIds),
      note: safeString,
    }),
    image: fc.option(imageArb, { nil: undefined }),
  });
  return fc.oneof(
    base.map((b): Evidence => ({ ...b, status: 'record' })),
    fc
      .tuple(base, safeString, safeString)
      .map(([b, claim, challenge]): Evidence => ({ ...b, status: 'disputed', dispute: { claim, challenge } })),
    fc.tuple(base, safeString).map(([b, origin]): Evidence => ({ ...b, status: 'legend', origin }))
  );
}

function referenceArb(sourceIds: string[]): fc.Arbitrary<Reference> {
  return fc.record({
    id: refIdArb,
    kind: fc.constantFrom('person', 'place', 'term', 'ship' as const),
    label: safeString,
    profile: fc.array(safeString, { minLength: 1, maxLength: 3 }),
    image: fc.option(imageArb, { nil: undefined }),
    sources: fc.option(fc.subarray(sourceIds), { nil: undefined }),
  });
}

const storySectionArb: fc.Arbitrary<StorySection> = fc.record({
  id: safeString,
  kicker: fc.option(safeString, { nil: undefined }),
  heading: safeString,
  body: fc.array(safeString, { minLength: 1, maxLength: 3 }),
  hook: fc.option(safeString, { nil: undefined }),
});

const legendIntroArb: fc.Arbitrary<LegendIntro> = fc.record({
  lines: fc.array(safeString, { minLength: 1, maxLength: 3 }),
  stamp: safeString,
  debunk: safeString,
});

const themeArb: fc.Arbitrary<CaseTheme> = fc.record({
  id: safeString,
  ambientAudio: fc.option(safeString, { nil: undefined }),
  sounds: fc.option(
    fc.record(
      { stamp: safeString, open: safeString, pin: safeString, portal: safeString, close: safeString },
      { requiredKeys: [] }
    ),
    { nil: undefined }
  ),
});

/**
 * A case that passes every validateCase check and has no '{' or '}' in any string.
 * Ids are unique per collection, evidence and references only point to generated
 * sources and theories, and reference ids are Ref_Ids.
 */
function markupSafeCaseArb(minReferences = 0): fc.Arbitrary<Case> {
  return fc
    .record({
      sources: fc.uniqueArray(sourceArb, { minLength: 1, maxLength: 4, selector: (s) => s.id }),
      theories: fc.uniqueArray(theoryArb, { minLength: 1, maxLength: 4, selector: (t) => t.id }),
    })
    .chain(({ sources, theories }) => {
      const sourceIds = sources.map((s) => s.id);
      const theoryIds = theories.map((t) => t.id);
      return fc
        .record({
          evidence: fc.uniqueArray(evidenceArb(sourceIds, theoryIds), {
            minLength: 1,
            maxLength: 4,
            selector: (e) => e.id,
          }),
          references: fc.uniqueArray(referenceArb(sourceIds), {
            minLength: minReferences,
            maxLength: 3,
            selector: (r) => r.id,
          }),
        })
        .chain(({ evidence, references }) =>
          fc.record({
            id: safeString,
            title: safeString,
            year: fc.integer({ min: 1, max: 2100 }),
            teaser: safeString,
            legendIntro: legendIntroArb,
            story: fc.array(storySectionArb, { minLength: 1, maxLength: 3 }),
            centralQuestion: safeString,
            fork: fc.record({ prompt: safeString, investigateLabel: safeString, leaveLabel: safeString }),
            theories: fc.constant(theories),
            evidence: fc.constant(evidence),
            sources: fc.constant(sources),
            references: fc.constant(references),
            historiansSummary: fc.array(safeString, { minLength: 1, maxLength: 3 }),
            closeThreshold: fc.integer({ min: 0, max: evidence.length }),
            theme: themeArb,
          })
        );
    });
}

// ---------- Field helpers ----------

/** A writable string slot in a case, addressed by its Field_Location / Field_Path. */
interface Slot {
  location: string;
  get: () => string;
  set: (v: string) => void;
}

function arraySlots(arr: string[], prefix: string): Slot[] {
  return arr.map((_, j) => ({
    location: `${prefix}[${j}]`,
    get: () => arr[j],
    set: (v: string) => {
      arr[j] = v;
    },
  }));
}

/** Every existing Markup_Field of the case, in the glossary's notation. */
function markupSlots(c: Case): Slot[] {
  const out: Slot[] = [];
  c.story.forEach((section, i) => {
    out.push(...arraySlots(section.body, `story[${i}].body`));
    if (typeof section.hook === 'string') {
      out.push({
        location: `story[${i}].hook`,
        get: () => section.hook as string,
        set: (v) => {
          section.hook = v;
        },
      });
    }
  });
  c.evidence.forEach((ev, i) => out.push(...arraySlots(ev.detail, `evidence[${i}].detail`)));
  c.references.forEach((ref, i) => out.push(...arraySlots(ref.profile, `references[${i}].profile`)));
  return out;
}

/** Every string in the value that is not at a Markup_Field location (the Plain_Fields). */
function plainSlots(root: Case): Slot[] {
  const skip = new Set(markupSlots(root).map((s) => s.location));
  const out: Slot[] = [];
  const walk = (value: unknown, path: string): void => {
    if (value === null || typeof value !== 'object') return;
    const container = value as Record<string, unknown>;
    const entries: [string, string][] = Array.isArray(value)
      ? value.map((_, i) => [String(i), `${path}[${i}]`])
      : Object.keys(value).map((k) => [k, path === '' ? k : `${path}.${k}`]);
    for (const [key, childPath] of entries) {
      const child = container[key];
      if (typeof child === 'string') {
        if (!skip.has(childPath)) {
          out.push({
            location: childPath,
            get: () => container[key] as string,
            set: (v) => {
              container[key] = v;
            },
          });
        }
      } else {
        walk(child, childPath);
      }
    }
  };
  walk(root, '');
  return out;
}

/** First `max` code points of s. */
function firstCodePoints(s: string, max = 40): string {
  return Array.from(s).slice(0, max).join('');
}

const wellFormed = (id: string, label: string): string => `{{ref:${id}|${label}}}`;

// ---------- Properties ----------

// Feature: story-engine, Property 7: valid refs to known ids in every Markup_Field kind give no errors
// **Validates: Requirements 4.1, 4.6, 5.8**
test('Property 7: validator accepts valid markup in every Markup_Field kind', () => {
  fc.assert(
    fc.property(
      markupSafeCaseArb(1),
      fc.array(fc.tuple(fc.nat(), fc.nat(), fc.nat(), refLabelArb), { minLength: 4, maxLength: 4 }),
      (generated, picks) => {
        const c = structuredClone(generated);
        const refIds = c.references.map((r) => r.id);
        const ref = ([a, , n, label]: [number, number, number, string]) =>
          wellFormed(refIds[n % refIds.length], label) + (a % 2 === 0 ? '' : ' and more');

        const [pBody, pHook, pDetail, pProfile] = picks;

        const section = c.story[pBody[0] % c.story.length];
        const bj = pBody[1] % section.body.length;
        section.body[bj] = `${section.body[bj]} ${ref(pBody)}`;

        const hookSection = c.story[pHook[0] % c.story.length];
        hookSection.hook = `${hookSection.hook ?? 'Then'} ${ref(pHook)}`;

        const ev = c.evidence[pDetail[0] % c.evidence.length];
        const dj = pDetail[1] % ev.detail.length;
        ev.detail[dj] = `${ref(pDetail)} ${ev.detail[dj]}`;

        const reference = c.references[pProfile[0] % c.references.length];
        const pj = pProfile[1] % reference.profile.length;
        reference.profile[pj] = `${reference.profile[pj]} ${ref(pProfile)}`;

        expect(validateCase(c)).toEqual([]);
      }
    ),
    { numRuns: NUM_RUNS }
  );
});

// Feature: story-engine, Property 8: a ref to an unknown id gives exactly one error naming the field and the id
// **Validates: Requirements 4.1, 4.2, 4.5, 5.9**
test('Property 8: unknown ids are reported at their location', () => {
  fc.assert(
    fc.property(
      markupSafeCaseArb()
        .chain((c) =>
          fc.tuple(
            fc.constant(c),
            refIdArb.filter((id) => !c.references.some((r) => r.id === id))
          )
        ),
      fc.nat(),
      ([generated, unknownId], pick) => {
        const c = structuredClone(generated);
        const slots = markupSlots(c);
        const slot = slots[pick % slots.length];
        slot.set(`${slot.get()} ${wellFormed(unknownId, 'x')}`);

        expect(validateCase(c)).toEqual([
          `Field ${slot.location}: reference ID '${unknownId}' not found in references`,
        ]);
      }
    ),
    { numRuns: NUM_RUNS }
  );
});

/** Malformed fragments from the design. `emptyLabel` marks the 4.3 form. */
const malformedFragmentArb: fc.Arbitrary<{ fragment: string; emptyLabel: boolean }> = fc.oneof(
  fc
    .tuple(refIdArb, whitespaceArb)
    .map(([id, ws]) => ({ fragment: `{{ref:${id}|${ws}}}`, emptyLabel: true })),
  fc
    .tuple(
      refIdArb,
      fc.constantFrom(
        (id: string) => `{{ref:${id}}}`,
        () => '{{ref:|x}}',
        (id: string) => `{{REF:${id}|x}}`,
        (id: string) => `{{ ref:${id}|x}}`,
        (id: string) => `{{foo:${id}|x}}`,
        (id: string) => `{{ref:${id}|a|b}}`,
        () => '{{ref:Bad|x}}',
        (id: string) => `{{ref:${id}|unclosed`
      )
    )
    .map(([id, make]) => ({ fragment: make(id), emptyLabel: false }))
);

// Feature: story-engine, Property 9: one malformed fragment gives exactly one error with the right message
// **Validates: Requirements 4.3, 4.4, 4.5, 4.7**
test('Property 9: malformed markup is reported once with the right message', () => {
  fc.assert(
    fc.property(markupSafeCaseArb(), fc.nat(), malformedFragmentArb, (generated, pick, { fragment, emptyLabel }) => {
      const c = structuredClone(generated);
      const slots = markupSlots(c);
      const slot = slots[pick % slots.length];
      slot.set(`${slot.get()} ${fragment}`);

      // The fragment is appended last, so the text from its '{{' to the end of the field is the fragment.
      const expected = emptyLabel
        ? `Field ${slot.location}: Invalid reference markup - label cannot be empty`
        : `Field ${slot.location}: Invalid reference markup near '${firstCodePoints(fragment)}'`;

      expect(validateCase(c)).toEqual([expected]);
    }),
    { numRuns: NUM_RUNS }
  );
});

// Feature: story-engine, Property 10: '{{' in any Plain_Field is reported once at its Field_Path
// **Validates: Requirements 4.11, 5.10**
test('Property 10: {{ in any Plain_Field is reported at its path', () => {
  fc.assert(
    fc.property(markupSafeCaseArb(), fc.nat(), (generated, pick) => {
      const c = structuredClone(generated);
      const slots = plainSlots(c);
      const slot = slots[pick % slots.length];
      slot.set(`${slot.get()}{{`);

      const expected = `Field ${slot.location}: portal markup is not allowed in this field`;
      const errors = validateCase(c);
      expect(errors.filter((e) => e === expected)).toHaveLength(1);
    }),
    { numRuns: NUM_RUNS }
  );
});

// Feature: story-engine, Property 11: a '{' directly before a valid ref gives exactly one stray-brace error
// **Validates: Requirements 4.13, 5.11**
test('Property 11: a brace before a valid ref is one stray-brace error', () => {
  fc.assert(
    fc.property(
      markupSafeCaseArb(1),
      fc.nat(),
      fc.nat(),
      refLabelArb,
      braceFreeText,
      braceFreeText,
      (generated, pick, refPick, label, pre, post) => {
        const c = structuredClone(generated);
        const slots = markupSlots(c);
        const slot = slots[pick % slots.length];
        const id = c.references[refPick % c.references.length].id;
        const tail = '{' + wellFormed(id, label) + post;
        slot.set(pre + tail);

        expect(validateCase(c)).toEqual([
          `Field ${slot.location}: Stray brace near '${firstCodePoints(tail)}'`,
        ]);
      }
    ),
    { numRuns: NUM_RUNS }
  );
});
