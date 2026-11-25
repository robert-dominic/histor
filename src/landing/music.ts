// src/landing/music.ts
// The landing page's playlist (landing v3 brief): the story playlist of the Mary Celeste (its music.ts), the same
// tracks and credits. Quiet, and off until the header's music button is clicked (src/lib/landing-music.ts).
import { playlists } from '@/cases/mary-celeste/music';
import type { Track } from '@/types/case';

export const LANDING_PLAYLIST: Track[] = playlists.story ?? [];
