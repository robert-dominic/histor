// src/cases/mary-celeste/media.ts
// Media for this case that the case types do not cover yet.

import type { CaseMedia } from '@/cases/media';

// Both files are picked up when they exist, so the app still builds and runs without them:
// no video file means no video behind the legend intro.
const videos = import.meta.glob<string>('./assets/video/legend-night.mp4', {
  eager: true,
  query: '?url',
  import: 'default',
});
const posters = import.meta.glob<string>('./assets/video/legend-night-poster.jpg', {
  eager: true,
  query: '?url',
  import: 'default',
});

const legendVideoSrc: string | undefined = Object.values(videos)[0];

const media: CaseMedia = {
  legendVideo:
    legendVideoSrc === undefined ? undefined : { src: legendVideoSrc, poster: Object.values(posters)[0] },
};

export default media;
