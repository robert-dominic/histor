// src/cases/index.ts
import type { Case, ImageAsset, RegistryEntry } from '@/types/case';
import maryCeleste from '@/cases/mary-celeste/case';
import { formatCaseYears } from '@/lib/case-years';
import { validateCase } from '@/lib/validate-case';
import ripperImage from '@/landing/images/ripper.webp';
import cooperImage from '@/landing/images/cooper.webp';
import princesImage from '@/landing/images/princes.webp';
import dancingImage from '@/landing/images/dancing.webp';
import earhartImage from '@/landing/images/earhart.webp';

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
  /** The picture in the frame: an open case's own chapter image, or a sealed case's period picture. */
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
  /** A sealed case's picture for its frame, until it has chapters of its own (src/landing/images, `npm run landing:images`). */
  image?: ImageAsset;
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
    image: { src: ripperImage, alt: 'A Punch cartoon of a hooded phantom marked CRIME, knife raised, drifting through a dark London slum.', credit: 'The Nemesis of Neglect, John Tenniel, Punch, 1888', isIllustration: true },
  },
  {
    id: 'db-cooper',
    title: 'D. B. Cooper',
    year: 1971,
    teaser: 'A quiet man hijacked a plane, took $200,000 and parachuted into a stormy night. He was never seen again.',
    frame: 'landscape',
    headline: "He jumped. The money didn't all land.",
    subline: 'A quiet man hijacked a plane, took $200,000 and parachuted into a stormy night. He was never seen again.',
    image: { src: cooperImage, alt: 'Rotted, torn twenty-dollar bills laid out in rows on white paper.', credit: 'The ransom bills found in 1980, FBI photograph', isIllustration: false },
  },
  {
    id: 'princes-in-the-tower',
    title: 'The Princes in the Tower',
    year: 1483,
    teaser: 'The young King Edward V and his brother were last seen in the Tower of London.',
    frame: 'square',
    headline: 'Two boys went in. History lost them.',
    subline: 'The young King Edward V and his brother were last seen in the Tower of London.',
    image: { src: princesImage, alt: 'A painting of two young boys in black sitting close together on a curtained bed, a small dog at their feet.', credit: 'The Children of Edward, Paul Delaroche, 1830', isIllustration: true },
  },
  {
    id: 'dancing-plague',
    title: 'The Dancing Plague',
    year: 1518,
    teaser: 'In July 1518, a woman began to dance in the street. Within weeks, dozens could not stop. The cure? More music.',
    frame: 'portrait',
    headline: 'Strasbourg danced. Some never stopped.',
    subline: 'In July 1518, a woman began to dance in the street. Within weeks, dozens could not stop. The cure? More music.',
    image: { src: dancingImage, alt: 'An old engraving of women dancing in a trance, each held up by two men, on a road past a bridge.', credit: 'The Dancing Mania, engraving by Hendrik Hondius after Pieter Bruegel, 1642', isIllustration: true },
  },
  {
    id: 'amelia-earhart',
    title: 'Amelia Earhart',
    year: 1937,
    teaser: 'Then silence, and a search that has never ended.',
    frame: 'landscape',
    headline: 'A last call over the Pacific.',
    subline: 'Then silence, and a search that has never ended.',
    image: { src: earhartImage, alt: 'A black-and-white photograph of Amelia Earhart standing in front of her twin-engine aeroplane.', credit: 'Amelia Earhart, NASA archive photograph', isIllustration: false },
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
  const image = open ? source.data?.story.find(section => section.id === source.frameChapter)?.image : source.image;
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
