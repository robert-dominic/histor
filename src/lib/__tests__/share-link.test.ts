// src/lib/__tests__/share-link.test.ts
// The share link (review-fixes brief, 11): /r/{caseId}?n=&r=&l=, URL-encoded, the name capped at 32 characters; and
// the page the link answers with (api/r.ts): its preview tags, its redirect, and nothing injectable.
import { describe, expect, test } from 'vitest';
import handler, { sharePage } from '../../../api/r';
import { SHARE_NAME_MAX, cleanShareName, readShareLink, shareCopy, shareLink } from '@/lib/share-link';

describe('the share link', () => {
  test('carries the case, the name, the rank and the legends, URL-encoded', () => {
    const link = shareLink({ caseId: 'mary-celeste', name: 'Ann Lee', rank: 'historian', legends: 0 });
    expect(link).toBe('https://histor.space/r/mary-celeste?n=Ann+Lee&r=historian&l=0');
    const url = new URL(link);
    expect(readShareLink('mary-celeste', url.searchParams)).toEqual({ caseId: 'mary-celeste', name: 'Ann Lee', rank: 'historian', legends: 0 });
  });

  test('no signature, no name; the name capped at 32 characters', () => {
    expect(shareLink({ caseId: 'mary-celeste', name: '', rank: 'deckhand', legends: 3 })).toBe('https://histor.space/r/mary-celeste?r=deckhand&l=3');
    const long = 'A'.repeat(50);
    expect(cleanShareName(long)).toHaveLength(SHARE_NAME_MAX);
    expect(new URL(shareLink({ caseId: 'mary-celeste', name: long, rank: 'deckhand', legends: 3 })).searchParams.get('n')).toHaveLength(SHARE_NAME_MAX);
  });

  test('the name is plain text only: markup, quotes and controls are dropped; letters of any script stay', () => {
    expect(cleanShareName('<script>alert("x")</script>')).toBe('scriptalertxscript');
    expect(cleanShareName('Zoë  O’Brien-Smith')).toBe('Zoë O’Brien-Smith');
    expect(cleanShareName('名前\u0000\n')).toBe('名前');
  });

  test('read back, only valid values pass: one of the three ranks, legends 0 to 99, a kebab-case case id', () => {
    const read = (caseId: string, query: string) => readShareLink(caseId, new URLSearchParams(query));
    expect(read('mary-celeste', 'r=investigator&l=99')).not.toBeNull();
    expect(read('mary-celeste', 'r=admiral&l=1')).toBeNull();
    expect(read('mary-celeste', 'r=historian&l=100')).toBeNull();
    expect(read('mary-celeste', 'r=historian&l=-1')).toBeNull();
    expect(read('mary-celeste', 'r=historian&l=1.5')).toBeNull();
    expect(read('Mary"><script>', 'r=historian&l=1')).toBeNull();
    expect(read('../etc', 'r=historian&l=1')).toBeNull();
  });

  test("the preview's words", () => {
    expect(shareCopy({ caseId: 'mary-celeste', name: 'Ann', rank: 'historian', legends: 1 })).toEqual({
      title: 'Ann closed the Mary Celeste case on Histor.',
      description: 'Historian. Trusted 1 legend. Can you tell legend from history?',
    });
  });
});

describe('the page a shared link answers with (api/r.ts)', () => {
  test('preview tags, the twitter card, and an instant redirect to the case', async () => {
    const response = handler(new Request('https://histor.space/api/r?path=mary-celeste&n=Ann&r=investigator&l=2'));
    expect(response.headers.get('content-type')).toContain('text/html');
    const html = await response.text();
    expect(html).toContain('<meta property="og:title" content="Ann closed the Mary Celeste case on Histor." />');
    expect(html).toContain('<meta property="og:description" content="Investigator. Trusted 2 legends. Can you tell legend from history?" />');
    expect(html).toMatch(/<meta property="og:image" content="https:\/\/histor\.space\/[^"]+" \/>/);
    expect(html).toContain('<meta name="twitter:card" content="summary_large_image" />');
    expect(html).toContain('<meta http-equiv="refresh" content="0; url=/case/mary-celeste" />');
    expect(html).toContain('location.replace("/case/mary-celeste")');
  });

  test('nothing can be injected: a hostile name is cleaned and escaped; a hostile case id goes home', () => {
    const hostile = sharePage(`https://histor.space/api/r?path=mary-celeste&n=${encodeURIComponent('"><img src=x onerror=alert(1)>')}&r=deckhand&l=0`);
    expect(hostile).not.toContain('<img');
    expect(hostile).not.toContain('onerror=alert(1)>');
    const badCase = sharePage(`https://histor.space/api/r?path=${encodeURIComponent('"><script>x</script>')}&r=deckhand&l=0`);
    expect(badCase).not.toContain('<script>x');
    expect(badCase).toContain('url=/"');
    // Invalid values: the site's own preview, still sent on to the case.
    const invalid = sharePage('https://histor.space/api/r?path=mary-celeste&r=admiral&l=7');
    expect(invalid).toContain('content="Histor"');
    expect(invalid).toContain('url=/case/mary-celeste');
  });
});
