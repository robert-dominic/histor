// api/og.ts
// The player's own card as the preview image of a shared link (ui-pass brief, 6; review-fixes brief, 11):
// /api/og?c={caseId}&n={name}&r={rank}&l={legendsTrusted} answers with a 1200×630 PNG in the design of the canvas card
// (src/lib/share-card.ts): paper with an inked double rule, the case's title in Grenze Gotisch, "I closed the … case."
// in Old Standard TT, the rank as a rust rubber stamp, the legends line, the signature and histor.space in Special
// Elite. Rendered with @vercel/og (ImageResponse) on the edge. Written with createElement, not JSX, so it compiles the
// same whatever JSX setting the function is built with.
// Every value is checked (src/lib/share-link.ts): an invalid link gets no card (404), and the page (api/r.ts) then
// points to the site's title card instead. Fonts: the repo commits no font files (design.md), so the three faces are
// loaded from Google Fonts when the function first needs them (the one network use the rules allow), then kept.
import { ImageResponse } from '@vercel/og';
import { createElement, type ReactElement, type ReactNode } from 'react';
import { RANK_COPY } from '../src/lib/ui-copy';
import { readShareLink, titleFromCaseId, type SharedResult } from '../src/lib/share-link';

export const config = { runtime: 'edge' };

/** The Ash palette's values (design.md), as on the canvas card. */
const COLOUR = { paper: '#e2ddcf', ink: '#23211d', muted: '#6c6a62', rust: '#9e3326' } as const;

/** The card's words, the same as the canvas card's (shareCardLines). */
export function ogCardLines(result: SharedResult) {
  const legends = result.legends === 0 ? 'I trusted no legends.' : result.legends === 1 ? 'I trusted 1 legend.' : `I trusted ${result.legends} legends.`;
  return {
    title: titleFromCaseId(result.caseId),
    closed: `I closed the ${titleFromCaseId(result.caseId)} case.`,
    rank: RANK_COPY[result.rank].name.toUpperCase(),
    legends,
    site: 'histor.space',
    signature: result.name,
  };
}

/** The card's values read from a request to /api/og, or null if any is not as it must be. */
export function readOgRequest(requestUrl: string): SharedResult | null {
  const params = new URL(requestUrl).searchParams;
  return readShareLink(params.get('c') ?? '', params);
}

type Style = Record<string, string | number>;
const el = (type: string, style: Style, ...children: ReactNode[]): ReactElement =>
  createElement(type, { style: { display: 'flex', ...style } }, ...children);

/** The card, as the elements ImageResponse draws (flex layout only, as Satori needs). */
export function ogCardElement(result: SharedResult): ReactElement {
  const lines = ogCardLines(result);
  return el(
    'div',
    { width: '100%', height: '100%', backgroundColor: COLOUR.paper, backgroundImage: 'linear-gradient(135deg, rgba(255,255,255,0.18), rgba(255,255,255,0) 45%, rgba(0,0,0,0.08))', padding: 36 },
    // The double rule, inked.
    el(
      'div',
      { flex: 1, border: `3px solid ${COLOUR.ink}`, padding: 9 },
      el(
        'div',
        { flex: 1, flexDirection: 'column', border: `1px solid ${COLOUR.ink}`, padding: '64px 48px 30px 48px', color: COLOUR.ink },
        el('div', { fontFamily: 'Grenze Gotisch', fontSize: 76, lineHeight: 1 }, lines.title),
        el('div', { fontFamily: 'Old Standard TT', fontSize: 40, marginTop: 48 }, lines.closed),
        // The rank, as a rubber stamp in rust: a frame of ink around typed capitals, a little crooked.
        el(
          'div',
          { marginTop: 40 },
          el(
            'div',
            { fontFamily: 'Special Elite', fontSize: 44, color: COLOUR.rust, border: `5px solid ${COLOUR.rust}`, padding: '6px 18px 0 18px', transform: 'rotate(-2.3deg)' },
            lines.rank
          )
        ),
        el('div', { fontFamily: 'Special Elite', fontSize: 34, marginTop: 36 }, lines.legends),
        el(
          'div',
          { flex: 1, alignItems: 'flex-end', justifyContent: 'space-between' },
          // The signature, when the player signed: "SIGNED", then the name in the legend's face.
          lines.signature === ''
            ? el('div', {})
            : el(
                'div',
                { alignItems: 'baseline' },
                el('div', { fontFamily: 'Special Elite', fontSize: 20, color: COLOUR.muted, marginRight: 14 }, 'SIGNED'),
                el('div', { fontFamily: 'Grenze Gotisch', fontSize: 50, lineHeight: 1 }, lines.signature)
              ),
          el('div', { fontFamily: 'Special Elite', fontSize: 26, color: COLOUR.muted }, lines.site)
        )
      )
    )
  );
}

/** The three faces, from Google Fonts, as TrueType (what a request without a browser's user agent is given). */
const FACES = [
  { name: 'Grenze Gotisch', family: 'Grenze+Gotisch:wght@600', weight: 600 },
  { name: 'Old Standard TT', family: 'Old+Standard+TT', weight: 400 },
  { name: 'Special Elite', family: 'Special+Elite', weight: 400 },
] as const;

async function loadFace(family: string): Promise<ArrayBuffer> {
  const css = await (await fetch(`https://fonts.googleapis.com/css2?family=${family}`)).text();
  const url = /src:\s*url\((.+?)\)\s*format\('(?:truetype|opentype)'\)/.exec(css)?.[1];
  if (url === undefined) {
    throw new Error(`No TrueType face for ${family}`);
  }
  return (await fetch(url)).arrayBuffer();
}

let fonts: Promise<{ name: string; data: ArrayBuffer; weight: 400 | 600; style: 'normal' }[]> | null = null;
function loadFonts() {
  fonts ??= Promise.all(FACES.map(async face => ({ name: face.name, data: await loadFace(face.family), weight: face.weight, style: 'normal' as const })));
  // A failed load is tried again next time.
  fonts.catch(() => {
    fonts = null;
  });
  return fonts;
}

export default async function handler(request: Request): Promise<Response> {
  const result = readOgRequest(request.url);
  if (result === null) {
    return new Response('Not a shared result.', { status: 404, headers: { 'content-type': 'text/plain; charset=utf-8' } });
  }
  return new ImageResponse(ogCardElement(result), {
    width: 1200,
    height: 630,
    fonts: await loadFonts(),
    headers: { 'cache-control': 'public, max-age=86400, s-maxage=31536000, immutable' },
  });
}
