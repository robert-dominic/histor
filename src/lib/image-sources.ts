// src/lib/image-sources.ts
// Sized versions of a case image, for `srcset`. A case's image `src` is the file `s-voyage.webp`; its sized
// versions sit next to it, named by width: `s-voyage-828.webp`, `s-voyage-1920.webp`. This reads them from the
// case folders, so no case data names them and no feature names a case.
// The camera moves in the story only run smoothly on images close to the size they are shown at.

const FILES = import.meta.glob<string>('/src/cases/*/assets/images/*.webp', {
  eager: true,
  query: '?url',
  import: 'default',
});

const PATH_OF_URL = new Map(Object.entries(FILES).map(([path, url]) => [url, path]));

export interface ImageSources {
  /** `url 828w, url 1920w`, smallest first. Undefined when the image has no sized versions. */
  srcSet: string | undefined;
  /** How wide the browser should assume the image is shown: the story's images fill the screen. */
  sizes: string;
}

/** The sized versions of the image at `src` (the URL the case data holds). */
export function imageSources(src: string): ImageSources {
  const sizes = '100vw';
  const path = PATH_OF_URL.get(src);
  if (path === undefined) {
    return { srcSet: undefined, sizes };
  }
  const stem = path.replace(/\.webp$/, '');
  const candidates = Object.entries(FILES)
    .map(([other, url]) => {
      const match = other.startsWith(`${stem}-`) ? /^-(\d+)\.webp$/.exec(other.slice(stem.length)) : null;
      return match === null ? null : { width: Number(match[1]), url };
    })
    .filter((candidate): candidate is { width: number; url: string } => candidate !== null)
    .sort((a, b) => a.width - b.width);
  return {
    srcSet: candidates.length === 0 ? undefined : candidates.map(({ url, width }) => `${url} ${width}w`).join(', '),
    sizes,
  };
}
