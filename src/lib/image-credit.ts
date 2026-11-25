// src/lib/image-credit.ts
// A story image's credit, behind its ⓘ. Story images carry no visible "Illustration" tag (quick-fixes brief, item 5),
// so the credit says it: for an image with `isIllustration: true` it begins "AI illustration.", unless the credit
// already says it is one (the s-aboard credit does, in its own words).
import type { ImageAsset } from '@/types/case';

export const ILLUSTRATION_PREFIX = 'AI illustration.';

/** The credit to show for `image`: its own, saying "AI illustration" when it is an illustration. */
export function storyImageCredit(image: Pick<ImageAsset, 'credit' | 'isIllustration'>): string {
  if (!image.isIllustration || /\bAI illustration\b/i.test(image.credit)) {
    return image.credit;
  }
  return `${ILLUSTRATION_PREFIX} ${image.credit}`.trim();
}
