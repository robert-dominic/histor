// api/og.ts
// The player's own card as the preview image of a shared link (ui-pass brief, 6; review-fixes brief, 11), now the
// case certificate (quick fixes, 5): /api/og?c={caseId}&n={name}&r={rank}&l={legendsTrusted}&t={theoryId}&d={day}
// answers with a 1200×630 PNG drawn from the very model the canvas draws (src/lib/certificate.ts), on the same sheet
// (public/cards/certificate-paper.jpg): every piece of text at its own place, size and face. So the link shows the
// card itself. The case's title, years and theory come from the share catalogue (src/lib/share-cases.ts): a link's
// theory is drawn only if the case has it. Rendered with @vercel/og (ImageResponse) on the edge. Written with
// createElement, not JSX, so it compiles the same whatever JSX setting the function is built with.
// Every value is checked (src/lib/share-link.ts): an invalid link gets no card (404), and the page (api/r.ts) then
// points to the site's title card instead. Fonts: the repo commits no font files (design.md), so the faces are
// loaded from Google Fonts when the function first needs them (the one network use the rules allow), then kept.
import { ImageResponse } from '@vercel/og';
import { createElement, type ReactElement, type ReactNode } from 'react';
import { MARK_INK, markSvg, markWidth } from '../src/lib/brand';
import { CERTIFICATE, CERTIFICATE_PAPER, CERT_INK, certificateModel, type CertFace, type CertInput, type CertModel } from '../src/lib/certificate';
import { SHARE_CASES } from '../src/lib/share-cases';
import { readShareLink, titleFromCaseId, type SharedResult } from '../src/lib/share-link';

export const config = { runtime: 'edge' };

/** The stamp's frame and letter spacing: the canvas's own (share-card.ts STAMP_BORDER, STAMP_TRACKING). */
const STAMP = { border: 4, tracking: 2 } as const;

/** The certificate's values from a shared result: the case's own title, years and theory where the catalogue has them. */
export function certificateInput(result: SharedResult): CertInput {
  const known = SHARE_CASES[result.caseId];
  const theory = result.theory === undefined ? undefined : known?.theories[result.theory];
  return {
    title: known?.title ?? titleFromCaseId(result.caseId),
    years: known?.years ?? '',
    rank: result.rank,
    legends: result.legends,
    verdict: theory ?? (result.against === true ? { title: '—', rejected: true } : undefined),
    name: result.name,
    date: result.date,
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

const FAMILY: Record<CertFace, string> = { legend: 'Grenze Gotisch', voice: 'Special Elite', record: 'Old Standard TT' };

/**
 * The certificate, as the elements ImageResponse draws: the sheet, then every piece placed absolutely where the model
 * puts it (a line's box is as wide as the sheet when centred, and ends at its x when right-aligned).
 * `paper`: the sheet's image as a data URL (the handler loads it; tests pass any string).
 */
export function ogCardElement(result: SharedResult, paper = CERTIFICATE_PAPER): ReactElement {
  return certificateElement(certificateModel(certificateInput(result)), paper);
}

export function certificateElement(model: CertModel, paper: string): ReactElement {
  const { width, height } = CERTIFICATE;
  const markW = Math.round(markWidth(model.mark.height));
  const { stamp } = model;
  return el(
    'div',
    { position: 'relative', width, height, backgroundColor: '#0d1317' },
    createElement('img', { src: paper, width, height, 'data-og': 'paper', style: { position: 'absolute', left: 0, top: 0 } }),
    createElement('img', {
      src: `data:image/svg+xml,${encodeURIComponent(markSvg(MARK_INK.ink))}`,
      width: markW,
      height: model.mark.height,
      'data-og': 'mark',
      style: { position: 'absolute', left: model.mark.x, top: model.mark.top },
    }),
    ...model.texts.map(text => {
      const box: Style =
        text.align === 'center'
          ? { left: 0, width, justifyContent: 'center' }
          : text.align === 'right'
            ? { right: width - text.x, justifyContent: 'flex-end' }
            : { left: text.x };
      return createElement(
        'div',
        {
          key: text.key,
          'data-og': text.key,
          style: {
            display: 'flex',
            position: 'absolute',
            top: text.top,
            ...box,
            fontFamily: FAMILY[text.face],
            fontStyle: text.italic === true ? 'italic' : 'normal',
            fontSize: text.size,
            lineHeight: 1,
            letterSpacing: text.tracking ?? 0,
            color: CERT_INK[text.ink],
            whiteSpace: 'nowrap',
          },
        },
        text.text
      );
    }),
    ...model.rules.map(rule =>
      el('div', { position: 'absolute', left: rule.x1, top: rule.y, width: rule.x2 - rule.x1, height: rule.width, backgroundColor: CERT_INK[rule.ink] })
    ),
    // The rank, a rubber stamp in rust: a frame of ink around typed capitals, tilted.
    el(
      'div',
      {
        position: 'absolute',
        left: stamp.cx - stamp.width / 2,
        top: stamp.cy - stamp.height / 2,
        width: stamp.width,
        height: stamp.height,
        alignItems: 'center',
        justifyContent: 'center',
        border: `${STAMP.border}px solid ${CERT_INK.rust}`,
        color: CERT_INK.rust,
        opacity: 0.9,
        fontFamily: FAMILY.voice,
        fontSize: stamp.size,
        lineHeight: 1,
        letterSpacing: STAMP.tracking,
        transform: `rotate(${stamp.rotate}deg)`,
      },
      stamp.text
    )
  );
}

/** The three faces, from Google Fonts, as TrueType (what a request without a browser's user agent is given). */
const FACES = [
  { name: 'Grenze Gotisch', family: 'Grenze+Gotisch:wght@600', weight: 600 },
  { name: 'Old Standard TT', family: 'Old+Standard+TT', weight: 400 },
  { name: 'Old Standard TT', family: 'Old+Standard+TT:ital@1', weight: 400, style: 'italic' },
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

let fonts: Promise<{ name: string; data: ArrayBuffer; weight: 400 | 600; style: 'normal' | 'italic' }[]> | null = null;
function loadFonts() {
  fonts ??= Promise.all(
    FACES.map(async face => ({ name: face.name, data: await loadFace(face.family), weight: face.weight, style: 'style' in face ? face.style : ('normal' as const) }))
  );
  // A failed load is tried again next time.
  fonts.catch(() => {
    fonts = null;
  });
  return fonts;
}

/** The certificate's sheet, from the site's own files, as a data URL; kept once loaded. */
let paperData: Promise<string> | null = null;
function loadPaper(url: string): Promise<string> {
  paperData ??= fetch(url).then(async response => {
    if (!response.ok) {
      throw new Error(`No certificate paper at ${url}`);
    }
    const bytes = new Uint8Array(await response.arrayBuffer());
    let binary = '';
    for (let i = 0; i < bytes.length; i += 0x8000) {
      binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    }
    return `data:image/jpeg;base64,${btoa(binary)}`;
  });
  // A failed load is tried again next time.
  paperData.catch(() => {
    paperData = null;
  });
  return paperData;
}

export default async function handler(request: Request): Promise<Response> {
  const result = readOgRequest(request.url);
  if (result === null) {
    return new Response('Not a shared result.', { status: 404, headers: { 'content-type': 'text/plain; charset=utf-8' } });
  }
  return new ImageResponse(ogCardElement(result, await loadPaper(new URL(CERTIFICATE_PAPER, request.url).href)), {
    width: 1200,
    height: 630,
    fonts: await loadFonts(),
    headers: { 'cache-control': 'public, max-age=86400, s-maxage=31536000, immutable' },
  });
}
