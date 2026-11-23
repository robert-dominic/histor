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
import { useHeadingFit } from '@/features/story/use-heading-fit';
import { storyImageCredit } from '@/lib/image-credit';
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
  // The heading never wraps: it shrinks to fit the panel, and the panel widens if it must (use-heading-fit.ts).
  const { headingRef, headingTextRef, boxRef, panelRef } = useHeadingFit();
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
        {image !== undefined && image.caption !== undefined && (
          <p className="absolute top-[calc(var(--case-header)+0.625rem)] right-14 z-10 flex max-w-[calc(100%-5rem)] flex-wrap justify-end gap-1.5 lg:right-16">
            <span data-story="caption" className={LABEL_CLASSES}>
              {image.caption}
            </span>
          </p>
        )}
        {image !== undefined && (
          <CreditInfo
            credit={storyImageCredit(image)}
            attribute="data-story"
            placement="below"
            className="top-[var(--case-header)] right-0 z-10 lg:right-1"
          />
        )}
        <div
          ref={panelRef}
          data-story="page"
          className="relative flex min-h-svh flex-col justify-end bg-linear-to-t from-night/95 via-night/85 to-transparent px-5 pt-[38svh] pb-12 text-night-ink sm:px-10 lg:w-[calc(42%+var(--heading-widen,0px))] lg:justify-center lg:bg-linear-to-r lg:from-night/92 lg:via-night/80 lg:pt-[calc(var(--case-header)+3.5rem)] lg:pr-[7%] lg:pb-16 lg:pl-[clamp(1.5rem,4vw,4rem)]"
        >
          <div ref={boxRef} className="max-w-[calc(34rem+var(--heading-widen,0px))]">
            {section.kicker !== undefined && (
              <p data-story="kicker" className="font-voice text-[0.75rem] tracking-[0.2em] uppercase sm:text-[0.8125rem]">
                {section.kicker}
              </p>
            )}
            <h2
              ref={headingRef}
              id={headingId}
              data-fit="heading"
              className="mt-2 font-legend text-[clamp(2.25rem,1.6rem+2.4vw,3.75rem)] leading-[1.02] whitespace-nowrap"
            >
              <span ref={headingTextRef} data-story="heading">
                {section.heading}
              </span>
            </h2>
            <div data-story="text" className="mt-5 flex flex-col gap-[0.85em] font-record text-[1.125rem] leading-[1.6] text-night-ink/90 lg:text-[1.1875rem]">
              {section.body.map((paragraph, paragraphIndex) => (
                <p key={paragraphIndex} data-story="line" className="text-pretty">
                  <PortalText text={paragraph} />
                </p>
              ))}
              {hasChartPoint && <VoyageChart route={route} variant="still" upTo={index} />}
            </div>
          </div>
        </div>
        {/* The roll call: its own quiet column on the other side of the image from the page (below it on phones). */}
        {rollCall !== undefined && rollCall.length > 0 && (
          <ul
            data-story="roll-call"
            aria-label="The ten aboard"
            className="grid grid-cols-2 gap-x-5 gap-y-1 px-5 pb-12 text-night-ink [text-shadow:0_1px_12px_rgb(0_0_0/0.85)] sm:px-10 lg:absolute lg:top-1/2 lg:right-[clamp(1.5rem,4vw,4rem)] lg:w-[min(19rem,24%)] lg:-translate-y-1/2 lg:grid-cols-1 lg:gap-y-2 lg:px-0 lg:pb-0"
          >
            {rollCall.map(entry => (
              <li key={entry.name} data-story="name" className="font-record leading-tight">
                {entry.name}
                <span className="font-voice text-[0.75rem] tracking-[0.08em] text-ghost-night"> · {entry.role}</span>
              </li>
            ))}
          </ul>
        )}
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
