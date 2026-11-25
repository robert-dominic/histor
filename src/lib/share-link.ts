// src/lib/share-link.ts
// The share link (review-fixes brief, 11): https://histor.space/r/{caseId}?n={name}&r={rank}&l={legendsTrusted}
// &t={theoryId}&d={YYYY-MM-DD}: the theory and the day the case closed are for the certificate (quick fixes, 5).
// Social sites read `og:image` from the page they are given and run no JavaScript, so the link goes to a small
// function (api/r.ts) that answers with the preview tags and sends people on to the case at once.
// Every value is checked, here and on the server: the rank is one of the three, the legends 0 to 99, the name plain
// text (letters, numbers, spaces and a little punctuation), at most 32 characters, the theory a short kebab-case id
// (the image draws only a theory it knows), the day a real one. Nothing else gets through, so
// nothing can be injected into the page. Imported by the function too: no '@/' imports here.
import { RANK_COPY } from './ui-copy';

export const SHARE_ORIGIN = 'https://histor.space';
export const SHARE_NAME_MAX = 32;
export const SHARE_LEGENDS_MAX = 99;

export type SharedRank = keyof typeof RANK_COPY;
export const SHARE_RANKS = Object.keys(RANK_COPY) as SharedRank[];

export interface SharedResult {
  caseId: string;
  /** The player's signature, cleaned; empty when they did not sign. */
  name: string;
  rank: SharedRank;
  legends: number;
  /** The player chose a theory historians ruled out (links made before the theory was carried). */
  against?: boolean;
  /** The theory the player chose. */
  theory?: string;
  /** The day the case closed, YYYY-MM-DD. */
  date?: string;
}

/** A real day, YYYY-MM-DD. */
function isDay(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (match === null) {
    return false;
  }
  const day = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return day.toISOString().slice(0, 10) === value;
}

/** A case id as the registry writes them: short kebab-case. */
const CASE_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isShareCaseId(value: string): boolean {
  return value.length <= 64 && CASE_ID.test(value);
}

/**
 * A name as plain text: letters (any script), marks, numbers, spaces and . ' ’ - only; runs of space made one;
 * at most `SHARE_NAME_MAX` characters.
 */
export function cleanShareName(raw: string): string {
  const plain = raw
    .normalize('NFC')
    .replace(/[^\p{L}\p{M}\p{N} .'’-]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
  return [...plain].slice(0, SHARE_NAME_MAX).join('').trim();
}

/** The link a result is shared with. */
export function shareLink({ caseId, name, rank, legends, against = false, theory, date }: SharedResult): string {
  const params = new URLSearchParams();
  const signed = cleanShareName(name);
  if (signed !== '') {
    params.set('n', signed);
  }
  params.set('r', rank);
  params.set('l', String(Math.min(SHARE_LEGENDS_MAX, Math.max(0, Math.round(legends)))));
  if (against) {
    params.set('a', '1');
  }
  if (theory !== undefined && isShareCaseId(theory)) {
    params.set('t', theory);
  }
  if (date !== undefined && isDay(date)) {
    params.set('d', date);
  }
  return `${SHARE_ORIGIN}/r/${encodeURIComponent(caseId)}?${params.toString()}`;
}

/** A shared result read back from a link's case id and query, or null if anything is not as it must be. */
export function readShareLink(caseId: string, params: URLSearchParams): SharedResult | null {
  const rank = params.get('r') ?? '';
  const legendsText = params.get('l') ?? '';
  if (!isShareCaseId(caseId) || !(SHARE_RANKS as string[]).includes(rank) || !/^\d{1,2}$/.test(legendsText)) {
    return null;
  }
  const theory = params.get('t') ?? '';
  const date = params.get('d') ?? '';
  return {
    caseId,
    name: cleanShareName(params.get('n') ?? ''),
    rank: rank as SharedRank,
    legends: Number(legendsText),
    against: params.get('a') === '1',
    // A theory or a day that is not as it must be is simply left out.
    ...(isShareCaseId(theory) ? { theory } : {}),
    ...(isDay(date) ? { date } : {}),
  };
}

/** A case's title from its id, for a page that cannot load the case: "mary-celeste" reads "Mary Celeste". */
export function titleFromCaseId(caseId: string): string {
  return caseId
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/** The preview's words: its title and its description. */
export function shareCopy(result: SharedResult): { title: string; description: string } {
  const who = result.name === '' ? 'I' : result.name;
  const legends = result.legends === 0 ? 'no legends' : result.legends === 1 ? '1 legend' : `${result.legends} legends`;
  return {
    title: `${who} closed the ${titleFromCaseId(result.caseId)} case on Histor.`,
    description: `${RANK_COPY[result.rank].name}. Trusted ${legends}. Can you tell legend from history?`,
  };
}
