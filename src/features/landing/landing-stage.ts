// src/features/landing/landing-stage.ts
// The landing page's stage (landing fixes brief): on a laptop at full motion the cases are not locked steps but free,
// silky scrolling. A tall track holds a sticky full-screen stage; Lenis smooths the scroll (a soft lerp, about 0.08)
// and one timeline, scrubbed by the scroll position, plays every transition: the current frame scales up and leaves up
// and to the left while the next, peeking at the bottom right, rises and grows into the centre. A fast scroll can pass
// several cases; a slow one moves gently. Each frame hangs from a wire: it leans a degree or two as it travels and the
// one coming in settles with one soft sway back. A soft snap eases to the nearest case label when scrolling stops (after a short delay, 0.4 to
// 0.8s, power2.inOut); any scroll takes over, it never blocks or makes anyone wait. (ScrollTrigger's own `snap` is not
// used: beside Lenis's programmatic scrolling its idle check never fired, so the snap is a Lenis scroll to the label's
// position, from ScrollTrigger's `labelToScroll`.)
//
// Text only when the scroll has settled on a case: the headline, subline and title leave as soon as scrolling starts
// (not part of the scrubbed timeline), and come back only after it has stopped on a case (after the snap): the
// headline and subline blur in, the title is written in letter by letter, its years fading in after. After the last
// case the track ends and the page scrolls on into the footer: no release, no retake.
//
// Everything animated is `transform` and `opacity`; the blur is on text blocks only. Pure DOM and GSAP: it reads the
// section markup of ExhibitSection.tsx (`data-exhibit-part`) and knows nothing about any case.
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { LANDING_BLUR, LANDING_SNAP, LINEAR, SCRUB, STEP, tween } from '@/lib/motion';
import { jumpToY, scrollToY, setSmoothLerp } from '@/lib/smooth-scroll';

// ScrollTrigger is registered when a stage is made: it needs window.matchMedia as soon as it is registered.
gsap.registerPlugin(SplitText);

/** How softly the page follows the wheel on the landing page (Lenis's lerp). */
export const LANDING_LERP = 0.08;

/** How far a leaving frame goes, as a share of the screen, and how big it grows on the way out. */
export const STAGE_AWAY = { x: -0.62, y: -0.8, scale: 1.7 } as const;

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
    place: section.querySelector<HTMLElement>('[data-exhibit-part="place"]'),
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
  /** The opening is over: the peek appears, and the words come once the scroll is still. */
  ready: () => void;
  /** To a case, scrolling there softly (the rail's tick, the wordmark, the keys). */
  go: (index: number) => void;
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

  // ---- Settling: the scroll has been still for a moment. Between two cases it eases to the nearest one (the soft
  // snap); on a case, the words come back. Any scroll starts the wait again, so nothing ever blocks.
  let latest = position();
  let idleTimer: gsap.core.Tween | null = null;
  const settleNow = () => {
    if (!alive || !isReady) {
      return;
    }
    if (Math.abs(latest - Math.round(latest)) < 0.02) {
      showWords(Math.round(latest));
    }
  };
  const idle = () => {
    if (!alive || !isReady) {
      return;
    }
    const nearest = Math.min(Math.max(Math.round(latest), 0), count - 1);
    const off = Math.abs(latest - nearest);
    // Past the last case the page is in the footer: no snap there.
    if (off < 0.02 || window.scrollY > positionOf(count - 1) + 2) {
      settleNow();
      return;
    }
    const label = trigger !== null && trigger.end > trigger.start ? trigger.labelToScroll(`case${nearest}`) : positionOf(nearest);
    const snap = tween('landing.snap');
    // The further it has to go, the longer it takes: 0.4 to 0.8s.
    const duration = LANDING_SNAP.min + Math.min(off / 0.5, 1) * (LANDING_SNAP.max - LANDING_SNAP.min);
    scrollToY(label, { ease: snap.ease, duration });
  };
  const settleSoon = () => {
    idleTimer?.kill();
    idleTimer = gsap.delayedCall(LANDING_SNAP.delay, idle);
  };

  // ---- The scrubbed timeline, and the snap.
  let timeline: gsap.core.Timeline | null = null;
  let trigger: ScrollTrigger | null = null;
  const build = () => {
    trigger?.kill();
    timeline?.kill();
    // Every frame at rest, to measure where it would sit.
    parts.forEach((p, index) => {
      if (p === null) {
        return;
      }
      gsap.set(p.section, { visibility: index === 0 ? 'visible' : 'hidden', zIndex: 1 });
      gsap.set(p.anchor, { x: 0, y: 0, scale: 1, opacity: 1 });
      if (p.rise !== null) {
        gsap.set(p.rise, { rotation: 0, transformOrigin: '50% 0%' });
      }
      if (p.peek !== null) {
        gsap.set(p.peek, { opacity: 1 });
      }
    });
    const tl = gsap.timeline({ paused: true });
    const move = tween('landing.stage');
    const away = { x: window.innerWidth * STAGE_AWAY.x, y: window.innerHeight * STAGE_AWAY.y, scale: STAGE_AWAY.scale };
    const rests = parts.map(p => p?.anchor.getBoundingClientRect() ?? null);
    const peeks = parts.map(p => p?.peek?.querySelector<HTMLElement>('.haunted-frame')?.getBoundingClientRect() ?? fallbackPeek());
    for (let i = 0; i < count - 1; i += 1) {
      const A = parts[i];
      const B = parts[i + 1];
      const restB = rests[i + 1];
      if (A === null || B === null || restB === null) {
        continue;
      }
      const pose = poseOver(restB, peeks[i]);
      // (A hair after the case itself, so that at rest only the case in hand is drawn.)
      tl.set(B.section, { visibility: 'visible' }, i + 0.001)
        // The next frame rises from its peek and grows into the centre; the current one scales up and leaves.
        .fromTo(B.anchor, { x: pose.x, y: pose.y, scale: pose.scale }, { x: 0, y: 0, scale: 1, ease: move.ease, duration: SCRUB.move, immediateRender: false }, i)
        .to(A.anchor, { ...away, ease: move.ease, duration: SCRUB.move, immediateRender: false }, i)
        .fromTo(A.anchor, { opacity: 1 }, { opacity: 0, ease: tween('ink.out').ease, duration: SCRUB.fadeOut, immediateRender: false }, i + 0.6)
        .set(A.section, { visibility: 'hidden' }, i + 1);
      // Hanging from a wire: a lean on the way, and one soft sway back as the new frame settles.
      if (A.rise !== null) {
        tl.fromTo(A.rise, { rotation: 0 }, { rotation: -FRAME_SWING, ease: move.ease, duration: SCRUB.move, immediateRender: false }, i);
      }
      if (B.rise !== null) {
        tl.fromTo(B.rise, { rotation: FRAME_SWING }, { rotation: 0, ease: tween('landing.swing').ease, duration: SCRUB.move, immediateRender: false }, i);
      }
      // The peeking frame is the next one: it goes as that frame takes its place, and the one after peeks in last.
      if (A.peek !== null) {
        tl.fromTo(A.peek, { opacity: 1 }, { opacity: 0, ease: LINEAR, duration: SCRUB.peekOut, immediateRender: false }, i);
      }
      if (B.peek !== null) {
        tl.fromTo(B.peek, { opacity: 0 }, { opacity: 1, ease: LINEAR, duration: SCRUB.peekIn, immediateRender: false }, i + 0.8);
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
  const peek = parts[current]?.peek ?? null;
  if (!shown) {
    if (place !== null) {
      gsap.set(place, { opacity: 0 });
    }
    if (peek !== null) {
      gsap.set(peek, { opacity: 0 });
    }
  }

  // ---- The keyboard: arrows, Page keys and Space go to the next or the previous case; Home and End to the ends.
  const go = (index: number) => {
    if (index < 0 || index >= count) {
      return;
    }
    scrollToY(positionOf(index), tween('landing.stage'));
  };
  const onKey = (event: KeyboardEvent) => {
    if (!isReady || event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) {
      return;
    }
    const target = event.target instanceof Element ? event.target : null;
    if (target !== null && target.closest('input, textarea, select, [contenteditable="true"], [role="dialog"]') !== null) {
      return;
    }
    // Space presses a focused button or link: it is theirs.
    const pressable = target?.closest('button, a[href]') != null;
    const at = Math.round(latest);
    if (event.key === 'ArrowDown' || event.key === 'PageDown' || (event.key === ' ' && !event.shiftKey && !pressable)) {
      if (at < count - 1) {
        event.preventDefault();
        go(at + 1);
      }
    } else if (event.key === 'ArrowUp' || event.key === 'PageUp' || (event.key === ' ' && event.shiftKey && !pressable)) {
      if (at > 0 && window.scrollY <= positionOf(count - 1) + 1) {
        event.preventDefault();
        go(at - 1);
      }
    } else if (event.key === 'Home') {
      event.preventDefault();
      go(0);
    } else if (event.key === 'End' && window.scrollY < positionOf(count - 1) - 1) {
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
      window.removeEventListener('resize', onResize);
      if (resizeTimer !== null) {
        clearTimeout(resizeTimer);
      }
      setSmoothLerp(null);
    },
  };
}
