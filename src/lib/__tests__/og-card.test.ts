// @vitest-environment node
// src/lib/__tests__/og-card.test.ts
// The player's own card as the shared link's preview (ui-pass brief, 6): api/og.ts draws it with @vercel/og from
// the link's values, checked as before; the shared page (api/r.ts) points og:image at it. (The PNG itself is drawn by
// @vercel/og, whose Node build does not load under Vitest; it was checked by rendering it once outside the suite.)
import { afterEach, describe, expect, test, vi } from 'vitest';
import handler, { ogCardElement, ogCardLines, readOgRequest } from '../../../api/og';
import { sharePage } from '../../../api/r';

afterEach(() => vi.unstubAllGlobals());

/** Every text in an element tree, in order. */
function texts(node: unknown): string[] {
  if (typeof node === 'string') {
    return [node];
  }
  if (node === null || typeof node !== 'object') {
    return [];
  }
  const children = (node as { props?: { children?: unknown } }).props?.children;
  return (Array.isArray(children) ? children : [children]).flatMap(texts);
}

describe('the card image (api/og.ts)', () => {
  test('its values are checked as before: anything invalid gives no card', async () => {
    expect(readOgRequest('https://histor.space/api/og?c=mary-celeste&n=Ann&r=historian&l=0')).toEqual({ caseId: 'mary-celeste', name: 'Ann', rank: 'historian', legends: 0, against: false });
    for (const query of ['c=mary-celeste&r=admiral&l=0', 'c=mary-celeste&r=historian&l=100', 'c=%3Cscript%3E&r=historian&l=1', 'r=historian&l=1']) {
      expect(readOgRequest(`https://histor.space/api/og?${query}`)).toBeNull();
    }
    const response = await handler(new Request('https://histor.space/api/og?c=mary-celeste&r=admiral&l=0'));
    expect(response.status).toBe(404);
  });

  test('against the historians (a=1): the preview says so too; without it, no such line', () => {
    const against = readOgRequest('https://histor.space/api/og?c=mary-celeste&r=deckhand&l=1&a=1')!;
    expect(ogCardLines(against).against).toBe('I sided against the historians.');
    expect(texts(ogCardElement(against))).toContain('I sided against the historians.');
    const plain = readOgRequest('https://histor.space/api/og?c=mary-celeste&r=deckhand&l=1')!;
    expect(texts(ogCardElement(plain))).not.toContain('I sided against the historians.');
  });

  test('the same words as the canvas card, the signature when signed, a name cleaned of markup', () => {
    const result = readOgRequest(`https://histor.space/api/og?c=mary-celeste&n=${encodeURIComponent('Ann <b>')}&r=investigator&l=2`)!;
    expect(ogCardLines(result)).toMatchObject({ closed: 'I closed the Mary Celeste case.', rank: 'INVESTIGATOR', legends: 'I trusted 2 legends.', signature: 'Ann b' });
    const words = texts(ogCardElement(result));
    expect(words).toEqual(expect.arrayContaining(['Mary Celeste', 'I closed the Mary Celeste case.', 'INVESTIGATOR', 'I trusted 2 legends.', 'SIGNED', 'Ann b', 'histor.space']));
    expect(texts(ogCardElement({ ...result, name: '' }))).not.toContain('SIGNED');
  });
});

describe('the shared page points its preview at the card', () => {
  test('og:image and twitter:image are /api/og with the same checked values', () => {
    const html = sharePage('https://histor.space/api/r?path=mary-celeste&n=Ann&r=historian&l=0');
    expect(html).toContain('<meta property="og:image" content="https://histor.space/api/og?c=mary-celeste&amp;n=Ann&amp;r=historian&amp;l=0" />');
    expect(html).toContain('<meta name="twitter:image" content="https://histor.space/api/og?c=mary-celeste&amp;n=Ann&amp;r=historian&amp;l=0" />');
    // An invalid link: the site's title card.
    expect(sharePage('https://histor.space/api/r?path=mary-celeste&r=admiral&l=0')).toContain('content="https://histor.space/og-default.png"');
  });
});
