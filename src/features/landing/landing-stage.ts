// src/features/landing/landing-stage.ts
// The landing page's stage (landing fixes brief; one case per gesture): on a laptop at full motion a tall track holds a
// sticky full-screen stage, and one timeline, scrubbed by the scroll position, plays every transition: the current
// frame scales up and leaves up and to the left while the next, peeking at the bottom right, rises and grows into the
// centre. Each frame hangs from a wire: it leans a degree or two as it travels and the one coming in settles with one
// soft sway back.
//
// One gesture moves exactly one case. A wheel or trackpad gesture, a swipe, or an arrow, Page or Space key press is
// taken here (before Lenis sees it) and becomes one smooth Lenis scroll to the next or previous case (`landing.stage`).
// While that move runs, input is ignored; a wheel gesture (a flick and all its trailing momentum, `LANDING_GESTURE`)
// moves at most once, and a burst that meets a move still running is spent, so only a new
// gesture that starts once the case has settled counts. However hard the flick, it is one case. Past the last case the
// next gesture is let through to Lenis, and the page scrolls on into the footer as normal; scrolling up from the top
// of the footer goes back to the last case in one move. The rail, Home, End and the header wordmark jump straight to
// their case.
//
// Text only when the scroll has settled on a case: the headline, subline and title leave as soon as a move starts and
// come back only once it has landed: the headline and subline blur in, the title is written in letter by letter, its
// years fading in after.
//
// Everything animated is `transform` and `opacity`; the blur is on text blocks only. Pure DOM and GSAP: it reads the
// section markup of ExhibitSection.tsx (`data-exhibit-part`) and knows nothing about any case.
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { LANDING_BLUR, LANDING_SETTLE, SCRUB, STEP, tween } from '@/lib/motion';
import { getLenis, jumpToY, scrollToY, setSmoothLerp } from '@/lib/smooth-scroll';
import { STORY_PACE } from '@/lib/story-pages';

// ScrollTrigger is registered when a stage is made: it needs window.matchMedia as soon as it is registered.
gsap.registerPlugin(SplitText);

/** How softly the page follows the wheel on the landing page (Lenis's lerp). */
export const LANDING_LERP = 0.08;

/** How far a leaving frame goes, as a share of the screen, and how big it grows on the way out. */
export const STAGE_AWAY = { x: -0.62, y: -0.8, scale: 1.7 } as const;

/**
 * What makes a wheel event a new gesture rather than the tail of the last one: a quiet gap of more than `gapMs`, and
 * then either a gap of more than `momentumMs` or a push harder than the last event (a trackpad's momentum only ever
 * dies away, so a tail never grows). However hard the flick, and however long its momentum trails, it is one gesture.
 */
export const LANDING_GESTURE = { gapMs: 300, momentumMs: 800, growth: 1.15 } as const;

/** One wheel gesture at a time: `note` every wheel event, then `take` asks whether this gesture may still move. */
export function createGestureGate({ gapMs, momentumMs, growth } = LANDING_GESTURE) {
  let last = Number.NEGATIVE_INFINITY;
  let lastSize = 0;
  let used = false;
  return {
    note(now: number, delta: number): void {
      const gap = now - last;
      const size = Math.abs(delta);
      if (gap > momentumMs || (gap > gapMs && size > lastSize * growth)) {
        used = false;
      }
      last = now;
      lastSize = size;
    },
    /** This gesture asks to move; `free` is false while a move runs. A gesture that meets a move is spent. */
    take(free: boolean): boolean {
      if (used) {
        return false;
      }
      used = true;
      return free;
    },
  };
}

/** How long a move may take before it is counted as landed whatever happens, past its own duration, in ms. */
export const MOVE_GRACE_MS = 400;

/** How far a frame leans as it travels, in degrees: it hangs from a wire, so it swings from its top edge. */
export const FRAME_SWING = 1.8;


/** The section's pieces that move. */
interface Parts {
  section: HTMLElement;
  /** The frame and its title, together: the opening fades them in. */
  place: HTMLElement | null;
  /** The frame, and what moves with it. */
  anchor: HTMLElement;
  /** The frame's own wrapper inside it: what swings, from its top edge. */
  rise: HTMLElement | null;
  /** The title beside the frame, with its name (written in) and its years (faded in after). */
  title: HTMLElement | null;
  name: HTMLElement | null;
  years: HTMLElement | null;
  /** The headline and the subline together. */
  words: HTMLElement | null;
}

function partsOf(section: HTMLElement): Parts | null {
  const anchor = section.querySelector<HTMLElement>('[data-exhibit-part="anchor"]');
  const title = section.querySelector<HTMLElement>('[data-exhibit-part="title"]');
  if (anchor === null) {
    return null;
  }
  return {
    section,
    place: section.querySelector<HTMLElement>('[data-exhibit-part="place"]'),
    anchor,
    rise: section.querySelector<HTMLElement>('[data-exhibit-part="rise"]'),
    title,
    name: title?.querySelector<HTMLElement>('h2') ?? null,
    years: title?.querySelector<HTMLElement>('p') ?? null,
    words: section.querySelector<HTMLElement>('[data-exhibit-part="words"]'),
  };
}

/** The headline and subline: they blur in and out. (The title is written, not blurred.) */
const wordsOf = (parts: Parts): HTMLElement[] => (parts.words === null ? [] : [parts.words]);

/** The pose (x, y, scale) that puts a box with the rectangle `rest` over the rectangle `target`. */
export function poseOver(rest: { left: number; top: number; width: number; height: number }, target: { left: number; top: number; width: number; height: number }) {
  const scale = rest.width > 0 && target.width > 0 ? target.width / rest.width : 0.35;
  return {
    x: target.left + target.width / 2 - (rest.left + rest.width / 2),
    y: target.top + target.height / 2 - (rest.top + rest.height / 2),
    scale,
  };
}

/** Where the next frame waits, peeking in at the bottom right: its height a share of the screen's, set in from the
 * right edge, and part of it below the bottom edge. */
export const PEEK = { height: 0.26, right: 0.04, below: 0.42 } as const;

/** The rectangle the next frame peeks in at, for a frame whose resting box is `rest` (it keeps its own shape). */
export function peekRect(rest: { width: number; height: number }, screen = { width: window.innerWidth, height: window.innerHeight }) {
  const height = screen.height * PEEK.height;
  const width = rest.height > 0 ? (height * rest.width) / rest.height : height;
  return { left: screen.width * (1 - PEEK.right) - width, top: screen.height - height * (1 - PEEK.below), width, height };
}

export interface StageOptions {
  /** The tall track the page scrolls through: one screen of scroll for each case after the first. */
  track: HTMLElement;
  /** The sticky full-screen stage inside it, which holds the sections. */
  stage: HTMLElement;
  sections: HTMLElement[];
  /** The case on screen at the start. */
  start: number;
  /** The opening is already over (the stage was rebuilt later): skip its entrances. */
  shown: boolean;
  /** The case on screen has changed (the rail, the address). */
  onChange: (index: number) => void;
}

export interface StageHandle {
  /** The case nearest the scroll position. */
  current: () => number;
  /** The opening's picture has settled into the first frame: the frame comes in around it. */
  showFrame: () => void;
  /** The opening is over: the next frame peeks in, and the words come once the scroll is still. */
  ready: () => void;
  /** Straight to a case, in one soft move (the rail's tick, the wordmark, Home and End). */
  go: (index: number) => void;
  /** A move is running: input is ignored. */
  moving: () => boolean;
  /** The case the words are showing for, or null while they are away. */
  wordsFor: () => number | null;
  /** The scroll is at `at` (0 at the first case, count - 1 at the last): what the page tells it on every scroll. */
  update: (at: number) => void;
  /** The scrubbed timeline: one unit for each move, a label at every case. */
  timeline: () => gsap.core.Timeline | null;
  destroy: () => void;
}

export function createLandingStage({ track, stage, sections, start, shown, onChange }: StageOptions): StageHandle {
  gsap.registerPlugin(ScrollTrigger);
  const parts = sections.map(partsOf);
  const count = sections.length;
  let current = Math.min(Math.max(start, 0), count - 1);
  let isReady = shown;
  let alive = true;
  /** The case the words are on screen for (or being written for). */
  let wordsFor: number | null = null;
  const textTimelines = new Map<number, gsap.core.Timeline>();
  const splits = new Map<number, SplitText>();
  const blurred = { opacity: 0, filter: `blur(${LANDING_BLUR}px)` };
  const sharp = { opacity: 1, filter: 'blur(0px)', clearProps: 'filter' };
  setSmoothLerp(LANDING_LERP);

  /** Scroll pixels for one case. */
  const caseHeight = () => (count > 1 ? (track.offsetHeight - stage.offsetHeight) / (count - 1) : window.innerHeight);
  const trackTop = () => track.getBoundingClientRect().top + window.scrollY;
  const positionOf = (index: number) => trackTop() + index * caseHeight();
  /** How far through the cases the scroll is: 0 at the first, count - 1 at the last. */
  const position = () => (count > 1 ? Math.min(Math.max((window.scrollY - trackTop()) / caseHeight(), 0), count - 1) : 0);

  // ---- The words: they leave as soon as scrolling starts, and come back once it has settled on a case.
  const revertSplit = (index: number) => {
    splits.get(index)?.revert();
    splits.delete(index);
  };
  const writeTitle = (index: number, p: Parts, tl: gsap.core.Timeline) => {
    if (p.title === null) {
      return;
    }
    gsap.set(p.title, { opacity: 1 });
    if (p.name === null) {
      return;
    }
    const split = SplitText.create(p.name, { type: 'chars', aria: 'auto' });
    splits.set(index, split);
    gsap.set(split.chars, { opacity: 0 });
    if (p.years !== null) {
      gsap.set(p.years, { opacity: 0 });
    }
    tl.to(split.chars, { opacity: 1, ...tween('landing.write'), stagger: STEP.fast / 4 }, 0);
    if (p.years !== null) {
      tl.to(p.years, { opacity: 1, ...tween('ink.in'), duration: STEP.base }, '>');
    }
    tl.call(() => revertSplit(index), undefined, '>');
  };
  const showWords = (index: number) => {
    const p = parts[index];
    if (p === null || wordsFor === index) {
      return;
    }
    wordsFor = index;
    const tl = gsap.timeline();
    textTimelines.set(index, tl);
    gsap.set(wordsOf(p), blurred);
    tl.to(wordsOf(p), { ...sharp, ...tween('landing.blur') }, 0);
    writeTitle(index, p, tl);
  };
  const hideWords = () => {
    const index = wordsFor;
    if (index === null) {
      return;
    }
    wordsFor = null;
    const p = parts[index];
    textTimelines.get(index)?.kill();
    textTimelines.delete(index);
    revertSplit(index);
    if (p === null) {
      return;
    }
    gsap.to(wordsOf(p), { opacity: 0, filter: `blur(${LANDING_BLUR}px)`, ...tween('ink.out'), duration: STEP.fast, overwrite: true });
    if (p.title !== null) {
      gsap.to(p.title, { opacity: 0, ...tween('ink.out'), duration: STEP.fast, overwrite: true });
      if (p.years !== null) {
        gsap.set(p.years, { opacity: 1 });
      }
    }
  };
  /** Everything but the words of the case in hand is away before the first scroll. */
  const hideAllWords = () => {
    parts.forEach(p => {
      if (p !== null) {
        gsap.set(wordsOf(p), blurred);
        if (p.title !== null) {
          gsap.set(p.title, { opacity: 0 });
        }
      }
    });
  };
  hideAllWords();

  // ---- Settling: the scroll has been still on a case for a moment: its words come back.
  let latest = position();
  let idleTimer: gsap.core.Tween | null = null;
  let moving = false;
  const settleNow = () => {
    if (!alive || !isReady || moving) {
      return;
    }
    if (Math.abs(latest - Math.round(latest)) < 0.02 && window.scrollY <= positionOf(count - 1) + 40) {
      showWords(Math.round(latest));
    }
  };
  const settleSoon = () => {
    idleTimer?.kill();
    idleTimer = gsap.delayedCall(LANDING_SETTLE, settleNow);
  };

  // ---- The scrubbed timeline, and the snap.
  let timeline: gsap.core.Timeline | null = null;
  let trigger: ScrollTrigger | null = null;
  const build = () => {
    trigger?.kill();
    timeline?.kill();
    // Every frame at rest, to measure where it would sit.
    parts.forEach(p => {
      if (p === null) {
        return;
      }
      gsap.set(p.section, { zIndex: 1 });
      gsap.set(p.anchor, { x: 0, y: 0, scale: 1, opacity: 1 });
      if (p.rise !== null) {
        gsap.set(p.rise, { rotation: 0, transformOrigin: '50% 0%' });
      }
    });
    const tl = gsap.timeline({ paused: true });
    const move = tween('landing.stage');
    const away = { x: window.innerWidth * STAGE_AWAY.x, y: window.innerHeight * STAGE_AWAY.y, scale: STAGE_AWAY.scale };
    const rests = parts.map(p => p?.anchor.getBoundingClientRect() ?? null);
    // Each frame's own pose at the peek, and further down, off the screen, where it waits before that.
    const peekPoses = rests.map(rest => (rest === null ? null : poseOver(rest, peekRect(rest))));
    const belowPoses = peekPoses.map(pose => (pose === null ? null : { ...pose, y: pose.y + window.innerHeight * PEEK.height * 2 }));
    // The first state: the first frame at rest, the second peeking (the real frame, not a copy), the rest away below.
    parts.forEach((p, index) => {
      if (p === null) {
        return;
      }
      const pose = index === 1 ? peekPoses[1] : index > 1 ? belowPoses[index] : null;
      gsap.set(p.section, { visibility: index <= 1 ? 'visible' : 'hidden' });
      if (pose !== null) {
        gsap.set(p.anchor, { x: pose.x, y: pose.y, scale: pose.scale, opacity: index > 1 ? 0 : 1 });
      }
    });
    for (let i = 0; i < count - 1; i += 1) {
      const A = parts[i];
      const B = parts[i + 1];
      const pose = peekPoses[i + 1];
      if (A === null || B === null || pose === null) {
        continue;
      }
      // The current frame scales up and leaves up and to the left; the next one, the very frame that was peeking at
      // the bottom right, rises and grows from there into the centre. Scrolled back, it travels back down to its peek.
      tl.fromTo(B.anchor, { x: pose.x, y: pose.y, scale: pose.scale }, { x: 0, y: 0, scale: 1, ease: move.ease, duration: SCRUB.move, immediateRender: false }, i)
        .fromTo(A.anchor, { x: 0, y: 0, scale: 1 }, { ...away, ease: move.ease, duration: SCRUB.move, immediateRender: false }, i)
        .fromTo(A.anchor, { opacity: 1 }, { opacity: 0, ease: tween('ink.out').ease, duration: SCRUB.fadeOut, immediateRender: false }, i + 0.6)
        .set(A.section, { visibility: 'hidden' }, i + 1);
      // Hanging from a wire: a lean on the way, and one soft sway back as the new frame settles.
      if (A.rise !== null) {
        tl.fromTo(A.rise, { rotation: 0 }, { rotation: -FRAME_SWING, ease: move.ease, duration: SCRUB.move, immediateRender: false }, i);
      }
      if (B.rise !== null) {
        tl.fromTo(B.rise, { rotation: FRAME_SWING }, { rotation: 0, ease: tween('landing.swing').ease, duration: SCRUB.move, immediateRender: false }, i);
      }
      // The frame after it comes up from below into the peek, once the way is clear.
      const C = parts[i + 2];
      const below = belowPoses[i + 2];
      const peek = peekPoses[i + 2];
      if (C != null && below != null && peek != null) {
        // (A hair after the case itself, so that at rest only the case in hand and the next one are drawn.)
        tl.set(C.section, { visibility: 'visible' }, i + 0.001)
          .fromTo(C.anchor, { ...below, opacity: 0 }, { ...peek, opacity: 1, ease: move.ease, duration: SCRUB.peekRise, immediateRender: false }, i + SCRUB.peekFrom);
      }
    }
    // The timeline is exactly one unit for each move, and a label at every case, for the snap.
    tl.set({}, {}, Math.max(count - 1, 0));
    for (let i = 0; i < count; i += 1) {
      tl.addLabel(`case${i}`, i);
    }
    timeline = tl;
    trigger = ScrollTrigger.create({
      trigger: track,
      start: 'top top',
      end: 'bottom bottom',
      animation: tl,
      scrub: true,
      onUpdate: () => update(position()),
    });
  };
  const update = (at: number) => {
    latest = at;
    const nearest = Math.round(at);
    if (nearest !== current) {
      current = nearest;
      onChange(nearest);
    }
    // Scrolling has started (or the page has gone on into the footer): the words go at once.
    if (wordsFor !== null && (Math.abs(at - wordsFor) > 0.004 || window.scrollY > positionOf(count - 1) + 40)) {
      hideWords();
    }
    settleSoon();
  };
  build();

  // The page opens at the case the address names.
  if (current > 0) {
    jumpToY(positionOf(current));
    ScrollTrigger.refresh();
  }

  // The words wait for the opening; when it is over they come, once the scroll is still.
  const place = parts[current]?.place ?? null;
  /** The next case's frame, peeking in: it comes in once the opening is over. */
  const peek = parts[current + 1]?.place ?? null;
  if (!shown) {
    if (place !== null) {
      gsap.set(place, { opacity: 0 });
    }
    if (peek !== null) {
      gsap.set(peek, { opacity: 0 });
    }
  }

  // ---- One move: a smooth Lenis scroll to a case. Input is ignored until it has landed.
  let moveTimer: ReturnType<typeof setTimeout> | null = null;
  /** The page went on into the footer: the next way back up returns to the last case. */
  let inFooter = false;
  const lastY = () => positionOf(count - 1);
  const moveTo = (index: number) => {
    const to = Math.min(Math.max(index, 0), count - 1);
    moving = true;
    inFooter = false;
    hideWords();
    const move = tween('landing.stage');
    const landed = () => {
      if (!moving) {
        return;
      }
      moving = false;
      if (moveTimer !== null) {
        clearTimeout(moveTimer);
        moveTimer = null;
      }
      settleSoon();
    };
    if (moveTimer !== null) {
      clearTimeout(moveTimer);
    }
    // Counted as landed after its own time in any case, so a move that is cut short never locks the page.
    moveTimer = setTimeout(landed, move.duration * 1000 + MOVE_GRACE_MS);
    scrollToY(positionOf(to), { ...move, onComplete: landed });
  };
  /** One gesture's move, the way it points; from the footer, back up to the last case. */
  const step = (direction: 1 | -1) => moveTo(window.scrollY > lastY() + 1 ? count - 1 : Math.round(latest) + direction);
  /**
   * Whether this gesture is the stage's (it moves a case) or the page's (Lenis scrolls on, into or within the footer).
   * Past the last case going down, and within the footer, it is the page's; coming back up out of the footer, the
   * stage's again.
   */
  const claims = (direction: 1 | -1, delta = 0): boolean => {
    // While a move runs, every gesture is swallowed (so Lenis never takes over half-way).
    if (moving) {
      return true;
    }
    const y = window.scrollY;
    const last = lastY();
    if (y < last - 1) {
      return true;
    }
    if (y <= last + 1) {
      return direction < 0;
    }
    // In the footer: only a scroll up that would cross back into the cases.
    if (direction > 0) {
      return false;
    }
    const target = (getLenis()?.targetScroll ?? y) + delta;
    return target <= last + 1;
  };
  /** Not ours: a dialog, a field, or something that scrolls itself. */
  const notOurs = (target: EventTarget | null) =>
    target instanceof Element && target.closest('[role="dialog"], [aria-modal="true"], input, textarea, select, [contenteditable="true"], [data-lenis-prevent]') !== null;

  // The wheel (and a trackpad): one burst, one case. Taken before Lenis (capture, on the window), so Lenis never moves
  // the page by itself while the cases are on screen.
  const gate = createGestureGate();
  const onWheel = (event: WheelEvent) => {
    gate.note(event.timeStamp || performance.now(), event.deltaY);
    if (!alive || event.ctrlKey || notOurs(event.target)) {
      return;
    }
    const delta = Math.abs(event.deltaY) >= Math.abs(event.deltaX) ? event.deltaY : 0;
    if (delta === 0) {
      return;
    }
    const direction = delta > 0 ? 1 : -1;
    if (!claims(direction, delta)) {
      return;
    }
    event.preventDefault();
    event.stopImmediatePropagation();
    if (isReady && gate.take(!moving)) {
      step(direction);
    }
  };
  window.addEventListener('wheel', onWheel, { capture: true, passive: false });

  // A swipe: one per touch, once it has gone far enough to mean it.
  let touchFrom: number | null = null;
  let touchUsed = false;
  const onTouchStart = (event: TouchEvent) => {
    touchFrom = event.touches[0]?.clientY ?? null;
    touchUsed = false;
  };
  const onTouchMove = (event: TouchEvent) => {
    const y = event.touches[0]?.clientY;
    if (!alive || touchFrom === null || y === undefined || notOurs(event.target)) {
      return;
    }
    const delta = touchFrom - y;
    if (Math.abs(delta) < STORY_PACE.gestureTolerance) {
      if (window.scrollY < lastY() - 1) {
        event.preventDefault();
      }
      return;
    }
    const direction = delta > 0 ? 1 : -1;
    if (!claims(direction, delta)) {
      return;
    }
    event.preventDefault();
    event.stopImmediatePropagation();
    if (isReady && !touchUsed && !moving) {
      step(direction);
    }
    touchUsed = true;
  };
  window.addEventListener('touchstart', onTouchStart, { capture: true, passive: true });
  window.addEventListener('touchmove', onTouchMove, { capture: true, passive: false });

  // Anything else that brings the page back up out of the footer (a key, the scrollbar): back to the last case.
  const onScroll = () => {
    const y = window.scrollY;
    const last = lastY();
    if (y > last + 1) {
      inFooter = true;
    } else if (inFooter && !moving && isReady && y < last - 1) {
      moveTo(count - 1);
    }
  };
  window.addEventListener('scroll', onScroll, { passive: true });

  // The next frame peeking in is the real frame: pressing it brings it in (one move), rather than opening it there.
  const onClick = (event: MouseEvent) => {
    const section = event.target instanceof Element ? event.target.closest<HTMLElement>('[data-exhibit]') : null;
    const index = section === null ? -1 : sections.indexOf(section);
    if (index < 0 || index === Math.round(latest)) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    if (!moving) {
      moveTo(index);
    }
  };
  stage.addEventListener('click', onClick, { capture: true });

  // ---- The keyboard: arrows, Page keys and Space go one case, like a gesture; Home and End to the ends.
  const go = (index: number) => {
    if (index < 0 || index >= count) {
      return;
    }
    moveTo(index);
  };
  const onKey = (event: KeyboardEvent) => {
    if (!isReady || event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || notOurs(event.target)) {
      return;
    }
    const target = event.target instanceof Element ? event.target : null;
    // Space presses a focused button or link: it is theirs.
    const pressable = target?.closest('button, a[href]') != null;
    let direction: 1 | -1 | 0 = 0;
    if (event.key === 'ArrowDown' || event.key === 'PageDown' || (event.key === ' ' && !event.shiftKey && !pressable)) {
      direction = 1;
    } else if (event.key === 'ArrowUp' || event.key === 'PageUp' || (event.key === ' ' && event.shiftKey && !pressable)) {
      direction = -1;
    }
    if (direction !== 0) {
      // Past the last case, or in the footer, the keys scroll the page as usual.
      if (!claims(direction) || (direction < 0 && window.scrollY > lastY() + 1)) {
        return;
      }
      event.preventDefault();
      if (!moving) {
        step(direction);
      }
    } else if (event.key === 'Home') {
      event.preventDefault();
      go(0);
    } else if (event.key === 'End' && window.scrollY < lastY() - 1) {
      event.preventDefault();
      go(count - 1);
    }
  };
  window.addEventListener('keydown', onKey);

  // ---- A new window size: the poses are measured again.
  let resizeTimer: ReturnType<typeof setTimeout> | null = null;
  const onResize = () => {
    if (resizeTimer !== null) {
      clearTimeout(resizeTimer);
    }
    resizeTimer = setTimeout(() => {
      if (alive) {
        hideWords();
        build();
        ScrollTrigger.refresh();
        settleSoon();
      }
    }, 250);
  };
  window.addEventListener('resize', onResize);

  return {
    current: () => current,
    showFrame: () => {
      if (place !== null) {
        gsap.to(place, { opacity: 1, ...tween('ink.in'), duration: STEP.base });
      }
    },
    ready: () => {
      isReady = true;
      if (peek !== null) {
        gsap.to(peek, { opacity: 1, ...tween('landing.blur') });
      }
      settleNow();
    },
    go,
    moving: () => moving,
    wordsFor: () => wordsFor,
    update,
    timeline: () => timeline,
    destroy: () => {
      if (!alive) {
        return;
      }
      alive = false;
      idleTimer?.kill();
      textTimelines.forEach(tl => tl.kill());
      splits.forEach(split => split.revert());
      splits.clear();
      trigger?.kill();
      timeline?.kill();
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('wheel', onWheel, { capture: true });
      window.removeEventListener('touchstart', onTouchStart, { capture: true });
      window.removeEventListener('touchmove', onTouchMove, { capture: true });
      window.removeEventListener('scroll', onScroll);
      stage.removeEventListener('click', onClick, { capture: true });
      window.removeEventListener('resize', onResize);
      if (moveTimer !== null) {
        clearTimeout(moveTimer);
      }
      if (resizeTimer !== null) {
        clearTimeout(resizeTimer);
      }
      setSmoothLerp(null);
    },
  };
}
