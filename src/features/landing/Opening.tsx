// src/features/landing/Opening.tsx
// The landing page's opening (landing v2 brief, 1), about 3 to 4s:
//   1. a black screen; the Histor wordmark fades in, centred;
//   2. behind it, a blurred, zoomed-in detail of the first case's picture fades in;
//   3. the detail sharpens and pulls back until the whole picture shows, and settles into its haunted frame;
//   4. at the same time the wordmark shrinks to the top left to become the header's logo, and the header's pills
//      fade in; then the first section's words come into focus and the rail appears (Landing.tsx).
// A scroll, touch, key or click skips to the end. The page does not scroll until it is over. Reduced motion: straight
// to the end state, with a fade. Transform and opacity only: the blurred look is a small soft copy of the picture
// (src/lib/blurred-copy.ts) that cross-fades to the sharp one, never a live blur on a large layer.
import { useEffect, useRef, useState, type RefObject } from 'react';
import gsap from 'gsap';
import { blurredCopy, loadImage } from '@/lib/blurred-copy';
import { MOTION_QUERIES, STEP, tween } from '@/lib/motion';
import { pauseSmoothScroll, resumeSmoothScroll } from '@/lib/smooth-scroll';

/** The longest the opening waits for the detail's picture, in ms. */
export const OPENING_IMAGE_WAIT_MS = 2000;

/** Keys that mean "go on": the ones that would scroll. */
const SKIP_KEYS = new Set(['ArrowDown', 'PageDown', ' ', 'End', 'Enter', 'Escape']);

/** How close the detail starts (the picture's own scale inside it) and where it looks at. */
const DETAIL = { zoom: 1.55, origin: '56% 58%', dimmed: 0.55 } as const;

interface OpeningProps {
  /** The header's wordmark: where this one docks. */
  targetRef: RefObject<HTMLImageElement | null>;
  /** The first case's picture and where its frame's opening is on screen. No picture: the wordmark docks alone. */
  detail?: { src: string; frameRect: () => DOMRect | null };
  /** The wordmark has started docking: the header's pills fade in. */
  onDock: () => void;
  /** The picture has settled into its frame: the frame comes in around it. */
  onSettle: () => void;
  /** The opening is over: the words come into focus, the rail appears. */
  onDone: () => void;
}

export default function Opening({ targetRef, detail, onDock, onSettle, onDone }: OpeningProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const markRef = useRef<HTMLImageElement>(null);
  const detailRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const softRef = useRef<HTMLImageElement>(null);
  const [gone, setGone] = useState(false);
  const calls = useRef({ onDock, onSettle, onDone });
  useEffect(() => {
    calls.current = { onDock, onSettle, onDone };
  }, [onDock, onSettle, onDone]);
  const detailSrc = detail?.src;
  const frameRect = useRef(detail?.frameRect);
  useEffect(() => {
    frameRect.current = detail?.frameRect;
  }, [detail]);

  useEffect(() => {
    const root = rootRef.current;
    const mark = markRef.current;
    if (root === null || mark === null) {
      return;
    }
    const html = document.documentElement;
    const overflow = html.style.overflow;
    html.style.overflow = 'hidden';
    pauseSmoothScroll();
    const black = root.querySelector<HTMLElement>('[data-landing="opening-black"]');
    const reduced = typeof window.matchMedia !== 'function' || window.matchMedia(MOTION_QUERIES.reduced).matches;
    const fired = { dock: false, settle: false, done: false };
    let timeline: gsap.core.Timeline | null = null;
    let skipped = false;
    let alive = true;

    const fire = (name: 'dock' | 'settle') => {
      if (!fired[name]) {
        fired[name] = true;
        if (name === 'dock') {
          calls.current.onDock();
        } else {
          calls.current.onSettle();
        }
      }
    };
    const end = () => {
      if (fired.done || !alive) {
        return;
      }
      fired.done = true;
      fire('dock');
      fire('settle');
      const target = targetRef.current;
      if (target !== null) {
        gsap.set(target, { opacity: 1 });
      }
      detach();
      html.style.overflow = overflow;
      resumeSmoothScroll();
      calls.current.onDone();
      setGone(true);
    };
    const skip = () => {
      skipped = true;
      if (timeline !== null) {
        // Events on, so every step the skip passes over still happens.
        timeline.progress(1, false);
      } else {
        // Still waiting for the picture: no need to wait any longer.
        end();
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (SKIP_KEYS.has(event.key)) {
        skip();
      }
    };
    const detach = () => {
      window.removeEventListener('wheel', skip);
      window.removeEventListener('touchmove', skip);
      window.removeEventListener('pointerdown', skip);
      window.removeEventListener('keydown', onKey);
    };
    window.addEventListener('wheel', skip, { passive: true });
    window.addEventListener('touchmove', skip, { passive: true });
    window.addEventListener('pointerdown', skip);
    window.addEventListener('keydown', onKey);

    if (reduced) {
      // The end state, with a fade.
      const target = targetRef.current;
      fire('dock');
      fire('settle');
      timeline = gsap.timeline({ onComplete: end });
      timeline.to(root, { opacity: 0, ...tween('ink.out') }, 0);
      if (target !== null) {
        timeline.to(target, { opacity: 1, ...tween('ink.in') }, 0);
      }
      return () => {
        alive = false;
        detach();
        timeline?.kill();
        html.style.overflow = overflow;
        resumeSmoothScroll();
      };
    }

    // The wordmark fades in at once, on the black.
    gsap.fromTo(mark, { opacity: 0 }, { opacity: 1, ...tween('landing.wordmark') });

    const build = (picture: HTMLImageElement | null) => {
      if (!alive || fired.done) {
        return;
      }
      const target = targetRef.current;
      const from = mark.getBoundingClientRect();
      const to = target?.getBoundingClientRect();
      const wordmarkTween =
        to === undefined || from.width === 0
          ? null
          : { x: to.left - from.left, y: to.top - from.top, scale: to.width / from.width, transformOrigin: '0 0', ...tween('scene') };
      const rect = picture === null ? null : (frameRect.current?.() ?? null);
      const detailEl = detailRef.current;
      const inner = innerRef.current;
      const soft = softRef.current;
      const tl = gsap.timeline({ onComplete: end });
      timeline = tl;
      let pullAt = STEP.slow;
      if (picture !== null && rect !== null && rect.width > 0 && detailEl !== null && inner !== null) {
        const copy = blurredCopy(picture);
        if (soft !== null) {
          if (copy === null) {
            soft.style.display = 'none';
          } else {
            soft.src = copy;
          }
        }
        // Over the frame's opening exactly; scaled up to fill the screen, looking at the ship.
        Object.assign(detailEl.style, { left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, height: `${rect.height}px`, visibility: 'visible', willChange: 'transform' });
        const fill = Math.max(window.innerWidth / rect.width, window.innerHeight / rect.height);
        gsap.set(detailEl, { scale: fill, opacity: 0, transformOrigin: '50% 50%' });
        gsap.set(inner, { scale: DETAIL.zoom, transformOrigin: DETAIL.origin });
        if (soft !== null) {
          gsap.set(soft, { opacity: 1 });
        }
        tl.to(detailEl, { opacity: DETAIL.dimmed, ...tween('landing.wordmark') }, STEP.fast);
        pullAt = STEP.fast + tween('landing.wordmark').duration;
        const pull = tween('landing.pull');
        tl.addLabel('pull', pullAt);
        if (soft !== null) {
          tl.to(soft, { opacity: 0, ...pull }, 'pull');
        }
        tl.to(detailEl, { scale: 1, opacity: 1, ...pull }, 'pull')
          .to(inner, { scale: 1, ...pull }, 'pull')
          .call(() => fire('settle'), undefined, `pull+=${pull.duration}`)
          .to(detailEl, { opacity: 0, ...tween('hover'), duration: STEP.fast * 1.5 }, `pull+=${pull.duration + STEP.base}`);
        // The wordmark leaves for the header while the picture is still settling.
        if (wordmarkTween !== null) {
          tl.call(() => fire('dock'), undefined, `pull+=${pull.duration * 0.4}`).to(mark, wordmarkTween, `pull+=${pull.duration * 0.4}`);
        }
        tl.to(black, { opacity: 0, ...tween('ink.out') }, `pull+=${pull.duration}`);
      } else {
        // No picture to show: a beat on the black, then the wordmark goes to the header.
        tl.call(() => fire('settle'), undefined, pullAt);
        tl.call(() => fire('dock'), undefined, pullAt);
        if (wordmarkTween !== null) {
          tl.to(mark, wordmarkTween, pullAt);
        }
        tl.to(black, { opacity: 0, ...tween('scene') }, pullAt);
      }
      if (skipped) {
        tl.progress(1, false);
      }
    };

    if (detailSrc === undefined) {
      build(null);
    } else {
      void loadImage(detailSrc, OPENING_IMAGE_WAIT_MS).then(build);
    }
    return () => {
      alive = false;
      detach();
      timeline?.kill();
      html.style.overflow = overflow;
      resumeSmoothScroll();
    };
  }, [targetRef, detailSrc]);

  if (gone) {
    return null;
  }
  return (
    <div ref={rootRef} data-landing="opening" aria-hidden="true" className="pointer-events-none fixed inset-0 z-50">
      <div data-landing="opening-black" className="absolute inset-0 bg-black" />
      {detailSrc !== undefined && (
        <div ref={detailRef} data-landing="opening-detail" className="opening-detail invisible absolute overflow-hidden">
          <div ref={innerRef} className="absolute inset-0">
            <img src={detailSrc} alt="" decoding="async" draggable={false} className="absolute inset-0 h-full w-full object-cover" />
            <img ref={softRef} alt="" draggable={false} data-landing="opening-soft" className="absolute inset-0 h-full w-full object-cover" />
          </div>
        </div>
      )}
      <div className="absolute inset-0 grid place-items-center px-6">
        <img ref={markRef} src="/brand/histor-logo-cream.svg" alt="" data-landing="opening-mark" className="w-[min(78vw,56rem)] opacity-0" />
      </div>
    </div>
  );
}
