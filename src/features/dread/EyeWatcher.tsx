// src/features/dread/EyeWatcher.tsx
// The face in the dark (dread pass, 4; the fix list). Rarely (eye-watch.ts: never in the first 30 seconds of activity,
// then once every 60 to 120 seconds of it at most), a face without flesh, hollow eyes and a nose only, about 120px
// tall, appears in an empty dark place: a zone of a story image (`StorySection.eyeZones`) or one of the desk's corners
// (`[data-eye-zone]`), never over text or a control, and only where it fits. It fades in out of the dark, looks to one
// side, and fades away. A barely audible breath comes with it (the `eye` event). Under reduced motion it never appears.
// A one-second timer counts activity; nothing runs between appearances.
import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import Face from '@/features/dread/Face';
import { EYE, FACE_GLANCE, boxIsClear, eyeDue, nextEyeAt } from '@/lib/eye-watch';
import { MOTION_QUERIES, tween } from '@/lib/motion';
import { emitStoryEvent } from '@/lib/story-events';

interface Showing {
  left: number;
  top: number;
}

/** A zone that is on screen, big enough for the face, and in a scene that is showing. */
function visibleZone(zone: HTMLElement): DOMRect | null {
  const scene = zone.closest<HTMLElement>('[data-story="chapter"]');
  if (scene !== null && scene.dataset.active !== 'true') {
    return null;
  }
  const box = zone.getBoundingClientRect();
  const fits = box.width >= EYE.width && box.height >= EYE.height;
  const onScreen = box.top >= 0 && box.left >= 0 && box.bottom <= window.innerHeight && box.right <= window.innerWidth;
  return fits && onScreen ? box : null;
}

export default function EyeWatcher() {
  const [showing, setShowing] = useState<Showing | null>(null);
  const faceRef = useRef<HTMLDivElement>(null);

  // Activity, counted once a second; the face when it is due and an empty dark zone is on screen.
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
      const left = pick.box.left + (pick.box.width - EYE.width) / 2;
      const top = pick.box.top + (pick.box.height - EYE.height) / 2;
      // Never over text or a control: anything under it with text of its own, or that can be pressed, rules it out
      // (the written story page included, though screen readers skip it).
      if (!boxIsClear(new DOMRect(left, top, EYE.width, EYE.height), element => pick.zone.contains(element))) {
        return;
      }
      open = true;
      nextAt = nextEyeAt(active);
      setShowing({ left, top });
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

  // One showing: it comes out of the dark, looks to one side, and fades.
  useEffect(() => {
    const root = faceRef.current;
    if (showing === null || root === null) {
      return;
    }
    const gaze = root.querySelector('[data-face="gaze"]');
    emitStoryEvent({ type: 'eye' });
    const [low, high] = EYE.lookFor;
    const side = Math.random() < 0.5 ? -1 : 1;
    const timeline = gsap.timeline({
      onComplete: () => {
        setShowing(null);
        window.dispatchEvent(new Event('histor:eye-closed'));
      },
    });
    timeline
      .fromTo(root, { opacity: 0 }, { opacity: 1, ...tween('dread.lid') })
      .to(gaze, { x: side * FACE_GLANCE, ...tween('dread.gaze') })
      .to(root, { opacity: 0, ...tween('dread.lid') }, `+=${low + Math.random() * (high - low)}`);
    return () => {
      timeline.kill();
    };
  }, [showing]);

  if (showing === null) {
    return null;
  }
  return (
    <div
      ref={faceRef}
      aria-hidden="true"
      data-eye-showing=""
      className="pointer-events-none fixed z-[44] opacity-0"
      style={{ left: showing.left, top: showing.top, width: EYE.width, height: EYE.height }}
    >
      <Face className="block h-full w-full" />
    </div>
  );
}
