// src/features/story/Story.tsx
// The real story, told like a documentary (docs/briefs/story-redesign.md). Every chapter is a full-screen scene:
// the image fills the screen under a slow camera, the quill writes the heading, the chapter's sentences rise in
// a text column as the reader scrolls, and the hook takes the whole screen before the next scene dissolves in. The scenes lie on top of
// each other in one pinned stage, and one timeline, scrubbed by the scroll, plays them in turn.
// The story opens on the first scene itself: the case's title, years, stamp and teaser lie over chapter 1's image
// (StoryOpening). As the reader scrolls they clear, the title docks into the case header, and chapter 1 begins on
// the same image: one image, one title.
// A small chart in the corner draws the voyage as it goes. The reader can scroll, or let the story play itself.
// Under reduced motion the chapters are plain stacked sections with still images, and the text only fades in.
// Everything shown comes from props. Nothing about any one case is written in this file.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollToPlugin } from 'gsap/ScrollToPlugin';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import PortalProvider from '@/features/portals/PortalProvider';
import CentralQuestion from '@/features/story/CentralQuestion';
import PlayCard from '@/features/story/PlayCard';
import PlayControl from '@/features/story/PlayControl';
import { activeSceneIndex } from '@/features/story/active-scene';
import StoryChapter from '@/features/story/StoryChapter';
import StoryOpening, { type OpeningCard } from '@/features/story/StoryOpening';
import { dockTitle, undockTitle } from '@/features/story/dock-title';
import StoryScene from '@/features/story/StoryScene';
import VoyageChart from '@/features/story/VoyageChart';
import { pxPerSecond, useStoryPlayer } from '@/features/story/use-story-player';
import { dayNightStep, imageGrade, skyColour, textTone } from '@/lib/day-night';
import { hashUnit } from '@/lib/desk';
import { INK_RISE, LINEAR, MOTION, MOTION_QUERIES, STEP, tween } from '@/lib/motion';
import { createQuillWriter, splitForQuill } from '@/lib/quill-writing';
import { scrollToY, setWheelMultiplier } from '@/lib/smooth-scroll';
import { splitIntoBeats } from '@/lib/story-beats';
import { COLUMN, SCROLL_FEEL, sentenceSeconds } from '@/lib/story-column';
import { STORY_PACE, penPlan } from '@/lib/story-pages';
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
  /** The page's panel dims away before the hook takes the screen. */
  pageOut: 0.45,
  nameOut: 0.36,
  hookDim: 0.92,
  /** "Hooks hold about 4s." */
  hookHold: 4,
  /** A beat of stillness: nothing changes before the next scene. */
  stillness: 1.6,
  /** Weighted words: the beat of stillness before a phrase lands, and how long its rust line takes to grow. */
  weightBeat: STEP.slow,
  weightLine: STEP.slow,
  /** The breath before a hook: the camera creeps this much closer, over `story.breath`. */
  creepTo: 1.05,
  /** A hook comes in word by word, one every so many seconds of scroll: slower than anything else. */
  hookWordEvery: 0.55,
  /** Where a hook's letters start: up to this far out of line, in px and degrees, then they snap into place. */
  hookMisalign: { x: 5, y: 7, rotate: 12 },
  /** A hook decays letter by letter over this long, in a random order. */
  decay: 1.8,
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

/**
 * The opening, over the first scene, in seconds of the scrubbed timeline. Its parts leave (and the title docks) on
 * their own timers once the scroll passes `leave`, so nothing is ever left half faded; chapter 1 starts at `span`.
 */
const OPENING = {
  /** The scroll that passes before the opening clears and the title docks. */
  leave: 0.5,
  /** Where chapter 1 begins: its heading is written, then its column rises, on the same image. */
  span: 1.6,
} as const;

/** The central question, in seconds of the scrubbed timeline: black before the first phrase, the least a phrase
 * holds, and the hold on the whole question before the fork. */
const QUESTION = {
  lead: 0.6,
  holdAtLeast: 1.6,
  beforeFork: STEP.scene * 2,
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
  /** The case's title, years and teaser, for the opening scene before the first chapter. */
  opening?: OpeningCard;
}

export default function Story({ story, centralQuestion, centralQuestionEmphasis, references, sources, voyage, opening }: StoryProps) {
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
  const sentences = useMemo(() => story.map(section => section.body.flatMap(splitIntoBeats)), [story]);
  const route = useMemo(() => buildRoute(voyage, story), [voyage, story]);

  // While the story is on the page, a wheel or trackpad moves it less (SCROLL_FEEL), so the text does not race.
  useEffect(() => {
    if (!cinematic) {
      return;
    }
    setWheelMultiplier(SCROLL_FEEL.wheelMultiplier);
    return () => setWheelMultiplier(1);
  }, [cinematic]);

  /** "Read at my pace": a short glide to where chapter 1 begins, unless the reader is already past it. */
  const goToFirstScene = useCallback(() => {
    const stage = rootRef.current?.querySelector<HTMLElement>('[data-story="stage"]');
    if (stage === null || stage === undefined) {
      return;
    }
    const lead = opening !== undefined ? OPENING.span * pxPerSecond() : 0;
    const y = stage.getBoundingClientRect().top + window.scrollY + lead;
    if (y > window.scrollY + 1) {
      scrollToY(y);
    }
  }, [opening]);

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
            /** When the page is on screen: the chart draws its route in between. */
            textFrom: number;
            textTo: number;
            end: number;
          }
          const spans: Span[] = [];
          // With an opening, the first scene starts with it: its title, years, stamp and teaser over chapter 1's image.
          const overlay = one('[data-story="opening"][data-overlay="true"]', stage);
          let t = overlay !== null ? OPENING.span : 0;
          // One timer-driven heading per scene (see HEADING), and the timelines to clean up.
          // Which way the playhead is moving: the scrub brings it to the scroll, so it can trail the scroll's direction.
          let lastTime = 0;
          timeline.eventCallback('onUpdate', () => {
            lastTime = timeline.time();
          });
          const playheadForward = () => timeline.time() >= lastTime;
          /** Each chapter's pen: start writing its page, finish it at once, and whether it is written. */
          const pageWriters: { start: () => void; finish: () => void; written: () => boolean }[] = [];
          const headingTimelines: gsap.core.Timeline[] = [];
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
              timeline.fromTo(scene, { opacity: 0 }, { opacity: 1, duration: SCENE.dissolve, immediateRender: false }, start);
              t += SCENE.dissolve;
            }
            timeline.call(
              () => {
                // Load this chapter's image, and the next one ahead of the reader.
                setLoadedThrough(loaded => Math.max(loaded, index + 1));
                emitStoryEvent({ type: 'chapter-enter', chapter: section.id, direction });
                // Forward over the start of the scene, the pen writes its page; going back over it, the writing simply
                // finishes (once written, the text stays). The first page is written as the stage comes up, or after
                // the opening when there is one.
                if (index > 0 || overlay !== null) {
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
              pageWriters.push({ start: () => undefined, finish: () => undefined, written: () => true });
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
              // The panel dims away, so the hook has the whole screen.
              if (page !== null) {
                timeline.fromTo(
                  page,
                  { opacity: 1 },
                  { opacity: 0, duration: SCENE.pageOut, ease: MOTION['ink.out'].ease, immediateRender: false },
                  t
                );
              }
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
              // Then the hook, word by word, slower than anything else: its letters start a little out of line (each
              // its own way, the same every time) and snap into place.
              // The letters are already split, word by word (StoryWords.tsx).
              const hookWords = all('[data-story="hook-word"]', hook);
              const hookChars = all('[data-story="hook-char"]', hook);
              const offset = (char: number, salt: string, size: number) => (hashUnit(`${section.id}:${char}`, salt) * 2 - 1) * size;
              gsap.set(hookChars, { opacity: 0 });
              timeline.set(hook, { opacity: 1, pointerEvents: 'auto' }, t);
              emitAt(t, () => ({ type: 'hook', chapter: section.id, direction }));
              hookWords.forEach((word, wordIndex) => {
                const chars = hookChars.filter(char => word.contains(char));
                const first = hookChars.indexOf(chars[0]);
                timeline.fromTo(
                  chars,
                  {
                    opacity: 0,
                    x: index => offset(first + index, 'x', SCENE.hookMisalign.x),
                    y: index => offset(first + index, 'y', SCENE.hookMisalign.y),
                    rotation: index => offset(first + index, 'r', SCENE.hookMisalign.rotate),
                  },
                  { opacity: 1, x: 0, y: 0, rotation: 0, ...tween('story.hook'), immediateRender: false },
                  t + wordIndex * SCENE.hookWordEvery
                );
              });
              t += Math.max(0, hookWords.length - 1) * SCENE.hookWordEvery + MOTION['story.hook'].duration + SCENE.hookHold;
              // The ending decays: its letters disappear unevenly, one at a time in a random order, like ink drying.
              const decaying = [...hookChars].sort(
                (a, b) => hashUnit(`${section.id}:${hookChars.indexOf(a)}`, 'decay') - hashUnit(`${section.id}:${hookChars.indexOf(b)}`, 'decay')
              );
              if (decaying.length > 0) {
                const decayFade = MOTION['story.decay'].duration;
                timeline.to(
                  decaying,
                  {
                    opacity: 0,
                    ...tween('story.decay'),
                    stagger: Math.max(0, SCENE.decay - decayFade) / Math.max(1, decaying.length - 1),
                    immediateRender: false,
                  },
                  t
                );
              }
              t += SCENE.decay;
              timeline.set(hook, { pointerEvents: 'none' }, t);
              t += SCENE.stillness;
            } else {
              t += SCENE.restWithoutHook;
            }

            // The camera: a slow push in and pan across the whole chapter, still moving as the next dissolves in.
            // The first scene's camera starts with the opening, which lies over the same image.
            const image = one('[data-story="image"]', scene);
            const pan = PANS[index % PANS.length];
            const cameraFrom = index === 0 ? 0 : start;
            if (image !== null) {
              timeline.fromTo(
                image,
                { scale: 1, xPercent: 0, yPercent: 0 },
                { scale: SCENE.zoomTo, xPercent: pan.x, yPercent: pan.y, duration: t - cameraFrom + SCENE.dissolve },
                cameraFrom
              );
            }
            spans.push({ start, textFrom, textTo, end: t });
          });

          // ---- The opening over the first scene. Once the scroll passes `OPENING.leave` its parts leave on their own
          // timer (ink.out) and the title floats up into the case header; scrolling back brings them in again and
          // takes the title out of the header. Never scrubbed, so nothing rests half faded.
          if (overlay !== null) {
            const bigTitle = one('[data-opening="title"]', overlay);
            const parts = all('[data-opening="years"], [data-opening="stamp"], [data-opening="teaser"], [data-opening="cue"], [data-opening="shade"]', overlay);
            let cleared = false;
            root.dataset.pastOpening = 'false';
            const clear = () => {
              if (cleared) {
                return;
              }
              cleared = true;
              root.dataset.pastOpening = 'true';
              gsap.to(parts, { opacity: 0, ...tween('ink.out'), overwrite: true });
              if (bigTitle !== null) {
                dockTitle(bigTitle, { reduced: false });
              }
            };
            const bringBack = () => {
              if (!cleared) {
                return;
              }
              cleared = false;
              root.dataset.pastOpening = 'false';
              gsap.to(parts, { opacity: 1, ...tween('ink.in'), overwrite: true });
              if (bigTitle !== null) {
                undockTitle(bigTitle);
              }
            };
            timeline.call(() => (playheadForward() ? clear() : bringBack()), undefined, OPENING.leave);
            cleanups.push(() => {
              delete root.dataset.pastOpening;
            });
          }

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
              // The first scene's camera runs from the very start, under the opening.
              const from = index === 0 ? 0 : span.start - SCENE.dissolve;
              const on = time >= from && time <= span.end + SCENE.dissolve;
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
            scrub: COLUMN.scrub,
            anticipatePin: 1,
            animation: timeline,
            invalidateOnRefresh: true,
            onUpdate: self => {
              direction = self.direction < 0 ? 'backward' : 'forward';
              writeSky(mixAt(timeline.time()));
              syncWillChange(timeline.time());
              syncActive(timeline.time());
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
            // The first scene has no dissolve to start it: without an opening, its heading is written as the stage
            // comes up. (With one, it is written once the opening has cleared, above.)
            onEnter: () => overlay === null && pageWriters[0]?.start(),
            onLeaveBack: () => overlay === null && pageWriters[0]?.finish(),
          });

          syncWillChange(0);
          syncActive(0);

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
        const questionRules = all('[data-story="question"] [data-story="weight-line"]');
        if (question !== null && phrases.length > 0) {
          if (reduced || !cinematic) {
            gsap.set(questionRules, { scaleX: 1 });
            gsap.set(phrases, { opacity: 0 });
            ScrollTrigger.create({
              trigger: question,
              start: 'top 70%',
              once: true,
              onEnter: () => gsap.to(phrases, { opacity: 1, ...tween('ink.in') }),
            });
          } else {
            const chokepoint = gsap.timeline({ defaults: { ease: LINEAR } });
            gsap.set([...phrases, ...questionWeighted], { opacity: 0 });
            let at: number = QUESTION.lead;
            phrases.forEach((phrase, index) => {
              chokepoint.fromTo(
                phrase,
                { opacity: 0, y: INK_RISE },
                { opacity: 1, y: 0, ...tween('ink.in'), immediateRender: false },
                at
              );
              at += MOTION['ink.in'].duration;
              all('[data-story="weighted"]', phrase).forEach(span => {
                at += SCENE.weightBeat;
                chokepoint.fromTo(
                  span,
                  { opacity: 0, y: -INK_RISE },
                  { opacity: 1, y: 0, ...tween('story.weighted'), immediateRender: false },
                  at
                );
                at += MOTION['story.weighted'].duration;
                const rule = one('[data-story="weight-line"]', span);
                if (rule !== null) {
                  chokepoint.fromTo(
                    rule,
                    { scaleX: 0 },
                    { scaleX: 1, ease: MOTION['story.weighted'].ease, duration: SCENE.weightLine, immediateRender: false },
                    at
                  );
                  at += SCENE.weightLine;
                }
              });
              // The stop: the scroll settles here, with the phrase written in, and holds it for its reading time.
              chokepoint.addLabel(`phrase-${index}`, at);
              at += Math.max(QUESTION.holdAtLeast, sentenceSeconds(phrase.textContent ?? ''));
            });
            // The whole question, held a moment before the fork.
            chokepoint.addLabel('whole', at);
            chokepoint.to({}, { duration: QUESTION.beforeFork }, at);
            const settle = MOTION['story.settle'];
            ScrollTrigger.create({
              trigger: question,
              start: 'top top',
              end: () => `+=${Math.round(chokepoint.duration() * pxPerSecond())}`,
              pin: true,
              scrub: COLUMN.scrub,
              animation: chokepoint,
              invalidateOnRefresh: true,
              snap: {
                snapTo: 'labelsDirectional',
                duration: { min: settle.duration / 2, max: settle.duration },
                delay: STEP.fast,
                ease: settle.ease,
                inertia: false,
              },
            });
          }
        }

        // Web fonts change the height of the text. Measure again once they are in.
        let current = true;
        document.fonts?.ready.then(() => current && ScrollTrigger.refresh());

        return () => {
          current = false;
          gsap.set([...phrases, ...questionWeighted], { clearProps: 'opacity,transform' });
          gsap.set(questionRules, { clearProps: 'transform' });
          cleanups.forEach(cleanup => cleanup());
          delete root.dataset.tone;
          root.style.removeProperty('--story-sky');
          // Hand the page's background back to the stylesheet (night on a case page, index.css).
          document.documentElement.style.removeProperty('background-color');
        };
      });
    },
    { scope: rootRef, dependencies: [story, centralQuestion, centralQuestionEmphasis, cinematic, sentences, route, steps, count, canAnimate], revertOnUpdate: true }
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
        {/* Reduced motion: the opening has its own screen at night, before chapter 1 and its image. */}
        {opening !== undefined && !cinematic && <StoryOpening card={opening} />}

        {cinematic ? (
          <div data-story="stage" className="relative h-svh overflow-hidden bg-[var(--story-sky)]">
            {/* The opening lies over the first scene, on its image. */}
            {opening !== undefined && <StoryOpening card={opening} overlay />}
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

        {cinematic && <VoyageChart route={route} variant="live" onExpand={player.pause} />}
        {cinematic && <PlayControl player={player} />}
        <PlayCard player={cinematic ? player : null} onRead={goToFirstScene} storyRef={rootRef} />
      </section>
    </PortalProvider>
  );
}
