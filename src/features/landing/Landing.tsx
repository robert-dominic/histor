// src/features/landing/Landing.tsx
// The landing page (landing brief): an archive of cases in the style of a gallery's dark rooms. It opens black with
// the Histor wordmark, which docks into the header; then one full-screen section per case, each a frame.
import { useCallback, useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import SiteFooter from '@/components/SiteFooter';
import LandingHeader from '@/features/landing/LandingHeader';
import ExhibitSection from '@/features/landing/ExhibitSection';
import { OpenFrame, SealedFrame } from '@/features/landing/FrameActions';
import Opening from '@/features/landing/Opening';
import ProgressRail from '@/features/landing/ProgressRail';
import { MOTION_QUERIES, tween } from '@/lib/motion';
import { jumpToY, scrollToY } from '@/lib/smooth-scroll';
import { LANDING_TITLE } from '@/lib/landing-meta';
import { exhibits } from '@/cases';

export default function Landing() {
  const markRef = useRef<HTMLImageElement>(null);
  /** The wordmark has docked (or is docking): the header shows, and the first frame rises in. */
  const [docked, setDocked] = useState(false);
  const dock = useCallback(() => setDocked(true), []);
  const start = exhibits.find(exhibit => exhibit.status === 'open');
  /** The case on screen: the rail's long tick. */
  const [current, setCurrent] = useState(0);
  const sectionOf = (index: number) => document.getElementById(`exhibit-${exhibits[index]?.id}`);
  const go = useCallback((index: number) => {
    const section = document.getElementById(`exhibit-${exhibits[index]?.id}`);
    if (section === null) {
      return;
    }
    const y = section.getBoundingClientRect().top + window.scrollY;
    const reduced = typeof window.matchMedia !== 'function' || window.matchMedia(MOTION_QUERIES.reduced).matches;
    if (reduced) {
      jumpToY(y);
    } else {
      scrollToY(y, tween('scene'));
    }
  }, []);
  // The page's title (landing brief, 7), also when coming back to it from a case.
  useEffect(() => {
    document.title = LANDING_TITLE;
  }, []);
  // Which case is on screen: the one across the middle of the screen.
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') {
      return;
    }
    gsap.registerPlugin(ScrollTrigger);
    const triggers = exhibits.flatMap((_, index) => {
      const section = sectionOf(index);
      return section === null
        ? []
        : [ScrollTrigger.create({ trigger: section, start: 'top center', end: 'bottom center', onToggle: self => self.isActive && setCurrent(index) })];
    });
    return () => triggers.forEach(trigger => trigger.kill());
  }, []);
  return (
    <main data-page="landing" data-docked={docked} className="relative min-h-svh bg-night text-night-ink">
      <LandingHeader startHref={start === undefined ? '/' : `/case/${start.id}`} markRef={markRef} docked={docked} />
      <Opening targetRef={markRef} onDock={dock} />
      <ol aria-label="The cases">
        {exhibits.map((exhibit, index) => (
          <ExhibitSection key={exhibit.id} exhibit={exhibit} index={index} next={exhibits[index + 1]} revealed={docked}>
            {frame =>
              exhibit.status === 'open' ? <OpenFrame exhibit={exhibit}>{frame}</OpenFrame> : <SealedFrame exhibit={exhibit}>{frame}</SealedFrame>
            }
          </ExhibitSection>
        ))}
      </ol>
      {/* After the last case: a quiet close, then the footer. */}
      <section aria-label="More to come" data-landing="end" className="flex min-h-[70svh] flex-col items-center justify-center gap-4 px-6 py-24 text-center">
        <p className="font-record text-[clamp(1.75rem,1.2rem+1.8vw,2.75rem)] leading-tight italic">More cases are being recovered.</p>
        <p className="font-voice text-[0.8125rem] tracking-[0.12em] text-night-ink/60">Legend or history? You decide.</p>
      </section>
      <SiteFooter />
      <ProgressRail exhibits={exhibits} current={current} onGo={go} shown={docked} />
      {/* The black an open case's frame fades the screen to, before its page. */}
      <div aria-hidden="true" data-landing="blackout" className="pointer-events-none invisible fixed inset-0 z-[60] bg-black opacity-0" />
    </main>
  );
}
