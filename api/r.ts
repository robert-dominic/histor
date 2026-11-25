// api/r.ts
// A shared result's link, /r/{caseId}?n=&r=&l= (review-fixes brief, 11; vercel.json sends /r/* here). Social sites
// read the preview from the page they are given and run no JavaScript, so this answers with a tiny page: its
// og:title, og:description and og:image (and the twitter:card tags), and an instant redirect to the case for people
// (a meta refresh, and a script). Every value is checked (src/lib/share-link.ts) and escaped: nothing can be injected.
import { SHARE_ORIGIN, isShareCaseId, readShareLink, shareCopy } from '../src/lib/share-link';

export const config = { runtime: 'edge' };

/**
 * The image of the player's own card: `/api/og` (api/og.ts, rendered with @vercel/og). An invalid link uses the site's
 * title card instead.
 */
export const OG_CARD_READY = true;

const escape = (text: string) =>
  text.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char] ?? char);

/** The page for a shared link. */
export function sharePage(requestUrl: string): string {
  const url = new URL(requestUrl);
  // The rewrite passes the path as `path`; called directly, it is the URL's own.
  const caseId = (url.searchParams.get('path') ?? url.pathname.replace(/^\/(?:api\/)?r\/?/, '')).split('/')[0] ?? '';
  const result = readShareLink(caseId, url.searchParams);
  const target = isShareCaseId(caseId) ? `/case/${caseId}` : '/';
  const copy = result === null ? { title: 'Histor', description: 'Legend or history? You decide.' } : shareCopy(result);
  const image =
    result !== null && OG_CARD_READY
      ? `${SHARE_ORIGIN}/api/og?${new URLSearchParams({ c: result.caseId, ...(result.name === '' ? {} : { n: result.name }), r: result.rank, l: String(result.legends), ...(result.against === true ? { a: '1' } : {}), ...(result.theory === undefined ? {} : { t: result.theory }), ...(result.date === undefined ? {} : { d: result.date }) }).toString()}`
      : `${SHARE_ORIGIN}/og-default.png`;
  const tags = [
    ['og:type', 'website'],
    ['og:site_name', 'Histor'],
    ['og:title', copy.title],
    ['og:description', copy.description],
    ['og:image', image],
    ['og:image:width', '1200'],
    ['og:image:height', '630'],
    ['og:url', `${SHARE_ORIGIN}${target}`],
  ]
    .map(([property, content]) => `<meta property="${property}" content="${escape(content)}" />`)
    .join('\n    ');
  const twitter = [
    ['twitter:card', 'summary_large_image'],
    ['twitter:title', copy.title],
    ['twitter:description', copy.description],
    ['twitter:image', image],
  ]
    .map(([name, content]) => `<meta name="${name}" content="${escape(content)}" />`)
    .join('\n    ');
  const href = escape(target);
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${escape(copy.title)}</title>
    <meta name="description" content="${escape(copy.description)}" />
    ${tags}
    ${twitter}
    <meta http-equiv="refresh" content="0; url=${href}" />
    <script>location.replace(${JSON.stringify(target)});</script>
  </head>
  <body>
    <p><a href="${href}">Open the case on Histor</a></p>
  </body>
</html>`;
}

export default function handler(request: Request): Response {
  return new Response(sharePage(request.url), {
    headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=300, s-maxage=86400' },
  });
}
