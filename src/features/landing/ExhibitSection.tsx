// src/features/landing/ExhibitSection.tsx
// One case on the landing page (landing brief, 3; v3), a full screen on a laptop, laid out like a gallery's wall,
// with plenty of empty space around everything and the frame always the biggest thing on screen:
// - the frame, about 60% of the screen's height, centred a little left, in the case's own shape;
// - the title beside the frame's bottom right: the case in italic serif (about 26px), its years (or "Sealed") under it;
// - the editorial block at the bottom left: the headline (about 44px, Old Standard TT), the subline (18px) under it;
// - on the first section, a "Scroll" cue at the bottom centre. (On the stage the next case's own frame peeks in at the
//   bottom right: landing-stage.ts moves the real frame there; there is no copy of it here.)
// Motion: the frame rises in (`paper.move`) as the section arrives (the first one as the wordmark docks), and drifts
// up and away as it leaves (scrubbed with the scroll); the headline comes in line by line (`ink.in`). Phones: the
// same pieces stacked, simple fades. Reduced motion: everything in place, fades only.
import { useEffect, useRef, type ReactNode } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import type { Exhibit } from '@/cases';
import Frame from '@/features/landing/Frame';
import { INK_RISE, LANDING_BLUR, LINEAR, MOTION_QUERIES, STEP, tween } from '@/lib/motion';
import { DESKTOP_QUERY } from '@/lib/use-media-query';

gsap.registerPlugin(useGSAP);

interface ExhibitSectionProps {
  exhibit: Exhibit;
  index: number;
  /** On the stage (a laptop at full motion): the section is a layer of the stage and landing-stage.ts moves it. */
  staged: boolean;
  /** The case the opening is about: its section waits for the opening, the others arrive as they are scrolled to. */
  isStart: boolean;
  /** The first section's frame comes in once the opening's picture has settled into it (landing v2 brief, 1). */
  frameIn: boolean;
  /** Its words come into focus once the opening is over. */
  wordsIn: boolean;
  /** The frame, wrapped in whatever it does when pressed (a link, or the sealed plaque's button: Landing.tsx). */
  children?: (frame: ReactNode) => ReactNode;
}

export default function ExhibitSection({ exhibit, index, staged, isStart, frameIn, wordsIn, children }: ExhibitSectionProps) {
  const rootRef = useRef<HTMLLIElement>(null);
  const first = isStart;
  const hasCue = index === 0;
  const titleId = `exhibit-${exhibit.id}-title`;
  /** What the opening has done so far, and what to play when the section is built (the fonts may not be in yet). */
  const flags = useRef({ frame: frameIn, words: wordsIn });
  const controls = useRef<{ frame: () => void; words: () => void } | null>(null);
  useEffect(() => {
    flags.current.frame = frameIn;
    if (frameIn) {
      controls.current?.frame();
    }
  }, [frameIn]);
  useEffect(() => {
    flags.current.words = wordsIn;
    if (wordsIn) {
      controls.current?.words();
    }
  }, [wordsIn]);

  useGSAP(
    () => {
      const root = rootRef.current;
      if (staged || root === null || typeof window.matchMedia !== 'function') {
        return;
      }
      gsap.registerPlugin(ScrollTrigger, SplitText);
      const q = (selector: string) => root.querySelector<HTMLElement>(selector);
      const rise = q('[data-exhibit-part="rise"]');
      const anchor = q('[data-exhibit-part="anchor"]');
      const words = q('[data-exhibit-part="words"]');
      const headline = q('[data-exhibit-part="headline"]');
      const subline = q('[data-exhibit-part="subline"]');
      const title = q('[data-exhibit-part="title"]');
      const veil = q('[data-frame-part="veil"]');
      if (rise === null || anchor === null || words === null || headline === null || subline === null || title === null) {
        return;
      }
      const mm = gsap.matchMedia();
      mm.add({ desktop: `${DESKTOP_QUERY} and ${MOTION_QUERIES.full}`, phone: `not all and ${DESKTOP_QUERY}`, reduced: MOTION_QUERIES.reduced }, context => {
        const { desktop, reduced } = context.conditions ?? {};
        const triggers: ScrollTrigger[] = [];
        const splits: SplitText[] = [];
        // What arrives, and how: on a laptop the frame comes in and the words come into focus (from blur and
        // transparent to sharp); otherwise fades. The lines are found once the fonts are in (split before, they
        // break in the wrong places).
        const frameArrive = gsap.timeline({ paused: true });
        const wordsArrive = gsap.timeline({ paused: true });
        const wanted = { frame: false, words: false };
        const playFrame = () => {
          wanted.frame = true;
          frameArrive.play();
        };
        const playWords = () => {
          wanted.words = true;
          wordsArrive.play();
        };
        const sharp = { opacity: 1, y: 0, filter: 'blur(0px)', clearProps: 'filter' };
        const build = context.add('build', () => {
          if (desktop === true) {
            const split = SplitText.create(headline, { type: 'lines', aria: 'auto' });
            splits.push(split);
            gsap.set([...split.lines, subline, title], { opacity: 0, y: INK_RISE, filter: `blur(${LANDING_BLUR}px)` });
            frameArrive.to(rise, { y: 0, opacity: 1, ...tween('paper.move'), onStart: () => void (rise.style.willChange = 'transform'), onComplete: () => void (rise.style.willChange = '') }, 0);
            wordsArrive
              .to(title, { ...sharp, ...tween('landing.blur') }, 0)
              .to(split.lines, { ...sharp, ...tween('landing.blur'), stagger: STEP.fast / 2 }, 0)
              .to(subline, { ...sharp, ...tween('landing.blur') }, STEP.fast);
          } else {
            frameArrive.to(rise, { opacity: 1, ...tween('ink.in') });
            wordsArrive.to([title, words], { opacity: 1, ...tween('ink.in'), stagger: reduced === true ? 0 : STEP.fast / 2 });
          }
          if (wanted.frame) {
            frameArrive.play();
          }
          if (wanted.words) {
            wordsArrive.play();
          }
        });
        if (desktop === true) {
          gsap.set(rise, { y: first ? 0 : 140, opacity: 0 });
          gsap.set(words, { opacity: 0 });
        } else {
          gsap.set([rise, words, title], { opacity: 0 });
        }
        let live = true;
        const fonts = typeof document !== 'undefined' ? document.fonts : undefined;
        if (fonts === undefined || desktop !== true) {
          build();
        } else {
          void fonts.ready.then(() => {
            if (live) {
              gsap.set(words, { opacity: 1 });
              build();
            }
          });
        }
        if (first) {
          // The first section waits for the opening (Landing.tsx); the rest arrive as they are scrolled to.
          controls.current = { frame: playFrame, words: playWords };
          if (flags.current.frame) {
            playFrame();
          }
          if (flags.current.words) {
            playWords();
          }
        } else {
          triggers.push(
            ScrollTrigger.create({
              trigger: root,
              start: 'top 70%',
              onEnter: () => {
                playFrame();
                playWords();
              },
              onEnterBack: () => {
                playFrame();
                playWords();
              },
            })
          );
        }
        if (desktop === true) {
          // Leaving: the frame drifts up and away, scrubbed with the scroll.
          triggers.push(
            ScrollTrigger.create({
              trigger: root,
              start: 'top top',
              end: 'bottom top',
              scrub: true,
              animation: gsap.fromTo(anchor, { y: 0, opacity: 1 }, { y: -90, opacity: 0.25, ease: LINEAR, immediateRender: false }),
            })
          );
          // A sealed case's veil sways, very slightly, all the time.
          if (veil !== null) {
            gsap.to(veil, { skewX: 0.7, scaleY: 1.008, ...tween('ghost'), yoyo: true, repeat: -1 });
          }
        }
        return () => {
          live = false;
          controls.current = null;
          triggers.forEach(trigger => trigger.kill());
          splits.forEach(split => split.revert());
          frameArrive.kill();
          wordsArrive.kill();
        };
      });
      return () => mm.revert();
    },
    { scope: rootRef, dependencies: [staged] }
  );

  // On the stage the veil of a sealed case still sways, very slightly, all the time.
  useGSAP(
    () => {
      const veil = rootRef.current?.querySelector<HTMLElement>('[data-frame-part="veil"]');
      if (!staged || veil == null) {
        return;
      }
      gsap.to(veil, { skewX: 0.7, scaleY: 1.008, ...tween('ghost'), yoyo: true, repeat: -1 });
    },
    { scope: rootRef, dependencies: [staged] }
  );

  // On a phone a tall frame would fill the screen: portrait and square frames are narrower there, centred.
  const narrow = exhibit.frame === 'portrait' ? 'max-lg:mx-auto max-lg:w-[72%]' : exhibit.frame === 'square' ? 'max-lg:mx-auto max-lg:w-[86%]' : 'w-full';
  // On the stage the frame has its own height everywhere (the phone's smaller), and its width follows its shape.
  const frame = <Frame exhibit={exhibit} className={staged ? 'h-(--frame-h-phone) w-auto lg:h-(--frame-h)' : `${narrow} lg:h-(--frame-h) lg:w-auto`} />;
  return (
    <li
      ref={rootRef}
      id={`exhibit-${exhibit.id}`}
      data-exhibit={exhibit.id}
      data-exhibit-index={index}
      aria-labelledby={titleId}
      className={
        staged
          ? 'absolute inset-0 block overflow-hidden'
          : 'relative flex flex-col gap-7 px-4 pt-10 pb-10 first:pt-24 sm:px-8 lg:block lg:h-svh lg:min-h-[40rem] lg:overflow-hidden lg:p-0 lg:first:pt-0'
      }
    >
      {/* The frame, and its title to its right, low. The title stays put while the frame moves. */}
      {/* On the phone's stage the frame is centred near the top, its title under it; on a laptop, a little left of
          centre, its title beside it. */}
      <div
        data-exhibit-part="place"
        className={`flex flex-col gap-5 lg:absolute lg:top-[43%] lg:left-[45%] lg:block lg:-translate-x-1/2 lg:-translate-y-1/2 ${
          staged ? 'max-lg:absolute max-lg:top-[max(5.5rem,12svh)] max-lg:left-1/2 max-lg:w-max max-lg:max-w-[92vw] max-lg:-translate-x-1/2 max-lg:items-center max-lg:gap-4' : ''
        }`}
      >
        <div data-exhibit-part="anchor">
          <div data-exhibit-part="rise" className="relative [perspective:1400px]">
            <span aria-hidden="true" className="haunted-frame-shadow" />
            {children === undefined ? frame : children(frame)}
          </div>
        </div>
        <div data-exhibit-part="title" className={`lg:absolute lg:bottom-1 lg:left-[calc(100%+2rem)] lg:w-[15rem] ${staged ? 'max-lg:text-center' : ''}`}>
          <h2 id={titleId} className="font-record text-[clamp(1.375rem,1.1rem+0.5vw,1.625rem)] leading-tight italic">
            {exhibit.title}
          </h2>
          <p className="mt-2 font-voice text-[0.75rem] tracking-[0.2em] text-night-ink/60 uppercase">{exhibit.status === 'open' ? exhibit.years : 'Sealed'}</p>
        </div>
      </div>

      {/* The editorial block: bottom left on a laptop. */}
      <div
        data-exhibit-part="words"
        className={`max-w-[34rem] lg:absolute lg:bottom-[6svh] lg:left-[5.5vw] ${staged ? 'max-lg:absolute max-lg:inset-x-6 max-lg:bottom-[max(4.5rem,11svh)]' : ''}`}
      >
        <p data-exhibit-part="headline" className="font-record text-[clamp(1.5rem,0.9rem+2.25vw,2.75rem)] leading-[1.1] text-night-ink">
          {exhibit.headline}
        </p>
        <p data-exhibit-part="subline" className="mt-3 max-w-xl font-record text-[1rem] leading-snug text-night-ink/70 sm:text-[1.125rem]">
          {exhibit.subline}
        </p>
      </div>

      {hasCue && (
        <div aria-hidden="true" data-exhibit-part="cue" className="pointer-events-none absolute bottom-6 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-3 lg:flex">
          <span className="font-voice text-[0.6875rem] tracking-[0.3em] text-night-ink/60 uppercase">Scroll</span>
          <span className="landing-cue-line relative block h-12 w-px overflow-hidden bg-night-ink/20" />
        </div>
      )}

    </li>
  );
}
