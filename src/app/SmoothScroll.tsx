// src/app/SmoothScroll.tsx
// Smooth scrolling for the whole app (Lenis), driven by GSAP's ticker and synced with ScrollTrigger
// (Lenis README, "GSAP ScrollTrigger"). One instance under full motion; none under reduced motion, or when the
// browser cannot say what the visitor prefers. It follows a change of the motion setting.
// Scrolling areas inside the page (the open file's document, a portal card) carry `data-lenis-prevent`, so they
// scroll natively.
import { useEffect, type ReactNode } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { setLenis } from '@/lib/smooth-scroll';
import { useReducedMotion } from '@/lib/use-reduced-motion';

export default function SmoothScroll({ children }: { children: ReactNode }) {
  const reduced = useReducedMotion();
  // Lenis needs matchMedia (to honour reduced motion) and ResizeObserver (to measure the page).
  const canSmooth =
    typeof window !== 'undefined' && typeof window.matchMedia === 'function' && typeof ResizeObserver === 'function';

  useEffect(() => {
    if (reduced || !canSmooth) {
      return;
    }
    gsap.registerPlugin(ScrollTrigger);
    // autoRaf is off: GSAP's ticker is the one clock (Lenis wants milliseconds, GSAP gives seconds).
    const lenis = new Lenis({ autoRaf: false });
    lenis.on('scroll', ScrollTrigger.update);
    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    // A paused tab must not make the scroll jump when it comes back.
    gsap.ticker.lagSmoothing(0);
    setLenis(lenis);
    return () => {
      setLenis(null);
      gsap.ticker.remove(tick);
      // GSAP's defaults.
      gsap.ticker.lagSmoothing(500, 33);
      lenis.destroy();
    };
  }, [reduced, canSmooth]);

  return <>{children}</>;
}
