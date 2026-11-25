// src/features/landing/use-frame-tilt.ts
// A frame on hover (landing v3 brief): it rotates in 3D toward the cursor (rotateX and rotateY up to about 8°, with
// perspective), shifts slightly toward it, and its shadow moves the opposite way; the glint follows the cursor across
// the gilt. Everything follows the mouse through gsap.quickTo (smooth, a little behind) and springs back flat when
// the cursor leaves. A sealed case's veil stirs. Only with a mouse on a laptop, at full motion; transforms and
// opacity only.
import { useEffect, type RefObject } from 'react';
import gsap from 'gsap';
import { DESKTOP_QUERY } from '@/lib/use-media-query';
import { MOTION_QUERIES, tween } from '@/lib/motion';

/** The most the frame turns toward the cursor, in degrees. */
export const FRAME_TILT = 8;
/** The most the frame shifts toward the cursor, in px; its shadow goes the other way, further. */
export const FRAME_SHIFT = 10;
export const SHADOW_SHIFT = 22;
/** The frame's own perspective, in px. */
export const FRAME_PERSPECTIVE = 900;

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
    // The shadow is under the frame, in the same wrapper.
    const shadow = element.closest('[data-exhibit-part="rise"]')?.querySelector<HTMLElement>('.haunted-frame-shadow') ?? null;
    if (frame === null) {
      return;
    }
    gsap.set(frame, { transformPerspective: FRAME_PERSPECTIVE });
    const follow = tween('landing.tilt');
    const turnY = gsap.quickTo(frame, 'rotationY', follow);
    const turnX = gsap.quickTo(frame, 'rotationX', follow);
    const shiftX = gsap.quickTo(frame, 'x', follow);
    const shiftY = gsap.quickTo(frame, 'y', follow);
    const shadowX = shadow === null ? null : gsap.quickTo(shadow, 'x', follow);
    const shadowY = shadow === null ? null : gsap.quickTo(shadow, 'y', follow);
    const glintX = glint === null ? null : gsap.quickTo(glint, 'x', follow);
    const glintY = glint === null ? null : gsap.quickTo(glint, 'y', follow);
    const move = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') {
        return;
      }
      const box = frame.getBoundingClientRect();
      const x = (event.clientX - box.left) / box.width - 0.5;
      const y = (event.clientY - box.top) / box.height - 0.5;
      const cx = Math.max(-0.5, Math.min(0.5, x)) * 2;
      const cy = Math.max(-0.5, Math.min(0.5, y)) * 2;
      turnY(cx * FRAME_TILT);
      turnX(-cy * FRAME_TILT);
      shiftX(cx * FRAME_SHIFT);
      shiftY(cy * FRAME_SHIFT);
      shadowX?.(-cx * SHADOW_SHIFT);
      shadowY?.(-cy * SHADOW_SHIFT);
      // The glint sits under the cursor, on the frame's own surface (its box is the frame's, unrotated).
      glintX?.((x + 0.5) * frame.offsetWidth);
      glintY?.((y + 0.5) * frame.offsetHeight);
    };
    const enter = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') {
        return;
      }
      frame.style.willChange = 'transform';
      if (shadow !== null) {
        shadow.style.willChange = 'transform';
      }
      if (glint !== null) {
        gsap.to(glint, { opacity: 1, ...tween('hover') });
      }
      if (veil !== null) {
        gsap.to(veil, { rotation: 0.6, ...tween('paper.move'), yoyo: true, repeat: 1 });
      }
    };
    const leave = () => {
      // Back to flat, with a soft spring.
      const release = tween('landing.tiltRelease');
      gsap.to(frame, { rotationX: 0, rotationY: 0, x: 0, y: 0, ...release, overwrite: 'auto', onComplete: () => void (frame.style.willChange = '') });
      if (shadow !== null) {
        gsap.to(shadow, { x: 0, y: 0, ...release, overwrite: 'auto', onComplete: () => void (shadow.style.willChange = '') });
      }
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
      gsap.killTweensOf([frame, shadow, glint]);
    };
  }, [ref]);
}
