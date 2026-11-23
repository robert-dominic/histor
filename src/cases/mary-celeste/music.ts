// src/cases/mary-celeste/music.ts
// Written by `npm run music:import -- mary-celeste` (scripts/music-import.mjs) from the tracks in
// histor-media/music/story and histor-media/music/desk. Running it again rewrites this file, keeping every credit
// already filled in.
import type { CaseTheme } from '@/types/case';

export const playlists: NonNullable<CaseTheme['playlists']> = {
  story: [
    { src: '/audio/music/mary-celeste/story/deep-sea.mp3', title: 'Deep Sea', credit: 'Universfield (Pixabay)' },
    { src: '/audio/music/mary-celeste/story/detective.mp3', title: 'Detective', credit: 'Viacheslav Starostin (Pixabay)' },
    { src: '/audio/music/mary-celeste/story/sub-suspense.mp3', title: 'Sub Suspense', credit: 'Sub_Clair (Pixabay)' },
    { src: '/audio/music/mary-celeste/story/suspense.mp3', title: 'Suspense', credit: 'Leberch (Nikita Kondrashev) (Pixabay)' },
  ],
  desk: [
    { src: '/audio/music/mary-celeste/desk/dark-noir.mp3', title: 'Dark Noir', credit: 'KostantinPazuzuStudio (Pixabay)' },
    { src: '/audio/music/mary-celeste/desk/investigation.mp3', title: 'Investigation', credit: 'Leberch (Nikita Kondrashev) (Pixabay)' },
    { src: '/audio/music/mary-celeste/desk/silent-night.mp3', title: 'Silent Night', credit: 'Low_Atoms (Pixabay)' },
    { src: '/audio/music/mary-celeste/desk/tense.mp3', title: 'Tense', credit: 'Leberch (Nikita Kondrashev) (Pixabay)' },
  ],
};