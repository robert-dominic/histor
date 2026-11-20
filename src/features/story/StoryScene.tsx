// src/features/story/StoryScene.tsx
// One chapter as a full-screen cinematic scene: the image fills the screen, the quill writes the heading over it,
// then the text arrives one beat (sentence) at a time in the lower third, and the hook takes the whole screen.
// The scenes lie on top of each other in one pinned stage; Story.tsx scrubs a timeline that plays them in turn.
//
// Screen readers and search engines get the full text: every paragraph is in the DOM, whole, in `data-story="text"`,
// which is visually hidden until a keyboard user tabs into one of its portals. The beats are for the eyes only.

import CreditInfo from '@/components/CreditInfo';
import Quill from '@/components/Quill';
import PortalText from '@/features/portals/PortalText';
import type { ImageGrade } from '@/lib/day-night';
import type { StorySection } from '@/types/case';

interface StorySceneProps {
  section: StorySection;
  index: number;
  grade: ImageGrade;
  /** The chapter's text split into beats, in order. */
  beats: string[];
  loadImage: boolean;
}

const LABEL_CLASSES =
  'bg-night/75 px-2 pt-1.5 pb-1 font-voice text-[0.625rem] leading-none tracking-[0.14em] text-night-ink uppercase lg:text-[0.6875rem]';

/** Long beats get a smaller size on phones, so the longest sentence still fits a 375×667 screen. */
function beatSizeClass(beat: string): string {
  if (beat.length > 150) {
    return 'text-[1.0625rem] sm:text-[1.5rem] lg:text-[1.875rem]';
  }
  if (beat.length > 90) {
    return 'text-[1.1875rem] sm:text-[1.625rem] lg:text-[2.125rem]';
  }
  return 'text-[1.375rem] sm:text-[1.875rem] lg:text-[2.5rem]';
}

export default function StoryScene({ section, index, grade, beats, loadImage }: StorySceneProps) {
  const headingId = `story-${section.id}`;
  const { image, rollCall } = section;

  return (
    <article
      data-story="chapter"
      data-chapter={section.id}
      data-index={index}
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
            alt={image.alt}
            decoding="async"
            draggable={false}
            className="h-full w-full origin-center object-cover"
            style={{ filter: grade.filter }}
          />
          <div aria-hidden="true" className="absolute inset-0 bg-ghost-night mix-blend-color" style={{ opacity: grade.tint }} />
        </figure>
      )}

      {/* Readability: dark over the bottom 45%, where the beats are. */}
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

      {/* The opening: the kicker, then the heading, written large and centred by the quill. */}
      <header
        data-story="title"
        className="absolute inset-x-0 top-[38%] px-5 text-center -translate-y-1/2 sm:px-10"
      >
        {/* Width in the screen's units, not `ch`: this wrapper's font is the body size, not the heading's. */}
        <div className="relative mx-auto w-fit max-w-[min(92vw,60rem)]">
          {section.kicker !== undefined && (
            <p
              data-story="kicker"
              className="font-voice text-[0.75rem] leading-snug tracking-[0.2em] text-night-ink uppercase sm:text-sm"
              style={{ opacity: 0 }}
            >
              {section.kicker}
            </p>
          )}
          <h2
            id={headingId}
            className="mt-3 font-legend text-[clamp(2.625rem,1.6rem+5vw,6rem)] leading-[1] text-balance text-night-ink [text-shadow:0_2px_24px_rgb(0_0_0/0.55)]"
          >
            {/* Screen readers get the whole heading at once; the copy the quill writes is for the eyes only. */}
            <span className="sr-only">{section.heading}</span>
            <span aria-hidden="true" data-story="heading">
              {section.heading}
            </span>
          </h2>
          <Quill attribute="data-story" sizeClassName="h-[clamp(2.75rem,5vw,4.5rem)]" />
        </div>
      </header>

      {/* The roll call: names appear one by one, and go out like candles at the hook. */}
      {rollCall !== undefined && rollCall.length > 0 && (
        <ul
          data-story="roll-call"
          aria-label="The ten aboard"
          className="absolute top-[calc(var(--case-header)+1rem)] left-1/2 flex w-[min(88vw,24rem)] -translate-x-1/2 flex-col gap-[0.35rem] text-center sm:top-[calc(var(--case-header)+2.5rem)] sm:gap-2 lg:left-[8%] lg:w-[22rem] lg:translate-x-0 lg:text-left"
        >
          {rollCall.map(entry => (
            <li key={entry.name} data-story="name" className="leading-tight text-night-ink" style={{ opacity: 0 }}>
              <span className="font-record text-[1rem] sm:text-[1.25rem] lg:text-[1.375rem]">{entry.name}</span>
              <span className="font-voice text-[0.6875rem] tracking-[0.08em] text-ghost-night sm:text-xs">
                {' '}
                · {entry.role}
              </span>
            </li>
          ))}
        </ul>
      )}

      {/* The beats, for the eyes only. Their portals stay tappable but out of the Tab order: the full text below
          has the same portals for keyboard and screen-reader users. */}
      <div aria-hidden="true" data-story="beats" className="absolute inset-x-0 top-[50%] bottom-[13%]">
        {beats.map((beat, beatIndex) => (
          <p
            key={beatIndex}
            data-story="beat"
            className={`absolute inset-x-0 bottom-0 mx-auto max-w-[min(32ch,88vw)] px-1 text-center font-record leading-[1.35] text-pretty text-night-ink sm:max-w-[30ch] ${beatSizeClass(beat)}`}
            style={{ opacity: 0 }}
          >
            <PortalText text={beat} tabbable={false} />
          </p>
        ))}
      </div>

      {section.hook !== undefined && (
        <p
          aria-hidden="true"
          data-story="hook-moment"
          className="absolute inset-x-0 top-1/2 mx-auto max-w-[min(20ch,88vw)] -translate-y-1/2 text-center font-record text-[clamp(1.75rem,1.2rem+3vw,3.75rem)] leading-[1.2] text-balance text-night-ink italic"
          style={{ opacity: 0 }}
        >
          <PortalText text={section.hook} tabbable={false} />
        </p>
      )}

      {/* The full text. Hidden while the beats tell it; shown as a readable panel when it holds the focus. */}
      <div
        data-story="text"
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
