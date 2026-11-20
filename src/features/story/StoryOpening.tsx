// src/features/story/StoryOpening.tsx
// The opening of the story: a full screen of the first chapter's image under a slow camera push. The quill writes
// the case title, the years are typed under it, the UNSOLVED stamp lands, then the teaser and a quiet scroll cue.
// When the reader scrolls, the title docks into the case header (dock-title.ts).
// Under reduced motion: no camera, no quill; everything fades in, and the title docks without flying.
// Everything shown comes from props. Nothing about any one case is written in this file.
import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { SplitText } from 'gsap/SplitText';
import { useGSAP } from '@gsap/react';
import CreditInfo from '@/components/CreditInfo';
import Quill from '@/components/Quill';
import { dockTitle, watchForDock } from '@/features/story/dock-title';
import type { ImageGrade } from '@/lib/day-night';
import { imageSources } from '@/lib/image-sources';
import { MOTION, MOTION_QUERIES, STEP, stampHit, tween } from '@/lib/motion';
import { createQuillWriter, splitForQuill } from '@/lib/quill-writing';
import { useReducedMotion } from '@/lib/use-reduced-motion';
import type { ImageAsset } from '@/types/case';

gsap.registerPlugin(useGSAP, SplitText);

/** What the opening shows. The page builds it from the case data. */
export interface OpeningCard {
  title: string;
  /** e.g. "1872 – 1873". */
  years: string;
  /** Shows the UNSOLVED stamp. */
  unsolved: boolean;
  /** One or two lines under the title. */
  teaser: string;
}

/** Seconds. */
const TIMING = {
  start: 0.5,
  pauseBeforeYears: 0.25,
  /** Letters of the years typed per second. */
  typeRate: 14,
  pauseBeforeStamp: 0.45,
  pauseBeforeTeaser: 0.35,
  pauseBeforeCue: 0.9,
  /** The camera's slow push in. */
  push: STEP.scene * 8,
  pushTo: 1.06,
} as const;

/** Reduced motion: everything fades in, one after another. Seconds. */
const REDUCED = { start: 0.2, gap: 0.35 } as const;

const LABEL_CLASSES =
  'bg-night/75 px-2 pt-1.5 pb-1 font-voice text-[0.625rem] leading-none tracking-[0.14em] text-night-ink uppercase lg:text-[0.6875rem]';

interface StoryOpeningProps {
  card: OpeningCard;
  /** The first chapter's image: the scene's picture. */
  image?: ImageAsset;
  /** The first chapter's grade, so the opening and chapter 1 match. */
  grade: ImageGrade;
}

export default function StoryOpening({ card, image, grade }: StoryOpeningProps) {
  const rootRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLSpanElement>(null);
  const dockedRef = useRef(false);
  const reducedMotion = useReducedMotion();
  const sources = image === undefined ? null : imageSources(image.src);

  // The title docks into the case header once, when the reader has scrolled a little way past the opening.
  useEffect(() => {
    const root = rootRef.current;
    const title = titleRef.current;
    if (root === null || title === null || dockedRef.current) {
      return;
    }
    return watchForDock(root, () => {
      dockedRef.current = true;
      dockTitle(title, { reduced: reducedMotion });
    });
  }, [reducedMotion]);

  useGSAP(
    () => {
      // Without matchMedia there is no way to honour a reduced-motion request, so nothing is animated.
      if (typeof window.matchMedia !== 'function') {
        return;
      }
      const mm = gsap.matchMedia();
      mm.add(MOTION_QUERIES, context => {
        const reduced = context.conditions?.reduced === true;
        const select = (name: string) => gsap.utils.toArray<HTMLElement>(`[data-opening="${name}"]`);
        const title = select('title');
        const years = select('years');
        const stamp = select('stamp');
        const teaser = select('teaser');
        const cue = select('cue');
        const picture = select('image');
        const timeline = gsap.timeline({ defaults: { ease: MOTION['ink.in'].ease } });
        const splits: SplitText[] = [];

        if (reduced) {
          [title, years, stamp, teaser, cue].forEach((targets, index) => {
            if (targets.length === 0) {
              return;
            }
            timeline.fromTo(
              targets,
              { opacity: 0 },
              { opacity: 1, ...tween('ink.in') },
              REDUCED.start + index * REDUCED.gap
            );
          });
          return () => undefined;
        }

        // The camera: a slow push in, on the image alone. will-change only while it moves.
        gsap.set(picture, { willChange: 'transform' });
        gsap.fromTo(
          picture,
          { scale: 1 },
          {
            scale: TIMING.pushTo,
            ease: MOTION.scene.ease,
            duration: TIMING.push,
            onComplete: () => {
              gsap.set(picture, { clearProps: 'willChange' });
            },
          }
        );

        // The title, written by the quill.
        const quill = createQuillWriter(select('quill')[0], select('quill-body')[0]);
        let at: number = TIMING.start;
        title.forEach(block => {
          const split = splitForQuill(block);
          splits.push(split);
          at += quill.write(timeline, split.chars as HTMLElement[], at);
        });

        // The years, typed: letters appear whole, one at a time.
        at += TIMING.pauseBeforeYears;
        years.forEach(block => {
          const split = SplitText.create(block, { type: 'chars', aria: 'none' });
          splits.push(split);
          const letters = split.chars as HTMLElement[];
          gsap.set(letters, { opacity: 0 });
          letters.forEach((letter, index) => timeline.set(letter, { opacity: 1 }, at + index / TIMING.typeRate));
          at += letters.length / TIMING.typeRate;
        });

        // The stamp lands, then the teaser, then a quiet scroll cue.
        at += TIMING.pauseBeforeStamp;
        if (stamp.length > 0) {
          timeline.add(stampHit(stamp), at);
          at += MOTION['stamp.hit'].duration + STEP.fast;
        }
        at += TIMING.pauseBeforeTeaser;
        timeline.fromTo(teaser, { opacity: 0, y: MOTION['ink.in'].y }, { opacity: 1, y: 0, ...tween('ink.in') }, at);
        at += MOTION['ink.in'].duration + TIMING.pauseBeforeCue;
        timeline.fromTo(cue, { opacity: 0 }, { opacity: 1, ...tween('ink.in') }, at);

        return () => {
          splits.forEach(split => split.revert());
        };
      });
    },
    { scope: rootRef, dependencies: [card.title, card.years, card.teaser] }
  );

  return (
    <section
      ref={rootRef}
      data-story="opening"
      aria-label={card.title}
      className="relative isolate flex h-svh flex-col items-center justify-center overflow-hidden bg-night px-5 text-center"
    >
      {image !== undefined && (
        <figure data-opening="figure" className="absolute inset-0 -z-10 overflow-hidden bg-night">
          <img
            data-opening="image"
            src={image.src}
            srcSet={sources?.srcSet}
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
      {/* Readability: dark over the bottom, where the teaser is, and a little over the top, under the labels. */}
      <div aria-hidden="true" className="absolute inset-x-0 bottom-0 -z-10 h-[55%] bg-linear-to-t from-night/95 via-night/75 to-transparent" />
      <div aria-hidden="true" className="absolute inset-x-0 top-0 -z-10 h-[20%] bg-linear-to-b from-night/60 to-transparent" />

      {image !== undefined && (image.isIllustration || image.caption !== undefined) && (
        <p className="absolute top-[calc(var(--case-header)+0.625rem)] left-2.5 z-10 flex max-w-[calc(100%-4rem)] flex-wrap gap-1.5 lg:left-3.5">
          {image.isIllustration && (
            <span data-opening="illustration" className={LABEL_CLASSES}>
              Illustration
            </span>
          )}
          {image.caption !== undefined && (
            <span data-opening="caption" className={LABEL_CLASSES}>
              {image.caption}
            </span>
          )}
        </p>
      )}
      {image !== undefined && (
        <CreditInfo
          credit={image.credit}
          attribute="data-opening"
          placement="below"
          className="top-[var(--case-header)] right-0 lg:right-1"
        />
      )}

      {/* The title, years and stamp are decoration: the case header is the page's heading. */}
      <div aria-hidden="true" className="relative flex w-full max-w-4xl flex-col items-center gap-3 sm:gap-4">
        <div className="relative font-legend text-[clamp(2.75rem,1.6rem+5.6vw,6.5rem)] leading-none whitespace-nowrap text-night-ink">
          <span ref={titleRef} data-opening="title" className="inline-block origin-top-left">
            {card.title}
          </span>
          {/* The quill. Its point is moved to the letter being written. */}
          <Quill attribute="data-opening" />
        </div>
        <p
          data-opening="years"
          className="font-voice text-[clamp(0.875rem,0.8rem+0.4vw,1.125rem)] tracking-[0.22em] text-ghost-night tabular-nums"
        >
          {card.years}
        </p>
        {card.unsolved && (
          <p
            data-opening="stamp"
            className="mt-1 -rotate-3 rounded-[0.14em] border-[0.14em] border-rust-night px-[0.6em] pt-[0.45em] pb-[0.3em] font-voice text-[clamp(0.75rem,0.7rem+0.3vw,0.9375rem)] leading-none tracking-[0.2em] text-rust-night uppercase"
          >
            Unsolved
          </p>
        )}
      </div>

      <p
        data-opening="teaser"
        className="relative mt-8 max-w-[34rem] font-record text-[clamp(1.0625rem,0.95rem+0.5vw,1.375rem)] leading-snug text-pretty text-night-ink"
      >
        {card.teaser}
      </p>

      {/* A quiet scroll cue. */}
      <div
        data-opening="cue"
        aria-hidden="true"
        className="absolute bottom-[max(1.25rem,env(safe-area-inset-bottom))] flex flex-col items-center gap-2 font-voice text-[0.75rem] tracking-[0.2em] text-ghost-night uppercase"
      >
        <span>{reducedMotion ? 'Scroll to read' : 'Scroll'}</span>
        <svg
          viewBox="0 0 16 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-5 w-4 animate-cue motion-reduce:animate-none"
        >
          <path d="M8 1v17M2 12l6 6 6-6" />
        </svg>
      </div>
    </section>
  );
}
