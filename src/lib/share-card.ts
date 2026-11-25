// src/lib/share-card.ts
// The shareable card at the end of a case (investigation brief, 3.3): a 1200×630 image drawn on a canvas in the
// site's style (paper, ink, the case title and years), saved or shared from the browser. Nothing is uploaded or sent
// anywhere: "Save the card" downloads it, "Share" hands the file to the browser's share sheet, or copies the text.
// The share links (polish brief, A4) open each site's own share page with the text and the link filled in; they cannot
// carry the image, so it is saved for attaching.
import { RANK_COPY } from '@/lib/ui-copy';
import type { CaseRank } from '@/lib/case-rank';
import { CARD_MARK as SHARE_MARK, MARK_PATH, MARK_VIEWBOX, markWidth } from '@/lib/brand';

/** The card's size, in px: the size social sites show a link preview at. */
export const SHARE_CARD = { width: 1200, height: 630 } as const;

/** Where the card says it came from. */
export const SHARE_SITE = 'histor.space';

export interface ShareCardInput {
  title: string;
  years: string;
  rank: CaseRank;
  /** Legends trusted: opened legend files pinned to a theory (buildCaseReport's `legendsTrusted`). */
  legends: number;
  /** The player chose a theory historians ruled out (the fix list): the card says so. */
  against?: boolean;
  /** The player's signature, when they signed (player-name.ts). No name, no signature line. */
  name?: string;
}

/**
 * Where the signature sits on the card, in its own px: "Signed" small, then the name in the legend's face, on one
 * baseline. The preview places its pen-written copy by the same numbers (VerdictReveal.tsx).
 */
export const SHARE_SIGNATURE = { left: 96, baseline: 560, labelPx: 20, namePx: 50, gap: 14 } as const;

/** The line on the card of a player who chose a theory historians ruled out. */
export const AGAINST_LINE = 'I sided against the historians.';

/** The card's words, in order: the line about the case, the rank, the line against the historians (or empty), the legends, the site. */
export function shareCardLines({ title, rank, legends, against = false }: ShareCardInput): { closed: string; rank: string; against: string; legends: string; site: string } {
  return {
    // "The Mary Celeste" reads "I closed the Mary Celeste case.", not "the The Mary Celeste".
    closed: `I closed the ${title.replace(/^the\s+/i, '')} case.`,
    rank: RANK_COPY[rank].name,
    against: against ? AGAINST_LINE : '',
    legends: legends === 0 ? 'I trusted no legends.' : legends === 1 ? 'I trusted 1 legend.' : `I trusted ${legends} legends.`,
    site: SHARE_SITE,
  };
}

/** The link that is shared: the case's own page on the site, so a friend lands on its start. */
export function shareUrl(caseId: string): string {
  return `https://${SHARE_SITE}/case/${encodeURIComponent(caseId)}`;
}

/**
 * The words that are shared (polish brief, A4): "I closed the {title} case on Histor. {rank}. I trusted {n} legends.
 * Can you tell legend from history?". The link goes beside it.
 */
export function shareCardText(input: ShareCardInput): string {
  const lines = shareCardLines(input);
  const against = lines.against === '' ? '' : ` ${lines.against}`;
  return `${lines.closed.replace(/ case\.$/, ' case on Histor.')} ${lines.rank}.${against} ${lines.legends} Can you tell legend from history?`;
}

export interface ShareLink {
  id: 'x' | 'facebook' | 'linkedin' | 'whatsapp' | 'reddit' | 'telegram';
  label: string;
  href: string;
}

/**
 * The direct share links: each site's own share page, opened in a new tab with the text and the link filled in
 * (Facebook and LinkedIn take only the link; they read the words from the page). None of them can carry an image.
 */
export function shareLinks(text: string, url: string): ShareLink[] {
  const t = encodeURIComponent(text);
  const u = encodeURIComponent(url);
  return [
    { id: 'x', label: 'X', href: `https://x.com/intent/tweet?text=${t}&url=${u}` },
    { id: 'facebook', label: 'Facebook', href: `https://www.facebook.com/sharer/sharer.php?u=${u}` },
    { id: 'linkedin', label: 'LinkedIn', href: `https://www.linkedin.com/sharing/share-offsite/?url=${u}` },
    { id: 'whatsapp', label: 'WhatsApp', href: `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}` },
    { id: 'reddit', label: 'Reddit', href: `https://www.reddit.com/submit?url=${u}&title=${t}` },
    { id: 'telegram', label: 'Telegram', href: `https://t.me/share/url?url=${u}&text=${t}` },
  ];
}

/** A colour token of the site (index.css `@theme`), read from the page. */
function token(name: string, fallback: string): string {
  if (typeof document === 'undefined') {
    return fallback;
  }
  const value = getComputedStyle(document.documentElement).getPropertyValue(`--color-${name}`).trim();
  return value === '' ? fallback : value;
}

/** The fonts the card is set in: the site's own three voices. */
const FONTS = {
  legend: '"Grenze Gotisch", serif',
  voice: '"Special Elite", monospace',
  record: '"Old Standard TT", serif',
} as const;

/** Waits until the card's fonts are ready, so the canvas draws in them (it will not wait by itself). */
export async function loadShareCardFonts(): Promise<void> {
  const fonts = typeof document === 'undefined' ? undefined : document.fonts;
  if (fonts === undefined) {
    return;
  }
  await Promise.all(
    [`72px ${FONTS.legend}`, `36px ${FONTS.voice}`, `32px ${FONTS.record}`].map(font => fonts.load(font).catch(() => []))
  );
}

/**
 * Draws the card onto `canvas` (resized to 1200×630). Paper with an inked double rule, the case title in the
 * legend's face and its years, the closing line, the rank stamped in rust, the legends line and the site.
 * Does nothing where the canvas cannot draw (no 2D context).
 */
export function drawShareCard(canvas: HTMLCanvasElement, input: ShareCardInput): void {
  canvas.width = SHARE_CARD.width;
  canvas.height = SHARE_CARD.height;
  const context = canvas.getContext?.('2d') ?? null;
  if (context === null) {
    return;
  }
  // Fallbacks are the Ash palette's own values (design.md), for a page that has not loaded its styles.
  const paper = token('paper', '#e2ddcf');
  const ink = token('ink', '#23211d');
  const muted = token('muted', '#6c6a62');
  const rust = token('rust', '#9e3326');
  const { width, height } = SHARE_CARD;
  const lines = shareCardLines(input);

  context.fillStyle = paper;
  context.fillRect(0, 0, width, height);
  // A faint fold of light across the paper, and darker edges.
  const light = context.createLinearGradient(0, 0, width, height);
  light.addColorStop(0, 'rgba(255, 255, 255, 0.18)');
  light.addColorStop(0.45, 'rgba(255, 255, 255, 0)');
  light.addColorStop(1, 'rgba(0, 0, 0, 0.08)');
  context.fillStyle = light;
  context.fillRect(0, 0, width, height);

  // The double rule, inked.
  context.strokeStyle = ink;
  context.lineWidth = 3;
  context.strokeRect(36, 36, width - 72, height - 72);
  context.lineWidth = 1;
  context.strokeRect(48, 48, width - 96, height - 96);

  // The Histor mark, small, in the top right corner (quick fixes, 4). Where Path2D is missing (tests), it is left out.
  if (typeof Path2D !== 'undefined') {
    const { x, y, height: markHeight } = SHARE_MARK;
    const scale = markHeight / MARK_VIEWBOX[3];
    context.save();
    context.translate(x - markWidth(markHeight), y);
    context.scale(scale, scale);
    context.translate(-MARK_VIEWBOX[0], -MARK_VIEWBOX[1]);
    context.fillStyle = ink;
    context.fill(new Path2D(MARK_PATH), 'evenodd');
    context.restore();
  }

  context.textBaseline = 'alphabetic';
  context.textAlign = 'left';
  const left = 96;

  // The case, in the legend's face, with its years.
  context.fillStyle = ink;
  context.font = `76px ${FONTS.legend}`;
  context.fillText(input.title, left, 170, width - 2 * left);
  context.fillStyle = muted;
  context.font = `28px ${FONTS.voice}`;
  context.fillText(input.years.toUpperCase(), left, 214);

  // The closing line, in the record's face.
  context.fillStyle = ink;
  context.font = `40px ${FONTS.record}`;
  context.fillText(lines.closed, left, 300, width - 2 * left);

  // The rank, as a rubber stamp in rust: a rectangle of ink around typed capitals, a little crooked.
  context.save();
  context.translate(left, 400);
  context.rotate(-0.04);
  context.font = `44px ${FONTS.voice}`;
  const label = lines.rank.toUpperCase();
  const labelWidth = context.measureText(label).width;
  context.strokeStyle = rust;
  context.lineWidth = 5;
  context.strokeRect(-18, -50, labelWidth + 36, 70);
  context.fillStyle = rust;
  context.fillText(label, 0, 0);
  context.restore();

  // The legends, and the site.
  context.fillStyle = ink;
  context.font = `34px ${FONTS.voice}`;
  // Against the historians, when the player was: just under the rank, then the legends.
  if (lines.against !== '') {
    context.font = `30px ${FONTS.voice}`;
    context.fillText(lines.against, left, 456, width - 2 * left);
    context.font = `34px ${FONTS.voice}`;
  }
  // The legends keep their place, clear of the signature (baseline 560).
  context.fillText(lines.legends, left, 500, width - 2 * left);
  context.fillStyle = muted;
  context.font = `26px ${FONTS.voice}`;
  context.textAlign = 'right';
  context.fillText(lines.site, width - left, height - 84);

  // The signature, when the player signed: "Signed", then the name in the legend's face.
  const name = input.name?.trim() ?? '';
  if (name !== '') {
    const sign = SHARE_SIGNATURE;
    context.textAlign = 'left';
    context.fillStyle = muted;
    context.font = `${sign.labelPx}px ${FONTS.voice}`;
    const label = 'SIGNED';
    context.fillText(label, sign.left, sign.baseline);
    const labelWidth = context.measureText(label).width;
    context.fillStyle = ink;
    context.font = `${sign.namePx}px ${FONTS.legend}`;
    context.fillText(name, sign.left + labelWidth + sign.gap, sign.baseline, width / 2);
  }
}

/** The card drawn on a canvas of its own, signature and all: what is saved and shared. */
export function renderShareCard(input: ShareCardInput): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  drawShareCard(canvas, input);
  return canvas;
}

/** The card as a PNG file, or null where the canvas cannot give one. */
export function shareCardFile(canvas: HTMLCanvasElement, name: string): Promise<File | null> {
  return new Promise(resolve => {
    if (typeof canvas.toBlob !== 'function') {
      resolve(null);
      return;
    }
    try {
      canvas.toBlob(blob => resolve(blob === null ? null : new File([blob], name, { type: 'image/png' })), 'image/png');
    } catch {
      resolve(null);
    }
  });
}

/** "Save the card": downloads the PNG. Returns false where the browser cannot make one. */
export async function saveShareCard(canvas: HTMLCanvasElement, name: string): Promise<boolean> {
  const file = await shareCardFile(canvas, name);
  if (file === null || typeof URL.createObjectURL !== 'function') {
    return false;
  }
  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
  return true;
}

/**
 * "Share": the browser's share sheet with the card, where it can share files (the link is in the text, since some
 * apps drop a separate link when a file is shared); a share sheet without files gets the text and the link; otherwise
 * both are copied.
 * @returns what happened: shared, copied, or nothing (the reader cancelled, or the browser can do neither)
 */
export async function shareShareCard(canvas: HTMLCanvasElement, name: string, text: string, url: string): Promise<'shared' | 'copied' | 'none'> {
  const file = await shareCardFile(canvas, name);
  const canShareFile = file !== null && typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] });
  if (typeof navigator.share === 'function' && (canShareFile || typeof navigator.canShare !== 'function' || navigator.canShare({ text, url }))) {
    try {
      await navigator.share(canShareFile && file !== null ? { files: [file], text: `${text} ${url}` } : { text, url });
      return 'shared';
    } catch {
      return 'none';
    }
  }
  return copyText(`${text} ${url}`);
}

/** True where the browser's share sheet can take an image file (the Share menu's "More…"). */
export function canShareAFile(): boolean {
  if (typeof navigator === 'undefined' || typeof navigator.share !== 'function' || typeof navigator.canShare !== 'function' || typeof File !== 'function') {
    return false;
  }
  try {
    return navigator.canShare({ files: [new File([''], 'card.png', { type: 'image/png' })] });
  } catch {
    return false;
  }
}

/** Copies `text` to the clipboard ("Copy link", and Share where nothing else can). */
export async function copyText(text: string): Promise<'copied' | 'none'> {
  try {
    await navigator.clipboard.writeText(text);
    return 'copied';
  } catch {
    return 'none';
  }
}
