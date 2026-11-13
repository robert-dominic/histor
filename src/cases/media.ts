// src/cases/media.ts
// Optional media per case, kept beside the registry because the case types have no field for it yet.
// A case without an entry here simply has no video.

import maryCelesteMedia from '@/cases/mary-celeste/media';

/** A background video. Always treated as an illustration, never as a historical recording. */
export interface LegendVideo {
  /** The video file: muted, looping, no audio track. */
  src: string;
  /** A still frame, shown while the video loads and instead of it under reduced motion. */
  poster?: string;
}

export interface CaseMedia {
  /** Plays behind the legend intro. */
  legendVideo?: LegendVideo;
}

const mediaByCaseId: Record<string, CaseMedia> = {
  'mary-celeste': maryCelesteMedia,
};

/** The media for a case, or an empty object when the case has none. */
export function getCaseMedia(caseId: string): CaseMedia {
  return Object.hasOwn(mediaByCaseId, caseId) ? mediaByCaseId[caseId] : {};
}
