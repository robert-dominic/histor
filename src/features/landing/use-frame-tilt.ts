// src/features/landing/use-frame-tilt.ts
// A frame on hover (landing v3 brief; landing fixes): it tilts around its centre toward the cursor (rotateX and rotateY
// up to about 8°) under a deep perspective (about 1200px), lifts a little toward the viewer and shifts slightly toward
// the cursor, and its shadow moves the opposite way; the glint follows the cursor across the gilt. Everything follows
// the mouse through gsap.quickTo (about 0.6s, power3.out) and eases back to flat when the cursor leaves (the same setters), with no spring
// and no jitter: the cursor is measured against the frame's own untransformed box, never against the tilted frame. A
// sealed case's veil stirs. Only with a mouse on a laptop, at full motion; transforms and opacity only.
import { useEffect, type RefObject } from 'react';
import gsap from 'gsap';
import { DESKTOP_QUERY } from '@/lib/use-media-query';
import { MOTION_QUERIES, tween } from '@/lib/motion';

/** The most the frame turns toward the cursor, in degrees. */
export const FRAME_TILT = 8;
/** The most the frame shifts toward the cursor, in px; its shadow goes the other way, further. */
export const FRAME_SHIFT = 10;
export const SHADOW_SHIFT = 22;
/** The frame's own perspective, in px: deep, so the tilt is gentle. */
export const FRAME_PERSPECTIVE = 1200;
/** How far the frame lifts toward the viewer while hovered, in px. */
export const FRAME_LIFT = 28;

export function useFrameTilt(ref: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    const element = ref.current;
    if (element === null || typeof window.matchMedia !== 'function') {
      return;
    }
    if (!window.matchMedia(`${DESKTOP_QUERY} and ${MOTION_QUERIES.full} and (hover: hover) and (pointer: fine)`).matches) {
      return;
    }
    // The tilt has its own inner wrapper (FrameActions.tsx), which nothing else ever animates: the stage moves the
    // anchor, swings the rise, and an open case's click scales the frame itself, so none of them can undo the tilt.
    const frame = element.querySelector<HTMLElement>('[data-frame-part="tilt"]') ?? element.querySelector<HTMLElement>('.haunted-frame');
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
    const lift = gsap.quickTo(frame, 'z', follow);
    const shadowX = shadow === null ? null : gsap.quickTo(shadow, 'x', follow);
    const shadowY = shadow === null ? null : gsap.quickTo(shadow, 'y', follow);
    const glintX = glint === null ? null : gsap.quickTo(glint, 'x', follow);
    const glintY = glint === null ? null : gsap.quickTo(glint, 'y', follow);
    const move = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') {
        return;
      }
      // The box that does not move: the frame's own place, not the tilted frame (which would feed back into the tilt).
      const box = element.getBoundingClientRect();
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
      lift(FRAME_LIFT);
      if (glint !== null) {
        gsap.to(glint, { opacity: 1, ...tween('hover') });
      }
      if (veil !== null) {
        gsap.to(veil, { rotation: 0.6, ...tween('paper.move'), yoyo: true, repeat: 1 });
      }
    };
    const leave = () => {
      // Back to flat, through the same quickTo setters (a separate tween here would kill them, and the tilt would
      // stop working until the page was reloaded: the tilt bug).
      turnY(0);
      turnX(0);
      shiftX(0);
      shiftY(0);
      lift(0);
      shadowX?.(0);
      shadowY?.(0);
      frame.style.willChange = '';
      if (shadow !== null) {
        shadow.style.willChange = '';
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
