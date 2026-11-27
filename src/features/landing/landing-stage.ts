// src/features/landing/landing-stage.ts
// The landing page's stage (landing timing fix): a tall track (one screen of scroll per case, so the address, the rail
// and the footer work as a page) holds a sticky full-screen stage. One gesture triggers one committed move to the next
// or the previous case, played on its own timeline of about 0.6s; nothing follows the hand and nothing is scrubbed.
//
// A move, forward (backward plays the same the other way):
//   0      the old headline, subline and title fade out (0.15s);
//   0-0.4  the leaving frame goes up and left off the screen, growing to about 1.3x (power2.in);
//   0-0.55 the arriving frame travels from the preview spot to the centre at full size (expo.out, no overshoot), and
//          the next case's frame rises from below into the preview spot over the same 0.55s;
//   0.25-0.6  the new headline and subline fade in with a small rise; they never wait for the move to settle;
//   0.35-0.75 the title beside the frame is written in, letter by letter, its years (or "Sealed") with it;
//   0.6    input counts again.
// Exactly one animation controls each frame at a time: a move kills (or finishes) the one before it, and every tween
// on a frame overwrites what was there. The move animates each frame's outer anchor only; the hover tilt has its own
// inner wrapper (FrameActions.tsx), so the two never touch the same element. No elastic or back eases.
//
// Input: one wheel or trackpad gesture (a flick and all its trailing momentum, `LANDING_GESTURE`), one swipe, or one
// arrow, Page or Space key press is one move; a gesture that meets a move still running is spent to its end. Past the
// last case the next gesture is Lenis's and the page scrolls into the footer; scrolling up from the top of the footer
// brings the page back to the last case. The rail, Home, End and the header wordmark jump straight to their case.
//
// Pure DOM and GSAP: it reads the section markup of ExhibitSection.tsx (`data-exhibit-part`) and knows nothing about
// any case.
import gsap from 'gsap';
import { SplitText } from 'gsap/SplitText';
import { INK_RISE, LANDING_MOVE, STEP, tween } from '@/lib/motion';
import { getLenis, jumpToY, scrollToY, setSmoothLerp } from '@/lib/smooth-scroll';
import { STORY_PACE } from '@/lib/story-pages';

gsap.registerPlugin(SplitText);

/** How softly the page follows the wheel on the landing page (Lenis's lerp), in the footer. */
export const LANDING_LERP = 0.08;

/** How far a leaving frame goes, as a share of the screen, and how big it grows on the way out. */
export const STAGE_AWAY = { x: -0.62, y: -0.8, scale: LANDING_MOVE.leaveScale } as const;

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
    /** Notes a wheel event; true when it starts a new gesture (not the tail of the last). */
    note(now: number, delta: number): boolean {
      const gap = now - last;
      const size = Math.abs(delta);
      const fresh = gap > momentumMs || (gap > gapMs && size > lastSize * growth);
      if (fresh) {
        used = false;
      }
      last = now;
      lastSize = size;
      return fresh;
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

/** Sent on the window as every move starts, so whatever belongs to the case in hand (a sealed plaque) can close. */
export const LANDING_MOVE_EVENT = 'histor:landing-move';

/** How long past its own time a move counts as landed whatever happens, in ms: nothing can ever lock the page. */
export const MOVE_GRACE_MS = 400;

/** The section's pieces that move. */
interface Parts {
  section: HTMLElement;
  /** The frame and its title, together: the opening fades them in. */
  place: HTMLElement | null;
  /** The frame's outer wrapper: the only thing a move animates on a frame. */
  anchor: HTMLElement;
  /** The title beside the frame, with its name (written in) and its years. */
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
    title,
    name: title?.querySelector<HTMLElement>('h2') ?? null,
    years: title?.querySelector<HTMLElement>('p') ?? null,
    words: section.querySelector<HTMLElement>('[data-exhibit-part="words"]'),
  };
}

type Pose = { x: number; y: number; scale: number };

/** The pose (x, y, scale) that puts a box with the rectangle `rest` over the rectangle `target`. */
export function poseOver(rest: { left: number; top: number; width: number; height: number }, target: { left: number; top: number; width: number; height: number }): Pose {
  const scale = rest.width > 0 && target.width > 0 ? target.width / rest.width : 0.35;
  return {
    x: target.left + target.width / 2 - (rest.left + rest.width / 2),
    y: target.top + target.height / 2 - (rest.top + rest.height / 2),
    scale,
  };
}

/** Where the next frame waits, peeking in at the bottom right: its height a share of the screen's, set in from the
 * right edge, and part of it below the bottom edge. */
export const PEEK = { height: 0.26, right: 0.04, below: 0.42, maxWidth: 0.3, belowNarrow: 0.58 } as const;

/** The rectangle the next frame peeks in at, for a frame whose resting box is `rest` (it keeps its own shape). */
export function peekRect(rest: { width: number; height: number }, screen = { width: window.innerWidth, height: window.innerHeight }) {
  // Never wider than a share of the screen (a phone), and on a narrow screen lower, clear of the words.
  const aspect = rest.height > 0 ? rest.width / rest.height : 1;
  const height = Math.min(screen.height * PEEK.height, (screen.width * PEEK.maxWidth) / aspect);
  const below = screen.width < 1024 ? PEEK.belowNarrow : PEEK.below;
  const width = rest.height > 0 ? (height * rest.width) / rest.height : height;
  return { left: screen.width * (1 - PEEK.right) - width, top: screen.height - height * (1 - below), width, height };
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
  /** The case on screen (the one a move is heading for, while it moves). */
  current: () => number;
  /** The opening's picture has settled into the first frame: the frame comes in around it. */
  showFrame: () => void;
  /** The opening is over: the next frame peeks in, the words come, and gestures count. */
  ready: () => void;
  /** Straight to a case, in one move (the rail's tick, the wordmark, Home and End). */
  go: (index: number) => void;
  /** A move is running: a new gesture is ignored. */
  moving: () => boolean;
  /** The case the words are showing for, or null while they are away. */
  wordsFor: () => number | null;
  /** The running move's timeline, if any. */
  timeline: () => gsap.core.Timeline | null;
  destroy: () => void;
}

export function createLandingStage({ track, stage, sections, start, shown, onChange }: StageOptions): StageHandle {
  const parts = sections.map(partsOf);
  const count = sections.length;
  let current = Math.min(Math.max(start, 0), count - 1);
  let isReady = shown;
  let alive = true;
  let moving = false;
  /** The case the words are on screen for (or coming in for). */
  let wordsFor: number | null = null;
  const splits = new Map<number, SplitText>();
  setSmoothLerp(LANDING_LERP);

  /** Scroll pixels for one case. */
  const caseHeight = () => (count > 1 ? (track.offsetHeight - stage.offsetHeight) / (count - 1) : window.innerHeight);
  const trackTop = () => track.getBoundingClientRect().top + window.scrollY;
  const positionOf = (index: number) => trackTop() + index * caseHeight();
  const lastY = () => positionOf(count - 1);

  // ---- The poses: each frame at rest, at the peek, below the screen (waiting), and away (gone up and left).
  let rest: Pose = { x: 0, y: 0, scale: 1 };
  let peeks: (Pose | null)[] = [];
  let belows: (Pose | null)[] = [];
  let away: Pose = rest;
  const measure = () => {
    parts.forEach(p => p !== null && gsap.set(p.anchor, { x: 0, y: 0, scale: 1 }));
    const rests = parts.map(p => p?.anchor.getBoundingClientRect() ?? null);
    peeks = rests.map(box => (box === null ? null : poseOver(box, peekRect(box))));
    belows = peeks.map(pose => (pose === null ? null : { ...pose, y: pose.y + window.innerHeight * PEEK.height * 2 }));
    rest = { x: 0, y: 0, scale: 1 };
    away = { x: window.innerWidth * STAGE_AWAY.x, y: window.innerHeight * STAGE_AWAY.y, scale: STAGE_AWAY.scale };
  };
  /** Everything at rest on case `index`: it in the centre, the next one peeking, the rest hidden. */
  const settleOn = (index: number) => {
    parts.forEach((p, i) => {
      if (p === null) {
        return;
      }
      gsap.killTweensOf(p.anchor);
      const pose = i === index ? rest : i === index + 1 ? peeks[i] : belows[i];
      gsap.set(p.anchor, { ...(pose ?? rest), opacity: i === index || i === index + 1 ? 1 : 0 });
      gsap.set(p.section, { visibility: i === index || i === index + 1 ? 'visible' : 'hidden', zIndex: i === index ? 2 : 1 });
    });
    markCurrent(index);
  };

  // ---- The words.
  const revertSplit = (index: number) => {
    splits.get(index)?.revert();
    splits.delete(index);
  };
  /** The words of every case away, at once. */
  const hideAllWords = () => {
    parts.forEach(p => {
      if (p !== null) {
        gsap.set([...(p.words === null ? [] : [p.words]), ...(p.title === null ? [] : [p.title])], { opacity: 0, y: 0 });
      }
    });
  };
  /** Adds to `tl` the old case's words fading out (0.15s at its start). */
  const wordsOut = (index: number | null, tl: gsap.core.Timeline) => {
    const p = index === null ? null : parts[index];
    if (index !== null) {
      revertSplit(index);
    }
    if (p == null) {
      return;
    }
    const out = [...(p.words === null ? [] : [p.words]), ...(p.title === null ? [] : [p.title])];
    gsap.killTweensOf(out);
    tl.to(out, { opacity: 0, ...tween('landing.textOut'), overwrite: 'auto' }, 0);
  };
  /** Adds to `tl` the new case's words: the headline and subline from `wordsAt`, the title written from `titleFrom`. */
  const wordsIn = (index: number, tl: gsap.core.Timeline, at = 0) => {
    const p = parts[index];
    if (p === null) {
      return;
    }
    wordsFor = index;
    if (p.words !== null) {
      gsap.killTweensOf(p.words);
      gsap.set(p.words, { opacity: 0, y: INK_RISE });
      tl.to(p.words, { opacity: 1, y: 0, ...tween('landing.textIn'), overwrite: 'auto' }, at + LANDING_MOVE.wordsAt);
    }
    if (p.title === null || p.name === null) {
      return;
    }
    const title = p.title;
    gsap.killTweensOf(title);
    revertSplit(index);
    const split = SplitText.create(p.name, { type: 'chars', aria: 'auto' });
    splits.set(index, split);
    gsap.set(title, { opacity: 1, y: 0 });
    gsap.set(split.chars, { opacity: 0 });
    // The letters are spread so the last one has finished at `titleTo`.
    const write = tween('landing.write');
    const span = LANDING_MOVE.titleTo - LANDING_MOVE.titleFrom;
    const stagger = split.chars.length > 1 ? Math.max(span - write.duration, 0) / (split.chars.length - 1) : 0;
    const from = at + LANDING_MOVE.titleFrom;
    tl.to(split.chars, { opacity: 1, ...write, stagger }, from);
    if (p.years !== null) {
      gsap.set(p.years, { opacity: 0 });
      tl.to(p.years, { opacity: 1, ...tween('landing.textOut') }, from + span - tween('landing.textOut').duration);
    }
    tl.call(() => revertSplit(index), undefined, from + span);
  };

  // ---- Which case is the one in hand: only it can be pressed (the next frame, peeking in, cannot).
  function markCurrent(index: number) {
    sections.forEach((section, i) => section.setAttribute('data-current', String(i === index)));
  }

  // ---- One committed move.
  let move: gsap.core.Timeline | null = null;
  let moveTimer: ReturnType<typeof setTimeout> | null = null;
  /** The page went on into the footer: the next way back up returns to the last case. */
  let inFooter = false;
  const unlock = () => {
    moving = false;
    if (moveTimer !== null) {
      clearTimeout(moveTimer);
      moveTimer = null;
    }
  };
  const lock = () => {
    moving = true;
    if (moveTimer !== null) {
      clearTimeout(moveTimer);
    }
    // Counted as landed after its own time in any case, so a move that is cut short never locks the page.
    moveTimer = setTimeout(unlock, LANDING_MOVE.unlockAt * 1000 + MOVE_GRACE_MS);
  };
  const moveTo = (index: number) => {
    const to = Math.min(Math.max(index, 0), count - 1);
    // From the footer, the frames are already on the last case: only the page comes back up.
    if (window.scrollY > lastY() + 1) {
      // From the footer: first the page scrolls up to the stage (Lenis, about 1.2s), then the move, if it goes on.
      inFooter = false;
      lock();
      const target = to;
      scrollToY(lastY(), {
        ...tween('landing.return'),
        onComplete: () => {
          if (!alive) {
            return;
          }
          unlock();
          if (target !== current) {
            from(current, target);
          }
        },
      });
      return;
    }
    if (to === current) {
      return;
    }
    from(current, to);
  };
  /** Plays the move from case `a` to case `b`. */
  function from(a: number, b: number) {
    // One animation per frame: whatever was running ends where it was going first.
    if (move !== null) {
      const running = move;
      move = null;
      running.progress(1);
      running.kill();
    }
    const A = parts[a];
    const B = parts[b];
    if (A === null || B === null) {
      return;
    }
    lock();
    window.dispatchEvent(new CustomEvent(LANDING_MOVE_EVENT, { detail: { from: a, to: b } }));
    if (Math.abs(b - a) > 1) {
      jump(a, b);
      return;
    }
    const forward = b > a;
    const leave = tween('landing.leave');
    const arrive = tween('landing.arrive');
    current = b;
    onChange(b);
    markCurrent(b);
    // The page's place follows at once: the stage is sticky, so this moves nothing on screen.
    if (window.scrollY <= lastY() + 1) {
      jumpToY(positionOf(b));
    }
    const tl = gsap.timeline({
      onComplete: () => {
        if (move === tl) {
          move = null;
        }
        settleOn(b);
      },
    });
    move = tl;
    const old = wordsFor;
    wordsFor = null;
    wordsOut(old, tl);
    const show = (i: number) => {
      const p = parts[i];
      if (p != null) {
        gsap.set(p.section, { visibility: 'visible' });
      }
    };
    const animate = (i: number, to: Pose, opacity: number, timing: { ease: string; duration: number }, start?: Pose, startOpacity?: number) => {
      const p = parts[i];
      if (p == null) {
        return;
      }
      gsap.killTweensOf(p.anchor);
      if (start !== undefined) {
        gsap.set(p.anchor, { ...start, opacity: startOpacity ?? 1 });
      }
      tl.to(p.anchor, { ...to, opacity, ...timing, overwrite: 'auto' }, 0);
    };
    show(a);
    show(b);
    gsap.set(A.section, { zIndex: forward ? 1 : 2 });
    gsap.set(B.section, { zIndex: forward ? 2 : 1 });
    if (forward) {
      // The one in hand leaves up and left; the next comes from its peek (or, a jump, from the peek spot) to the centre.
      animate(a, away, 0, leave);
      const arriveFrom = b === a + 1 ? undefined : (peeks[b] ?? rest);
      animate(b, rest, 1, arrive, arriveFrom, 1);
      // The old peek, if it is not the one arriving, goes back down.
      if (a + 1 !== b && parts[a + 1] != null) {
        show(a + 1);
        animate(a + 1, belows[a + 1] ?? rest, 0, leave);
      }
    } else {
      // Back: the one in hand goes down to the peek (or away below, a jump); the earlier one comes back from away.
      animate(a, b + 1 === a ? (peeks[a] ?? rest) : (belows[a] ?? rest), b + 1 === a ? 1 : 0, arrive);
      animate(b, rest, 1, arrive, away, 0);
      if (parts[a + 1] != null) {
        show(a + 1);
        animate(a + 1, belows[a + 1] ?? rest, 0, leave);
      }
    }
    // The next preview rises from below into the corner over the same 0.55s.
    const next = b + 1;
    if (next < count && next !== a) {
      show(next);
      animate(next, peeks[next] ?? rest, 1, arrive, belows[next] ?? rest, 0);
    }
    wordsIn(b, tl);
    tl.call(unlock, undefined, LANDING_MOVE.unlockAt);
  }

  /**
   * A long jump (more than one case away: the wordmark, the rail, Home, End): the frame in hand, its preview and its
   * words fade out (0.3s); then the cases between are skipped, never animated, and the target arrives as usual
   * (0.55s, expo.out), its preview rising into the corner and its words coming in on the move's own timing.
   */
  function jump(a: number, b: number) {
    const out = tween('landing.jumpOut');
    current = b;
    onChange(b);
    markCurrent(b);
    if (window.scrollY <= lastY() + 1) {
      jumpToY(positionOf(b));
    }
    const tl = gsap.timeline({
      onComplete: () => {
        if (move === tl) {
          move = null;
        }
        settleOn(b);
      },
    });
    move = tl;
    const old = wordsFor;
    wordsFor = null;
    if (old !== null) {
      revertSplit(old);
      const p = parts[old];
      const words = p === null ? [] : [p.words, p.title].filter((element): element is HTMLElement => element !== null);
      gsap.killTweensOf(words);
      tl.to(words, { opacity: 0, ...out, overwrite: 'auto' }, 0);
    }
    const leaving = [a, a + 1].map(i => parts[i]?.anchor).filter((anchor): anchor is HTMLElement => anchor != null);
    gsap.killTweensOf(leaving);
    tl.to(leaving, { opacity: 0, ...out, overwrite: 'auto' }, 0);
    // The cases between are skipped: everything is set straight to where the target's arrival starts.
    const B = parts[b];
    const next = b + 1 < count ? parts[b + 1] : null;
    const start = b > a ? (peeks[b] ?? rest) : away;
    tl.call(
      () => {
        parts.forEach((p, i) => {
          if (p !== null && i !== b && i !== b + 1) {
            gsap.set(p.section, { visibility: 'hidden' });
          }
        });
        if (B !== null) {
          gsap.set(B.section, { visibility: 'visible', zIndex: 2 });
        }
        if (next != null) {
          gsap.set(next.section, { visibility: 'visible', zIndex: 1 });
        }
      },
      undefined,
      out.duration
    );
    const arrive = tween('landing.arrive');
    if (B !== null) {
      tl.set(B.anchor, { ...start, opacity: b > a ? 1 : 0 }, out.duration).to(B.anchor, { ...rest, opacity: 1, ...arrive, overwrite: 'auto' }, out.duration);
    }
    if (next != null) {
      tl.set(next.anchor, { ...(belows[b + 1] ?? rest), opacity: 0 }, out.duration).to(next.anchor, { ...(peeks[b + 1] ?? rest), opacity: 1, ...arrive, overwrite: 'auto' }, out.duration);
    }
    wordsIn(b, tl, out.duration);
    tl.call(unlock, undefined, out.duration + LANDING_MOVE.unlockAt);
  }

  // ---- The first state.
  measure();
  hideAllWords();
  settleOn(current);
  if (current > 0) {
    jumpToY(positionOf(current));
  }
  const place = parts[current]?.place ?? null;
  const peek = parts[current + 1]?.place ?? null;
  if (!shown) {
    if (place !== null) {
      gsap.set(place, { opacity: 0 });
    }
    if (peek !== null) {
      gsap.set(peek, { opacity: 0 });
    }
  }

  /**
   * Whether this input is the stage's (it moves a case) or the page's (Lenis scrolls on, into or within the footer).
   * Past the last case going down, and within the footer, it is the page's; coming back up out of the footer, the
   * stage's again.
   */
  const claims = (direction: 1 | -1, delta = 0): boolean => {
    // While a move runs, every input is swallowed, so Lenis never takes over half-way.
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
    if (direction > 0) {
      return false;
    }
    const target = (getLenis()?.targetScroll ?? y) + delta;
    return target <= last + 1;
  };
  /** Not ours: a dialog, a field, or something that scrolls itself. */
  const notOurs = (target: EventTarget | null) =>
    target instanceof Element && target.closest('[role="dialog"], [aria-modal="true"], input, textarea, select, [contenteditable="true"], [data-lenis-prevent]') !== null;
  /** One gesture's move, the way it points; from the footer, back up to the last case. */
  const step = (direction: 1 | -1) => moveTo(window.scrollY > lastY() + 1 ? count - 1 : current + direction);

  // The wheel (and a trackpad), taken before Lenis (capture, on the window): one gesture, one move.
  const gate = createGestureGate();
  const onWheel = (event: WheelEvent) => {
    const raw = event.deltaMode === 1 ? event.deltaY * 16 : event.deltaMode === 2 ? event.deltaY * window.innerHeight : event.deltaY;
    gate.note(event.timeStamp || performance.now(), raw);
    if (!alive || event.ctrlKey || notOurs(event.target)) {
      return;
    }
    const delta = Math.abs(event.deltaY) >= Math.abs(event.deltaX) ? raw : 0;
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

  // A swipe: one move per touch, once it has gone far enough to mean it.
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
    if (!touchUsed && !claims(direction, delta)) {
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

  // Only the case in hand can be pressed: a press on another (the peeking frame) does nothing at all.
  const onClick = (event: MouseEvent) => {
    const section = event.target instanceof Element ? event.target.closest<HTMLElement>('[data-exhibit]') : null;
    if (section !== null && section.getAttribute('data-current') !== 'true') {
      event.preventDefault();
      event.stopPropagation();
    }
  };
  stage.addEventListener('click', onClick, { capture: true });

  // ---- The keyboard: arrows, Page keys and Space go one case, like a gesture; Home and End to the ends.
  const go = (index: number) => {
    if (index >= 0 && index < count) {
      moveTo(index);
    }
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

  // ---- A new window size: the poses are measured again, and everything set at rest.
  let resizeTimer: ReturnType<typeof setTimeout> | null = null;
  const onResize = () => {
    if (resizeTimer !== null) {
      clearTimeout(resizeTimer);
    }
    resizeTimer = setTimeout(() => {
      if (alive && !moving) {
        measure();
        settleOn(current);
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
        gsap.to(peek, { opacity: 1, ...tween('landing.textIn') });
      }
      // The first case's words: the same timing as a move's, from its start.
      if (wordsFor === null) {
        wordsIn(current, gsap.timeline());
      }
    },
    go,
    moving: () => moving,
    wordsFor: () => wordsFor,
    timeline: () => move,
    destroy: () => {
      if (!alive) {
        return;
      }
      alive = false;
      move?.kill();
      splits.forEach(split => split.revert());
      splits.clear();
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('wheel', onWheel, { capture: true });
      window.removeEventListener('touchstart', onTouchStart, { capture: true });
      window.removeEventListener('touchmove', onTouchMove, { capture: true });
      window.removeEventListener('scroll', onScroll);
      stage.removeEventListener('click', onClick, { capture: true });
      sections.forEach(section => section.removeAttribute('data-current'));
      window.removeEventListener('resize', onResize);
      if (resizeTimer !== null) {
        clearTimeout(resizeTimer);
      }
      if (moveTimer !== null) {
        clearTimeout(moveTimer);
      }
      setSmoothLerp(null);
    },
  };
}
