// src/lib/day-night.ts
// Day into night (design.md): the story's background steps from `ash` to `night`, one step per chapter,
// and each chapter's image is graded a little darker and colder than the one before.

/**
 * Body text needs 4.5:1 against its background. Between `ash` and `night` there is a band of greys where
 * neither `ink` nor `night-ink` reaches it. These are the edges of that band, as the share of `night`
 * in an sRGB mix. A step that would land inside the band moves to the nearer edge.
 * src/lib/__tests__/day-night.test.ts checks both edges against the real colour tokens.
 */
export const INK_UNTIL = 0.36;
export const NIGHT_INK_FROM = 0.56;

/**
 * Inside that band, body text is pure black on the lighter side and pure white on the darker side: the only
 * two colours that still reach 4.5:1 there. This is where it switches from one to the other. The background
 * only passes through the band while the reader scrolls from one chapter to the next.
 */
export const TONE_FLIP = 0.46;

/** The colour of body text: the `ink` and `night-ink` tokens, or black and white while crossing the band. */
export type TextTone = 'ink' | 'black' | 'white' | 'night-ink';

/** The body text colour that reaches 4.5:1 on a background with this share of `night` (0 to 1). */
export function textTone(mix: number): TextTone {
  if (mix <= INK_UNTIL) {
    return 'ink';
  }
  if (mix < TONE_FLIP) {
    return 'black';
  }
  if (mix < NIGHT_INK_FROM) {
    return 'white';
  }
  return 'night-ink';
}

export interface DayNightStep {
  /** CSS colour for the background of this step. */
  background: string;
  /** Share of `night` in the background, 0 to 1. */
  mix: number;
  /** True when body text must be `night-ink` instead of `ink`. */
  dark: boolean;
}

/** How far into the night a chapter is: 0 for the first, 1 for the last. */
export function nightProgress(index: number, count: number): number {
  return count <= 1 ? 0 : Math.min(1, Math.max(0, index / (count - 1)));
}

/** The CSS colour of a sky with this share of `night` (0 to 1), rounded to a tenth of a percent. */
export function skyColour(mix: number): string {
  const percent = Math.round(Math.min(1, Math.max(0, mix)) * 1000) / 10;
  return `color-mix(in srgb, var(--color-ash), var(--color-night) ${percent}%)`;
}

/** The background step for chapter `index` of `count`: even steps from `ash` to `night`. */
export function dayNightStep(index: number, count: number): DayNightStep {
  let mix = nightProgress(index, count);
  if (mix > INK_UNTIL && mix < NIGHT_INK_FROM) {
    mix = mix - INK_UNTIL <= NIGHT_INK_FROM - mix ? INK_UNTIL : NIGHT_INK_FROM;
  }
  return {
    background: skyColour(mix),
    mix,
    dark: mix >= NIGHT_INK_FROM,
  };
}

export interface ImageGrade {
  /** CSS filter for the image. */
  filter: string;
  /** Opacity of the cold tint laid over the image, 0 to 1. */
  tint: number;
}

/**
 * The grade for chapter `index` of `count`: desaturated and slightly sepia throughout, and darker and colder
 * with every chapter. It is what makes paintings, an engraving and a video still look like one set.
 */
export function imageGrade(index: number, count: number): ImageGrade {
  const t = nightProgress(index, count);
  const round = (value: number) => Math.round(value * 100) / 100;
  return {
    filter: `saturate(${round(0.72 - 0.27 * t)}) sepia(${round(0.2 - 0.12 * t)}) contrast(${round(1 + 0.06 * t)}) brightness(${round(1 - 0.45 * t)})`,
    tint: round(0.08 + 0.3 * t),
  };
}
