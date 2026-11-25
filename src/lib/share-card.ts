// src/lib/share-card.ts
// The shareable card at the end of a case (investigation brief, 3.3), now a case certificate (quick fixes, 5): a
// 1200×630 image drawn on a canvas from the certificate's model (certificate.ts) on its aged sheet
// (public/cards/certificate-paper.jpg), saved or shared from the browser. /api/og draws the same model, so the preview
// of a shared link is the card itself. Nothing is uploaded or sent anywhere: "Save the card" downloads it, "Share"
// hands the file to the browser's share sheet, or copies the text.
import { RANK_COPY } from '@/lib/ui-copy';
import type { CaseRank } from '@/lib/case-rank';
import { MARK_INK, MARK_PATH, MARK_VIEWBOX } from '@/lib/brand';
import { CERTIFICATE, CERTIFICATE_PAPER, CERT_INK, certificateModel, type CertFace, type CertInput, type CertModel } from '@/lib/certificate';

/** The card's size, in px: the size social sites show a link preview at. */
export const SHARE_CARD = CERTIFICATE;

/** Where the card says it came from. */
export const SHARE_SITE = 'histor.space';

export interface ShareCardInput extends CertInput {
  rank: CaseRank;
}

/** The line on the card of a player who chose a theory historians ruled out. */
export const AGAINST_LINE = 'I sided against the historians.';

/** The shared words' parts, in order: the line about the case, the rank, the line against the historians (or empty), the legends, the site. */
export function shareCardLines({ title, rank, legends, verdict }: ShareCardInput): { closed: string; rank: string; against: string; legends: string; site: string } {
  const against = verdict?.rejected === true;
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

/** The fonts the card is set in: the site's own three voices. */
const FONTS: Record<CertFace, string> = {
  legend: '"Grenze Gotisch", serif',
  voice: '"Special Elite", monospace',
  record: '"Old Standard TT", serif',
};

/** The sheet, once it has loaded: until then (and in tests) the card is drawn on plain paper with its double rule. */
let paperImage: HTMLImageElement | null = null;
let paperLoading: Promise<void> | null = null;

function loadPaper(): Promise<void> {
  if (typeof Image === 'undefined') {
    return Promise.resolve();
  }
  paperLoading ??= new Promise<void>(resolve => {
    const image = new Image();
    image.onload = () => {
      paperImage = image;
      resolve();
    };
    image.onerror = () => {
      paperLoading = null;
      resolve();
    };
    image.src = CERTIFICATE_PAPER;
  });
  return paperLoading;
}

/** Waits until the card's fonts and its sheet are ready, so the canvas draws in them (it will not wait by itself). */
export async function loadShareCardAssets(): Promise<void> {
  const fonts = typeof document === 'undefined' ? undefined : document.fonts;
  await Promise.all([
    loadPaper(),
    ...(fonts === undefined
      ? []
      : [`60px ${FONTS.legend}`, `17px ${FONTS.voice}`, `30px ${FONTS.record}`, `italic 20px ${FONTS.record}`].map(font => fonts.load(font).catch(() => []))),
  ]);
}

/** The plain sheet, for before the paper has loaded: paper, and the double rule where the image has it. */
function plainSheet(context: CanvasRenderingContext2D) {
  const { width, height } = CERTIFICATE;
  context.fillStyle = '#0d1317';
  context.fillRect(0, 0, width, height);
  context.fillStyle = '#e2ddcf';
  context.fillRect(14, 14, width - 28, height - 28);
  context.strokeStyle = CERT_INK.ink;
  context.lineWidth = 3;
  context.strokeRect(40, 40, width - 80, height - 80);
  context.lineWidth = 1;
  context.strokeRect(50, 50, width - 100, height - 100);
}

/** Draws a certificate model; `skip` leaves out the pieces drawn by something else (the preview's pen-written name). */
export function drawCertificate(context: CanvasRenderingContext2D, model: CertModel, skip: ReadonlySet<string> = new Set()): void {
  if (paperImage !== null) {
    context.drawImage(paperImage, 0, 0, CERTIFICATE.width, CERTIFICATE.height);
  } else {
    plainSheet(context);
  }
  // The small mark before the top line. Where Path2D is missing (tests), it is left out.
  if (typeof Path2D !== 'undefined') {
    const { x, top, height } = model.mark;
    const scale = height / MARK_VIEWBOX[3];
    context.save();
    context.translate(x, top);
    context.scale(scale, scale);
    context.translate(-MARK_VIEWBOX[0], -MARK_VIEWBOX[1]);
    context.fillStyle = MARK_INK.ink;
    context.fill(new Path2D(MARK_PATH), 'evenodd');
    context.restore();
  }
  const spacing = (px: number) => {
    if ('letterSpacing' in context) {
      context.letterSpacing = `${px}px`;
    }
  };
  context.textBaseline = 'top';
  for (const text of model.texts) {
    if (skip.has(text.key)) {
      continue;
    }
    context.font = `${text.italic === true ? 'italic ' : ''}${text.size}px ${FONTS[text.face]}`;
    context.fillStyle = CERT_INK[text.ink];
    context.textAlign = text.align;
    spacing(text.tracking ?? 0);
    context.fillText(text.text, text.x, text.top);
  }
  spacing(0);
  for (const rule of model.rules) {
    context.strokeStyle = CERT_INK[rule.ink];
    context.lineWidth = rule.width;
    context.beginPath();
    context.moveTo(rule.x1, rule.y + 0.5);
    context.lineTo(rule.x2, rule.y + 0.5);
    context.stroke();
  }
  // The rank, a rubber stamp in rust: a frame of ink around typed capitals, tilted.
  const { stamp } = model;
  context.save();
  context.translate(stamp.cx, stamp.cy);
  context.rotate((stamp.rotate * Math.PI) / 180);
  context.globalAlpha = 0.9;
  context.strokeStyle = CERT_INK.rust;
  context.lineWidth = STAMP_BORDER;
  context.strokeRect(-stamp.width / 2 + STAMP_BORDER / 2, -stamp.height / 2 + STAMP_BORDER / 2, stamp.width - STAMP_BORDER, stamp.height - STAMP_BORDER);
  context.fillStyle = CERT_INK.rust;
  context.font = `${stamp.size}px ${FONTS.voice}`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  spacing(STAMP_TRACKING);
  context.fillText(stamp.text, STAMP_TRACKING / 2, 0);
  spacing(0);
  context.restore();
}

/** The stamp's frame and letter spacing, in px (the same in /api/og). */
export const STAMP_BORDER = 4;
export const STAMP_TRACKING = 2;

/**
 * Draws the card onto `canvas` (resized to 1200×630). `penName`: the preview, whose name the pen writes over it
 * (CardSignature), so the canvas leaves the name out. Does nothing where the canvas cannot draw (no 2D context).
 */
export function drawShareCard(canvas: HTMLCanvasElement, input: ShareCardInput, { penName = false }: { penName?: boolean } = {}): void {
  canvas.width = SHARE_CARD.width;
  canvas.height = SHARE_CARD.height;
  const context = canvas.getContext?.('2d') ?? null;
  if (context === null) {
    return;
  }
  drawCertificate(context, certificateModel(input), penName ? new Set(['name']) : undefined);
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
