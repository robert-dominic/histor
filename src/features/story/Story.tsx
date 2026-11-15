// src/features/story/Story.tsx
// The real story: the reader scrolls through the chapters, from daylight into night, and ends on the
// case's central question. Each chapter's image stays put while its text scrolls; the next chapter's image
// takes over when the reader scrolls on. The reader sets the pace: nothing advances by itself.
// Everything shown comes from props. Nothing about any one case is written in this file.

import { useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import PortalProvider from '@/features/portals/PortalProvider';
import CentralQuestion from '@/features/story/CentralQuestion';
import StoryChapter from '@/features/story/StoryChapter';
import { dayNightStep, imageGrade } from '@/lib/day-night';
import { EASE, MOTION_QUERIES } from '@/lib/motion';
import { createQuillWriter, splitForQuill, type QuillWriter } from '@/lib/quill-writing';
import { DESKTOP_QUERY } from '@/lib/use-media-query';
import type { Reference, Source, StorySection } from '@/types/case';

// ScrollTrigger is registered inside the component: it needs window.matchMedia as soon as it is registered.
gsap.registerPlugin(useGSAP);

/**
 * Where on the screen things happen, as a distance from the top.
 * On a phone the text only shows in the bottom half, below the image. On a desktop it has the full height.
 */
const LINES = {
  phone: {
    /** A chapter takes over when the top of its text reaches this line. */
    takeover: '82%',
    /** A paragraph drops in when its top reaches this line. */
    reveal: '88%',
    /** A paragraph is out of sight once its bottom is above this line: under the image. */
    gone: '50%',
  },
  desktop: { takeover: '60%', reveal: '86%', gone: '0%' },
} as const;

/** The first chapter takes over when the top of the story reaches this line. */
const FIRST_TAKEOVER = '45%';

/** Seconds. */
const ENTRANCE = {
  imageFade: 0.7,
  imageSettle: 1.4,
  kickerAt: 0.3,
  kickerDuration: 0.4,
  headingAt: 0.6,
  /** A leaving image waits for the next one to cover it, then goes faster than it came. */
  exitDelay: 0.35,
  exitDuration: 0.35,
  paragraphDuration: 0.4,
  paragraphStagger: 0.08,
  /** How far a paragraph drops in from, in pixels. */
  paragraphDrop: 16,
  /** The central question: each phrase fades in slowly, one after another. */
  phraseDuration: 1.2,
  phraseStagger: 0.8,
} as const;

interface StoryProps {
  /** The chapters, in order. */
  story: StorySection[];
  /** Shown on its own screen after the last chapter. */
  centralQuestion: string;
  /** Every reference of the case, for the portals in the text. */
  references: Reference[];
  /** Every source of the case, listed in the portal cards. */
  sources: Source[];
}

/** The animated parts of one chapter. */
interface ChapterParts {
  pane: HTMLElement;
  figure: HTMLElement | null;
  kicker: HTMLElement | null;
  heading: HTMLElement | null;
  text: HTMLElement;
  letters: HTMLElement[];
  quill: QuillWriter | null;
  entrance: gsap.core.Timeline | null;
  exit: gsap.core.Tween | null;
}

export default function Story({ story, centralQuestion, references, sources }: StoryProps) {
  const rootRef = useRef<HTMLElement>(null);
  const count = story.length;
  // Images load one chapter ahead of the reader. The first one loads at once: the story starts one scroll away.
  const [loadedThrough, setLoadedThrough] = useState(0);
  // True when nothing can be animated: every chapter is then simply shown, on its own background.
  const [plain, setPlain] = useState(false);

  const steps = useMemo(() => story.map((_, index) => dayNightStep(index, count)), [story, count]);
  const grades = useMemo(() => story.map((_, index) => imageGrade(index, count)), [story, count]);

  useGSAP(
    () => {
      const root = rootRef.current;
      // Without matchMedia there is no way to honour a reduced-motion request, so nothing is animated.
      if (root === null || typeof window.matchMedia !== 'function') {
        setPlain(true);
        setLoadedThrough(count);
        return;
      }

      gsap.registerPlugin(ScrollTrigger);

      const all = (selector: string, parent: Element = root) => [...parent.querySelectorAll<HTMLElement>(selector)];
      const one = (selector: string, parent: Element = root) => parent.querySelector<HTMLElement>(selector);

      const mm = gsap.matchMedia();

      mm.add({ ...MOTION_QUERIES, desktop: DESKTOP_QUERY }, context => {
        const reduced = context.conditions?.reduced === true;
        const lines = context.conditions?.desktop === true ? LINES.desktop : LINES.phone;
        const grid = one('[data-story="grid"]');
        if (grid === null) {
          return;
        }

        const splits: ReturnType<typeof splitForQuill>[] = [];
        const hiddenLine = reduced ? { opacity: 0 } : { opacity: 0, y: ENTRANCE.paragraphDrop };

        const chapters: ChapterParts[] = all('[data-story="chapter"]').flatMap(chapter => {
          const pane = one('[data-story="pane"]', chapter);
          const text = one('[data-story="text"]', chapter);
          if (pane === null || text === null) {
            return [];
          }
          const heading = one('[data-story="heading"]', chapter);
          const point = one('[data-story="quill"]', chapter);
          const body = one('[data-story="quill-body"]', chapter);
          let letters: HTMLElement[] = [];
          let quill: QuillWriter | null = null;
          // Full motion: the heading is split into letters for the quill.
          if (!reduced && heading !== null && point !== null && body !== null) {
            const split = splitForQuill(heading);
            splits.push(split);
            letters = split.chars as HTMLElement[];
            quill = createQuillWriter(point, body);
          }
          const figure = one('[data-story="figure"]', chapter);
          const kicker = one('[data-story="kicker"]', chapter);
          // Every image starts hidden: the current chapter's is faded in when it takes over.
          gsap.set(pane, { opacity: 0 });
          // The kicker and the heading start hidden too, until the chapter's entrance shows them.
          gsap.set([kicker, quill === null ? heading : null].filter(part => part !== null), { opacity: 0 });
          return [
            {
              pane,
              figure,
              kicker,
              heading,
              text,
              letters,
              quill,
              entrance: null,
              exit: null,
            },
          ];
        });

        const panes = chapters.map(chapter => chapter.pane);

        // The first image is there from the start, so the story never scrolls into view as an empty block.
        // Its entrance (settling, the kicker, the heading) still waits for the chapter to take over.
        const first = chapters[0];
        const beforeFirst = () => {
          if (first === undefined) {
            return;
          }
          gsap.set(first.pane, { opacity: 1 });
          if (!reduced && first.figure !== null) {
            gsap.set(first.figure, { scale: 1.04 });
          }
        };
        beforeFirst();

        // ---- A chapter takes over: its image fades and settles in, the kicker fades in, the quill writes the heading.
        // Built afresh every time, so the entrance replays on every visit, in both scroll directions.
        const enter = (index: number) => {
          const chapter = chapters[index];
          chapter.exit?.kill();
          chapter.entrance?.kill();
          chapter.quill?.hide();
          // Load this chapter's image if it has not been yet, and the next one ahead of the reader.
          setLoadedThrough(loaded => Math.max(loaded, index + 1));

          gsap.set(panes, { zIndex: 20 });
          gsap.set(chapter.pane, { zIndex: 21 });

          const timeline = gsap.timeline({ defaults: { ease: EASE.out } });
          timeline.to(chapter.pane, { opacity: 1, duration: ENTRANCE.imageFade }, 0);
          if (!reduced && chapter.figure !== null) {
            timeline.fromTo(chapter.figure, { scale: 1.04 }, { scale: 1, duration: ENTRANCE.imageSettle }, 0);
          }
          if (chapter.kicker !== null) {
            timeline.fromTo(
              chapter.kicker,
              { opacity: 0 },
              { opacity: 1, duration: ENTRANCE.kickerDuration },
              ENTRANCE.kickerAt
            );
          }
          if (chapter.quill !== null) {
            gsap.set(chapter.letters, { opacity: 0 });
            chapter.quill.write(timeline, chapter.letters, ENTRANCE.headingAt);
          } else if (chapter.heading !== null) {
            // Reduced motion: no quill, the heading fades in whole, after the kicker.
            timeline.fromTo(chapter.heading, { opacity: 0 }, { opacity: 1, duration: 0.5 }, ENTRANCE.headingAt);
          }
          chapter.entrance = timeline;
        };

        const leave = (index: number, towardsStart: boolean) => {
          const chapter = chapters[index];
          chapter.entrance?.kill();
          chapter.exit?.kill();
          chapter.quill?.hide();
          // Back above the first chapter: its image stays, and its words wait to be written again.
          if (index === 0 && towardsStart) {
            const words = [chapter.kicker, chapter.quill === null ? chapter.heading : null, ...chapter.letters];
            gsap.set(
              words.filter(part => part !== null),
              { opacity: 0 }
            );
            beforeFirst();
            return;
          }
          chapter.exit = gsap.to(chapter.pane, {
            opacity: 0,
            duration: ENTRANCE.exitDuration,
            delay: ENTRANCE.exitDelay,
            ease: EASE.out,
          });
        };

        chapters.forEach((chapter, index) => {
          const next = chapters[index + 1];
          ScrollTrigger.create({
            trigger: index === 0 ? grid : chapter.text,
            start: index === 0 ? `top ${FIRST_TAKEOVER}` : `top ${lines.takeover}`,
            endTrigger: next === undefined ? grid : next.text,
            end: next === undefined ? 'bottom top' : `top ${lines.takeover}`,
            onToggle: self => (self.isActive ? enter(index) : leave(index, self.direction < 0)),
          });
        });

        // ---- Paragraphs drop in one by one as they scroll into view, from either direction.
        // They are only ever hidden while out of sight, so nothing disappears in front of the reader.
        const paragraphs = all('[data-story="line"]');
        gsap.set(paragraphs, hiddenLine);
        // One tween per paragraph, kept by hand, so a paragraph that leaves mid-entrance is stopped for certain.
        const dropping = new Map<Element, gsap.core.Tween>();
        const show = (targets: Element[], from: number) => {
          targets.forEach((target, index) => {
            dropping.get(target)?.kill();
            dropping.set(
              target,
              gsap.fromTo(target, reduced ? { opacity: 0 } : { opacity: 0, y: from }, {
                opacity: 1,
                y: 0,
                duration: ENTRANCE.paragraphDuration,
                ease: EASE.out,
                delay: index * ENTRANCE.paragraphStagger,
              })
            );
          });
        };
        const hide = (targets: Element[]) => {
          targets.forEach(target => {
            dropping.get(target)?.kill();
            dropping.delete(target);
          });
          gsap.set(targets, hiddenLine);
        };
        ScrollTrigger.batch(paragraphs, {
          start: `top ${lines.reveal}`,
          end: `bottom ${lines.gone}`,
          onEnter: targets => show(targets, ENTRANCE.paragraphDrop),
          onEnterBack: targets => show(targets, -ENTRANCE.paragraphDrop),
          onLeave: hide,
          onLeaveBack: hide,
        });

        // ---- Day into night: the background eases from one chapter's step to the next as the reader scrolls
        // between them. Each step is a layer that is faded in, so only opacity is animated.
        const sky = all('[data-story="sky"]');
        chapters.forEach((chapter, index) => {
          const layer = sky[index];
          if (index === 0 || layer === undefined) {
            return;
          }
          gsap.fromTo(
            layer,
            { opacity: 0 },
            {
              opacity: 1,
              ease: 'none',
              scrollTrigger: { trigger: chapter.text, start: 'top bottom', end: `top ${lines.takeover}`, scrub: 0.4 },
            }
          );
        });
        // Coming out of the legend's night, the story's first screen eases into daylight.
        const dawn = one('[data-story="dawn"]');
        if (dawn !== null) {
          gsap.fromTo(
            dawn,
            { opacity: 1 },
            {
              opacity: 0,
              ease: 'none',
              scrollTrigger: { trigger: grid, start: 'top bottom', end: `top ${FIRST_TAKEOVER}`, scrub: 0.4 },
            }
          );
        }

        // ---- The central question, written in slowly: one phrase after another.
        let stopWriting = () => {};
        const question = one('[data-story="question"]');
        const phrases = all('[data-story="phrase"]');
        if (question !== null && phrases.length > 0) {
          gsap.set(phrases, { opacity: 0 });
          let writing: gsap.core.Tween | null = null;
          const write = () => {
            writing?.kill();
            writing = gsap.fromTo(
              phrases,
              { opacity: 0 },
              { opacity: 1, duration: ENTRANCE.phraseDuration, ease: 'sine.out', stagger: ENTRANCE.phraseStagger }
            );
          };
          stopWriting = () => writing?.kill();
          ScrollTrigger.create({ trigger: question, start: 'top 35%', onEnter: write, onEnterBack: write });
          // It is cleared only once it is fully off the screen, so it is written again on the next visit.
          ScrollTrigger.create({
            trigger: question,
            start: 'top bottom',
            onLeaveBack: () => {
              writing?.kill();
              gsap.set(phrases, { opacity: 0 });
            },
          });
        }

        // Web fonts change the height of the text. Measure again once they are in.
        let current = true;
        document.fonts?.ready.then(() => {
          if (current) {
            ScrollTrigger.refresh();
          }
        });

        return () => {
          current = false;
          // Animations started from scroll callbacks are not tracked by the context: stop them by hand.
          chapters.forEach(chapter => {
            chapter.entrance?.kill();
            chapter.exit?.kill();
            chapter.quill?.hide();
          });
          dropping.forEach(tween => tween.kill());
          stopWriting();
          const shown = chapters.flatMap(chapter => [chapter.kicker, chapter.heading]).filter(part => part !== null);
          gsap.set([...paragraphs, ...phrases, ...shown], { clearProps: 'opacity,transform' });
          splits.forEach(split => split.revert());
        };
      });
    },
    { scope: rootRef, dependencies: [story, centralQuestion] }
  );

  return (
    <PortalProvider references={references} sources={sources}>
      <section ref={rootRef} aria-label="The story" data-story="root" className="relative bg-ash">
        {/* One grid for the whole story. A chapter's image cell and text cell are both placed in it
            (StoryChapter.tsx), which is what lets every image stay stuck from the first chapter to the last. */}
        <div data-story="grid" className="relative grid grid-cols-1 lg:grid-cols-2">
          {/* The sky: one layer per step from day into night, stuck behind the text. */}
          {!plain && (
            <div
              aria-hidden="true"
              className="pointer-events-none sticky top-0 col-span-full col-start-1 h-lvh self-start"
              style={{ gridRow: `1 / span ${Math.max(1, count)}` }}
            >
              {steps.map((step, index) => (
                <div
                  key={index}
                  data-story="sky"
                  className="absolute inset-0"
                  style={{ backgroundColor: step.background }}
                />
              ))}
              <div data-story="dawn" className="absolute inset-0 bg-night" />
            </div>
          )}

          {story.map((section, index) => (
            <StoryChapter
              key={section.id}
              section={section}
              index={index}
              count={count}
              step={steps[index]}
              grade={grades[index]}
              loadImage={index <= loadedThrough}
              plain={plain}
            />
          ))}
        </div>

        <CentralQuestion question={centralQuestion} />
      </section>
    </PortalProvider>
  );
}
