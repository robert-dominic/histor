// src/features/story/StoryScene.tsx
// One chapter as a full-screen cinematic scene (story v3): the image fills the screen under a slow camera, and a
// dark, softly faded panel on one side holds the chapter's page: the kicker, the heading, the body and the roll call,
// all written by the pen (Story.tsx). Then the hook takes the centre of the screen.
// The scenes lie on top of each other in one pinned stage; Story.tsx scrubs a timeline that plays them in turn.
//
// Screen readers and search engines get the full text: every paragraph is in the DOM, whole, in `data-story="text"`,
// which is visually hidden until a keyboard user tabs into one of its portals. The page is for the eyes only.

import CreditInfo from '@/components/CreditInfo';
import Quill from '@/components/Quill';
import PortalText from '@/features/portals/PortalText';
import PenText from '@/features/story/PenText';
import { HookLetters } from '@/features/story/StoryWords';
import type { ImageGrade } from '@/lib/day-night';
import { imageSources } from '@/lib/image-sources';
import type { StorySection } from '@/types/case';

interface StorySceneProps {
  section: StorySection;
  index: number;
  grade: ImageGrade;
  loadImage: boolean;
}

const LABEL_CLASSES =
  'bg-night/75 px-2 pt-1.5 pb-1 font-voice text-[0.625rem] leading-none tracking-[0.14em] text-night-ink uppercase lg:text-[0.6875rem]';

export default function StoryScene({ section, index, grade, loadImage }: StorySceneProps) {
  const headingId = `story-${section.id}`;
  const { image, rollCall } = section;
  const sources = image === undefined ? null : imageSources(image.src);

  return (
    <article
      data-story="chapter"
      data-chapter={section.id}
      data-index={index}
      // Only the scene on screen takes clicks (effects.css); Story.tsx moves this as the story plays.
      data-active={String(index === 0)}
      aria-labelledby={headingId}
      className="absolute inset-0 overflow-hidden"
      // Later scenes start hidden; the timeline dissolves each in over the one before.
      style={index === 0 ? undefined : { opacity: 0 }}
    >
      {image !== undefined && (
        <figure data-story="figure" className="absolute inset-0 overflow-hidden bg-night">
          <img
            data-story="image"
            src={loadImage ? image.src : undefined}
            srcSet={loadImage ? sources?.srcSet : undefined}
            sizes={sources?.srcSet === undefined ? undefined : sources.sizes}
            alt={image.alt}
            decoding="async"
            draggable={false}
            className="h-full w-full origin-center object-cover"
            style={{ filter: grade.filter }}
          />
          <div aria-hidden="true" className="absolute inset-0 bg-ghost-night mix-blend-color" style={{ opacity: grade.tint }} />
        </figure>
      )}

      {/* Readability: dark over the bottom 45%, where the text column is. */}
      <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-[45%] bg-linear-to-t from-night/95 via-night/75 to-transparent" />
      {/* Dims the whole image: a little for the roll call, almost to black for the hook. */}
      <div aria-hidden="true" data-story="dim" className="absolute inset-0 bg-night" style={{ opacity: 0 }} />

      {image !== undefined && (image.isIllustration || image.caption !== undefined) && (
        <p className="absolute top-[calc(var(--case-header)+0.625rem)] left-2.5 z-10 flex max-w-[calc(100%-4rem)] flex-wrap gap-1.5 lg:left-3.5">
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

      {/* The page: a dark, softly faded panel on the left (along the bottom on phones) holding the chapter's text.
          The image stays visible on the rest of the screen. The kicker is typed small, the heading written large at
          the top, then the body in Old Standard TT at about 18 to 19px, and the roll call after it. The pen writes it
          all (Story.tsx); a click on the panel finishes the writing at once. Portals stay tappable, out of the Tab
          order: the full text below has them for the keyboard and screen readers. */}
      <div
        data-story="page"
        className="thin-scroll absolute inset-x-0 bottom-0 z-[3] max-h-[78svh] overflow-y-auto bg-linear-to-t from-night/95 via-night/85 to-transparent px-5 pt-16 pb-24 text-night-ink sm:px-10 lg:inset-y-0 lg:right-auto lg:flex lg:max-h-none lg:w-[42%] lg:flex-col lg:justify-center lg:bg-linear-to-r lg:from-night/92 lg:via-night/80 lg:pt-[calc(var(--case-header)+3.5rem)] lg:pr-[7%] lg:pb-20 lg:pl-[clamp(1.5rem,4vw,4rem)]"
      >
        <div data-story="page-inner" className="relative max-w-[34rem]">
          {section.kicker !== undefined && (
            <p data-story="kicker" className="font-voice text-[0.75rem] leading-snug tracking-[0.2em] uppercase sm:text-[0.8125rem]">
              {section.kicker}
            </p>
          )}
          <h2
            id={headingId}
            className="mt-2 font-legend text-[clamp(2.25rem,1.6rem+2.4vw,3.75rem)] leading-[1.02] text-balance [text-shadow:0_2px_24px_rgb(0_0_0/0.55)]"
          >
            {/* Screen readers get the whole heading at once; the copy the pen writes is for the eyes only. */}
            <span className="sr-only">{section.heading}</span>
            <span aria-hidden="true" data-story="heading">
              {section.heading}
            </span>
          </h2>
          <div aria-hidden="true" data-story="body" className="mt-5 flex flex-col gap-[0.85em] font-record text-[1.125rem] leading-[1.6] text-night-ink/90 lg:text-[1.1875rem]">
            {section.body.map((paragraph, paragraphIndex) => (
              <p key={paragraphIndex} data-story="paragraph" className="text-pretty">
                <PenText text={paragraph} emphasis={section.emphasis} />
              </p>
            ))}
          </div>
          {/* The roll call: a short list after the body. The names go out like candles, last to first, at the hook. */}
          {rollCall !== undefined && rollCall.length > 0 && (
            <ul data-story="roll-call" aria-label="The ten aboard" className="mt-5 grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-2">
              {rollCall.map(entry => (
                <li key={entry.name} data-story="name" className="leading-tight">
                  <span className="font-record text-[1rem]">
                    <PenText text={entry.name} />
                  </span>
                  <span className="font-voice text-[0.6875rem] tracking-[0.08em] text-ghost-night">
                    {' · '}
                    <PenText text={entry.role} />
                  </span>
                </li>
              ))}
            </ul>
          )}
          <Quill attribute="data-story" sizeClassName="h-[clamp(2.5rem,4vw,3.75rem)]" />
        </div>
      </div>
      {section.hook !== undefined && (
        <p
          aria-hidden="true"
          data-story="hook-moment"
          // Click-through until it appears (Story.tsx): an invisible hook must not cover the text column.
          className="pointer-events-none absolute inset-x-0 top-1/2 z-[4] mx-auto max-w-[min(20ch,88vw)] -translate-y-1/2 text-center font-record text-[clamp(1.75rem,1.2rem+3vw,3.75rem)] leading-[1.2] text-balance text-night-ink italic"
          style={{ opacity: 0 }}
        >
          <HookLetters text={section.hook} />
        </p>
      )}

      {/* The full text. Hidden while the page tells it; shown as a readable panel when it holds the focus. */}
      <div
        data-story="text"
        data-lenis-prevent
        className="sr-only focus-within:not-sr-only focus-within:fixed focus-within:inset-x-3 focus-within:bottom-3 focus-within:z-40 focus-within:max-h-[55svh] focus-within:overflow-y-auto focus-within:rounded-sm focus-within:bg-night/95 focus-within:p-5 focus-within:font-record focus-within:text-[1.0625rem] focus-within:leading-normal focus-within:text-night-ink sm:focus-within:inset-x-auto sm:focus-within:left-1/2 sm:focus-within:w-[34rem] sm:focus-within:-translate-x-1/2"
      >
        {section.body.map((paragraph, paragraphIndex) => (
          <p key={paragraphIndex} data-story="line" className="mb-3">
            <PortalText text={paragraph} />
          </p>
        ))}
        {section.hook !== undefined && (
          <p data-story="line" data-hook="true" className="italic">
            <PortalText text={section.hook} />
          </p>
        )}
      </div>
    </article>
  );
}
