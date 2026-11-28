// src/features/hook/HookScreen.tsx
// The case's first screen, on its own, on every visit: the case's picture, very dark and slowly drifting under a soft,
// moving fog (CSS only: effects.css). The hook lines appear one at a time, centred and unhurried; then the dateline
// fades in; then the screen dissolves into chapter 1 (the story is mounted under it as the dissolve starts). A small
// "Skip" sits in the corner the whole time. Everything shown comes from the case data.
// Sound (src/lib/sound): the sea and the wind under the screen, and one soft low tone as each line appears.
import { useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { INK_RISE, LINEAR, MOTION_QUERIES, tween } from '@/lib/motion';
import { imageSources } from '@/lib/image-sources';
import { emitStoryEvent } from '@/lib/story-events';
import { HOOK_PACE } from '@/lib/story-pages';
import type { CaseHook, ImageAsset } from '@/types/case';

gsap.registerPlugin(useGSAP);

interface HookScreenProps {
  hook: CaseHook;
  /** The case's picture, shown very dark behind the lines. */
  image?: ImageAsset;
  /** The dissolve begins: the story can mount under the screen. Called once. */
  onEnded: () => void;
  /** The screen has gone. Called once. */
  onDone: () => void;
}

export default function HookScreen({ hook, image, onEnded, onDone }: HookScreenProps) {
  const rootRef = useRef<HTMLElement>(null);
  /** Ends the screen early (Skip). Set by the effect below. */
  const skipRef = useRef<() => void>(() => undefined);
  const sources = image === undefined ? null : imageSources(image.src);

  useGSAP(
    () => {
      const root = rootRef.current;
      if (root === null) {
        return;
      }
      const lines = [...root.querySelectorAll<HTMLElement>('[data-hook="line"]')];
      const dateline = root.querySelector<HTMLElement>('[data-hook="dateline"]');
      let finished = false;
      // Without matchMedia a reduced-motion request cannot be honoured, so nothing is animated: straight to the story.
      if (typeof window.matchMedia !== 'function') {
        finished = true;
        onEnded();
        onDone();
        return;
      }
      const mm = gsap.matchMedia();
      mm.add(MOTION_QUERIES, context => {
        const reduced = context.conditions?.reduced === true;
        // Reduced motion keeps the fades and takes the rise away.
        const rise = reduced ? 0 : INK_RISE;
        gsap.set([...lines, ...(dateline === null ? [] : [dateline])], { opacity: 0 });
        gsap.set(root, { opacity: 1 });
        emitStoryEvent({ type: 'hook-screen', on: true });

        /** The dissolve into chapter 1: the story mounts, then the screen fades off the top of it. */
        const end = (seconds: number) => {
          if (finished) {
            return;
          }
          finished = true;
          timeline.kill();
          emitStoryEvent({ type: 'hook-screen', on: false });
          onEnded();
          gsap.to(root, { opacity: 0, ease: LINEAR, duration: seconds, onComplete: onDone });
        };
        skipRef.current = () => end(HOOK_PACE.skipDissolve);

        // `data` marks it as the hook's own timeline (tests settle it with this).
        const timeline = gsap.timeline({ data: 'hook', onComplete: () => end(HOOK_PACE.dissolve) });
        let at: number = HOOK_PACE.before;
        lines.forEach((line, index) => {
          timeline.fromTo(line, { opacity: 0, y: rise }, { opacity: 1, y: 0, ...tween('ink.in') }, at);
          timeline.call(() => emitStoryEvent({ type: 'hook-line', index }), undefined, at);
          at += tween('ink.in').duration + HOOK_PACE.lineHold;
          timeline.to(line, { opacity: 0, ...tween('ink.out') }, at);
          at += tween('ink.out').duration + HOOK_PACE.lineGap;
        });
        if (dateline !== null) {
          timeline.fromTo(dateline, { opacity: 0 }, { opacity: 1, duration: HOOK_PACE.datelineIn, ease: tween('ink.in').ease }, at);
          at += HOOK_PACE.datelineIn + HOOK_PACE.datelineHold;
        }
        // The timeline ends once the dateline has been held; the dissolve follows.
        timeline.to({}, { duration: 0 }, at);
        return () => {
          timeline.kill();
          if (!finished) {
            emitStoryEvent({ type: 'hook-screen', on: false });
          }
        };
      });
      return () => mm.revert();
    },
    { scope: rootRef, dependencies: [hook] }
  );

  return (
    <section
      ref={rootRef}
      aria-label="The hook"
      data-hook="root"
      className="fixed inset-0 z-[70] grid place-items-center overflow-hidden bg-night text-night-ink"
    >
      {image !== undefined && (
        <div aria-hidden="true" className="absolute inset-0 overflow-hidden">
          <img
            data-hook="image"
            src={image.src}
            srcSet={sources?.srcSet}
            sizes={sources?.srcSet === undefined ? undefined : sources.sizes}
            alt=""
            decoding="async"
            draggable={false}
            className="hook-drift h-full w-full object-cover"
          />
        </div>
      )}
      {/* Very dark: a flat shade over the picture, then a vignette, then the fog. */}
      <div aria-hidden="true" className="absolute inset-0 bg-night/80" />
      <div aria-hidden="true" className="hook-vignette absolute inset-0" />
      <div aria-hidden="true" className="hook-fog hook-fog-a absolute" />
      <div aria-hidden="true" className="hook-fog hook-fog-b absolute" />

      {/* Screen readers get the whole hook at once; the lines the eyes see appear one at a time. */}
      <p className="sr-only">
        {hook.lines.join(' ')} {hook.dateline}
      </p>
      <div aria-hidden="true" className="relative grid w-full max-w-[44rem] place-items-center px-6 text-center">
        {hook.lines.map((line, index) => (
          <p
            key={index}
            data-hook="line"
            className="col-start-1 row-start-1 font-legend text-[clamp(2.25rem,1.5rem+3.6vw,4.5rem)] leading-[1.1] text-balance text-night-ink [text-shadow:0_2px_30px_rgb(0_0_0/0.7)]"
            style={{ opacity: 0 }}
          >
            {line}
          </p>
        ))}
        <p
          data-hook="dateline"
          className="col-start-1 row-start-1 font-voice text-[clamp(0.9375rem,0.85rem+0.5vw,1.25rem)] tracking-[0.22em] text-ghost-night uppercase"
          style={{ opacity: 0 }}
        >
          {hook.dateline}
        </p>
      </div>

      <button
        type="button"
        onClick={() => skipRef.current()}
        className="absolute top-4 right-4 z-10 min-h-11 rounded-sm border border-night-ink/30 bg-night/60 px-4 font-voice text-sm tracking-[0.14em] text-night-ink/90 uppercase transition-[scale,color,border-color] duration-150 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass active:scale-[0.97] sm:top-6 sm:right-6"
      >
        Skip
      </button>
    </section>
  );
}
