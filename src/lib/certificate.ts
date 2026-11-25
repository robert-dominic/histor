// src/lib/certificate.ts
// The shareable card as a case certificate (quick fixes, 5): one model, drawn the same by the canvas (on screen and
// in the saved PNG: share-card.ts) and by /api/og (api/og.ts). Every piece of text has its own place on the
// 1200×630 sheet, its size, face and colour; nothing is laid out by either drawer, so they cannot drift apart. Sizes
// that must shrink to fit (the title, the name, the verdict) shrink by the same estimate in both. The paper itself
// (torn, water-darkened edges, stains, grain, darker corners, the double rule and the watermark) is one image,
// public/cards/certificate-paper.jpg (scripts/certificate-paper.mjs). Pure. Imported by the edge function too: no
// '@/' imports here.
import { RANK_COPY } from './ui-copy';

export const CERTIFICATE = { width: 1200, height: 630 } as const;

/** The sheet the certificate is printed on. */
export const CERTIFICATE_PAPER = '/cards/certificate-paper.jpg';

/** The Ash palette's inks (design.md). */
export const CERT_INK = { ink: '#23211d', muted: '#5f5d56', rust: '#9e3326' } as const;
export type CertInk = keyof typeof CERT_INK;

/** The three faces: the legend's (Grenze Gotisch), the typed voice (Special Elite), the record (Old Standard TT). */
export type CertFace = 'legend' | 'voice' | 'record';

/** About how wide one character of each face is, as a share of its size: to shrink a line to fit, the same way twice. */
const ADVANCE: Record<CertFace, number> = { legend: 0.46, voice: 0.6, record: 0.5 };

export interface CertText {
  key: string;
  text: string;
  /** Where the line is anchored: its left edge, centre or right edge, by `align`. */
  x: number;
  /** The top of the line (its em box). */
  top: number;
  size: number;
  face: CertFace;
  italic?: boolean;
  ink: CertInk;
  align: 'left' | 'center' | 'right';
  /** Letter spacing, in px. */
  tracking?: number;
}

export interface CertRule {
  key: string;
  x1: number;
  x2: number;
  y: number;
  width: number;
  ink: CertInk;
}

export interface CertStamp {
  text: string;
  /** Its centre. */
  cx: number;
  cy: number;
  size: number;
  width: number;
  height: number;
  /** Degrees. */
  rotate: number;
}

export interface CertModel {
  /** The small Histor mark before the top line. */
  mark: { x: number; top: number; height: number };
  texts: CertText[];
  rules: CertRule[];
  stamp: CertStamp;
  /** The case number, for the description. */
  number: string;
}

export interface CertInput {
  /** The case's title and years, as the case gives them. */
  title: string;
  years: string;
  rank: keyof typeof RANK_COPY;
  legends: number;
  /** The theory the player chose, and whether historians ruled it out. */
  verdict?: { title: string; rejected: boolean };
  /** The player's signature; empty or absent: "an unnamed investigator". */
  name?: string;
  /** The day the case was closed, YYYY-MM-DD. */
  date?: string;
}

/** The sheet's places (px on the 1200×630 sheet), to tune. Inside the double rule: 50 to 1150 across, 50 to 580 down. */
export const CERT_LAYOUT = {
  left: 96,
  right: 1104,
  centre: 600,
  topLine: 82,
  title: { top: 116, size: 60, max: 860 },
  years: 190,
  certifies: 234,
  name: { top: 266, size: 46, max: 420 },
  signatureLine: { y: 322, half: 230 },
  unnamed: { top: 284, size: 26 },
  closedTheCase: 334,
  rule: 382,
  fields: { label: 402, value: 426, against: 466, verdictX: 150, verdictMax: 430, legendsX: 640 },
  legendsNumber: { top: 422, size: 62 },
  stamp: { cx: 935, cy: 498, size: 30, rotate: -6 },
  bottomLine: 548,
} as const;

/** A size at most `size` at which `text` fits `max` px in `face`. */
export function fitSize(text: string, size: number, max: number, face: CertFace, tracking = 0): number {
  const width = [...text].length * (size * ADVANCE[face] + tracking);
  return width <= max ? size : Math.max(10, Math.floor((size * max) / width));
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** "25 November 2026" from "2026-11-25", or null for anything that is not a real day. */
export function formatCertDate(date: string | undefined): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date ?? '');
  if (match === null) {
    return null;
  }
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const real = new Date(Date.UTC(year, month - 1, day));
  if (real.getUTCFullYear() !== year || real.getUTCMonth() !== month - 1 || real.getUTCDate() !== day) {
    return null;
  }
  return `${day} ${MONTHS[month - 1]} ${year}`;
}

/** A day as YYYY-MM-DD, in the player's own time zone. */
export function certDay(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** The case number: "No. 0047", the same for the same name and day (FNV-1a, 0000 to 9999). */
export function caseNumber(name: string, date: string): string {
  let hash = 0x811c9dc5;
  for (const char of `${name.trim().toLowerCase()}|${date}`) {
    hash ^= char.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return `No. ${String(hash % 10000).padStart(4, '0')}`;
}

export const CERT_UNNAMED = 'an unnamed investigator';

/** The certificate, every piece in its place. */
export function certificateModel(input: CertInput): CertModel {
  const L = CERT_LAYOUT;
  const name = input.name?.trim() ?? '';
  const date = input.date ?? '';
  const number = caseNumber(name, date);
  const closed = formatCertDate(date);
  const texts: CertText[] = [];
  const add = (text: CertText) => texts.push(text);

  // The top line: what this is, and its number.
  add({ key: 'kicker', text: 'HISTOR · CASE FILE', x: L.left + 34, top: L.topLine, size: 17, face: 'voice', ink: 'muted', align: 'left', tracking: 3 });
  add({ key: 'number', text: number, x: L.right, top: L.topLine, size: 17, face: 'voice', ink: 'muted', align: 'right', tracking: 2 });
  // The case, its years.
  add({ key: 'title', text: input.title, x: L.centre, top: L.title.top, size: fitSize(input.title, L.title.size, L.title.max, 'legend'), face: 'legend', ink: 'ink', align: 'center' });
  add({ key: 'years', text: input.years, x: L.centre, top: L.years, size: 18, face: 'voice', ink: 'muted', align: 'center', tracking: 2 });
  // Who closed it.
  add({ key: 'certifies', text: 'This certifies that', x: L.centre, top: L.certifies, size: 20, face: 'record', italic: true, ink: 'ink', align: 'center' });
  if (name === '') {
    add({ key: 'unnamed', text: CERT_UNNAMED, x: L.centre, top: L.unnamed.top, size: L.unnamed.size, face: 'record', italic: true, ink: 'muted', align: 'center' });
  } else {
    add({ key: 'name', text: name, x: L.centre, top: L.name.top, size: fitSize(name, L.name.size, L.name.max, 'legend'), face: 'legend', ink: 'ink', align: 'center' });
  }
  add({ key: 'closed-the-case', text: 'closed the case.', x: L.centre, top: L.closedTheCase, size: 20, face: 'record', italic: true, ink: 'ink', align: 'center' });
  // The two fields.
  const F = L.fields;
  add({ key: 'verdict-label', text: 'VERDICT', x: F.verdictX, top: F.label, size: 15, face: 'voice', ink: 'muted', align: 'left', tracking: 3 });
  const verdict = input.verdict?.title ?? '—';
  add({ key: 'verdict', text: verdict, x: F.verdictX, top: F.value, size: fitSize(verdict, 30, F.verdictMax, 'record'), face: 'record', ink: 'ink', align: 'left' });
  if (input.verdict?.rejected === true) {
    add({ key: 'against', text: 'Against the historians', x: F.verdictX, top: F.against, size: 18, face: 'record', italic: true, ink: 'rust', align: 'left' });
  }
  add({ key: 'legends-label', text: 'LEGENDS TRUSTED', x: F.legendsX, top: F.label, size: 15, face: 'voice', ink: 'muted', align: 'left', tracking: 3 });
  add({ key: 'legends', text: String(input.legends), x: F.legendsX, top: L.legendsNumber.top, size: L.legendsNumber.size, face: 'record', ink: 'ink', align: 'left' });
  // The bottom line.
  if (closed !== null) {
    add({ key: 'closed-on', text: `Closed ${closed}`, x: L.left, top: L.bottomLine, size: 17, face: 'voice', ink: 'muted', align: 'left', tracking: 1 });
  }
  add({ key: 'site', text: 'histor.space', x: L.right, top: L.bottomLine, size: 17, face: 'voice', ink: 'muted', align: 'right', tracking: 1 });

  const rank = RANK_COPY[input.rank].name.toUpperCase();
  const S = L.stamp;
  return {
    mark: { x: L.left, top: L.topLine - 6, height: 28 },
    texts,
    rules: [
      { key: 'signature-line', x1: L.centre - L.signatureLine.half, x2: L.centre + L.signatureLine.half, y: L.signatureLine.y, width: 1, ink: 'ink' },
      { key: 'fields-rule', x1: F.verdictX, x2: 1050, y: L.rule, width: 1, ink: 'muted' },
    ],
    stamp: { text: rank, cx: S.cx, cy: S.cy, size: S.size, width: Math.round([...rank].length * S.size * 0.62 + 2 * S.size * 0.8), height: Math.round(S.size * 1.9), rotate: S.rotate },
    number,
  };
}

/** The words a screen reader gets for the certificate, in reading order. */
export function certificateLabel(model: CertModel): string {
  const read = (key: string) => model.texts.find(text => text.key === key)?.text;
  const who = read('name') ?? CERT_UNNAMED;
  const against = read('against');
  const closed = read('closed-on');
  return [
    `Histor case file, ${model.number}.`,
    `${read('title')}, ${read('years')}.`,
    `This certifies that ${who} closed the case.`,
    `Verdict: ${read('verdict')}${against === undefined ? '' : `, against the historians`}.`,
    `Legends trusted: ${read('legends')}.`,
    `Rank: ${model.stamp.text.charAt(0)}${model.stamp.text.slice(1).toLowerCase()}.`,
    ...(closed === undefined ? [] : [`${closed}.`]),
    'histor.space',
  ].join(' ');
}
