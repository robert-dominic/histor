// src/lib/credits.ts
// What the /credits page lists (the fix list): each case's credits, built from its own data (the legend's video, the
// chapters' images, the portraits and maps, its sound and, while it plays, its music), and the app's own credits (the
// fonts, the sound and music sources, the libraries). Pure.
import { exhibits } from '@/cases';
import { LANDING_PLAYLIST } from '@/landing/music';
import { storyImageCredit } from '@/lib/image-credit';
import { MUSIC_ENABLED } from '@/lib/sound/levels';
import { SOUND_CREDIT } from '@/lib/sound-credit';
import type { Case } from '@/types/case';

export interface CreditLine {
  /** What is credited, e.g. a chapter's heading or "The legend intro (video)". */
  what: string;
  credit: string;
}

export interface CaseCreditGroup {
  caseId: string;
  title: string;
  images: CreditLine[];
  sound: CreditLine[];
  music: CreditLine[];
}

/** A case's credits, from its data. Each image, track and credit once. */
export function caseCredits(caseData: Case): CaseCreditGroup {
  const images: CreditLine[] = [
    ...(caseData.theme.legendVideo === undefined ? [] : [{ what: 'The legend intro (video)', credit: caseData.theme.legendVideo.credit }]),
    ...caseData.story.flatMap(section => (section.image === undefined ? [] : [{ what: section.heading, credit: storyImageCredit(section.image) }])),
    ...caseData.references.flatMap(reference => (reference.image === undefined ? [] : [{ what: reference.label, credit: storyImageCredit(reference.image) }])),
  ];
  const tracks = MUSIC_ENABLED ? [...(caseData.theme.playlists?.story ?? []), ...(caseData.theme.playlists?.desk ?? [])] : [];
  const music = tracks
    .filter((track, index, all) => all.findIndex(other => other.src === track.src) === index)
    .map(track => ({ what: track.title, credit: track.credit }));
  return {
    caseId: caseData.id,
    title: caseData.title,
    images: images.filter((line, index, all) => all.findIndex(other => other.what === line.what && other.credit === line.credit) === index),
    sound: [{ what: 'Sound effects', credit: `${SOUND_CREDIT.source} (${new URL(SOUND_CREDIT.url).host}): free to use, no attribution required` }],
    music,
  };
}

/** The app's own credits: the faces, where the sound and the music come from, the libraries (licences from each package). */
export const APP_CREDITS: { heading: string; lines: CreditLine[] }[] = [
  {
    heading: 'Fonts',
    lines: [
      { what: 'Grenze Gotisch', credit: 'Omnibus-Type, via Google Fonts (SIL Open Font License)' },
      { what: 'Old Standard TT', credit: 'Alexey Kryukov, via Google Fonts (SIL Open Font License)' },
      { what: 'Special Elite', credit: 'Astigmatic, via Google Fonts (Apache License 2.0)' },
    ],
  },
  {
    heading: 'Sound and music',
    lines: [
      { what: 'Sound effects', credit: 'Mixkit (mixkit.co): no attribution required, credited as good practice' },
      { what: 'Music', credit: 'Pixabay (pixabay.com): the landing page plays the story playlist, quietly, once the music button is pressed' },
      ...LANDING_PLAYLIST.map(track => ({ what: `Landing music · ${track.title}`, credit: track.credit })),
    ],
  },
  {
    // The sealed cases' pictures in their frames on the landing page, until each case has its own.
    heading: 'The archive',
    lines: exhibits.flatMap(exhibit => (exhibit.status === 'sealed' && exhibit.frameImage !== undefined ? [{ what: exhibit.title, credit: exhibit.frameImage.credit }] : [])),
  },
  {
    heading: 'Libraries',
    lines: [
      { what: 'React', credit: 'MIT License' },
      { what: 'React Router', credit: 'MIT License' },
      { what: 'GSAP', credit: 'GreenSock Standard "no charge" License' },
      { what: 'Lenis', credit: 'MIT License' },
      { what: 'Tailwind CSS', credit: 'MIT License' },
      { what: 'Vite', credit: 'MIT License' },
      { what: '@vercel/og', credit: 'Mozilla Public License 2.0' },
    ],
  },
];
