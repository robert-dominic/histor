// src/cases/index.ts
import type { Case, ImageAsset, RegistryEntry } from '@/types/case';
import maryCeleste from '@/cases/mary-celeste/case';
import { formatCaseYears } from '@/lib/case-years';
import { validateCase } from '@/lib/validate-case';

/** The shape of a case's frame on the landing page (landing brief, 1): the frames are not all the same. */
export type FrameShape = 'landscape' | 'portrait' | 'square';

/**
 * One exhibit on the landing page (landing brief, 1): a case, its frame and its section's words.
 * `status` is computed: a case is `open` only if its case data exists and validates.
 */
export interface Exhibit {
  id: string;
  title: string;
  /** As the case's title card shows them, e.g. "1872 – 1873". */
  years: string;
  /** One line about the case. */
  teaser: string;
  status: 'open' | 'sealed';
  frame: FrameShape;
  /** The main painting: a wider frame with a thicker, heavier moulding (the first case). */
  featured: boolean;
  /** The section's editorial line, large. */
  headline: string;
  /** The smaller line under it. */
  subline: string;
  /** For an open case: one of its own chapter images, shown in the frame. */
  frameImage?: ImageAsset;
  /** For an open case: its data. */
  data?: Case;
}

/** What the registry is written from: an exhibit before its status is known. */
interface ExhibitSource {
  id: string;
  title: string;
  year: number;
  yearEnd?: number;
  teaser: string;
  frame: FrameShape;
  /** The main painting: wider, with a heavier moulding. */
  featured?: boolean;
  headline: string;
  subline: string;
  /** The case's data, once it exists. Without it, the case stays sealed. */
  data?: Case;
  /** Which chapter's image the frame shows (an open case). */
  frameChapter?: string;
}

/**
 * The exhibits, in order (landing brief, 1). A teaser is the case's own line where it has one; for the cases still
 * to come it is their subline.
 */
const SOURCES: ExhibitSource[] = [
  {
    id: 'mary-celeste',
    title: 'The Mary Celeste',
    year: 1872,
    yearEnd: 1873,
    teaser: maryCeleste.teaser,
    frame: 'landscape',
    featured: true,
    headline: 'Every legend began as something that happened.',
    subline: 'Histor is for anyone who has ever wondered which part of the story is true.',
    data: maryCeleste,
    frameChapter: 's-found',
  },
  {
    id: 'jack-the-ripper',
    title: 'Jack the Ripper',
    year: 1888,
    teaser: 'Whitechapel, 1888. The killer was never named.',
    frame: 'portrait',
    headline: 'Some names were never written down.',
    subline: 'Whitechapel, 1888. Five women killed. The killer was never named.',
  },
  {
    id: 'roanoke',
    title: 'The Lost Colony of Roanoke',
    year: 1587,
    yearEnd: 1590,
    teaser: 'An English colony vanished from the coast of America, leaving almost nothing behind.',
    frame: 'landscape',
    headline: 'A hundred people. One carved word.',
    subline: 'An English colony vanished from the coast of America, leaving almost nothing behind.',
  },
  {
    id: 'princes-in-the-tower',
    title: 'The Princes in the Tower',
    year: 1483,
    teaser: 'The young King Edward V and his brother were last seen in the Tower of London.',
    frame: 'square',
    headline: 'Two boys went in. History lost them.',
    subline: 'The young King Edward V and his brother were last seen in the Tower of London.',
  },
  {
    id: 'dyatlov-pass',
    title: 'The Dyatlov Pass',
    year: 1959,
    teaser: 'Nine hikers in the Ural Mountains. None came home.',
    frame: 'portrait',
    headline: 'The tent was cut from the inside.',
    subline: 'Nine hikers in the Ural Mountains. None came home.',
  },
  {
    id: 'amelia-earhart',
    title: 'Amelia Earhart',
    year: 1937,
    teaser: 'Then silence, and a search that has never ended.',
    frame: 'landscape',
    headline: 'A last call over the Pacific.',
    subline: 'Then silence, and a search that has never ended.',
  },
];

/** A case opens once its data exists and passes validateCase with no errors (the Ripper, as soon as it is added). */
export function caseOpens(data: Case | undefined): data is Case {
  return data !== undefined && validateCase(data).length === 0;
}

/** The cases that open: each checked once. */
const OPEN = new Set(SOURCES.filter(source => caseOpens(source.data)).map(source => source.id));

function opens(source: ExhibitSource): source is ExhibitSource & { data: Case } {
  return source.data !== undefined && OPEN.has(source.id);
}

/** Every exhibit, in order, each open only if its case data exists and validates. */
export const exhibits: Exhibit[] = SOURCES.map(source => {
  const open = opens(source);
  const image = open ? source.data?.story.find(section => section.id === source.frameChapter)?.image : undefined;
  return {
    id: source.id,
    title: source.title,
    years: formatCaseYears(source.year, source.yearEnd),
    teaser: source.teaser,
    status: open ? 'open' : 'sealed',
    frame: source.frame,
    featured: source.featured === true,
    headline: source.headline,
    subline: source.subline,
    ...(image === undefined ? {} : { frameImage: image }),
    ...(open ? { data: source.data } : {}),
  };
});

/**
 * Registry of all historical cases available in Histor.
 * Open cases include full case data (sealed: false).
 * Sealed cases are placeholders (sealed: true) without data.
 */
export const registry: RegistryEntry[] = SOURCES.map(source =>
  opens(source)
    ? { id: source.id, title: source.title, year: source.year, teaser: source.teaser, sealed: false, data: source.data }
    : { id: source.id, title: source.title, year: source.year, teaser: source.teaser, sealed: true }
);

/**
 * Look up a case in the registry by ID.
 *
 * Returns the matching RegistryEntry if found, or undefined if:
 * - The ID does not exist in the registry
 * - The ID is null, undefined, or an empty string
 *
 * @param id - The case ID to look up
 * @returns The RegistryEntry with matching ID, or undefined
 */
export function getCaseById(id: string | undefined | null): RegistryEntry | undefined {
  // Handle null, undefined, or empty string
  if (!id) {
    return undefined;
  }

  // Find and return the matching entry
  return registry.find((entry) => entry.id === id);
}

export default registry;
