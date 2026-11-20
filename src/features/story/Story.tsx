// src/features/story/Story.tsx
// The real story, told like a documentary (docs/briefs/story-redesign.md). Every chapter is a full-screen scene:
// the image fills the screen under a slow camera, the quill writes the heading, the text arrives one sentence
// at a time, and the hook takes the whole screen before the next scene dissolves in. The scenes lie on top of
// each other in one pinned stage, and one timeline, scrubbed by the scroll, plays them in turn.
// A small chart in the corner draws the voyage as it goes. The reader can scroll, or let the story play itself.
// Under reduced motion the chapters are plain stacked sections with still images, and the text only fades in.
// Everything shown comes from props. Nothing about any one case is written in this file.

import { useCallback, useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollToPlugin } from 'gsap/ScrollToPlugin';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import PortalProvider from '@/features/portals/PortalProvider';
import CentralQuestion from '@/features/story/CentralQuestion';
import PlayControl from '@/features/story/PlayControl';
import StoryChapter from '@/features/story/StoryChapter';
import StoryScene from '@/features/story/StoryScene';
import StoryStart from '@/features/story/StoryStart';
import VoyageChart from '@/features/story/VoyageChart';
import { pxPerSecond, useStoryPlayer } from '@/features/story/use-story-player';
import { dayNightStep, imageGrade, skyColour, textTone } from '@/lib/day-night';
import { LINEAR, MOTION_QUERIES, tween } from '@/lib/motion';
import { createQuillWriter, splitForQuill } from '@/lib/quill-writing';
import { scrollToY } from '@/lib/smooth-scroll';
import { beatSeconds, rollCallBeatIndex, splitIntoBeats } from '@/lib/story-beats';
import { emitStoryEvent, type StoryDirection } from '@/lib/story-events';
import { useReducedMotion } from '@/lib/use-reduced-motion';
import { buildRoute } from '@/lib/voyage-chart';
import type { Reference, Source, StorySection, Voyage } from '@/types/case';

// ScrollTrigger is registered inside the component: it needs window.matchMedia as soon as it is registered.
gsap.registerPlugin(useGSAP, ScrollToPlugin);

/**
 * The scenes' timeline, in seconds of reading. One second takes pxPerSecond() pixels of scroll, so playing the
 * story at that speed gives each beat its reading time.
 */
const SCENE = {
  /** The next image cross-dissolves in over the old one. */
  dissolve: 1.4,
  kickerAt: 0.3,
  kicker: 0.6,
  headingAt: 0.7,
  titleHold: 1.2,
  titleOut: 0.6,
  beatIn: 0.6,
  beatOut: 0.45,
  beatGap: 0.15,
  nameEvery: 0.32,
  nameIn: 0.45,
  rollCallDim: 0.55,
  nameOut: 0.36,
  hookDim: 0.92,
  hookIn: 0.9,
  /** "Hooks hold about 4s." */
  hookHold: 4,
  /** A beat of stillness: nothing changes before the next scene. */
  stillness: 1.6,
  /** A chapter without a hook still pauses before the next. */
  restWithoutHook: 1,
  /** The camera's slow push in. */
  zoomTo: 1.12,
  /** The dimming for the roll call and the hook, and a point on the route fading in. */
  rollCallDimIn: 0.6,
  hookDimIn: 0.9,
  dotIn: 0.3,
  /** A name going out like a candle: [opacity, seconds] steps. */
  candle: [
    [0.35, 0.07],
    [0.9, 0.07],
    [0.5, 0.05],
    [0, 0.17],
  ],
} as const;

/** Each chapter's camera pans its own way, as a share of the image (xPercent, yPercent). */
const PANS = [
  { x: -3.5, y: -1.5 },
  { x: 3.5, y: -1 },
  { x: -2.5, y: 2 },
  { x: 3, y: 1.5 },
  { x: -3, y: -2 },
  { x: 2.5, y: -2.5 },
] as const;

interface StoryProps {
  /** The chapters, in order. */
  story: StorySection[];
  /** Shown on its own screen after the last chapter. */
  centralQuestion: string;
  /** Every reference of the case, for the portals in the text. */
  references: Reference[];
  /** Every source of the case, listed in the portal cards. */
  sources: Source[];
  /** The voyage, drawn on the chart as the story goes. */
  voyage?: Voyage;
}

export default function Story({ story, centralQuestion, references, sources, voyage }: StoryProps) {
  const rootRef = useRef<HTMLElement>(null);
  const count = story.length;
  const reducedMotion = useReducedMotion();
  // Without matchMedia a reduced-motion request cannot be honoured, so nothing is animated.
  const canAnimate = typeof window !== 'undefined' && typeof window.matchMedia === 'function';
  const cinematic = canAnimate && !reducedMotion;
  const player = useStoryPlayer(cinematic);
  // Images load one chapter ahead of the reader. The first one loads at once.
  const [loadedThrough, setLoadedThrough] = useState(0);

  const steps = useMemo(() => story.map((_, index) => dayNightStep(index, count)), [story, count]);
  const grades = useMemo(() => story.map((_, index) => imageGrade(index, count)), [story, count]);
  const beats = useMemo(() => story.map(section => section.body.flatMap(splitIntoBeats)), [story]);
  const route = useMemo(() => buildRoute(voyage, story), [voyage, story]);

  /** "Read at my pace": a short glide to the first scene. */
  const goToFirstScene = useCallback(() => {
    const stage = rootRef.current?.querySelector<HTMLElement>('[data-story="stage"]');
    if (stage === null || stage === undefined) {
      return;
    }
    const y = stage.getBoundingClientRect().top + window.scrollY;
    scrollToY(y);
  }, []);

  useGSAP(
    () => {
      const root = rootRef.current;
      if (root === null || !canAnimate) {
        return;
      }
      gsap.registerPlugin(ScrollTrigger);
      // Phones: the browser bar showing or hiding must not make the pinned stage jump.
      ScrollTrigger.config({ ignoreMobileResize: true });

      const all = (selector: string, parent: Element = root) => [...parent.querySelectorAll<HTMLElement>(selector)];
      const one = (selector: string, parent: Element = root) => parent.querySelector<HTMLElement>(selector);

      const mm = gsap.matchMedia();
      mm.add(MOTION_QUERIES, context => {
        const reduced = context.conditions?.reduced === true;

        // ---- Day into night. The sky is the page's background (and its scrollbar gutter), the colour around
        // the scenes and behind them while they dissolve, and the tone of text set on it. Written to elements,
        // never to React state, and only when it changes.
        let tone = '';
        let colour = '';
        const writeSky = (mix: number) => {
          const nextTone = textTone(mix);
          if (nextTone !== tone) {
            tone = nextTone;
            root.dataset.tone = nextTone;
          }
          const nextColour = skyColour(mix);
          if (nextColour !== colour) {
            colour = nextColour;
            root.style.setProperty('--story-sky', nextColour);
            document.documentElement.style.backgroundColor = nextColour;
          }
        };

        const cleanups: (() => void)[] = [];

        if (reduced || !cinematic) {
          // ---- Reduced motion: stacked sections. The text fades in as it comes into view; nothing moves.
          writeSky(1);
          const fading = all('[data-story="line"], [data-story="roll-call"], [data-chart="frame"]');
          gsap.set(fading, { opacity: 0 });
          ScrollTrigger.batch(fading, {
            start: 'top 88%',
            once: true,
            onEnter: targets => gsap.to(targets, { opacity: 1, ...tween('ink.in'), stagger: 0.08 }),
          });
          // The sky follows the chapter on screen.
          all('[data-story="chapter"]').forEach((chapter, index) => {
            ScrollTrigger.create({
              trigger: chapter,
              start: 'top 60%',
              end: 'bottom 60%',
              onToggle: self => self.isActive && writeSky(steps[index]?.mix ?? 1),
            });
          });
          ScrollTrigger.create({
            trigger: one('[data-story="question"]'),
            start: 'top 60%',
            onToggle: self => writeSky(self.isActive ? 1 : (steps[count - 1]?.mix ?? 1)),
          });
          cleanups.push(() => gsap.set(fading, { clearProps: 'opacity' }));
        } else {
          // ---- The cinematic story: one pinned stage, one scrubbed timeline.
          const stage = one('[data-story="stage"]');
          if (stage === null) {
            return;
          }
          const scenes = all('[data-story="chapter"]', stage);
          const chartFrame = one('[data-chart="frame"][data-variant="live"]');
          const playControl = one('[data-story="play-control"]');
          const splits: ReturnType<typeof splitForQuill>[] = [];
          const timeline = gsap.timeline({ defaults: { ease: LINEAR } });
          let direction: StoryDirection = 'forward';
          const emitAt = (at: number, make: () => Parameters<typeof emitStoryEvent>[0]) =>
            timeline.call(() => emitStoryEvent(make()), undefined, at);

          interface Span {
            start: number;
            /** When the beats begin and end: the chart draws its route in between. */
            textFrom: number;
            textTo: number;
            end: number;
          }
          const spans: Span[] = [];
          let t = 0;

          scenes.forEach((scene, index) => {
            const section = story[index];
            const start = t;
            const quote = (selector: string) => all(selector, scene);
            const dim = one('[data-story="dim"]', scene);
            let dimLevel = 0;
            const dimTo = (level: number, at: number, duration: number) => {
              timeline.fromTo(dim, { opacity: dimLevel }, { opacity: level, duration, immediateRender: false }, at);
              dimLevel = level;
            };

            timeline.addLabel(`chapter-${index}`, start);
            if (index > 0) {
              timeline.fromTo(scene, { opacity: 0 }, { opacity: 1, duration: SCENE.dissolve, immediateRender: false }, start);
              t += SCENE.dissolve;
            }
            timeline.call(
              () => {
                // Load this chapter's image, and the next one ahead of the reader.
                setLoadedThrough(loaded => Math.max(loaded, index + 1));
                emitStoryEvent({ type: 'chapter-enter', chapter: section.id, direction });
              },
              undefined,
              start + 0.01
            );

            // The opening: the kicker, then the quill writes the heading.
            const kicker = one('[data-story="kicker"]', scene);
            const title = one('[data-story="title"]', scene);
            const heading = one('[data-story="heading"]', scene);
            const point = one('[data-story="quill"]', scene);
            const body = one('[data-story="quill-body"]', scene);
            if (kicker !== null) {
              timeline.fromTo(kicker, { opacity: 0 }, { opacity: 1, duration: SCENE.kicker, immediateRender: false }, t + SCENE.kickerAt);
            }
            let written = 0.8;
            if (heading !== null && point !== null && body !== null) {
              const split = splitForQuill(heading);
              splits.push(split);
              written = createQuillWriter(point, body).write(timeline, split.chars as HTMLElement[], t + SCENE.headingAt);
            }
            t += SCENE.headingAt + written + SCENE.titleHold;
            timeline.fromTo(title, { opacity: 1, y: 0 }, { opacity: 0, y: -14, duration: SCENE.titleOut, immediateRender: false }, t);
            t += SCENE.titleOut;
            const textFrom = t;

            // The beats, one at a time in the lower third.
            const beatTexts = beats[index] ?? [];
            const names = quote('[data-story="name"]');
            const rollAfter = names.length > 0 ? rollCallBeatIndex(beatTexts, names.length) : -1;
            quote('[data-story="beat"]').forEach((beat, beatIndex) => {
              timeline.fromTo(
                beat,
                { opacity: 0, y: 20 },
                { opacity: 1, y: 0, duration: SCENE.beatIn, immediateRender: false },
                t
              );
              emitAt(t, () => ({ type: 'beat', chapter: section.id, index: beatIndex, direction }));
              t += SCENE.beatIn + beatSeconds(beatTexts[beatIndex] ?? '');
              timeline.fromTo(
                beat,
                { opacity: 1, y: 0 },
                { opacity: 0, y: -10, duration: SCENE.beatOut, immediateRender: false },
                t
              );
              t += SCENE.beatOut + SCENE.beatGap;

              // The roll call: after the beat that gives their number, the names appear one by one, and stay.
              if (beatIndex === rollAfter) {
                dimTo(SCENE.rollCallDim, t, SCENE.rollCallDimIn);
                names.forEach((name, nameIndex) => {
                  timeline.fromTo(
                    name,
                    { opacity: 0, y: 6 },
                    { opacity: 1, y: 0, duration: SCENE.nameIn, immediateRender: false },
                    t + 0.3 + nameIndex * SCENE.nameEvery
                  );
                });
                t += 0.3 + names.length * SCENE.nameEvery + SCENE.nameIn;
              }
            });
            const textTo = t;

            // The hook: the names go out like candles, last to first; the image dims almost to black; the line
            // takes the screen; then stillness.
            const hook = one('[data-story="hook-moment"]', scene);
            if (hook !== null) {
              [...names].reverse().forEach(name => {
                timeline.fromTo(
                  name,
                  { opacity: 1 },
                  {
                    keyframes: SCENE.candle.map(([opacity, seconds]) => ({ opacity, duration: seconds })),
                    immediateRender: false,
                  },
                  t
                );
                const label = name.querySelector('span')?.textContent ?? '';
                emitAt(t, () => ({ type: 'roll-call-out', chapter: section.id, name: label, direction }));
                t += SCENE.nameOut;
              });
              dimTo(SCENE.hookDim, t, SCENE.hookDimIn);
              timeline.fromTo(
                hook,
                { opacity: 0, y: 12 },
                { opacity: 1, y: 0, duration: SCENE.hookIn, immediateRender: false },
                t + 0.35
              );
              emitAt(t + 0.35, () => ({ type: 'hook', chapter: section.id, direction }));
              t += 0.35 + SCENE.hookIn + SCENE.hookHold + SCENE.stillness;
            } else {
              t += SCENE.restWithoutHook;
            }

            // The camera: a slow push in and pan across the whole chapter, still moving as the next dissolves in.
            const image = one('[data-story="image"]', scene);
            const pan = PANS[index % PANS.length];
            if (image !== null) {
              timeline.fromTo(
                image,
                { scale: 1, xPercent: 0, yPercent: 0 },
                { scale: SCENE.zoomTo, xPercent: pan.x, yPercent: pan.y, duration: t - start + SCENE.dissolve },
                start
              );
            }
            spans.push({ start, textFrom, textTo, end: t });
          });

          // ---- The chart: each stretch of the route draws itself during the chapter it ends in, and the ship
          // follows the line. The stretch she sailed alone is dashed and ghostly (VoyageChart.tsx).
          if (chartFrame !== null) {
            const reveals = all('[data-chart="reveal"]', chartFrame);
            const ship = chartFrame.querySelector('[data-chart="ship"]');
            const dots = new Map(all('[data-chart="point"]', chartFrame).map(dot => [dot.dataset.id, dot]));
            route.segments.forEach((segment, index) => {
              const span = spans[segment.to.chapterIndex];
              const reveal = reveals[index];
              if (span === undefined || reveal === undefined) {
                return;
              }
              const share = (span.textTo - span.textFrom) / segment.slots;
              const at = span.textFrom + segment.slot * share;
              const duration = Math.max(0.5, share * 0.85);
              timeline.fromTo(
                reveal,
                { attr: { 'stroke-dashoffset': 1 } },
                {
                  attr: { 'stroke-dashoffset': 0 },
                  duration,
                  immediateRender: false,
                  onUpdate() {
                    const p = this.progress();
                    const x = segment.from.x + (segment.to.x - segment.from.x) * p;
                    const y = segment.from.y + (segment.to.y - segment.from.y) * p;
                    ship?.setAttribute('transform', `translate(${x} ${y})`);
                  },
                },
                at
              );
              const dot = dots.get(segment.to.id);
              if (dot !== undefined) {
                timeline.fromTo(dot, { opacity: 0 }, { opacity: 1, duration: SCENE.dotIn, immediateRender: false }, at + duration);
              }
            });
          }

          // ---- The sky over the scenes: each chapter's step, eased across the dissolve between two.
          // The camera pushes only the image of the scene on screen: will-change is set while a scene is within
          // its span (and its dissolve), and cleared afterwards. Written only when it changes.
          const images = scenes.map(scene => one('[data-story="image"]', scene));
          const cameraOn = images.map(() => false);
          const syncWillChange = (time: number) => {
            spans.forEach((span, index) => {
              const on = time >= span.start - SCENE.dissolve && time <= span.end + SCENE.dissolve;
              if (on !== cameraOn[index] && images[index] !== null) {
                cameraOn[index] = on;
                images[index].style.willChange = on ? 'transform' : '';
              }
            });
          };

          const mixAt = (time: number) => {
            let mix = steps[0]?.mix ?? 0;
            spans.forEach((span, index) => {
              if (time < span.start || index === 0) {
                return;
              }
              const into = Math.min(1, (time - span.start) / SCENE.dissolve);
              mix = steps[index - 1].mix + (steps[index].mix - steps[index - 1].mix) * into;
            });
            return mix;
          };

          const pinned = ScrollTrigger.create({
            trigger: stage,
            start: 'top top',
            end: () => `+=${Math.round(timeline.duration() * pxPerSecond())}`,
            pin: true,
            scrub: 0.6,
            anticipatePin: 1,
            animation: timeline,
            invalidateOnRefresh: true,
            onUpdate: self => {
              direction = self.direction < 0 ? 'backward' : 'forward';
              writeSky(mixAt(timeline.time()));
              syncWillChange(timeline.time());
            },
            onToggle: self => {
              if (chartFrame !== null) {
                chartFrame.dataset.visible = String(self.isActive);
              }
            },
          });

          syncWillChange(0);

          // ---- Coming out of the legend's night, the start of the story eases into the first scene's sky.
          ScrollTrigger.create({
            trigger: one('[data-story="start"]'),
            start: 'top bottom',
            end: 'bottom bottom',
            onUpdate: self => {
              if (pinned.progress === 0) {
                writeSky(1 + ((steps[0]?.mix ?? 0) - 1) * self.progress);
              }
            },
          });
          // After the last scene, full night for the question.
          ScrollTrigger.create({
            trigger: one('[data-story="question"]'),
            start: 'top bottom',
            onToggle: self => self.isActive && writeSky(1),
          });
          // The play control shows while the story is on screen.
          ScrollTrigger.create({
            trigger: root,
            start: 'top 70%',
            end: 'bottom 30%',
            onToggle: self => {
              if (playControl !== null) {
                playControl.dataset.visible = String(self.isActive);
              }
            },
          });
          writeSky(1);
          cleanups.push(() => {
            images.forEach(image => image !== null && (image.style.willChange = ''));
            splits.forEach(split => split.revert());
            if (chartFrame !== null) {
              chartFrame.dataset.visible = 'false';
            }
          });
        }

        // ---- The central question, written in slowly: one phrase after another.
        const question = one('[data-story="question"]');
        const phrases = all('[data-story="phrase"]');
        let writing: gsap.core.Tween | null = null;
        if (question !== null && phrases.length > 0) {
          gsap.set(phrases, { opacity: 0 });
          const write = () => {
            writing?.kill();
            writing = gsap.fromTo(
              phrases,
              { opacity: 0 },
              { opacity: 1, ...tween('scene'), stagger: reduced ? 0.4 : 0.8 }
            );
          };
          ScrollTrigger.create({ trigger: question, start: 'top 35%', onEnter: write, onEnterBack: write });
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
        document.fonts?.ready.then(() => current && ScrollTrigger.refresh());

        return () => {
          current = false;
          writing?.kill();
          gsap.set(phrases, { clearProps: 'opacity' });
          cleanups.forEach(cleanup => cleanup());
          delete root.dataset.tone;
          root.style.removeProperty('--story-sky');
          // Hand the page's background back to the stylesheet (night on a case page, index.css).
          document.documentElement.style.removeProperty('background-color');
        };
      });
    },
    { scope: rootRef, dependencies: [story, centralQuestion, cinematic, beats, route, steps, count, canAnimate], revertOnUpdate: true }
  );

  return (
    <PortalProvider references={references} sources={sources} onOpen={player.pause}>
      <section
        ref={rootRef}
        aria-label="The story"
        data-story="root"
        data-mode={cinematic ? 'cinematic' : 'stacked'}
        data-tone="night-ink"
        className="group/sky relative bg-[var(--story-sky)]"
        style={{ '--story-sky': 'var(--color-night)' } as React.CSSProperties}
      >
        <StoryStart player={cinematic ? player : null} onRead={goToFirstScene} />

        {cinematic ? (
          <div data-story="stage" className="relative h-svh overflow-hidden bg-[var(--story-sky)]">
            {story.map((section, index) => (
              <StoryScene
                key={section.id}
                section={section}
                index={index}
                grade={grades[index]}
                beats={beats[index]}
                loadImage={index <= loadedThrough}
              />
            ))}
          </div>
        ) : (
          story.map((section, index) => (
            <StoryChapter
              key={section.id}
              section={section}
              index={index}
              step={steps[index]}
              grade={grades[index]}
              route={route}
            />
          ))
        )}

        <CentralQuestion question={centralQuestion} />

        {cinematic && <VoyageChart route={route} variant="live" onExpand={player.pause} />}
        {cinematic && <PlayControl player={player} />}
      </section>
    </PortalProvider>
  );
}
