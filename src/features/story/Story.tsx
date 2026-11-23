// src/features/story/Story.tsx
// The real story, told like a documentary, in steps (docs/briefs/story-steps.md). Every chapter is a full-screen
// scene: the image fills the screen under a slow camera, and the pen writes the chapter's page in a dark panel on
// one side. Then its hook takes the centre of the screen; then the next chapter; then the central question, one line
// at a time; then the fork.
//
// Under full motion the story is a fixed, full-screen stage: it never scrolls as a long page. GSAP's Observer turns
// each wheel, touch or pointer gesture into exactly one step, however hard the flick (story-steps.ts); the keyboard
// does the same. While a step's animation plays, input is ignored. A forward gesture while the pen is writing
// finishes the page and stays on it. Every step ends by painting the exact state of that step (`paint`), so nothing
// from another step (a hook's letters, a page) can be left on screen. A rail on the left shows where the reader is,
// and jumps. The reader can also let the story play itself.
//
// The story begins only once the reader has chosen, in the play modal, how to hear it (`start`).
// Under reduced motion the chapters are plain stacked sections on a normal scrolling page, with their pages already
// written. Everything shown comes from props. Nothing about any one case is written in this file.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
import { Observer } from 'gsap/Observer';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import PortalProvider from '@/features/portals/PortalProvider';
import Fork, { type ForkProps } from '@/features/fork/Fork';
import CentralQuestion from '@/features/story/CentralQuestion';
import PlayControl from '@/features/story/PlayControl';
import StoryChapter from '@/features/story/StoryChapter';
import StoryRail from '@/features/story/StoryRail';
import StoryScene from '@/features/story/StoryScene';
import VoyageChart from '@/features/story/VoyageChart';
import { createPageWriter, type PageWriter } from '@/features/story/page-writer';
import {
  buildSteps,
  chapterOf,
  createWheelGate,
  stepName,
  stepOfTick,
  tickOf,
  type StoryStep,
} from '@/features/story/story-steps';
import { useStepPlayer, type StepDriver } from '@/features/story/use-step-player';
import { dayNightStep, imageGrade, skyColour, textTone } from '@/lib/day-night';
import { hashUnit } from '@/lib/desk';
import { INK_RISE, MOTION, MOTION_QUERIES, tween } from '@/lib/motion';
import { splitQuestion } from '@/lib/phrases';
import { holdSmoothScroll, jumpToY, releaseSmoothScroll } from '@/lib/smooth-scroll';
import { STORY_PACE, readingSeconds } from '@/lib/story-pages';
import { emitStoryEvent, type StoryDirection } from '@/lib/story-events';
import { useReducedMotion } from '@/lib/use-reduced-motion';
import { buildRoute } from '@/lib/voyage-chart';
import type { Reference, Source, StorySection, Voyage } from '@/types/case';

// ScrollTrigger is registered inside the component: it needs window.matchMedia as soon as it is registered.
gsap.registerPlugin(useGSAP, Observer);

/** How the scenes look as they move. Their pace is `STORY_PACE` (src/lib/story-pages.ts). */
const SCENE = {
  /** The page's panel dims away before the hook takes the screen. */
  pageOut: 0.45,
  hookDim: 0.92,
  /** Weighted words in the central question: the breath before a phrase lands on its own. */
  weightBeat: 0.45,
  /** The breath before a hook: the camera creeps this much closer. */
  creepTo: 1.05,
  /** Where a hook's letters start: up to this far out of line, in px and degrees, then they snap into place. */
  hookMisalign: { x: 5, y: 7, rotate: 12 },
  /** The camera's slow push in. */
  zoomTo: 1.12,
  /** A name going out like a candle: [opacity, seconds] steps. */
  candle: [
    [0.35, 0.07],
    [0.9, 0.07],
    [0.5, 0.05],
    [0, 0.17],
  ],
} as const;

const CANDLE_SECONDS = SCENE.candle.reduce((sum, [, seconds]) => sum + seconds, 0);

/** Each chapter's camera pans its own way, as a share of the image (xPercent, yPercent). */
const PANS = [
  { x: -3.5, y: -1.5 },
  { x: 3.5, y: -1 },
  { x: -2.5, y: 2 },
  { x: 3, y: 1.5 },
  { x: -3, y: -2 },
  { x: 2.5, y: -2.5 },
] as const;

/** Where a gesture is someone else's: a portal card, a dialog, an inner scrolling area, the story's own controls. */
const NOT_A_STEP = '[data-portal="root"], [role="dialog"], [data-lenis-prevent], [data-story-control]';

/** The keys that move the story, while nothing modal is open. */
const FORWARD_KEYS = new Set(['ArrowDown', 'PageDown', ' ']);
const BACK_KEYS = new Set(['ArrowUp', 'PageUp']);

/** What the play modal's choice, the rail and the fork's Escape ask of the stage. */
interface StageControls {
  begin: () => void;
  jump: (index: number) => void;
  closeFork: () => void;
}

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
  const lines = useMemo(() => splitQuestion(centralQuestion), [centralQuestion]);
  const hasFork = fork !== undefined;
  const steps = useMemo(() => buildSteps(story, lines.length, hasFork), [story, lines, hasFork]);
  const driverRef = useRef<StepDriver | null>(null);
  const player = useStepPlayer(cinematic, driverRef);
  const stageRef = useRef<StageControls | null>(null);
  /** The fork is open over the question. (Whether it shows is state; how it moves is GSAP's.) */
  const [forkOpen, setForkOpen] = useState(false);
  /** The story has begun: the stage holds the screen. The rail shows. */
  const [begun, setBegun] = useState(false);
  /** The rail's lit tick: the chapter on screen, or the question. */
  const [tick, setTick] = useState(-1);
  // Images load one chapter ahead of the reader. The first one loads at once.
  const [loadedThrough, setLoadedThrough] = useState(0);
  /** Escape on the fork, on the stacked page: back to the question. */
  const backToQuestionRef = useRef<() => void>(() => undefined);

  const dayNight = useMemo(() => story.map((_, index) => dayNightStep(index, count)), [story, count]);
  const grades = useMemo(() => story.map((_, index) => imageGrade(index, count)), [story, count]);
  const route = useMemo(() => buildRoute(voyage, story), [voyage, story]);
  const railLabels = useMemo(() => [...story.map(section => section.heading), 'The question'], [story]);

  /** "Read at my pace" on the stacked page: to the top of the story, at once. */
  const goToTop = useCallback(() => {
    rootRef.current?.scrollIntoView?.({ behavior: 'auto', block: 'start' });
  }, []);

  // The reader has chosen how to hear the story: it begins on the first page. "Play the story" then plays it.
  const startToken = start?.token;
  const startMode = start?.mode;
  const { play } = player;
  useEffect(() => {
    if (startToken === undefined) {
      return;
    }
    if (!cinematic) {
      goToTop();
      return;
    }
    stageRef.current?.begin();
    if (startMode === 'play') {
      play();
    }
  }, [startToken, startMode, cinematic, play, goToTop]);

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
        let mix = 1;
        const writeSky = (next: number) => {
          mix = next;
          const nextTone = textTone(next);
          if (nextTone !== tone) {
            tone = nextTone;
            root.dataset.tone = nextTone;
          }
          const nextColour = skyColour(next);
          if (nextColour !== colour) {
            colour = nextColour;
            root.style.setProperty('--story-sky', nextColour);
            document.documentElement.style.backgroundColor = nextColour;
          }
        };
        const cleanups: (() => void)[] = [];
        const restoreSky = () => {
          delete root.dataset.tone;
          root.style.removeProperty('--story-sky');
          // Hand the page's background back to the stylesheet (night on a case page, index.css).
          document.documentElement.style.removeProperty('background-color');
        };

        if (reduced || !cinematic) {
          // ---- Reduced motion: stacked sections on a normal page. The text fades in as it comes into view;
          // nothing moves.
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
              onToggle: self => self.isActive && writeSky(dayNight[index]?.mix ?? 1),
            });
          });
          const question = one('[data-story="question"]');
          const phrases = all('[data-story="phrase"]');
          if (question !== null) {
            ScrollTrigger.create({
              trigger: question,
              start: 'top 60%',
              onToggle: self => writeSky(self.isActive ? 1 : (dayNight[count - 1]?.mix ?? 1)),
            });
          }
          if (question !== null && phrases.length > 0) {
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
          }
          let live = true;
          document.fonts?.ready.then(() => live && ScrollTrigger.refresh());
          return () => {
            live = false;
            gsap.set([...fading, ...phrases], { clearProps: 'opacity' });
            restoreSky();
          };
        }

        // ---- The cinematic story: one fixed stage, played in steps.
        const stage = one('[data-story="stage"]');
        if (stage === null) {
          return;
        }
        const scenes = all('[data-story="chapter"]', stage);
        const questionLayer = one('[data-story="question-layer"]', stage);
        const phrases = questionLayer === null ? [] : all('[data-story="phrase"]', questionLayer);
        const chartFrame = one('[data-chart="frame"][data-variant="live"]');
        const playControl = one('[data-story="play-control"]');
        const reveals = chartFrame === null ? [] : all('[data-chart="reveal"]', chartFrame);
        const ship = chartFrame?.querySelector('[data-chart="ship"]') ?? null;
        const dots = new Map((chartFrame === null ? [] : all('[data-chart="point"]', chartFrame)).map(dot => [dot.dataset.id, dot]));

        /** Each scene's parts. */
        const parts = scenes.map(scene => ({
          page: one('[data-story="page"]', scene),
          corners: one('[data-story="corners"]', scene),
          names: all('[data-story="name"]', scene),
          dim: one('[data-story="dim"]', scene),
          figure: one('[data-story="figure"]', scene),
          image: one('[data-story="image"]', scene),
          hook: one('[data-story="hook-moment"]', scene),
          hookChars: all('[data-story="hook-char"]', scene),
        }));

        // ---- The pen: one writer per page. A click on the page (or the roll call) finishes its writing at once.
        const writers: PageWriter[] = scenes.map(scene => createPageWriter(scene));
        scenes.forEach((scene, index) => {
          const finish = () => writers[index].finish();
          [one('[data-story="page"]', scene), one('[data-story="roll-call"]', scene)].forEach(element =>
            element?.addEventListener('click', finish)
          );
        });
        cleanups.push(() => writers.forEach(writer => writer.revert()));

        // ---- Each hook's snap: the whole line at once, its letters settling from out of line (each its own way,
        // the same every time) over `STORY_PACE.hookIn`.
        const hookIns = parts.map(({ hookChars }, index) => {
          if (hookChars.length === 0) {
            return null;
          }
          const id = story[index]?.id ?? String(index);
          const offset = (char: number, salt: string, size: number) => (hashUnit(`${id}:${char}`, salt) * 2 - 1) * size;
          gsap.set(hookChars, { opacity: 0 });
          const snap = MOTION['story.hook'].duration;
          return gsap.timeline({ paused: true }).fromTo(
            hookChars,
            {
              opacity: 0,
              x: char => offset(char, 'x', SCENE.hookMisalign.x),
              y: char => offset(char, 'y', SCENE.hookMisalign.y),
              rotation: char => offset(char, 'r', SCENE.hookMisalign.rotate),
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
        });
        /** A hook's letters in their decay order: uneven, the same every time. */
        const decayOrder = parts.map(({ hookChars }, index) => {
          const id = story[index]?.id ?? String(index);
          return [...hookChars].sort(
            (a, b) => hashUnit(`${id}:${hookChars.indexOf(a)}`, 'decay') - hashUnit(`${id}:${hookChars.indexOf(b)}`, 'decay')
          );
        });

        // ---- Each line of the question: it plays in on a timer, its weighted parts landing on their own after a
        // breath, slightly brighter.
        const phraseWeighted = phrases.map(phrase => all('[data-story="weighted"]', phrase));
        gsap.set([...phrases, ...phraseWeighted.flat()], { opacity: 0 });
        const phraseIns = phrases.map((phrase, index) => {
          const timeline = gsap.timeline({ paused: true });
          timeline.fromTo(
            phrase,
            { opacity: 0, y: INK_RISE },
            { opacity: 1, y: 0, ease: MOTION['ink.in'].ease, duration: STORY_PACE.questionPhrase }
          );
          let at: number = STORY_PACE.questionPhrase;
          phraseWeighted[index].forEach(span => {
            at += SCENE.weightBeat;
            timeline.fromTo(span, { opacity: 0, y: -INK_RISE }, { opacity: 1, y: 0, ...tween('story.weighted') }, at);
            at += MOTION['story.weighted'].duration;
          });
          return timeline;
        });
        cleanups.push(() => [...hookIns, ...phraseIns].forEach(timeline => timeline?.kill()));

        // ---- Where the story is. Written to the DOM (`data-step`, `data-animating`), never to React state, except
        // the rail's lit tick and whether the fork is open.
        let current = -1;
        let animating = false;
        let transition: gsap.core.Timeline | null = null;
        /** Who is waiting for the step on screen to settle ("Play the story"). */
        let settled: (() => void)[] = [];
        const setStep = (index: number) => {
          current = index;
          root.dataset.step = stepName(steps[index]);
          setTick(tickOf(steps[index], count));
        };
        const setAnimating = (value: boolean) => {
          animating = value;
          root.dataset.animating = String(value);
        };
        root.dataset.step = 'none';
        setAnimating(false);

        /** The chapter whose scene is on screen in a step: the question and the fork sit over the last one. */
        const sceneOf = (step: StoryStep | undefined) => {
          const chapter = chapterOf(step);
          return chapter === -1 ? (step === undefined ? 0 : count - 1) : chapter;
        };
        const onQuestion = (step: StoryStep | undefined) => step?.kind === 'line' || step?.kind === 'fork';
        const linesShown = (step: StoryStep | undefined) =>
          step?.kind === 'fork' ? phrases.length : step?.kind === 'line' ? step.line + 1 : 0;

        /** A scene as its page shows it, or as its hook does. */
        const look = (index: number, as: 'page' | 'hook') => {
          const { page, corners, names, dim, figure, hook, hookChars } = parts[index];
          const quiet = [page, corners].filter((element): element is HTMLElement => element !== null);
          gsap.killTweensOf([...quiet, ...names, dim, figure, hook].filter((element): element is HTMLElement => element !== null));
          gsap.set(quiet, { opacity: as === 'page' ? 1 : 0 });
          gsap.set(names, { opacity: as === 'page' ? 1 : 0 });
          if (dim !== null) {
            gsap.set(dim, { opacity: as === 'page' ? 0 : SCENE.hookDim });
          }
          if (figure !== null) {
            gsap.set(figure, { scale: as === 'page' ? 1 : SCENE.creepTo });
          }
          if (hook !== null) {
            if (as === 'hook') {
              hookIns[index]?.pause().progress(1);
              gsap.set(hookChars, { opacity: 1, x: 0, y: 0, rotation: 0 });
            } else {
              hookIns[index]?.pause().progress(0);
              gsap.set(hookChars, { opacity: 0 });
            }
            gsap.set(hook, { opacity: as === 'hook' ? 1 : 0, pointerEvents: as === 'hook' ? 'auto' : 'none' });
          }
        };

        /** The chart, drawn up to `chapter`: the stretches that end in it too, unless they are about to be drawn. */
        const drawChart = (chapter: number, holdBack: boolean) => {
          gsap.killTweensOf(reveals);
          let shipAt: { x: number; y: number } | null = null;
          route.segments.forEach((segment, index) => {
            const reveal = reveals[index];
            if (reveal === undefined) {
              return;
            }
            const end = segment.to.chapterIndex;
            const drawn = end < chapter || (end === chapter && !holdBack);
            gsap.set(reveal, { attr: { 'stroke-dashoffset': drawn ? 0 : 1 } });
            const dot = dots.get(segment.to.id);
            if (dot !== undefined) {
              gsap.set(dot, { opacity: drawn ? 1 : 0 });
            }
            if (drawn) {
              shipAt = segment.to;
            }
          });
          const at = shipAt as { x: number; y: number } | null;
          if (at !== null) {
            ship?.setAttribute('transform', `translate(${at.x} ${at.y})`);
          }
        };

        /** Draws the stretches of the voyage that end in `chapter`, one after another, while its page is on screen. */
        const drawStretches = (chapter: number) => {
          const stretches = route.segments
            .map((segment, index) => ({ segment, reveal: reveals[index] }))
            .filter(({ segment, reveal }) => segment.to.chapterIndex === chapter && reveal !== undefined);
          const each = STORY_PACE.chartDraw / Math.max(1, stretches.length);
          stretches.forEach(({ segment, reveal }, order) => {
            gsap.fromTo(
              reveal,
              { attr: { 'stroke-dashoffset': 1 } },
              {
                attr: { 'stroke-dashoffset': 0 },
                ease: MOTION.scene.ease,
                duration: each,
                delay: order * each,
                onUpdate() {
                  const p = this.progress();
                  const x = segment.from.x + (segment.to.x - segment.from.x) * p;
                  const y = segment.from.y + (segment.to.y - segment.from.y) * p;
                  ship?.setAttribute('transform', `translate(${x} ${y})`);
                },
                onComplete: () => {
                  const dot = dots.get(segment.to.id);
                  if (dot !== undefined) {
                    gsap.to(dot, { opacity: 1, ...tween('hover') });
                  }
                },
              }
            );
          });
        };

        /**
         * The exact state of a step, at once: only its scene shown, in its page's look or its hook's; every other
         * hook and page hidden; the pages before it written; the question's lines up to it; the chart, the sky, the
         * fork. `fresh`: the step's page has just been reached going forward, so its pen and its stretch of chart
         * are still to come.
         */
        const paint = (index: number, fresh: boolean) => {
          transition?.kill();
          transition = null;
          const step = steps[index];
          const shown = sceneOf(step);
          const question = onQuestion(step);
          const freshPage = fresh && step?.kind === 'page';
          scenes.forEach((scene, sceneIndex) => {
            gsap.killTweensOf(scene);
            gsap.set(scene, { opacity: sceneIndex === shown ? 1 : 0 });
            scene.dataset.active = String(sceneIndex === shown && !question);
            look(sceneIndex, sceneIndex === shown && step?.kind === 'hook' ? 'hook' : 'page');
            const image = parts[sceneIndex].image;
            if (image !== null) {
              if (sceneIndex !== shown) {
                gsap.killTweensOf(image);
                gsap.set(image, { scale: 1, xPercent: 0, yPercent: 0 });
              }
              image.style.willChange = sceneIndex === shown && !question ? 'transform' : '';
            }
          });
          // Pages before this one count as written, and so does this one unless it has just been reached.
          writers.forEach((writer, writerIndex) => {
            if (writerIndex < shown || question || (writerIndex === shown && !freshPage)) {
              writer.finish();
            }
          });
          // The question.
          if (questionLayer !== null) {
            gsap.killTweensOf(questionLayer);
            gsap.set(questionLayer, { opacity: question ? 1 : 0, pointerEvents: question ? 'auto' : 'none' });
          }
          const shownLines = linesShown(step);
          phraseIns.forEach((timeline, line) => {
            timeline.pause().progress(line < shownLines ? 1 : 0);
            if (line >= shownLines) {
              gsap.set([phrases[line], ...phraseWeighted[line]], { opacity: 0 });
            }
          });
          // The chart: on while a chapter is on screen, quiet while its hook is, away for the question.
          drawChart(question ? count : shown, freshPage);
          if (chartFrame !== null) {
            chartFrame.dataset.visible = String(!question);
            chartFrame.dataset.hushed = String(step?.kind === 'hook');
          }
          writeSky(question ? 1 : (dayNight[shown]?.mix ?? 1));
          setLoadedThrough(loaded => Math.max(loaded, Math.min(count - 1, shown + 1)));
          setForkOpen(step?.kind === 'fork');
        };

        /** What follows a step once it has settled: the pen, the camera, the chart. */
        const settle = (index: number, fresh: boolean, direction: StoryDirection) => {
          const step = steps[index];
          if (step?.kind === 'page') {
            const section = story[step.chapter];
            emitStoryEvent({ type: 'chapter-enter', chapter: section.id, direction });
            emitStoryEvent({ type: 'beat', chapter: section.id, index: 0, direction });
            const image = parts[step.chapter].image;
            if (image !== null && (fresh || !gsap.isTweening(image))) {
              // The camera: a slow push in and pan across the page, never holding up a step.
              const pan = PANS[step.chapter % PANS.length];
              gsap.fromTo(
                image,
                { scale: 1, xPercent: 0, yPercent: 0 },
                { scale: SCENE.zoomTo, xPercent: pan.x, yPercent: pan.y, ease: MOTION.scene.ease, duration: STORY_PACE.cameraDrift, overwrite: true }
              );
            }
            if (fresh) {
              writers[step.chapter].start();
              drawStretches(step.chapter);
            }
          }
          const waiting = settled;
          settled = [];
          waiting.forEach(resolve => resolve());
        };

        /** Moves to step `index`, with `build` adding the animation on the way; nothing new is accepted meanwhile. */
        const moveTo = (index: number, fresh: boolean, direction: StoryDirection, build: (timeline: gsap.core.Timeline) => void) =>
          new Promise<boolean>(resolve => {
            transition?.kill();
            setAnimating(true);
            setStep(index);
            // `data` marks it as a step's own animation (tests settle it with this).
            const timeline = gsap.timeline({
              data: 'story-step',
              onComplete: () => {
                paint(index, fresh);
                setAnimating(false);
                settle(index, fresh, direction);
                resolve(true);
              },
            });
            build(timeline);
            // A step with nothing to animate still settles a moment later, so a burst of input cannot slip through.
            if (timeline.duration() === 0) {
              timeline.to({}, { duration: STORY_PACE.settleAtLeast });
            }
            transition = timeline;
          });

        /** Hides every hook at once but those of the steps being left and reached: no fragment can stay on screen. */
        const hideHooksBut = (...keep: number[]) => {
          parts.forEach(({ hook, hookChars }, index) => {
            if (hook !== null && !keep.includes(index)) {
              hookIns[index]?.pause().progress(0);
              gsap.set(hookChars, { opacity: 0 });
              gsap.set(hook, { opacity: 0, pointerEvents: 'none' });
            }
          });
        };

        /** The top layer of a step: the question over everything, or its scene. */
        const topOf = (step: StoryStep | undefined) => (onQuestion(step) ? questionLayer : scenes[sceneOf(step)]);

        /** One step forward or back, by that step's own animation. */
        const step = (delta: 1 | -1): Promise<boolean> => {
          const target = current + delta;
          const from = steps[current];
          const to = steps[target];
          if (from === undefined || to === undefined) {
            return Promise.resolve(false);
          }
          const fromScene = sceneOf(from);
          const toScene = sceneOf(to);
          hideHooksBut(chapterOf(from), chapterOf(to));

          if (delta === 1) {
            return moveTo(target, to.kind === 'page', 'forward', timeline => {
              let at = 0;
              // Leaving a page for its hook: the names go out like candles, last to first; the page and the image's
              // corners dim away; the image darkens and the camera creeps closer; then the hook snaps in, whole.
              if (from.kind === 'page' && to.kind === 'hook') {
                const { page, corners, names, dim, figure, hook } = parts[fromScene];
                const section = story[fromScene];
                [...names].reverse().forEach((name, order) => {
                  const when = order * STORY_PACE.nameOutEvery;
                  timeline.to(name, { keyframes: SCENE.candle.map(([opacity, seconds]) => ({ opacity, duration: seconds })) }, when);
                  const label = name.querySelector('span')?.textContent ?? '';
                  timeline.call(() => emitStoryEvent({ type: 'roll-call-out', chapter: section.id, name: label, direction: 'forward' }), undefined, when);
                });
                at = names.length > 0 ? (names.length - 1) * STORY_PACE.nameOutEvery + CANDLE_SECONDS : 0;
                const quiet = [page, corners].filter((element): element is HTMLElement => element !== null);
                if (quiet.length > 0) {
                  timeline.to(quiet, { opacity: 0, duration: SCENE.pageOut, ease: MOTION['ink.out'].ease }, at);
                }
                const breath = { ease: MOTION['story.breath'].ease, duration: SCENE.pageOut + STORY_PACE.breath };
                if (dim !== null) {
                  timeline.to(dim, { opacity: SCENE.hookDim, ...breath }, at);
                }
                if (figure !== null) {
                  timeline.to(figure, { scale: SCENE.creepTo, ...breath }, at);
                }
                at += breath.duration;
                if (hook !== null) {
                  timeline.set(hook, { opacity: 1, pointerEvents: 'auto' }, at);
                  timeline.call(
                    () => {
                      hookIns[fromScene]?.timeScale(1).restart();
                      emitStoryEvent({ type: 'hook', chapter: section.id, direction: 'forward' });
                    },
                    undefined,
                    at
                  );
                  timeline.to({}, { duration: STORY_PACE.hookIn }, at);
                }
                if (chartFrame !== null) {
                  chartFrame.dataset.hushed = 'true';
                }
                return;
              }
              // Leaving a hook: its letters decay one at a time, in an uneven order, like ink drying away.
              if (from.kind === 'hook') {
                const decaying = decayOrder[fromScene];
                if (decaying.length > 0) {
                  const fade = MOTION['story.decay'].duration;
                  const stagger = Math.max(0, STORY_PACE.hookDecay - fade) / Math.max(1, decaying.length - 1);
                  timeline.to(decaying, { opacity: 0, ...tween('story.decay'), stagger }, 0);
                }
                at = STORY_PACE.hookDecay;
              }
              // On to the next chapter: its image cross-dissolves in over the last, its page still to be written.
              if (to.kind === 'page' && toScene !== fromScene) {
                look(toScene, 'page');
                timeline.fromTo(scenes[toScene], { opacity: 0 }, { opacity: 1, duration: STORY_PACE.dissolve }, at);
                const sky = { mix };
                timeline.to(sky, { mix: dayNight[toScene]?.mix ?? 1, duration: STORY_PACE.dissolve, onUpdate: () => writeSky(sky.mix) }, at);
                return;
              }
              // On to the question: the black screen comes over the last scene, then its first line plays in.
              if (to.kind === 'line' && to.line === 0 && questionLayer !== null) {
                timeline.fromTo(questionLayer, { opacity: 0 }, { opacity: 1, duration: STORY_PACE.dissolve }, at);
                at += STORY_PACE.dissolve;
              }
              if (to.kind === 'line') {
                const line = to.line;
                timeline.call(() => phraseIns[line]?.timeScale(1).restart(), undefined, at);
                timeline.to({}, { duration: phraseIns[line]?.duration() ?? 0 }, at);
              }
              // The fork has its own entrance (Fork.tsx).
            });
          }

          // Back, one step: quicker, and the page it returns to is already written.
          return moveTo(target, false, 'backward', timeline => {
            const quick = { duration: STORY_PACE.backDissolve, ease: MOTION['ink.out'].ease };
            if (from.kind === 'fork') {
              return;
            }
            if (from.kind === 'line' && to.kind === 'line') {
              timeline.to([phrases[from.line], ...phraseWeighted[from.line]], { opacity: 0, ...quick });
              return;
            }
            if (from.kind === 'hook' && to.kind === 'page' && toScene === fromScene) {
              // Back from a hook to its page: the hook goes, the page comes back as it was.
              const { page, corners, names, dim, figure, hook } = parts[fromScene];
              const quiet = [page, corners].filter((element): element is HTMLElement => element !== null);
              if (hook !== null) {
                timeline.to(hook, { opacity: 0, ...quick }, 0);
              }
              timeline.to([...quiet, ...names], { opacity: 1, ...quick }, 0);
              if (dim !== null) {
                timeline.to(dim, { opacity: 0, ...quick }, 0);
              }
              if (figure !== null) {
                timeline.to(figure, { scale: 1, ...quick }, 0);
              }
              return;
            }
            // Back across a scene (or from the question): the step returned to is laid underneath, then the one
            // left fades away over it.
            const leaving = topOf(from);
            paint(target, false);
            if (leaving !== null && leaving !== topOf(to)) {
              gsap.set(leaving, { opacity: 1 });
              timeline.to(leaving, { opacity: 0, ...quick });
            }
          });
        };

        /** A jump (the rail, Home): straight to the step, with a quick dissolve; the pages before it are written. */
        const jump = (index: number) => {
          if (index < 0 || index >= steps.length || index === current) {
            return;
          }
          const fresh = steps[index]?.kind === 'page';
          const direction: StoryDirection = index > current ? 'forward' : 'backward';
          void moveTo(index, fresh, direction, timeline => {
            paint(index, fresh);
            const top = topOf(steps[index]);
            if (top !== null) {
              timeline.fromTo(top, { opacity: 0 }, { opacity: 1, duration: STORY_PACE.jumpDissolve, ease: MOTION.scene.ease });
            }
          });
        };

        /** Escape on the fork, or a gesture back: the fork closes over the whole question. */
        const closeFork = () => {
          const last = steps.findLastIndex(entry => entry.kind === 'line');
          if (steps[current]?.kind === 'fork' && last >= 0) {
            void moveTo(last, false, 'backward', () => undefined);
          } else {
            setForkOpen(false);
          }
        };

        // ---- Gestures. A forward gesture while the pen is writing finishes the page and stays on it; the next one
        // moves on. Every other gesture is one step, forward or back.
        const forward = () => {
          const at = steps[current];
          if (at === undefined || at.kind === 'fork') {
            return;
          }
          if (at.kind === 'page' && !writers[at.chapter].written()) {
            writers[at.chapter].finish();
            return;
          }
          void step(1);
        };
        const back = () => {
          if (current > 0) {
            void step(-1);
          }
        };
        const modalOpen = () => document.querySelector('[aria-modal="true"]') !== null;

        const gate = createWheelGate();
        // Every wheel event is noted first (capture, on the window), so a burst is a burst however small its tail.
        const noteWheel = (event: WheelEvent) => gate.note(event.timeStamp || performance.now());
        window.addEventListener('wheel', noteWheel, { capture: true, passive: true });
        cleanups.push(() => window.removeEventListener('wheel', noteWheel, { capture: true }));
        let pressUsed = false;
        /** Whether something else should take this gesture: a dialog, the controls, a page panel that still scrolls. */
        const notOurs = (event: Event) => {
          const target = event.target instanceof Element ? event.target : null;
          if (target === null) {
            return false;
          }
          if (target.closest(NOT_A_STEP) !== null) {
            return true;
          }
          const panel = target.closest<HTMLElement>('[data-story="page"]');
          if (panel === null || panel.scrollHeight <= panel.clientHeight + 1) {
            return false;
          }
          if (event.type === 'wheel') {
            const down = (event as WheelEvent).deltaY > 0;
            return down ? panel.scrollTop + panel.clientHeight < panel.scrollHeight - 1 : panel.scrollTop > 0;
          }
          // A finger on a page that scrolls: it scrolls the page.
          return true;
        };
        const gesture = (self: Observer, direction: 1 | -1) => {
          if (current < 0) {
            return;
          }
          const atFork = steps[current]?.kind === 'fork';
          // While a modal is open the story stays put; at the fork, a gesture back closes it.
          if (modalOpen() && !(atFork && direction === -1)) {
            return;
          }
          let take: boolean;
          if (self.event?.type === 'wheel') {
            take = gate.take(!animating);
          } else {
            take = !pressUsed && !animating;
            pressUsed = true;
          }
          if (!take) {
            return;
          }
          if (direction === 1) {
            forward();
          } else if (atFork) {
            closeFork();
          } else {
            back();
          }
        };
        const observer = Observer.create({
          target: window,
          type: 'wheel,touch,pointer',
          // Wheel down and a finger moving up both go forward: `onUp`.
          wheelSpeed: -1,
          tolerance: STORY_PACE.gestureTolerance,
          dragMinimum: STORY_PACE.gestureTolerance,
          preventDefault: true,
          debounce: false,
          ignoreCheck: event => notOurs(event),
          onPress: () => {
            pressUsed = false;
          },
          onUp: self => gesture(self, 1),
          onDown: self => gesture(self, -1),
        });
        observer.disable();
        cleanups.push(() => observer.kill());

        // ---- The keyboard: ↓, PageDown and Space forward; ↑ and PageUp back; Home to the start. Only while no
        // modal or portal card is open.
        const onKey = (event: KeyboardEvent) => {
          if (current < 0 || event.defaultPrevented || modalOpen() || event.altKey || event.ctrlKey || event.metaKey) {
            return;
          }
          const target = event.target instanceof Element ? event.target : null;
          // Space on a button or a link presses it.
          if (event.key === ' ' && target?.closest('button, a[href], [role="button"], input, textarea, select') != null) {
            return;
          }
          if (FORWARD_KEYS.has(event.key)) {
            event.preventDefault();
            if (!animating) {
              forward();
            }
          } else if (BACK_KEYS.has(event.key)) {
            event.preventDefault();
            if (!animating) {
              back();
            }
          } else if (event.key === 'Home') {
            event.preventDefault();
            jump(0);
          }
        };
        window.addEventListener('keydown', onKey);
        cleanups.push(() => window.removeEventListener('keydown', onKey));

        // ---- The stage holds the screen once the story begins: the page stops scrolling, at the story's top.
        let holding = false;
        const begin = () => {
          if (!holding) {
            holding = true;
            jumpToY(stage.getBoundingClientRect().top + window.scrollY);
            holdSmoothScroll();
            document.documentElement.dataset.storyStage = 'held';
            observer.enable();
            setBegun(true);
            if (playControl !== null) {
              playControl.dataset.visible = 'true';
            }
          }
          if (current < 0) {
            setStep(0);
            paint(0, true);
            settle(0, true, 'forward');
          }
        };
        cleanups.push(() => {
          if (holding) {
            releaseSmoothScroll();
            delete document.documentElement.dataset.storyStage;
          }
          setBegun(false);
        });
        stageRef.current = { begin, jump, closeFork };
        cleanups.push(() => {
          stageRef.current = null;
        });

        // ---- "Play the story": each step is held for its time, then the next one comes.
        const untilSettled = () => (animating ? new Promise<void>(resolve => settled.push(resolve)) : Promise.resolve());
        driverRef.current = {
          ready: async () => {
            await untilSettled();
            const now = steps[current];
            if (now === undefined || now.kind === 'fork') {
              return null;
            }
            if (now.kind === 'page') {
              const writer = writers[now.chapter];
              writer.start();
              await writer.whenWritten();
              const text = all('[data-story="paragraph"], [data-story="name"]', scenes[now.chapter])
                .map(element => element.textContent ?? '')
                .join(' ');
              return Math.max(STORY_PACE.playHoldAtLeast, readingSeconds(text) - writer.seconds);
            }
            if (now.kind === 'hook') {
              return STORY_PACE.hookHold;
            }
            const read = readingSeconds(phrases[now.line]?.textContent ?? '');
            return now.line === phrases.length - 1 ? read + STORY_PACE.beforeFork : read;
          },
          next: async () => {
            await untilSettled();
            const now = steps[current];
            if (now === undefined || now.kind === 'fork' || current + 1 >= steps.length) {
              return false;
            }
            return step(1);
          },
        };
        cleanups.push(() => {
          driverRef.current = null;
        });

        // Before the story begins: the first scene waits under the play modal, its page still to be written.
        writeSky(1);
        scenes.forEach((scene, index) => {
          scene.dataset.active = String(index === 0);
          gsap.set(scene, { opacity: index === 0 ? 1 : 0 });
        });
        if (chartFrame !== null) {
          chartFrame.dataset.visible = 'false';
        }
        drawChart(0, true);

        return () => {
          transition?.kill();
          cleanups.forEach(cleanup => cleanup());
          parts.forEach(({ image }) => image !== null && (image.style.willChange = ''));
          delete root.dataset.step;
          delete root.dataset.animating;
          restoreSky();
        };
      });
    },
    { scope: rootRef, dependencies: [story, centralQuestion, centralQuestionEmphasis, cinematic, route, steps, dayNight, count, canAnimate], revertOnUpdate: true }
  );

  const jumpToTick = (tickIndex: number) => {
    player.pause();
    stageRef.current?.jump(stepOfTick(steps, tickIndex, count));
  };

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
              <StoryScene key={section.id} section={section} index={index} grade={grades[index]} loadImage={index <= loadedThrough} />
            ))}
            {/* The central question, over the last scene, one line per step. */}
            <div data-story="question-layer" className="pointer-events-none absolute inset-0 z-[6] opacity-0">
              <CentralQuestion question={centralQuestion} emphasis={centralQuestionEmphasis} />
            </div>
          </div>
        ) : (
          <>
            {story.map((section, index) => (
              <StoryChapter key={section.id} section={section} index={index} step={dayNight[index]} grade={grades[index]} route={route} />
            ))}
            <CentralQuestion question={centralQuestion} emphasis={centralQuestionEmphasis} />
            {/* After the question, more black to scroll into: scrolling on brings the fork. */}
            <div aria-hidden="true" data-story="after-question" className="h-[45svh] bg-black" />
          </>
        )}
        {fork !== undefined && (
          <Fork
            {...fork}
            open={forkOpen}
            onClose={() => {
              if (cinematic) {
                stageRef.current?.closeFork();
              } else {
                setForkOpen(false);
                backToQuestionRef.current();
              }
            }}
          />
        )}

        {cinematic && <VoyageChart route={route} variant="live" onExpand={player.pause} />}
        {cinematic && <PlayControl player={player} />}
        {cinematic && <StoryRail labels={railLabels} current={tick} hidden={!begun || forkOpen} onJump={jumpToTick} />}
      </section>
    </PortalProvider>
  );
}
