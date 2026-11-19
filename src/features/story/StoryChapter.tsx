// src/features/story/StoryChapter.tsx
// One chapter as a plain stacked section, for reduced motion (and browsers that cannot honour it): a still,
// graded image with the kicker and heading over it, then the text in full on the chapter's sky. No camera, no
// scrub; Story.tsx only fades the text in as it comes into view.
// Everything shown comes from props.

import CreditInfo from '@/components/CreditInfo';
import PortalText from '@/features/portals/PortalText';
import VoyageChart from '@/features/story/VoyageChart';
import type { DayNightStep, ImageGrade } from '@/lib/day-night';
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
  const roleTone = step.dark ? 'text-ghost-night' : 'text-muted';
  const hasChartPoint = route.points.some(point => point.chapterIndex === index && point.unreached !== true);

  return (
    <article data-story="chapter" data-chapter={section.id} data-index={index} aria-labelledby={headingId}>
      <div data-story="pane" className="relative h-[70svh] overflow-hidden">
        {image !== undefined && (
          <figure data-story="figure" className="absolute inset-0 bg-night">
            <img
              data-story="image"
              src={image.src}
              alt={image.alt}
              loading={index === 0 ? 'eager' : 'lazy'}
              decoding="async"
              draggable={false}
              className="h-full w-full object-cover"
              style={{ filter: grade.filter }}
            />
            <div aria-hidden="true" className="absolute inset-0 bg-ghost-night mix-blend-color" style={{ opacity: grade.tint }} />
            <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-[45%] bg-linear-to-t from-night/95 via-night/70 to-transparent" />
          </figure>
        )}
        {image !== undefined && (image.isIllustration || image.caption !== undefined) && (
          <p className="absolute top-[calc(var(--case-header)+0.625rem)] left-2.5 flex max-w-[calc(100%-4rem)] flex-wrap gap-1.5 lg:left-3.5">
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
            className="top-[var(--case-header)] right-0 lg:right-1"
          />
        )}
        <header className="absolute inset-x-0 bottom-0 px-5 pb-6 text-center sm:px-10 sm:pb-10">
          {section.kicker !== undefined && (
            <p data-story="kicker" className="font-voice text-[0.75rem] tracking-[0.2em] text-night-ink uppercase sm:text-sm">
              {section.kicker}
            </p>
          )}
          <h2 id={headingId} className="mt-2 font-legend text-[clamp(2.375rem,1.5rem+4vw,5rem)] leading-none text-balance text-night-ink">
            <span data-story="heading">{section.heading}</span>
          </h2>
        </header>
      </div>

      <div
        data-story="text"
        className={`px-5 py-12 sm:px-10 ${tone}`}
        style={{ backgroundColor: step.background }}
      >
        <div className="mx-auto flex max-w-[34rem] flex-col gap-[1.1em] font-record text-[clamp(1.125rem,1rem+0.45vw,1.375rem)] leading-[1.6]">
          {section.body.map((paragraph, paragraphIndex) => (
            <p key={paragraphIndex} data-story="line" className="text-pretty">
              <PortalText text={paragraph} />
            </p>
          ))}
          {rollCall !== undefined && rollCall.length > 0 && (
            <ul data-story="roll-call" aria-label="The ten aboard" className="flex flex-col gap-1.5">
              {rollCall.map(entry => (
                <li key={entry.name} data-story="name" className="leading-tight">
                  {entry.name}
                  <span className={`font-voice text-[0.75rem] tracking-[0.08em] ${roleTone}`}> · {entry.role}</span>
                </li>
              ))}
            </ul>
          )}
          {section.hook !== undefined && (
            <p data-story="line" data-hook="true" className="mt-[0.6em] text-[1.4em] leading-[1.28] text-balance italic">
              <PortalText text={section.hook} />
            </p>
          )}
          {hasChartPoint && <VoyageChart route={route} variant="still" upTo={index} />}
        </div>
      </div>
    </article>
  );
}
