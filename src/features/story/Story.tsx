// src/features/story/Story.tsx
// The real story, told like a documentary (story v3, docs/briefs/night-run.md). Every chapter is a full-screen
// scene: the image fills the screen under a slow camera, and the pen writes the chapter's page in a dark panel on
// one side. When the reader scrolls on, the panel dims away, the hook takes the centre of the screen, decays, and
// the next image dissolves in. The scenes lie on top of each other in one pinned stage, and one timeline, scrubbed
// by the scroll, plays them in turn; the writing itself is timed, not scrubbed.
// A small chart in the corner draws the voyage as it goes. The reader can scroll, or let the story play itself.
// The case header shows the case's title once the story starts.
// Under reduced motion the chapters are plain stacked sections with still images and their pages already written.
// Everything shown comes from props. Nothing about any one case is written in this file.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollToPlugin } from 'gsap/ScrollToPlugin';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import PortalProvider from '@/features/portals/PortalProvider';
import Fork, { type ForkProps } from '@/features/fork/Fork';
import CentralQuestion from '@/features/story/CentralQuestion';
import PlayControl from '@/features/story/PlayControl';
import { activeSceneIndex } from '@/features/story/active-scene';
import StoryChapter from '@/features/story/StoryChapter';
import StoryScene from '@/features/story/StoryScene';
import VoyageChart from '@/features/story/VoyageChart';
import { pxPerSecond, useStoryPlayer, type PlayStep } from '@/features/story/use-story-player';
import { dayNightStep, imageGrade, skyColour, textTone } from '@/lib/day-night';
import { hashUnit } from '@/lib/desk';
import { INK_RISE, LINEAR, MOTION, MOTION_QUERIES, STEP, tween } from '@/lib/motion';
import { createQuillWriter, splitForQuill } from '@/lib/quill-writing';
import { scrollToY, setWheelMultiplier } from '@/lib/smooth-scroll';
import { STORY_PACE, penPlan, readingSeconds } from '@/lib/story-pages';
import { emitStoryEvent, type StoryDirection } from '@/lib/story-events';
import { useReducedMotion } from '@/lib/use-reduced-motion';
import { buildRoute } from '@/lib/voyage-chart';
import type { Reference, Source, StorySection, Voyage } from '@/types/case';

// ScrollTrigger is registered inside the component: it needs window.matchMedia as soon as it is registered.
gsap.registerPlugin(useGSAP, ScrollToPlugin);

/**
 * How the scenes look as they move: the camera, the hook's letters, the candles. Their pace is `STORY_PACE`
 * (src/lib/story-pages.ts), the one place to tune the story's timing.
 */
const SCENE = {
  /** The page's panel dims away before the hook takes the screen. */
  pageOut: 0.45,
  nameOut: 0.36,
  hookDim: 0.92,
  /** Weighted words in the central question: the breath before a phrase lands on its own. */
  weightBeat: STEP.base,
  /** Going back over a hook's start, its snap runs backwards this many times faster (exits are quicker). */
  hookBackRate: 2,
  /** The breath before a hook: the camera creeps this much closer, over `story.breath`. */
  creepTo: 1.05,
  /** Where a hook's letters start: up to this far out of line, in px and degrees, then they snap into place. */
  hookMisalign: { x: 5, y: 7, rotate: 12 },
  /** A chapter without a hook still pauses before the next. */
  restWithoutHook: 1,
  /** The camera's slow push in. */
  zoomTo: 1.12,
  /** A point on the route fading in. */
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
  /** The question's weighted parts. */
  centralQuestionEmphasis?: string[];
  /** Every reference of the case, for the portals in the text. */
  references: Reference[];
  /** Every source of the case, listed in the portal cards. */
  sources: Source[];
  /** The voyage, drawn on the chart as the story goes. */
  voyage?: Voyage;
  /** The fork after the central question, shown as a modal over it. */
  fork?: Pick<ForkProps, 'fork' | 'historiansSummary' | 'filesHref'>;
  /** The reader's choice in the play modal, each time it is made (a new token): the story starts with it. */
  start?: { mode: 'play' | 'read'; token: number } | null;
}

export default function Story({ story, centralQuestion, centralQuestionEmphasis, references, sources, voyage, start = null, fork }: StoryProps) {
  const rootRef = useRef<HTMLElement>(null);
  const count = story.length;
  const reducedMotion = useReducedMotion();
  // Without matchMedia a reduced-motion request cannot be honoured, so nothing is animated.
  const canAnimate = typeof window !== 'undefined' && typeof window.matchMedia === 'function';
  const cinematic = canAnimate && !reducedMotion;
  /** The stops "Play the story" plays through, worked out from the timeline when play is pressed. */
  const playPlanRef = useRef<(() => PlayStep[]) | null>(null);
  const player = useStoryPlayer(cinematic, () => playPlanRef.current?.() ?? []);
  /** The fork is open over the question. (Whether it shows is state; how it moves is GSAP's.) */
  const [forkOpen, setForkOpen] = useState(false);
  /** Escape on the fork: back to the whole question. Set once the question is built. */
  const backToQuestionRef = useRef<() => void>(() => undefined);
  // Images load one chapter ahead of the reader. The first one loads at once.
  const [loadedThrough, setLoadedThrough] = useState(0);

  const steps = useMemo(() => story.map((_, index) => dayNightStep(index, count)), [story, count]);
  const grades = useMemo(() => story.map((_, index) => imageGrade(index, count)), [story, count]);
  const route = useMemo(() => buildRoute(voyage, story), [voyage, story]);

  // While the story is on the page, a wheel or trackpad moves it less (STORY_PACE), so the pages do not race.
  useEffect(() => {
    if (!cinematic) {
      return;
    }
    setWheelMultiplier(STORY_PACE.wheelMultiplier);
    return () => setWheelMultiplier(1);
  }, [cinematic]);

  /** "Read at my pace": a short glide to where chapter 1 begins, unless the reader is already past it. */
  const goToFirstScene = useCallback(() => {
    const stage = rootRef.current?.querySelector<HTMLElement>('[data-story="stage"]');
    if (stage === null || stage === undefined) {
      // The stacked story (reduced motion): to its top, at once.
      rootRef.current?.scrollIntoView?.({ behavior: 'auto', block: 'start' });
      return;
    }
    const y = stage.getBoundingClientRect().top + window.scrollY;
    if (y > window.scrollY + 1) {
      scrollToY(y);
    }
  }, []);

  // The reader has chosen how to hear the story: it starts. "Play the story" plays from here (its first stop is the
  // first page); "Read at my pace" glides to the first page.
  const startToken = start?.token;
  const startMode = start?.mode;
  const { play } = player;
  useEffect(() => {
    if (startToken === undefined) {
      return;
    }
    if (startMode === 'play' && cinematic) {
      play();
    } else {
      goToFirstScene();
    }
  }, [startToken, startMode, cinematic, play, goToFirstScene]);

  // The case header shows the case's title once the story starts: as the story comes up the screen, and away again
  // when the reader goes back up into the legend. Without matchMedia it is simply shown.
  useEffect(() => {
    const bar = document.querySelector<HTMLElement>('[data-case-header="bar"]');
    const root = rootRef.current;
    if (bar === null || root === null) {
      return;
    }
    if (!canAnimate) {
      bar.style.opacity = '1';
      return;
    }
    gsap.registerPlugin(ScrollTrigger);
    const trigger = ScrollTrigger.create({
      trigger: root,
      start: 'top 80%',
      onToggle: self => gsap.to(bar, { opacity: self.isActive || self.progress > 0 ? 1 : 0, ...tween('hover'), overwrite: true }),
    });
    if (trigger.isActive || trigger.progress > 0) {
      gsap.set(bar, { opacity: 1 });
    }
    return () => trigger.kill();
  }, [canAnimate]);

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
        /** "Play the story"'s stops at the central question: worked out once its chokepoint is built. */
        let questionStops: () => PlayStep[] = () => [];

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
            /** When the page is on screen: the chart draws its route in between. */
            textFrom: number;
            textTo: number;
            end: number;
          }
          const spans: Span[] = [];
          let t = 0;
          // One timer-driven heading per scene (see HEADING), and the timelines to clean up.
          // Which way the playhead is moving: the scrub brings it to the scroll, so it can trail the scroll's direction.
          let lastTime = 0;
          timeline.eventCallback('onUpdate', () => {
            lastTime = timeline.time();
          });
          const playheadForward = () => timeline.time() >= lastTime;
          /** Each chapter's pen: start writing its page, finish it at once, and whether it is written. */
          const pageWriters: { seconds: number; start: () => void; finish: () => void; written: () => boolean }[] = [];
          const headingTimelines: gsap.core.Timeline[] = [];
          /** When each hook has the screen: the chart inset goes quiet then. */
          const hooks: { from: number; to: number }[] = [];
          /** Each hook's timed snap, where it starts on the timeline, and where its decay begins. */
          const hookIns: { at: number; decayAt?: number; timeline: gsap.core.Timeline }[] = [];
          /** Who is waiting for a page to be written ("Play the story"). */
          const onWritten: (() => void)[][] = scenes.map(() => []);

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
              timeline.fromTo(scene, { opacity: 0 }, { opacity: 1, duration: STORY_PACE.dissolve, immediateRender: false }, start);
              t += STORY_PACE.dissolve;
            }
            timeline.call(
              () => {
                // Load this chapter's image, and the next one ahead of the reader.
                setLoadedThrough(loaded => Math.max(loaded, index + 1));
                emitStoryEvent({ type: 'chapter-enter', chapter: section.id, direction });
                // Forward over the start of the scene, the pen writes its page; going back over it, the writing simply
                // finishes (once written, the text stays). The first page is written as the stage comes up.
                if (index > 0) {
                  (playheadForward() ? pageWriters[index].start : pageWriters[index].finish)();
                }
              },
              undefined,
              start + 0.01
            );

            // The page, written by the pen: the kicker typed, the heading written, then the whole body and the roll
            // call, by the same pen. Timed, not scrubbed: it starts when the chapter settles and runs at a steady pace
            // that leads the eye (penPlan), a word at a time for a long chapter. Weighted phrases get a breath before
            // them and are written a touch slower. Once written, the text stays. A click on the panel, or scrolling
            // onward, finishes it at once.
            const kicker = one('[data-story="kicker"]', scene);
            const heading = one('[data-story="heading"]', scene);
            const point = one('[data-story="quill"]', scene);
            const quillBody = one('[data-story="quill-body"]', scene);
            const writing = gsap.timeline({ paused: true });
            const pageEl = one('[data-story="page"]', scene);
            if (point !== null && quillBody !== null) {
              const pen = createQuillWriter(point, quillBody);
              let at = 0;
              if (kicker !== null) {
                const split = splitForQuill(kicker);
                splits.push(split);
                const kickerLetters = split.chars as HTMLElement[];
                kickerLetters.forEach((letter, letterIndex) =>
                  writing.set(letter, { opacity: 1 }, letterIndex / STORY_PACE.kickerRate)
                );
                at += kickerLetters.length / STORY_PACE.kickerRate;
              }
              if (heading !== null) {
                const split = splitForQuill(heading);
                splits.push(split);
                const headingLetters = split.chars as HTMLElement[];
                at += pen.write(writing, headingLetters, at, headingLetters.length / STORY_PACE.headingSeconds);
              }
              // The body and the roll call: letters, or whole words for a long page.
              const written = quote('[data-story="body"] [data-pen="char"], [data-story="roll-call"] [data-pen="char"]');
              const wordUnits = quote('[data-story="body"] [data-pen="word"], [data-story="roll-call"] [data-pen="word"]');
              const plan = penPlan(written.length, wordUnits.length);
              const units = plan.unit === 'letter' ? written : wordUnits;
              gsap.set(units, { opacity: 0 });
              // Runs of plain units, and the weighted phrases between them.
              let run: HTMLElement[] = [];
              const flush = () => {
                if (run.length > 0) {
                  at += pen.write(writing, run, at, plan.rate);
                  run = [];
                }
              };
              let weightedRun: HTMLElement | null = null;
              let weightedUnits: HTMLElement[] = [];
              const flushWeighted = () => {
                if (weightedUnits.length > 0) {
                  at += STORY_PACE.weightedBreath;
                  at += pen.write(writing, weightedUnits, at, plan.rate / STORY_PACE.weightedSlowdown);
                  weightedUnits = [];
                }
                weightedRun = null;
              };
              units.forEach(unit => {
                const weighted = unit.closest<HTMLElement>('[data-pen="weighted"]');
                if (weighted !== null) {
                  if (weightedRun !== weighted) {
                    flush();
                    flushWeighted();
                    weightedRun = weighted;
                  }
                  weightedUnits.push(unit);
                } else {
                  flushWeighted();
                  run.push(unit);
                }
              });
              flush();
              flushWeighted();
              writing.call(() => {
                if (pageEl !== null) {
                  pageEl.dataset.written = 'true';
                }
                onWritten[index]?.forEach(callback => callback());
                onWritten[index] = [];
              }, undefined, at);
              pageWriters.push({
                seconds: writing.duration(),
                start: () => {
                  if (writing.progress() === 0 && !writing.isActive()) {
                    writing.play(0);
                  }
                },
                finish: () => {
                  if (writing.progress() < 1) {
                    writing.progress(1);
                    pen.hide();
                  }
                },
                written: () => writing.progress() === 1,
              });
            } else {
              pageWriters.push({ seconds: 0, start: () => undefined, finish: () => undefined, written: () => true });
            }
            headingTimelines.push(writing);
            pageEl?.addEventListener('click', () => pageWriters[index]?.finish());

            // The page: the chapter's text, in its panel on one side of the image. It holds for a stretch of scroll
            // (`STORY_PACE.pageHold`) before the hook can begin.
            const page = one('[data-story="page"]', scene);
            const names = quote('[data-story="name"]');
            const textFrom = t;
            // (A moment after the page starts: a call at the timeline's very start never fires.)
            emitAt(t + 0.02, () => ({ type: 'beat', chapter: section.id, index: 0, direction }));
            t += STORY_PACE.pageHold;
            const textTo = t;

            // The hook: the names go out like candles, last to first; the panel dims away; the image darkens and the
            // camera creeps closer; the line takes the centre of the screen; then it decays, and stillness.
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
              // The panel dims away, and the image's labels and credit go quiet: the hook has the whole screen.
              const quiet = [page, one('[data-story="corners"]', scene)].filter((element): element is HTMLElement => element !== null);
              if (quiet.length > 0) {
                timeline.fromTo(
                  quiet,
                  { opacity: 1 },
                  { opacity: 0, duration: SCENE.pageOut, ease: MOTION['ink.out'].ease, immediateRender: false },
                  t
                );
              }
              const hushFrom = t;
              t += SCENE.pageOut;
              // The breath before the hook: the column has cleared; the image darkens further and the camera creeps
              // closer, and for a stretch of scroll nothing new appears.
              const breath = MOTION['story.breath'].duration;
              dimTo(SCENE.hookDim, t, breath);
              const figure = one('[data-story="figure"]', scene);
              if (figure !== null) {
                timeline.fromTo(
                  figure,
                  { scale: 1 },
                  { scale: SCENE.creepTo, ease: MOTION['story.breath'].ease, duration: breath, immediateRender: false },
                  t
                );
              }
              t += breath;
              // Then the hook: once the reader reaches it, the whole line snaps in on a timer (not scrubbed), its
              // letters starting a little out of line (each its own way, the same every time) and settling into place
              // over `STORY_PACE.hookIn`. Then it holds. Going back over its start, it leaves the same way, quicker.
              // The letters are already split, word by word (StoryWords.tsx).
              const hookChars = all('[data-story="hook-char"]', hook);
              const offset = (char: number, salt: string, size: number) => (hashUnit(`${section.id}:${char}`, salt) * 2 - 1) * size;
              gsap.set(hookChars, { opacity: 0 });
              const snap = MOTION['story.hook'].duration;
              const hookIn = gsap.timeline({ paused: true }).fromTo(
                hookChars,
                {
                  opacity: 0,
                  x: index => offset(index, 'x', SCENE.hookMisalign.x),
                  y: index => offset(index, 'y', SCENE.hookMisalign.y),
                  rotation: index => offset(index, 'r', SCENE.hookMisalign.rotate),
                },
                {
                  opacity: 1,
                  x: 0,
                  y: 0,
                  rotation: 0,
                  ...tween('story.hook'),
                  stagger: Math.max(0, STORY_PACE.hookIn - snap) / Math.max(1, hookChars.length - 1),
                }
              );
              headingTimelines.push(hookIn);
              hookIns.push({ at: t, timeline: hookIn });
              timeline.addLabel(`hook-${index}`, t);
              timeline.set(hook, { opacity: 1, pointerEvents: 'auto' }, t);
              timeline.call(
                () => {
                  if (playheadForward()) {
                    hookIn.timeScale(1).restart();
                  } else {
                    hookIn.timeScale(SCENE.hookBackRate).reverse();
                  }
                },
                undefined,
                t
              );
              emitAt(t, () => ({ type: 'hook', chapter: section.id, direction }));
              t += STORY_PACE.hookIn + STORY_PACE.hookHold;
              // The decay takes the letters from whole: the snap is finished first if it is still settling.
              hookIns[hookIns.length - 1].decayAt = t;
              // The ending decays: its letters disappear unevenly, one at a time in a random order, like ink drying.
              const decaying = [...hookChars].sort(
                (a, b) => hashUnit(`${section.id}:${hookChars.indexOf(a)}`, 'decay') - hashUnit(`${section.id}:${hookChars.indexOf(b)}`, 'decay')
              );
              if (decaying.length > 0) {
                const decayFade = MOTION['story.decay'].duration;
                timeline.fromTo(
                  decaying,
                  { opacity: 1 },
                  {
                    opacity: 0,
                    ...tween('story.decay'),
                    stagger: Math.max(0, STORY_PACE.hookDecay - decayFade) / Math.max(1, decaying.length - 1),
                    immediateRender: false,
                  },
                  t
                );
              }
              t += STORY_PACE.hookDecay;
              timeline.set(hook, { pointerEvents: 'none' }, t);
              t += STORY_PACE.stillness;
              hooks.push({ from: hushFrom, to: t });
            } else {
              t += SCENE.restWithoutHook;
            }

            // The camera: a slow push in and pan across the whole chapter, still moving as the next dissolves in.
            const image = one('[data-story="image"]', scene);
            const pan = PANS[index % PANS.length];
            const cameraFrom = index === 0 ? 0 : start;
            if (image !== null) {
              timeline.fromTo(
                image,
                { scale: 1, xPercent: 0, yPercent: 0 },
                { scale: SCENE.zoomTo, xPercent: pan.x, yPercent: pan.y, duration: t - cameraFrom + STORY_PACE.dissolve },
                cameraFrom
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
              const from = span.start - STORY_PACE.dissolve;
              const on = time >= from && time <= span.end + STORY_PACE.dissolve;
              if (on !== cameraOn[index] && images[index] !== null) {
                cameraOn[index] = on;
                images[index].style.willChange = on ? 'transform' : '';
              }
            });
          };

          // Only the scene on screen takes clicks: the scenes lie on top of each other in one stage, and an invisible
          // one above the visible one would swallow a tap meant for a portal name.
          const startsOf = spans.map(span => span.start);
          let activeScene = 0;
          const syncActive = (time: number) => {
            const next = activeSceneIndex(startsOf, time);
            if (next !== activeScene) {
              scenes[activeScene].dataset.active = 'false';
              scenes[next].dataset.active = 'true';
              activeScene = next;
            }
          };

          const mixAt = (time: number) => {
            let mix = steps[0]?.mix ?? 0;
            spans.forEach((span, index) => {
              if (time < span.start || index === 0) {
                return;
              }
              const into = Math.min(1, (time - span.start) / STORY_PACE.dissolve);
              mix = steps[index - 1].mix + (steps[index].mix - steps[index - 1].mix) * into;
            });
            return mix;
          };

          const pinned = ScrollTrigger.create({
            trigger: stage,
            start: 'top top',
            end: () => `+=${Math.round(timeline.duration() * pxPerSecond())}`,
            pin: true,
            scrub: STORY_PACE.scrub,
            anticipatePin: 1,
            animation: timeline,
            invalidateOnRefresh: true,
            onUpdate: self => {
              direction = self.direction < 0 ? 'backward' : 'forward';
              writeSky(mixAt(timeline.time()));
              syncWillChange(timeline.time());
              syncActive(timeline.time());
              // Nothing else on screen while a hook is there: the chart inset goes quiet.
              if (chartFrame !== null) {
                const hushed = hooks.some(hook => timeline.time() >= hook.from && timeline.time() < hook.to);
                if ((chartFrame.dataset.hushed === 'true') !== hushed) {
                  chartFrame.dataset.hushed = String(hushed);
                }
              }
              // Scrolling on into a hook's decay while its snap still settles: the snap finishes first.
              hookIns.forEach(hookIn => {
                if (hookIn.decayAt !== undefined && timeline.time() >= hookIn.decayAt && hookIn.timeline.progress() < 1 && !hookIn.timeline.reversed()) {
                  hookIn.timeline.progress(1);
                }
              });
              // Scrolling onward into a page finishes its writing at once: the reader is never kept waiting.
              if (direction === 'forward') {
                spans.forEach((span, spanIndex) => {
                  if (timeline.time() > span.textFrom + STORY_PACE.skipAfter && timeline.time() < span.end) {
                    pageWriters[spanIndex]?.finish();
                  }
                });
              }
            },
            onToggle: self => {
              if (chartFrame !== null) {
                chartFrame.dataset.visible = String(self.isActive);
              }
            },
            // The first scene has no dissolve to start it: its page is written as the stage comes up.
            onEnter: () => pageWriters[0]?.start(),
            onLeaveBack: () => pageWriters[0]?.finish(),
          });

          syncWillChange(0);
          syncActive(0);

          // ---- "Play the story": a stop at every page, where it waits for the pen, then gives the page its reading
          // time; the hooks between pass at the story's own pace. Worked out when play is pressed, from the pin.
          const whenWritten = (index: number) =>
            new Promise<void>(resolve => {
              if (pageWriters[index]?.written() ?? true) {
                resolve();
                return;
              }
              onWritten[index].push(resolve);
              pageWriters[index].start();
            });
          playPlanRef.current = () => {
            const px = pxPerSecond();
            const pages: PlayStep[] = spans.map((span, index) => {
              const text = all('[data-story="paragraph"], [data-story="name"]', scenes[index])
                .map(element => element.textContent ?? '')
                .join(' ');
              return {
                y: pinned.start + span.textFrom * px,
                waitFor: () => whenWritten(index),
                hold: Math.max(STORY_PACE.playHoldAtLeast, readingSeconds(text) - (pageWriters[index]?.seconds ?? 0)),
              };
            });
            return [...pages, ...questionStops()];
          };
          cleanups.push(() => {
            playPlanRef.current = null;
          });

          // ---- Coming out of the legend's night, the start of the story eases into the first scene's sky.
          ScrollTrigger.create({
            trigger: stage,
            start: 'top bottom',
            end: 'top top',
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
            headingTimelines.forEach(heading => heading.kill());
            scenes.forEach((scene, index) => (scene.dataset.active = String(index === 0)));
            images.forEach(image => image !== null && (image.style.willChange = ''));
            splits.forEach(split => split.revert());
            if (chartFrame !== null) {
              chartFrame.dataset.visible = 'false';
            }
          });
        }

        // ---- The central question, the chokepoint. Full motion: a pinned, full-black screen; the question builds
        // phrase by phrase, each written in with `ink.in`, its weighted parts landing like weighted words. Each phrase
        // is a stop: ScrollTrigger snaps the scroll to its label (`story.settle`), never locking it. The fork only
        // comes once the whole question is on screen, after a short hold. "Play the story" scrolls through at the
        // same pace, so it reads it slowly, pausing on each phrase. Reduced motion: the question is shown whole.
        const question = one('[data-story="question"]');
        const phrases = all('[data-story="phrase"]');
        const questionWeighted = all('[data-story="question"] [data-story="weighted"]');
        if (question !== null && phrases.length > 0) {
          if (reduced || !cinematic) {
            gsap.set(phrases, { opacity: 0 });
            ScrollTrigger.create({
              trigger: question,
              start: 'top 70%',
              once: true,
              onEnter: () => gsap.to(phrases, { opacity: 1, ...tween('ink.in') }),
            });
            // The fork: once the question has been read and the reader scrolls on; scrolling back up closes it.
            ScrollTrigger.create({
              trigger: question,
              start: 'bottom 60%',
              onEnter: () => setForkOpen(true),
              onLeaveBack: () => setForkOpen(false),
            });
            backToQuestionRef.current = () => question.scrollIntoView?.({ behavior: 'auto', block: 'start' });
          } else {
            const chokepoint = gsap.timeline({ defaults: { ease: LINEAR } });
            gsap.set([...phrases, ...questionWeighted], { opacity: 0 });
            let at: number = STORY_PACE.questionLead;
            const phraseIns: gsap.core.Timeline[] = [];
            phrases.forEach((phrase, index) => {
              // The stop: as soon as the scroll reaches it, the phrase plays in on a timer (`STORY_PACE.questionPhrase`),
              // its weighted parts landing on their own after a breath. Going back over it, it leaves, quicker.
              const phraseIn = gsap.timeline({ paused: true });
              phraseIn.fromTo(
                phrase,
                { opacity: 0, y: INK_RISE },
                { opacity: 1, y: 0, ease: MOTION['ink.in'].ease, duration: STORY_PACE.questionPhrase }
              );
              let landAt = STORY_PACE.questionPhrase;
              all('[data-story="weighted"]', phrase).forEach(span => {
                landAt += SCENE.weightBeat;
                phraseIn.fromTo(span, { opacity: 0, y: -INK_RISE }, { opacity: 1, y: 0, ...tween('story.weighted') }, landAt);
                landAt += MOTION['story.weighted'].duration;
              });
              phraseIns.push(phraseIn);
              chokepoint.addLabel(`phrase-${index}`, at);
              chokepoint.call(
                () => {
                  const forward = chokepoint.time() >= chokepointLast;
                  if (forward) {
                    phraseIn.timeScale(1).play();
                  } else {
                    phraseIn.timeScale(SCENE.hookBackRate).reverse();
                  }
                },
                undefined,
                at
              );
              // The phrase holds for its time to arrive and to be read before the next stop.
              at += phraseIn.duration() + Math.max(STORY_PACE.readAtLeast, readingSeconds(phrase.textContent ?? ''));
            });
            let chokepointLast = 0;
            chokepoint.eventCallback('onUpdate', () => {
              chokepointLast = chokepoint.time();
            });
            cleanups.push(() => phraseIns.forEach(phraseIn => phraseIn.kill()));
            // The whole question, held a moment before the fork.
            chokepoint.addLabel('whole', at);
            chokepoint.to({}, { duration: STORY_PACE.beforeFork }, at);
            const settle = MOTION['story.settle'];
            const questionPin = ScrollTrigger.create({
              trigger: question,
              start: 'top top',
              end: () => `+=${Math.round(chokepoint.duration() * pxPerSecond())}`,
              pin: true,
              scrub: STORY_PACE.scrub,
              animation: chokepoint,
              invalidateOnRefresh: true,
              // The fork: once the whole question has held and the reader scrolls on; back up, it closes.
              onLeave: () => setForkOpen(true),
              onEnterBack: () => setForkOpen(false),
              snap: {
                snapTo: 'labelsDirectional',
                duration: { min: settle.duration / 2, max: settle.duration },
                delay: STEP.fast,
                ease: settle.ease,
                inertia: false,
              },
            });
            // Playing reads it slowly: a stop at every phrase, held for its reading time, then the whole question.
            questionStops = () => {
              const px = pxPerSecond();
              return [
                ...phrases.map((phrase, index) => ({
                  y: questionPin.start + chokepoint.labels[`phrase-${index}`] * px,
                  hold: (phraseIns[index]?.duration() ?? 0) + readingSeconds(phrase.textContent ?? ''),
                })),
                {
                  y: questionPin.start + chokepoint.labels.whole * px,
                  hold: STORY_PACE.beforeFork,
                  then: () => setForkOpen(true),
                },
              ];
            };
            backToQuestionRef.current = () => scrollToY(questionPin.start + chokepoint.labels.whole * pxPerSecond());
          }
        }

        // Web fonts change the height of the text. Measure again once they are in.
        let current = true;
        document.fonts?.ready.then(() => current && ScrollTrigger.refresh());

        return () => {
          current = false;
          gsap.set([...phrases, ...questionWeighted], { clearProps: 'opacity,transform' });
          cleanups.forEach(cleanup => cleanup());
          delete root.dataset.tone;
          root.style.removeProperty('--story-sky');
          // Hand the page's background back to the stylesheet (night on a case page, index.css).
          document.documentElement.style.removeProperty('background-color');
        };
      });
    },
    { scope: rootRef, dependencies: [story, centralQuestion, centralQuestionEmphasis, cinematic, route, steps, count, canAnimate], revertOnUpdate: true }
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

        {cinematic ? (
          <div data-story="stage" className="relative h-svh overflow-hidden bg-[var(--story-sky)]">
            {story.map((section, index) => (
              <StoryScene
                key={section.id}
                section={section}
                index={index}
                grade={grades[index]}
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

        <CentralQuestion question={centralQuestion} emphasis={centralQuestionEmphasis} />
        {/* After the question, more black to scroll into: scrolling on brings the fork. No lighter band below. */}
        <div aria-hidden="true" data-story="after-question" className="h-[45svh] bg-black" />
        {fork !== undefined && (
          <Fork
            {...fork}
            open={forkOpen}
            onClose={() => {
              setForkOpen(false);
              backToQuestionRef.current();
            }}
          />
        )}

        {cinematic && <VoyageChart route={route} variant="live" onExpand={player.pause} />}
        {cinematic && <PlayControl player={player} />}
      </section>
    </PortalProvider>
  );
}
