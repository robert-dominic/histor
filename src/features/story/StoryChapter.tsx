// src/features/story/StoryChapter.tsx
// One chapter as a plain stacked section, for reduced motion (and browsers that cannot honour it): its still, graded
// image with the whole page already written on it (the same panel as the cinematic story), then the hook as plain
// text on the chapter's sky. No camera, no scrub, no pen; Story.tsx only fades the text in as it comes into view.
// Everything shown comes from props.

import CreditInfo from '@/components/CreditInfo';
import PortalText from '@/features/portals/PortalText';
import VoyageChart from '@/features/story/VoyageChart';
import type { DayNightStep, ImageGrade } from '@/lib/day-night';
import { imageSources } from '@/lib/image-sources';
import type { ChartRoute } from '@/lib/voyage-chart';
import type { StorySection } from '@/types/case';

interface StoryChapterProps {
  section: StorySection;
  index: number;
  step: DayNightStep;
  grade: ImageGrade;
  /** The voyage, drawn as far as this chapter when one of its points is in it. */
  route: ChartRoute;
}

const LABEL_CLASSES =
  'bg-night/75 px-2 pt-1.5 pb-1 font-voice text-[0.625rem] leading-none tracking-[0.14em] text-night-ink uppercase lg:text-[0.6875rem]';

export default function StoryChapter({ section, index, step, grade, route }: StoryChapterProps) {
  const headingId = `story-${section.id}`;
  const { image, rollCall } = section;
  const tone = step.dark ? 'text-night-ink' : 'text-ink';
  const hasChartPoint = route.points.some(point => point.chapterIndex === index && point.unreached !== true);

  return (
    <article data-story="chapter" data-chapter={section.id} data-index={index} aria-labelledby={headingId}>
      {/* The chapter's image, with its page already written on it: the same page as the cinematic story, still. */}
      <div data-story="pane" className="relative isolate min-h-svh overflow-hidden">
        {image !== undefined && (
          <figure data-story="figure" className="absolute inset-0 -z-10 bg-night">
            <img
              data-story="image"
              src={image.src}
              srcSet={imageSources(image.src).srcSet}
              sizes={imageSources(image.src).srcSet === undefined ? undefined : imageSources(image.src).sizes}
              alt={image.alt}
              loading={index === 0 ? 'eager' : 'lazy'}
              decoding="async"
              draggable={false}
              className="h-full w-full object-cover"
              style={{ filter: grade.filter }}
            />
            <div aria-hidden="true" className="absolute inset-0 bg-ghost-night mix-blend-color" style={{ opacity: grade.tint }} />
          </figure>
        )}
        {image !== undefined && (image.isIllustration || image.caption !== undefined) && (
          <p className="absolute top-[calc(var(--case-header)+0.625rem)] right-14 z-10 flex max-w-[calc(100%-5rem)] flex-wrap justify-end gap-1.5 lg:right-16">
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
            className="top-[var(--case-header)] right-0 z-10 lg:right-1"
          />
        )}
        <div
          data-story="page"
          className="relative flex min-h-svh flex-col justify-end bg-linear-to-t from-night/95 via-night/85 to-transparent px-5 pt-[38svh] pb-12 text-night-ink sm:px-10 lg:w-[42%] lg:justify-center lg:bg-linear-to-r lg:from-night/92 lg:via-night/80 lg:pt-[calc(var(--case-header)+3.5rem)] lg:pr-[7%] lg:pb-16 lg:pl-[clamp(1.5rem,4vw,4rem)]"
        >
          <div className="max-w-[34rem]">
            {section.kicker !== undefined && (
              <p data-story="kicker" className="font-voice text-[0.75rem] tracking-[0.2em] uppercase sm:text-[0.8125rem]">
                {section.kicker}
              </p>
            )}
            <h2 id={headingId} className="mt-2 font-legend text-[clamp(2.25rem,1.6rem+2.4vw,3.75rem)] leading-[1.02] text-balance">
              <span data-story="heading">{section.heading}</span>
            </h2>
            <div data-story="text" className="mt-5 flex flex-col gap-[0.85em] font-record text-[1.125rem] leading-[1.6] text-night-ink/90 lg:text-[1.1875rem]">
              {section.body.map((paragraph, paragraphIndex) => (
                <p key={paragraphIndex} data-story="line" className="text-pretty">
                  <PortalText text={paragraph} />
                </p>
              ))}
              {rollCall !== undefined && rollCall.length > 0 && (
                <ul data-story="roll-call" aria-label="The ten aboard" className="grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-2">
                  {rollCall.map(entry => (
                    <li key={entry.name} data-story="name" className="leading-tight">
                      {entry.name}
                      <span className="font-voice text-[0.75rem] tracking-[0.08em] text-ghost-night"> · {entry.role}</span>
                    </li>
                  ))}
                </ul>
              )}
              {hasChartPoint && <VoyageChart route={route} variant="still" upTo={index} />}
            </div>
          </div>
        </div>
      </div>

      {/* Then the hook, as plain text, on the chapter's sky. */}
      {section.hook !== undefined && (
        <div className={`grid min-h-[50svh] place-items-center px-6 py-16 text-center ${tone}`} style={{ backgroundColor: step.background }}>
          <p data-story="line" data-hook="true" className="max-w-[20ch] font-record text-[clamp(1.75rem,1.2rem+3vw,3.25rem)] leading-[1.2] text-balance italic">
            <PortalText text={section.hook} />
          </p>
        </div>
      )}
    </article>
  );
}
