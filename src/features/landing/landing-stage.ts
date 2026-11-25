// src/features/landing/landing-stage.ts
// The landing page's stage (landing v2 brief, 2): on a laptop at full motion the cases are not a long page but one
// fixed, full-screen stage, driven by GSAP Observer like the story's steps. One wheel gesture, swipe or arrow key
// moves exactly one case: a gesture that meets a transition still playing is swallowed, tail and all.
//
// The move to the next case: the current frame scales up and leaves up and to the left; the next frame, which was
// peeking at the bottom right, rises and grows into the centre. Each frame hangs from a wire: it leans a degree or
// two as it travels and the one coming in settles with one soft sway back. Text only when the frame is still: the
// headline and subline blur out at once as the move starts (the old title fades out quickly), and once the new frame
// has landed and settled the new ones blur in and the new title is written in letter by letter, its years fading in
// after. Going back plays it the other way. After the last case the
// next gesture lets go of the stage and the page scrolls on into the footer; scrolling back up to the top takes the
// stage again, at the last case.
//
// Everything animated is `transform` and `opacity`; the blur is on text blocks only. Pure DOM and GSAP: it reads the
// section markup of ExhibitSection.tsx (`data-exhibit-part`) and knows nothing about any case.
import gsap from 'gsap';
import { Observer } from 'gsap/Observer';
import { SplitText } from 'gsap/SplitText';
import { createWheelGate } from '@/features/story/story-steps';
import { LANDING_BLUR, STEP, tween } from '@/lib/motion';
import { holdSmoothScroll, jumpToY, releaseSmoothScroll, scrollToY } from '@/lib/smooth-scroll';
import { STORY_PACE } from '@/lib/story-pages';

gsap.registerPlugin(Observer, SplitText);

/** Where the held stage is marked on the page, so its overflow rule is a stylesheet's (effects.css). */
export const STAGE_HELD_ATTRIBUTE = 'data-landing-stage';

/** How far a leaving frame goes, as a share of the screen, and how big it grows on the way out. */
export const STAGE_AWAY = { x: -0.62, y: -0.8, scale: 1.7 } as const;

/** How far a frame leans as it travels, in degrees: it hangs from a wire, so it swings from its top edge. */
export const FRAME_SWING = 1.8;

/** How long after the new frame lands before its words come in: the swing has all but settled. */
export const SETTLE_BEAT = STEP.fast;

/** The section's pieces that move. */
interface Parts {
  section: HTMLElement;
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
  /** The next case's frame, peeking in at the bottom right. */
  peek: HTMLElement | null;
}

function partsOf(section: HTMLElement): Parts | null {
  const anchor = section.querySelector<HTMLElement>('[data-exhibit-part="anchor"]');
  const title = section.querySelector<HTMLElement>('[data-exhibit-part="title"]');
  if (anchor === null) {
    return null;
  }
  return {
    section,
    anchor,
    rise: section.querySelector<HTMLElement>('[data-exhibit-part="rise"]'),
    title,
    name: title?.querySelector<HTMLElement>('h2') ?? null,
    years: title?.querySelector<HTMLElement>('p') ?? null,
    words: section.querySelector<HTMLElement>('[data-exhibit-part="words"]'),
    peek: section.querySelector<HTMLElement>('[data-exhibit-part="peek"]'),
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

/** Where a frame peeks when its section has no peek to measure: the bottom right. */
function fallbackPeek(): { left: number; top: number; width: number; height: number } {
  const width = window.innerWidth * 0.2;
  return { left: window.innerWidth * 0.76, top: window.innerHeight * 0.78, width, height: width * 0.75 };
}

export interface StageOptions {
  /** The stage's element: the sections' parent, a full screen. */
  root: HTMLElement;
  sections: HTMLElement[];
  /** The case on screen at the start. */
  start: number;
  /** The first section's frame and words are already in (the opening is over): skip their entrance. */
  shown: boolean;
  /** The case on screen has changed (the rail, the address). */
  onChange: (index: number) => void;
}

export interface StageHandle {
  /** The index on screen (the one it is moving to, while it moves). */
  current: () => number;
  /** The opening's picture has settled into the first frame: it comes in around it. */
  showFrame: () => void;
  /** The opening is over: the words come into focus, the peek appears, and gestures count. */
  ready: () => void;
  /** To a case, in one move (the rail's tick). */
  go: (index: number) => void;
  /** Whether the stage has let go of the page (the reader is in the footer). */
  released: () => boolean;
  destroy: () => void;
}

export function createLandingStage({ root, sections, start, shown, onChange }: StageOptions): StageHandle {
  const parts = sections.map(partsOf);
  const html = document.documentElement;
  const count = sections.length;
  let current = Math.min(Math.max(start, 0), count - 1);
  let animating = false;
  let enabled = false;
  let released = false;
  let holding = false;
  let scrolledAway = false;
  let alive = true;
  const timelines = new Set<gsap.core.Animation>();
  const splits = new Set<SplitText>();
  const track = <T extends gsap.core.Animation>(animation: T): T => {
    timelines.add(animation);
    return animation;
  };
  const blurred = { opacity: 0, filter: `blur(${LANDING_BLUR}px)` };
  const sharp = { opacity: 1, filter: 'blur(0px)', clearProps: 'filter' };

  // ---- The first state: only the case on screen is there; its frame and words wait for the opening.
  const initial = () => {
    parts.forEach((p, index) => {
      if (p === null) {
        return;
      }
      const here = index === current;
      gsap.set(p.section, { visibility: here ? 'visible' : 'hidden', zIndex: 1 });
      gsap.set(p.anchor, { x: 0, y: 0, scale: 1, opacity: here && !shown ? 0 : 1 });
      // The frame hangs from its top edge.
      if (p.rise !== null) {
        gsap.set(p.rise, { rotation: 0, transformOrigin: '50% 0%' });
      }
      if (here) {
        gsap.set([...wordsOf(p), ...(p.peek === null ? [] : [p.peek])], shown ? { opacity: 1 } : blurred);
        if (p.title !== null) {
          gsap.set(p.title, { opacity: shown ? 1 : 0 });
        }
      }
    });
  };
  initial();

  // ---- Taking and letting go of the page.
  const hold = () => {
    if (holding) {
      return;
    }
    holding = true;
    html.setAttribute(STAGE_HELD_ATTRIBUTE, 'held');
    holdSmoothScroll();
  };
  const unhold = () => {
    if (!holding) {
      return;
    }
    holding = false;
    html.removeAttribute(STAGE_HELD_ATTRIBUTE);
    releaseSmoothScroll();
  };

  // ---- A frame's title is written in, letter by letter, once the frame has settled; its years fade in after.
  const writeTitle = (p: Parts, tl: gsap.core.Timeline, at: number | string) => {
    if (p.title === null) {
      return;
    }
    gsap.set(p.title, { opacity: 1 });
    if (p.name === null) {
      return;
    }
    const split = SplitText.create(p.name, { type: 'chars', aria: 'auto' });
    splits.add(split);
    gsap.set(split.chars, { opacity: 0 });
    if (p.years !== null) {
      gsap.set(p.years, { opacity: 0 });
    }
    const write = tween('landing.write');
    tl.to(split.chars, { opacity: 1, ...write, stagger: STEP.fast / 4 }, at);
    if (p.years !== null) {
      tl.to(p.years, { opacity: 1, ...tween('ink.in'), duration: STEP.base }, '>');
    }
    tl.call(
      () => {
        split.revert();
        splits.delete(split);
      },
      undefined,
      '>'
    );
  };

  // ---- One transition: from one case to another, either way.
  const run = (from: number, to: number) => {
    const A = parts[from];
    const B = parts[to];
    if (A === null || B === null || from === to) {
      return;
    }
    const direction = to > from ? 1 : -1;
    animating = true;
    current = to;
    onChange(to);
    const stage = tween('landing.stage');
    gsap.set(B.section, { visibility: 'visible', zIndex: direction === 1 ? 2 : 1 });
    gsap.set(A.section, { zIndex: direction === 1 ? 1 : 2 });
    // Both frames at rest, to measure where they would sit.
    gsap.set([A.anchor, B.anchor], { x: 0, y: 0, scale: 1 });
    const restA = A.anchor.getBoundingClientRect();
    const restB = B.anchor.getBoundingClientRect();
    const away = { x: window.innerWidth * STAGE_AWAY.x, y: window.innerHeight * STAGE_AWAY.y, scale: STAGE_AWAY.scale };
    const tl = track(
      gsap.timeline({
        onComplete: () => {
          gsap.set(A.section, { visibility: 'hidden' });
          gsap.set(A.anchor, { x: 0, y: 0, scale: 1, opacity: 1 });
          gsap.set(wordsOf(A), { opacity: 1, clearProps: 'filter' });
          if (A.title !== null) {
            gsap.set(A.title, { opacity: 1 });
          }
          if (A.years !== null) {
            gsap.set(A.years, { opacity: 1 });
          }
          if (A.rise !== null) {
            gsap.set(A.rise, { rotation: 0 });
          }
          if (A.peek !== null) {
            gsap.set(A.peek, { opacity: 1 });
          }
          gsap.set(B.section, { zIndex: 1 });
          timelines.delete(tl);
          animating = false;
        },
      })
    );
    const peekOf = (p: Parts) => p.peek?.querySelector<HTMLElement>('.haunted-frame')?.getBoundingClientRect() ?? fallbackPeek();

    if (direction === 1) {
      // The current frame scales up and leaves up and to the left; the peeking one rises and grows into the centre.
      const peekRect = peekOf(A);
      gsap.set(B.anchor, { ...poseOver(restB, peekRect), opacity: 1 });
      if (A.peek !== null) {
        tl.set(A.peek, { opacity: 0 }, 0);
      }
      tl.to(A.anchor, { ...away, ...stage }, 0)
        .to(A.anchor, { opacity: 0, ...tween('ink.out') }, stage.duration * 0.6)
        .to(B.anchor, { x: 0, y: 0, scale: 1, ...stage }, 0);
      if (B.peek !== null) {
        gsap.set(B.peek, { opacity: 0 });
        tl.to(B.peek, { opacity: 1, ...tween('hover') }, stage.duration - STEP.fast);
      }
    } else {
      // The same, the other way: the frame on screen goes back down to peek; the earlier one comes back in.
      const peekRect = peekOf(B);
      gsap.set(B.anchor, { ...away, opacity: 1 });
      if (B.peek !== null) {
        gsap.set(B.peek, { opacity: 0 });
        tl.set(B.peek, { opacity: 1 }, stage.duration);
      }
      tl.to(A.anchor, { ...poseOver(restA, peekRect), ...stage }, 0)
        .set(A.anchor, { opacity: 0 }, stage.duration)
        .to(B.anchor, { x: 0, y: 0, scale: 1, ...stage }, 0);
    }
    // Hanging from a wire: each frame leans a little as it travels and the one coming in settles from its lean with
    // one soft sway back (`landing.swing`), a little after it has landed.
    const lean = direction * FRAME_SWING;
    if (A.rise !== null) {
      tl.to(A.rise, { rotation: -lean, ...stage }, 0);
    }
    if (B.rise !== null) {
      gsap.set(B.rise, { rotation: lean });
      tl.to(B.rise, { rotation: 0, ...tween('landing.swing') }, 0);
    }
    // Text only when the frame is still: the old headline and subline blur out at once, as the scroll starts, and the
    // old title fades out quickly; once the new frame has landed and settled, the new words blur in and the new
    // title is written in letter by letter, its years fading in after.
    const after = stage.duration + SETTLE_BEAT;
    gsap.set(wordsOf(B), blurred);
    tl.to(wordsOf(A), { opacity: 0, filter: `blur(${LANDING_BLUR}px)`, ...tween('ink.out'), duration: STEP.fast }, 0).to(wordsOf(B), { ...sharp, ...tween('landing.blur') }, after);
    if (A.title !== null) {
      tl.to(A.title, { opacity: 0, ...tween('ink.out'), duration: STEP.fast }, 0);
    }
    if (B.title !== null) {
      gsap.set(B.title, { opacity: 0 });
    }
    writeTitle(B, tl, after);
  };

  const forward = () => {
    if (current < count - 1) {
      run(current, current + 1);
    } else {
      release();
    }
  };
  const back = () => {
    if (current > 0) {
      run(current, current - 1);
    }
  };

  // ---- After the last case: the page scrolls on into the footer; scrolling back to the top takes the stage again.
  const stageBottom = () => root.getBoundingClientRect().bottom + window.scrollY;
  function release() {
    if (released) {
      return;
    }
    released = true;
    scrolledAway = false;
    observer.disable();
    unhold();
    scrollToY(stageBottom());
  }
  function retake() {
    released = false;
    scrolledAway = false;
    jumpToY(0);
    hold();
    // The tail of the scroll that brought it back is not a gesture.
    gate.take(false);
    observer.enable();
  }
  const onScroll = () => {
    if (!released) {
      return;
    }
    if (window.scrollY > 40) {
      scrolledAway = true;
    } else if (scrolledAway && window.scrollY <= 1) {
      retake();
    }
  };
  window.addEventListener('scroll', onScroll, { passive: true });

  // ---- Gestures: one wheel burst, swipe or key is one case.
  const gate = createWheelGate();
  const noteWheel = (event: WheelEvent) => gate.note(event.timeStamp || performance.now());
  window.addEventListener('wheel', noteWheel, { capture: true, passive: true });
  let pressUsed = false;
  const notOurs = (event: Event) => (event.target instanceof Element ? event.target.closest('[role="dialog"], [aria-modal="true"]') !== null : false);
  const gesture = (self: Observer, direction: 1 | -1) => {
    if (!enabled || released) {
      return;
    }
    let take: boolean;
    if (self.event?.type === 'wheel') {
      take = gate.take(!animating);
    } else {
      take = !pressUsed && !animating;
      pressUsed = true;
    }
    if (take) {
      if (direction === 1) {
        forward();
      } else {
        back();
      }
    }
  };
  const observer = Observer.create({
    target: window,
    type: 'wheel,touch',
    wheelSpeed: -1,
    tolerance: STORY_PACE.gestureTolerance,
    dragMinimum: STORY_PACE.gestureTolerance,
    preventDefault: true,
    debounce: false,
    ignoreCheck: notOurs,
    onPress: () => {
      pressUsed = false;
    },
    onUp: self => gesture(self, 1),
    onDown: self => gesture(self, -1),
  });
  observer.disable();

  const onKey = (event: KeyboardEvent) => {
    if (!enabled || released || animating || event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) {
      return;
    }
    const target = event.target instanceof Element ? event.target : null;
    if (target !== null && (notOurs(event) || target.closest('input, textarea, select, [contenteditable="true"]') !== null)) {
      return;
    }
    // Space presses a focused button or link: it is theirs.
    const pressable = target?.closest('button, a[href]') != null;
    if (event.key === 'ArrowDown' || event.key === 'PageDown' || (event.key === ' ' && !event.shiftKey && !pressable)) {
      event.preventDefault();
      forward();
    } else if (event.key === 'ArrowUp' || event.key === 'PageUp' || (event.key === ' ' && event.shiftKey && !pressable)) {
      event.preventDefault();
      back();
    } else if (event.key === 'Home') {
      event.preventDefault();
      go(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      go(count - 1);
    }
  };
  window.addEventListener('keydown', onKey);

  function go(index: number) {
    if (!enabled || animating || index < 0 || index >= count) {
      return;
    }
    if (released) {
      retake();
    }
    if (index !== current) {
      run(current, index);
    }
  }

  return {
    current: () => current,
    showFrame: () => {
      const p = parts[current];
      if (p !== null) {
        track(gsap.to(p.anchor, { opacity: 1, ...tween('ink.in'), duration: STEP.base }));
      }
    },
    ready: () => {
      const p = parts[current];
      if (p !== null && !shown) {
        track(gsap.to(wordsOf(p), { ...sharp, ...tween('landing.blur') }));
        writeTitle(p, track(gsap.timeline()), 0);
        if (p.peek !== null) {
          track(gsap.to(p.peek, { opacity: 1, ...tween('landing.blur') }));
        }
      }
      enabled = true;
      hold();
      observer.enable();
    },
    go,
    released: () => released,
    destroy: () => {
      if (!alive) {
        return;
      }
      alive = false;
      timelines.forEach(animation => animation.kill());
      splits.forEach(split => split.revert());
      splits.clear();
      observer.kill();
      window.removeEventListener('wheel', noteWheel, { capture: true });
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', onScroll);
      unhold();
    },
  };
}
