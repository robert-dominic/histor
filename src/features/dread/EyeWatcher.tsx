// src/features/dread/EyeWatcher.tsx
// The eye (dread pass, 4). Rarely (eye-watch.ts: never in the first 30 seconds of activity, then once every 60 to 120
// seconds of it at most), an eye opens in a dark place: a zone of a story image (`StorySection.eyeZones`) or one of the
// desk's corners (`[data-eye-zone]`), only where it covers no text and no control. It opens slowly, follows the cursor
// for 2 to 3 seconds, blinks once, and closes. A barely audible wet blink and a low breath come with it (the `eye`
// event). Under reduced motion it never appears. A one-second timer counts activity; nothing runs between eyes.
import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import Eye from '@/features/dread/Eye';
import { EYE, EYE_GAZE, EYE_OPEN, boxIsClear, eyeDue, nextEyeAt } from '@/lib/eye-watch';
import { MOTION, MOTION_QUERIES, tween } from '@/lib/motion';
import { emitStoryEvent } from '@/lib/story-events';

interface Showing {
  left: number;
  top: number;
  width: number;
}

/** A zone that is on screen and in a scene that is showing. */
function visibleZone(zone: HTMLElement): DOMRect | null {
  const scene = zone.closest<HTMLElement>('[data-story="chapter"]');
  if (scene !== null && scene.dataset.active !== 'true') {
    return null;
  }
  const box = zone.getBoundingClientRect();
  const onScreen = box.width > 20 && box.height > 12 && box.top >= 0 && box.left >= 0 && box.bottom <= window.innerHeight && box.right <= window.innerWidth;
  return onScreen ? box : null;
}

export default function EyeWatcher() {
  const [showing, setShowing] = useState<Showing | null>(null);
  const eyeRef = useRef<HTMLDivElement>(null);

  // Activity, counted once a second; the eye when it is due and a clear zone is on screen.
  useEffect(() => {
    if (typeof window.matchMedia !== 'function' || window.matchMedia(MOTION_QUERIES.reduced).matches) {
      return;
    }
    let lastInput = 0;
    let active = 0;
    let nextAt = 0;
    let open = false;
    const input = () => {
      lastInput = performance.now();
    };
    const inputs = ['pointermove', 'pointerdown', 'keydown', 'wheel', 'touchstart'] as const;
    inputs.forEach(type => window.addEventListener(type, input, { passive: true }));
    const tick = setInterval(() => {
      if (document.visibilityState === 'hidden' || performance.now() - lastInput > EYE.activeWithin * 1000) {
        return;
      }
      active += 1;
      if (open || !eyeDue(active, nextAt) || document.querySelector('[aria-modal="true"]') !== null) {
        return;
      }
      const zones = [...document.querySelectorAll<HTMLElement>('[data-eye-zone]')]
        .map(zone => ({ zone, box: visibleZone(zone) }))
        .filter((entry): entry is { zone: HTMLElement; box: DOMRect } => entry.box !== null);
      const pick = zones[Math.floor(Math.random() * zones.length)];
      if (pick === undefined) {
        return;
      }
      const width = Math.min(EYE.maxWidth, pick.box.width, pick.box.height * 2);
      const height = width / 2;
      const left = pick.box.left + (pick.box.width - width) / 2;
      const top = pick.box.top + (pick.box.height - height) / 2;
      // Never over text or a control: anything under it with text of its own, or that can be pressed, rules it out
      // (the written story page included, though screen readers skip it).
      const clear = boxIsClear(new DOMRect(left, top, width, height), element => pick.zone.contains(element));
      if (!clear) {
        return;
      }
      open = true;
      nextAt = nextEyeAt(active);
      setShowing({ left, top, width });
    }, 1000);
    const done = () => {
      open = false;
    };
    window.addEventListener('histor:eye-closed', done);
    return () => {
      clearInterval(tick);
      inputs.forEach(type => window.removeEventListener(type, input));
      window.removeEventListener('histor:eye-closed', done);
    };
  }, []);

  // One showing: it opens slowly, follows the cursor, blinks once, closes.
  useEffect(() => {
    const root = eyeRef.current;
    if (showing === null || root === null) {
      return;
    }
    const upper = root.querySelector('[data-eye="upper"]');
    const lower = root.querySelector('[data-eye="lower"]');
    const gaze = root.querySelector<SVGGElement>('[data-eye="gaze"]');
    emitStoryEvent({ type: 'eye' });
    const follow = (event: PointerEvent) => {
      const centreX = showing.left + showing.width / 2;
      const centreY = showing.top + showing.width / 4;
      const dx = Math.max(-1, Math.min(1, (event.clientX - centreX) / 400));
      const dy = Math.max(-1, Math.min(1, (event.clientY - centreY) / 300));
      gsap.to(gaze, { x: dx * EYE_GAZE.x, y: dy * EYE_GAZE.y, ...tween('dread.gaze'), overwrite: 'auto' });
    };
    const [low, high] = EYE.followFor;
    const followFor = low + Math.random() * (high - low);
    const lid = tween('dread.lid');
    const blink = tween('dread.blink');
    const timeline = gsap.timeline({
      onComplete: () => {
        window.removeEventListener('pointermove', follow);
        setShowing(null);
        window.dispatchEvent(new Event('histor:eye-closed'));
      },
    });
    timeline
      .fromTo(root, { opacity: 0 }, { opacity: 1, ...tween('ink.in') }, 0)
      .to(upper, { y: EYE_OPEN.upper, ...lid }, 0)
      .to(lower, { y: EYE_OPEN.lower, ...lid }, 0)
      .call(() => window.addEventListener('pointermove', follow, { passive: true }), undefined, lid.duration)
      // It watches; then one blink, and it closes.
      .to(upper, { y: 0, ...blink }, lid.duration + followFor)
      .to(lower, { y: 0, ...blink }, '<')
      .to(upper, { y: EYE_OPEN.upper, ...blink })
      .to(lower, { y: EYE_OPEN.lower, ...blink }, '<')
      .to(upper, { y: 0, ...lid }, `>+=${MOTION['dread.blink'].duration * 2}`)
      .to(lower, { y: 0, ...lid }, '<')
      .to(root, { opacity: 0, ...tween('ink.out') });
    return () => {
      timeline.kill();
      window.removeEventListener('pointermove', follow);
    };
  }, [showing]);

  if (showing === null) {
    return null;
  }
  return (
    <div
      ref={eyeRef}
      aria-hidden="true"
      data-eye-showing=""
      className="pointer-events-none fixed z-[44] opacity-0"
      style={{ left: showing.left, top: showing.top, width: showing.width }}
    >
      <Eye className="block h-auto w-full" />
    </div>
  );
}
