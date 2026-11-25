// src/features/landing/Landing.tsx
// The landing page (landing v2 brief): an archive of cases in the style of a gallery's dark rooms. It opens black with
// the Histor wordmark and a detail of the first case's picture, which settle into the header and the first frame.
// Then one full-screen section per case, each a frame. On a laptop at full motion the cases are one fixed stage moved
// one case per gesture (landing-stage.ts), and after the last the page scrolls on into the footer; on a phone, or under
// reduced motion, the same sections are a plain stack. The address carries the case (/#mary-celeste).
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import SiteFooter from '@/components/SiteFooter';
import LandingHeader from '@/features/landing/LandingHeader';
import ExhibitSection from '@/features/landing/ExhibitSection';
import { OpenFrame, SealedFrame } from '@/features/landing/FrameActions';
import Opening from '@/features/landing/Opening';
import ProgressRail from '@/features/landing/ProgressRail';
import { createLandingStage, type StageHandle } from '@/features/landing/landing-stage';
import { startIndexOf } from '@/features/landing/start-index';
import { useStaged } from '@/features/landing/use-staged';
import { MOTION_QUERIES, tween } from '@/lib/motion';
import { jumpToY, scrollToY } from '@/lib/smooth-scroll';
import { LANDING_TITLE } from '@/lib/landing-meta';
import { exhibits } from '@/cases';

const sectionOf = (index: number) => document.getElementById(`exhibit-${exhibits[index]?.id}`);

export default function Landing() {
  const markRef = useRef<HTMLImageElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const handle = useRef<StageHandle | null>(null);
  const staged = useStaged();
  const { hash } = useLocation();
  const [startIndex] = useState(() => startIndexOf(hash));
  /** The wordmark is docking: the header's pills show. */
  const [docked, setDocked] = useState(false);
  /** The opening's picture has settled into the first frame: the frame comes in around it. */
  const [settled, setSettled] = useState(false);
  /** The opening is over: the first section's words come into focus and the rail appears. */
  const [ready, setReady] = useState(false);
  const phases = useRef({ settled: false, ready: false });
  /** The reader has scrolled on past the cases, into the footer: the rail steps aside. */
  const [pastCases, setPastCases] = useState(false);
  useEffect(() => {
    const onScroll = () => setPastCases(window.scrollY > window.innerHeight * 0.4);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  const dock = useCallback(() => setDocked(true), []);
  const settle = useCallback(() => setSettled(true), []);
  const finish = useCallback(() => setReady(true), []);
  const start = exhibits.find(exhibit => exhibit.status === 'open');
  const first = exhibits[startIndex];
  const detail = useMemo(
    () =>
      first?.status === 'open' && first.frameImage !== undefined
        ? {
            src: first.frameImage.src,
            frameRect: () => document.querySelector<HTMLElement>(`#exhibit-${first.id} .haunted-frame__opening`)?.getBoundingClientRect() ?? null,
          }
        : undefined,
    [first]
  );

  /** The case on screen: the rail's long tick, and the address. */
  const [current, setCurrent] = useState(startIndex);
  const currentRef = useRef(startIndex);
  const changed = useCallback((index: number) => {
    currentRef.current = index;
    setCurrent(index);
    const id = exhibits[index]?.id;
    if (id !== undefined && window.location.hash !== `#${id}`) {
      // Keep the router's own history state: only the hash changes.
      window.history.replaceState(window.history.state, '', `#${id}`);
    }
  }, []);

  const go = useCallback((index: number) => {
    if (handle.current !== null) {
      handle.current.go(index);
      return;
    }
    const section = sectionOf(index);
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

  // The stage: on a laptop at full motion the cases are one fixed screen moved by gestures.
  useLayoutEffect(() => {
    const root = stageRef.current;
    if (!staged || root === null) {
      return;
    }
    const sections = exhibits.map((_, index) => sectionOf(index)).filter((section): section is HTMLElement => section !== null);
    const stage = createLandingStage({ root, sections, start: currentRef.current, shown: phases.current.ready, onChange: changed });
    handle.current = stage;
    if (phases.current.ready) {
      stage.ready();
    }
    return () => {
      stage.destroy();
      handle.current = null;
    };
  }, [staged, changed]);
  useEffect(() => {
    phases.current.settled = settled;
    if (settled) {
      handle.current?.showFrame();
    }
  }, [settled]);
  useEffect(() => {
    phases.current.ready = ready;
    if (ready) {
      handle.current?.ready();
    }
  }, [ready]);

  // A stacked page opens at the case the address names, and tracks which case is across the middle.
  useLayoutEffect(() => {
    if (staged || startIndex === 0) {
      return;
    }
    const section = sectionOf(startIndex);
    if (section !== null) {
      jumpToY(section.getBoundingClientRect().top + window.scrollY);
    }
  }, [staged, startIndex]);
  useEffect(() => {
    if (staged || typeof window.matchMedia !== 'function') {
      return;
    }
    gsap.registerPlugin(ScrollTrigger);
    const triggers = exhibits.flatMap((_, index) => {
      const section = sectionOf(index);
      return section === null
        ? []
        : [ScrollTrigger.create({ trigger: section, start: 'top center', end: 'bottom center', onToggle: self => self.isActive && changed(index) })];
    });
    return () => triggers.forEach(trigger => trigger.kill());
  }, [staged, changed]);

  return (
    <main data-page="landing" data-staged={staged} data-docked={docked} data-settled={settled} data-ready={ready} className="relative min-h-svh bg-night text-night-ink">
      <LandingHeader startHref={start === undefined ? '/' : `/case/${start.id}`} markRef={markRef} docked={docked} />
      <Opening targetRef={markRef} detail={detail} onDock={dock} onSettle={settle} onDone={finish} />
      <div ref={stageRef} data-landing="stage" className={staged ? 'relative h-svh min-h-[40rem] overflow-hidden' : undefined}>
        <ol aria-label="The cases" className={staged ? 'absolute inset-0' : undefined}>
          {exhibits.map((exhibit, index) => (
            <ExhibitSection
              key={exhibit.id}
              exhibit={exhibit}
              index={index}
              next={exhibits[index + 1]}
              staged={staged}
              isStart={index === startIndex}
              frameIn={settled}
              wordsIn={ready}
            >
              {frame => (exhibit.status === 'open' ? <OpenFrame exhibit={exhibit}>{frame}</OpenFrame> : <SealedFrame exhibit={exhibit}>{frame}</SealedFrame>)}
            </ExhibitSection>
          ))}
        </ol>
      </div>
      <SiteFooter />
      <ProgressRail exhibits={exhibits} current={current} onGo={go} shown={ready && !pastCases} />
      {/* The black an open case's frame fades the screen to, before its page. */}
      <div aria-hidden="true" data-landing="blackout" className="pointer-events-none invisible fixed inset-0 z-[60] bg-black opacity-0" />
    </main>
  );
}
