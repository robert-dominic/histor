// src/lib/parse-refs.ts
// Pure, total, lossless parser for portal markup: {{ref:<id>|<label>}}
// Imports nothing and holds no module-level mutable state. All regexes are
// non-global and non-sticky, so RegExp.prototype.test never touches lastIndex.

export interface TextSegment {
  kind: 'text';
  /** Plain text exactly as written. Always at least 1 character. Also its Raw_Text. */
  text: string;
}

export interface RefSegment {
  kind: 'ref';
  /** A Ref_Id. */
  id: string;
  /** A Ref_Label, whitespace kept as written. */
  label: string;
  /** The full markup, `{{ref:` through `}}`. Always equals `{{ref:${id}|${label}}}`. */
  raw: string;
}

export type Segment = TextSegment | RefSegment;

const PREFIX = '{{ref:';
const REF_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const LABEL_FORBIDDEN = /[{}|]/;
const NON_WHITESPACE = /\S/;

/** True when s matches ^[a-z0-9]+(-[a-z0-9]+)*$. */
export function isRefId(s: string): boolean {
  return REF_ID.test(s);
}

/** True when s is non-empty, has no '{', '}' or '|', and has a non-whitespace character. */
export function isRefLabel(s: string): boolean {
  return s.length > 0 && !LABEL_FORBIDDEN.test(s) && NON_WHITESPACE.test(s);
}

/** [a-z0-9-] */
function isIdChar(c: number): boolean {
  return (c >= 0x61 && c <= 0x7a) || (c >= 0x30 && c <= 0x39) || c === 0x2d;
}

/** '{', '}' or '|' */
function isLabelStop(c: number): boolean {
  return c === 0x7b || c === 0x7d || c === 0x7c;
}

/**
 * Tries to match a Well_Formed_Ref starting at position p.
 * Returns the id, label and the index just past the closing `}}`, or null.
 */
function matchRefAt(input: string, p: number): { id: string; label: string; end: number } | null {
  if (!input.startsWith(PREFIX, p)) return null;
  const idStart = p + PREFIX.length;
  let j = idStart;
  while (j < input.length && isIdChar(input.charCodeAt(j))) j++;
  if (input[j] !== '|') return null;
  const id = input.slice(idStart, j);
  if (!isRefId(id)) return null;
  const labelStart = j + 1;
  let k = labelStart;
  while (k < input.length && !isLabelStop(input.charCodeAt(k))) k++;
  if (input[k] !== '}' || input[k + 1] !== '}') return null;
  const label = input.slice(labelStart, k);
  if (!isRefLabel(label)) return null;
  return { id, label, end: k + 2 };
}

/** Splits input into segments. Total: never throws, for every string. */
export function parseRefs(input: string): Segment[] {
  const out: Segment[] = [];
  let textStart = 0; // start of pending plain text
  let i = 0; // scan cursor
  for (;;) {
    const p = input.indexOf('{{', i);
    if (p === -1) break;
    const m = matchRefAt(input, p);
    if (m === null) {
      // Not a ref here: retry at the next position, so an overlapping '{{' is tried.
      i = p + 1;
      continue;
    }
    if (p > textStart) out.push({ kind: 'text', text: input.slice(textStart, p) });
    out.push({ kind: 'ref', id: m.id, label: m.label, raw: input.slice(p, m.end) });
    textStart = i = m.end;
  }
  if (textStart < input.length) out.push({ kind: 'text', text: input.slice(textStart) });
  return out;
}

/** Concatenates the Raw_Text of every segment, in order. */
export function serializeSegments(segments: readonly Segment[]): string {
  let s = '';
  for (const seg of segments) s += seg.kind === 'text' ? seg.text : seg.raw;
  return s;
}
