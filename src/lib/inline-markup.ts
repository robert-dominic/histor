// src/lib/inline-markup.ts
// Light inline markup in story text: **bold** (the crew's names in chapter 1) and *italic* (a word the text stresses,
// such as the *Marie* Celeste). Pure. Joining the parts' text gives the string back without its asterisks.
// {{ref:…}} markup is left alone (it holds no asterisks), so it can sit inside a part and be read by `parseRefs`.

export type InlineStyle = 'plain' | 'bold' | 'italic';

export interface InlinePart {
  text: string;
  style: InlineStyle;
}

const INLINE = /\*\*([^*]+)\*\*|\*([^*]+)\*/g;

/** Cuts `text` into plain, bold and italic parts, in order. A string without asterisks is one plain part. */
export function splitInline(text: string): InlinePart[] {
  const parts: InlinePart[] = [];
  let last = 0;
  for (const match of text.matchAll(INLINE)) {
    const at = match.index ?? 0;
    if (at > last) {
      parts.push({ text: text.slice(last, at), style: 'plain' });
    }
    parts.push(match[1] !== undefined ? { text: match[1], style: 'bold' } : { text: match[2], style: 'italic' });
    last = at + match[0].length;
  }
  if (last < text.length || parts.length === 0) {
    parts.push({ text: text.slice(last), style: 'plain' });
  }
  return parts;
}

/** The text as it reads, without the markup's asterisks. */
export function stripInline(text: string): string {
  return splitInline(text)
    .map(part => part.text)
    .join('');
}
