// @vitest-environment node
// src/lib/__tests__/og-card.test.ts
// The player's own card as the shared link's preview (ui-pass brief, 6): api/og.ts draws it with @vercel/og from
// the link's values, checked as before; the shared page (api/r.ts) points og:image at it. (The PNG itself is drawn by
// @vercel/og, whose Node build does not load under Vitest; it was checked by rendering it once outside the suite.)
import { afterEach, describe, expect, test, vi } from 'vitest';
import handler, { certificateInput, ogCardElement, readOgRequest } from '../../../api/og';
import { sharePage } from '../../../api/r';
import { MARK_PATH } from '@/lib/brand';
import { certificateModel } from '@/lib/certificate';

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

/** The element placed for one piece of the certificate (its data-og). */
function byOg(node: unknown, key: string): { props: Record<string, unknown> } | null {
  if (node === null || typeof node !== 'object') {
    return null;
  }
  const props = (node as { props?: Record<string, unknown> }).props ?? {};
  if (props['data-og'] === key) {
    return node as { props: Record<string, unknown> };
  }
  const children = props.children;
  return (Array.isArray(children) ? children : [children]).map(child => byOg(child, key)).find(found => found !== null) ?? null;
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

  test('the certificate (quick fixes, 5): the very model the canvas draws, on the same sheet, every piece in its place', () => {
    const result = readOgRequest('https://histor.space/api/og?c=mary-celeste&n=Ann%20Lee&r=investigator&l=2&t=t-mutiny&d=2026-11-25')!;
    expect(result).toMatchObject({ theory: 't-mutiny', date: '2026-11-25' });
    const input = certificateInput(result);
    expect(input).toEqual({
      title: 'The Mary Celeste',
      years: '1872 – 1873',
      rank: 'investigator',
      legends: 2,
      verdict: { title: 'Drunken mutiny', rejected: true },
      name: 'Ann Lee',
      date: '2026-11-25',
    });
    const model = certificateModel(input);
    const element = ogCardElement(result, 'paper.jpg');
    // The sheet first, then the mark, then every text at the model's own top.
    expect(byOg(element, 'paper')!.props.src).toBe('paper.jpg');
    expect(byOg(element, 'mark')!.props.style).toMatchObject({ position: 'absolute', left: model.mark.x, top: model.mark.top });
    expect(String(byOg(element, 'mark')!.props.src)).toContain(encodeURIComponent(MARK_PATH));
    for (const text of model.texts) {
      const placed = byOg(element, text.key)!;
      expect(placed.props.children, text.key).toBe(text.text);
      expect(placed.props.style, text.key).toMatchObject({ position: 'absolute', top: text.top, fontSize: text.size });
    }
    expect(texts(element)).toEqual(
      expect.arrayContaining(['HISTOR · CASE FILE', model.number, 'This certifies that', 'Ann Lee', 'closed the case.', 'VERDICT', 'Drunken mutiny', 'Against the historians', 'LEGENDS TRUSTED', '2', 'INVESTIGATOR', 'Closed 25 November 2026', 'histor.space'])
    );
  });

  test('no name: "an unnamed investigator"; a leading theory: no line against; an unknown theory or a bad day: left out', () => {
    const plain = readOgRequest('https://histor.space/api/og?c=mary-celeste&r=historian&l=0&t=t-sinking&d=2026-11-25')!;
    const words = texts(ogCardElement(plain));
    expect(words).toContain('an unnamed investigator');
    expect(words).toContain('She was sinking');
    expect(words).not.toContain('Against the historians');
    const odd = readOgRequest('https://histor.space/api/og?c=mary-celeste&r=historian&l=0&t=t-nothing&d=2026-02-30')!;
    expect(odd.date).toBeUndefined();
    expect(certificateInput(odd).verdict).toBeUndefined();
    expect(texts(ogCardElement(odd)).some(word => word.startsWith('Closed'))).toBe(false);
    // A link from before the theory was carried, against the historians: still says so.
    expect(certificateInput(readOgRequest('https://histor.space/api/og?c=mary-celeste&r=deckhand&l=1&a=1')!).verdict).toEqual({ title: '—', rejected: true });
  });
});

describe('the shared page points its preview at the card', () => {
  test('og:image and twitter:image are /api/og with the same checked values', () => {
    const html = sharePage('https://histor.space/api/r?path=mary-celeste&n=Ann&r=historian&l=0');
    expect(html).toContain('<meta property="og:image" content="https://histor.space/api/og?c=mary-celeste&amp;n=Ann&amp;r=historian&amp;l=0" />');
    expect(html).toContain('<meta name="twitter:image" content="https://histor.space/api/og?c=mary-celeste&amp;n=Ann&amp;r=historian&amp;l=0" />');
    // The theory and the day go through to the image.
    expect(sharePage('https://histor.space/api/r?path=mary-celeste&r=historian&l=0&t=t-sinking&d=2026-11-25')).toContain(
      'content="https://histor.space/api/og?c=mary-celeste&amp;r=historian&amp;l=0&amp;t=t-sinking&amp;d=2026-11-25"'
    );
    // An invalid link: the site's title card.
    expect(sharePage('https://histor.space/api/r?path=mary-celeste&r=admiral&l=0')).toContain('content="https://histor.space/og-default.png"');
  });
});
