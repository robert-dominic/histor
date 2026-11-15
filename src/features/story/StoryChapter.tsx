// src/features/story/StoryChapter.tsx
// One chapter of the story: its image, with the kicker and the heading written over it, and its text.
// The chapter is two cells of the story's grid (Story.tsx). The image cell is sticky and stays put, below the
// case header; the text cell is the only part that scrolls. The article itself has no box (`contents`).
// Everything shown comes from props.

import CreditInfo from '@/components/CreditInfo';
import Quill from '@/components/Quill';
import PortalText from '@/features/portals/PortalText';
import type { DayNightStep, ImageGrade } from '@/lib/day-night';
import type { StorySection } from '@/types/case';

interface StoryChapterProps {
  section: StorySection;
  /** Position in the story, from 0. */
  index: number;
  /** Number of chapters in the story. */
  count: number;
  /** This chapter's step from day into night. */
  step: DayNightStep;
  /** This chapter's image grade. */
  grade: ImageGrade;
  /** True to load the image now. Images further down the story wait until the reader is one chapter away. */
  loadImage: boolean;
  /** True when nothing is animated: the text cell then carries its own background and text colour. */
  plain: boolean;
}

/**
 * Body text follows the sky (Story.tsx sets `data-tone` on the grid as the background changes), so it keeps
 * 4.5:1 against the background at every point of a transition, not only at its ends.
 */
const TONE_CLASSES =
  'text-ink group-data-[tone=black]/sky:text-black group-data-[tone=white]/sky:text-white group-data-[tone=night-ink]/sky:text-night-ink';

const LABEL_CLASSES =
  'bg-night/75 px-2 pt-1.5 pb-1 font-voice text-[0.625rem] leading-none tracking-[0.14em] text-night-ink uppercase lg:text-[0.6875rem]';

export default function StoryChapter({ section, index, count, step, grade, loadImage, plain }: StoryChapterProps) {
  const headingId = `story-${section.id}`;
  const { image } = section;
  const plainTone = step.dark ? 'text-night-ink' : 'text-ink';

  return (
    <article
      data-story="chapter"
      data-chapter={section.id}
      aria-labelledby={headingId}
      // Not animated: a plain block, image above text. Otherwise the two cells sit in the story's grid.
      className={plain ? 'col-span-full' : 'contents'}
    >
      {/* The image cell. It spans every row of the grid, so it stays stuck for the whole story;
          the chapters' image cells lie on top of each other and the current one is faded in. */}
      <div
        data-story="pane"
        className={
          plain
            ? 'relative h-[50svh] overflow-hidden'
            : 'sticky top-[var(--case-header)] z-20 col-start-1 h-[calc((100svh-var(--case-header))/2)] self-start overflow-hidden lg:h-[calc(100svh-var(--case-header))]'
        }
        style={plain ? undefined : { gridRow: `1 / span ${count}` }}
      >
        {image !== undefined && (
          <figure data-story="figure" className="absolute inset-0 bg-night">
            <img
              data-story="image"
              src={loadImage ? image.src : undefined}
              alt={image.alt}
              decoding="async"
              draggable={false}
              className="h-full w-full object-cover"
              style={{ filter: grade.filter }}
            />
            {/* The cold tint of the grade, and a dark gradient where the kicker and the heading lie over the image. */}
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-ghost-night mix-blend-color"
              style={{ opacity: grade.tint }}
            />
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-linear-to-t from-night/90 via-night/60 via-30% to-transparent to-65%"
            />
          </figure>
        )}

        {/* Always visible: what the reader must know at a glance. The full credit is behind the ⓘ. */}
        {image !== undefined && (image.isIllustration || image.caption !== undefined) && (
          <p className="absolute top-2.5 left-2.5 flex max-w-[calc(100%-4rem)] flex-wrap gap-1.5 lg:top-3.5 lg:left-3.5">
            {image.isIllustration && (
              <span data-story="illustration" className={LABEL_CLASSES}>
                Illustration
              </span>
            )}
            {image.caption !== undefined && (
              <span data-story="caption" className={LABEL_CLASSES}>
                {image.caption}
              </span>
            )}
          </p>
        )}
        {image !== undefined && (
          <CreditInfo
            credit={image.credit}
            attribute="data-story"
            placement="below"
            className="top-0 right-0 lg:top-1 lg:right-1"
          />
        )}

        <header className="absolute inset-x-0 bottom-0 px-5 pb-5 sm:px-8 sm:pb-7 lg:px-12 lg:pb-12">
          {section.kicker !== undefined && (
            <p
              data-story="kicker"
              className="font-voice text-[0.6875rem] leading-snug tracking-[0.18em] text-night-ink uppercase sm:text-xs"
            >
              {section.kicker}
            </p>
          )}
          <h2
            id={headingId}
            className="mt-2 font-legend text-[clamp(2.125rem,1.4rem+3.4vw,4.25rem)] leading-[1.02] text-balance text-night-ink"
          >
            {/* Screen readers get the whole heading at once; the copy the quill writes is for the eyes only. */}
            <span className="sr-only">{section.heading}</span>
            <span aria-hidden="true" data-story="heading">
              {section.heading}
            </span>
          </h2>
          <Quill attribute="data-story" sizeClassName="h-[clamp(2.5rem,4.5vw,3.75rem)]" />
        </header>
      </div>

      {/* The text cell. */}
      <div
        data-story="text"
        className={`relative z-10 px-5 sm:px-8 lg:px-16 xl:px-24 ${
          plain
            ? `py-10 ${plainTone}`
            : `col-start-1 pb-[50svh] lg:col-start-2 lg:flex lg:min-h-svh lg:flex-col lg:justify-center lg:py-[24svh] ${TONE_CLASSES} ${
                // On a phone the first chapter's text starts below the image, which covers the top half.
                index === 0 ? 'pt-[calc((100svh-var(--case-header))/2+2.5rem)]' : 'pt-10'
              }`
        }`}
        style={plain ? { backgroundColor: step.background } : { gridRow: index + 1 }}
      >
        <div className="mx-auto flex w-full max-w-[34rem] flex-col gap-[1.15em] font-record text-[clamp(1.0625rem,1rem+0.35vw,1.25rem)] leading-[1.62] lg:mx-0">
          {section.body.map((paragraph, paragraphIndex) => (
            <p key={paragraphIndex} data-story="line" className="text-pretty">
              <PortalText text={paragraph} />
            </p>
          ))}
          {section.hook !== undefined && (
            <p
              data-story="line"
              data-hook="true"
              className="mt-[1.1em] text-[1.4em] leading-[1.28] text-balance italic"
            >
              <PortalText text={section.hook} />
            </p>
          )}
        </div>
      </div>
    </article>
  );
}
