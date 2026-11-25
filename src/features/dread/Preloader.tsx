// src/features/dread/Preloader.tsx
// The preloader (dread pass, 1): on the first load of a page, a dark screen with a small ship's-bell mark, the typed
// line "Recovering the files…" and a thin progress line, shown while the fonts and the first images load, at most about
// three seconds. Then it fades into the legend intro. It never takes a click (nothing is ever blocked) and is hidden
// from screen readers. Reduced motion: no typing, and it simply fades. Shown once per page load.
import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { MOTION_QUERIES, STEP, tween } from '@/lib/motion';
import { PRELOAD_MAX_MS, takePreloader } from '@/lib/preloader';
import { typeElement } from '@/lib/typewriter';

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
  /** The first images the reader will see (the legend's still, the first chapter's image). */
  images: string[];
}

export default function Preloader({ images }: PreloaderProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [show] = useState(() => typeof window !== 'undefined' && typeof window.matchMedia === 'function' && takePreloader());
  const [gone, setGone] = useState(!show);
  const [imageList] = useState(images);

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
      const waits: Promise<unknown>[] = [document.fonts?.ready ?? Promise.resolve(), ...imageList.map(imageReady)];
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
        {/* A small ship's bell. */}
        <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="size-10 text-brass">
          <path d="M24 6v4M20 6h8" />
          <path d="M14 34c0-12 3-22 10-22s10 10 10 22" />
          <path d="M10 34h28M12 38h24" />
          <circle cx="24" cy="41" r="2" />
        </svg>
        <p data-preloader="line" className="font-voice text-[0.9375rem] tracking-[0.06em]">
          Recovering the files…
        </p>
        <span className="block h-px w-40 overflow-hidden bg-night-ink/15">
          <span data-preloader="progress" className="block h-full w-full origin-left bg-brass/70" />
        </span>
      </div>
    </div>
  );
}
