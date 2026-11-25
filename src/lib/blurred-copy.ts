// src/lib/blurred-copy.ts
// A soft, blurred copy of a loaded picture, as a small data URL (landing v2 brief, 1). The opening's detail starts
// out of focus; blurring a large layer live is not allowed (tech.md, rule 5), so the soft copy is made once, tiny
// (the browser smooths it as it scales up), and cross-fades away to the sharp picture: opacity only.

/** The copy's longest side, in px: small enough that scaling it up reads as a blur. */
export const BLURRED_COPY_SIZE = 40;

/** The copy of `image`, or null when there is no canvas (or the picture is not readable). */
export function blurredCopy(image: HTMLImageElement): string | null {
  try {
    if (image.naturalWidth === 0 || image.naturalHeight === 0) {
      return null;
    }
    const long = Math.max(image.naturalWidth, image.naturalHeight);
    const scale = BLURRED_COPY_SIZE / long;
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext('2d');
    if (context === null) {
      return null;
    }
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.7);
  } catch {
    return null;
  }
}

/** Resolves with the loaded image, or null if it fails or takes longer than `capMs`. */
export function loadImage(src: string, capMs: number): Promise<HTMLImageElement | null> {
  return new Promise(resolve => {
    const image = new Image();
    const timer = window.setTimeout(() => resolve(null), capMs);
    image.onload = () => {
      window.clearTimeout(timer);
      resolve(image);
    };
    image.onerror = () => {
      window.clearTimeout(timer);
      resolve(null);
    };
    image.src = src;
  });
}
