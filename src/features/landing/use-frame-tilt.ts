// src/features/landing/use-frame-tilt.ts
// A frame on hover (landing brief, 4): it tilts gently toward the cursor (about ±5°, smoothed), a dull glint moves
// across the gilt, and a sealed case's veil stirs. Only with a mouse on a laptop, at full motion; transforms only.
import { useEffect, type RefObject } from 'react';
import gsap from 'gsap';
import { DESKTOP_QUERY } from '@/lib/use-media-query';
import { MOTION_QUERIES, tween } from '@/lib/motion';

/** The most the frame turns toward the cursor, in degrees. */
export const FRAME_TILT = 5;

export function useFrameTilt(ref: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    const element = ref.current;
    if (element === null || typeof window.matchMedia !== 'function') {
      return;
    }
    if (!window.matchMedia(`${DESKTOP_QUERY} and ${MOTION_QUERIES.full} and (hover: hover) and (pointer: fine)`).matches) {
      return;
    }
    const frame = element.querySelector<HTMLElement>('.haunted-frame');
    const glint = element.querySelector<HTMLElement>('[data-frame-part="glint"]');
    const veil = element.querySelector<HTMLElement>('[data-frame-part="veil"]');
    if (frame === null) {
      return;
    }
    const smooth = tween('dread.gaze');
    const turnY = gsap.quickTo(frame, 'rotationY', smooth);
    const turnX = gsap.quickTo(frame, 'rotationX', smooth);
    const glide = glint === null ? null : gsap.quickTo(glint, 'xPercent', smooth);
    const move = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') {
        return;
      }
      const box = frame.getBoundingClientRect();
      const x = (event.clientX - box.left) / box.width - 0.5;
      const y = (event.clientY - box.top) / box.height - 0.5;
      turnY(x * 2 * FRAME_TILT);
      turnX(-y * 2 * FRAME_TILT);
      glide?.(x * 260 + 60);
    };
    const enter = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') {
        return;
      }
      frame.style.willChange = 'transform';
      if (glint !== null) {
        gsap.to(glint, { opacity: 1, ...tween('hover') });
      }
      if (veil !== null) {
        gsap.to(veil, { rotation: 0.6, ...tween('paper.move'), yoyo: true, repeat: 1 });
      }
    };
    const leave = () => {
      turnY(0);
      turnX(0);
      frame.style.willChange = '';
      if (glint !== null) {
        gsap.to(glint, { opacity: 0, ...tween('hover') });
      }
    };
    element.addEventListener('pointermove', move);
    element.addEventListener('pointerenter', enter);
    element.addEventListener('pointerleave', leave);
    return () => {
      element.removeEventListener('pointermove', move);
      element.removeEventListener('pointerenter', enter);
      element.removeEventListener('pointerleave', leave);
    };
  }, [ref]);
}
