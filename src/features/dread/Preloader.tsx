// src/features/dread/Preloader.tsx
// The loading screen (dread pass, 1; landing v2 brief, 5): a dark screen with the Histor mark, a typed line and a thin
// progress line, shown while the fonts and the first images load, at most about three seconds. It never takes a click
// (nothing is ever blocked) and is hidden from screen readers. Reduced motion: no typing, and it simply fades.
// Two uses: the desk's "Recovering the files…", once per page load (`once`); and the story's "Opening the case…",
// which only appears if loading takes longer than `showAfterMs` (about 400ms), so a quick load has no loader at all.
import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { MOTION_QUERIES, STEP, tween } from '@/lib/motion';
import { PRELOAD_MAX_MS, takePreloader } from '@/lib/preloader';
import { typeElement } from '@/lib/typewriter';
import HistorMark from '@/components/HistorMark';

gsap.registerPlugin(useGSAP);

/** Resolves once an image has loaded (or failed), so a missing file never holds the screen. */
function imageReady(src: string): Promise<void> {
  return new Promise(resolve => {
    const image = new Image();
    image.onload = () => resolve();
    image.onerror = () => resolve();
    image.src = src;
  });
}

interface PreloaderProps {
  /** The first images the reader will see. */
  images: string[];
  /** The typed line, e.g. "Recovering the files…". */
  label: string;
  /** Show it only the first time on a page load (the desk's). Otherwise every time it is mounted. */
  once?: boolean;
  /** Show nothing unless loading takes longer than this many ms (the story's). 0 shows it at once. */
  showAfterMs?: number;
}

/** What the loading screen waits for: the fonts, then each image. */
function waitsFor(images: string[]): Promise<unknown>[] {
  return [document.fonts?.ready ?? Promise.resolve(), ...images.map(imageReady)];
}

export default function Preloader({ images, label, once = false, showAfterMs = 0 }: PreloaderProps) {
  const [allowed] = useState(() => typeof window !== 'undefined' && typeof window.matchMedia === 'function' && (!once || takePreloader()));
  const [imageList] = useState(images);
  /** Past the grace period and still loading: the screen may show. */
  const [armed, setArmed] = useState(showAfterMs <= 0);
  useEffect(() => {
    if (!allowed || armed) {
      return;
    }
    let settled = false;
    void Promise.allSettled(waitsFor(imageList)).then(() => {
      settled = true;
    });
    const timer = window.setTimeout(() => {
      if (!settled) {
        setArmed(true);
      }
    }, showAfterMs);
    return () => window.clearTimeout(timer);
  }, [allowed, armed, imageList, showAfterMs]);
  return allowed && armed ? <LoaderScreen images={imageList} label={label} /> : null;
}

function LoaderScreen({ images: imageList, label }: { images: string[]; label: string }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const show = true;
  const [gone, setGone] = useState(false);

  useGSAP(
    () => {
      const root = rootRef.current;
      if (!show || root === null) {
        return;
      }
      const reduced = window.matchMedia(MOTION_QUERIES.reduced).matches;
      const line = root.querySelector<HTMLElement>('[data-preloader="line"]');
      const bar = root.querySelector<HTMLElement>('[data-preloader="progress"]');
      const started = performance.now();
      const typing = gsap.timeline();
      const typed = reduced ? null : typeElement(typing, line, STEP.fast);
      // What there is to wait for: the fonts, then each image.
      const waits = waitsFor(imageList);
      let done = 0;
      gsap.set(bar, { scaleX: 0 });
      const step = () => {
        done += 1;
        gsap.to(bar, { scaleX: done / waits.length, ...tween('dread.progress'), overwrite: true });
      };
      waits.forEach(wait => void Promise.resolve(wait).then(step, step));
      let finished = false;
      const finish = () => {
        if (finished) {
          return;
        }
        finished = true;
        gsap.to(bar, { scaleX: 1, ...tween('dread.progress'), overwrite: true });
        gsap.to(root, { opacity: 0, ...tween('scene'), delay: tween('dread.progress').duration, onComplete: () => setGone(true) });
      };
      const cap = setTimeout(finish, PRELOAD_MAX_MS);
      void Promise.allSettled(waits).then(() => {
        // Let the line be read: never gone before it has been typed.
        const typedFor = typed === null ? 0 : typed.end * 1000;
        setTimeout(finish, Math.max(0, typedFor - (performance.now() - started)));
      });
      return () => {
        clearTimeout(cap);
        typing.kill();
        typed?.split.revert();
      };
    },
    { scope: rootRef }
  );

  useEffect(() => {
    if (gone) {
      return;
    }
    const html = document.documentElement;
    html.dataset.preloading = 'true';
    return () => {
      delete html.dataset.preloading;
    };
  }, [gone]);

  if (gone) {
    return null;
  }
  return (
    <div ref={rootRef} aria-hidden="true" data-preloader="" className="pointer-events-none fixed inset-0 z-[80] grid place-items-center bg-night">
      <div className="flex flex-col items-center gap-5 text-night-ink/80">
        {/* The Histor mark (quick fixes, 4: it replaces the ship's bell). */}
        <HistorMark className="h-11 w-auto text-night-ink" />
        <p data-preloader="line" className="font-voice text-[0.9375rem] tracking-[0.06em]">
          {label}
        </p>
        <span className="block h-px w-40 overflow-hidden bg-night-ink/15">
          <span data-preloader="progress" className="block h-full w-full origin-left bg-brass/70" />
        </span>
      </div>
    </div>
  );
}
