// src/features/landing/ExhibitSection.tsx
// One case on the landing page (landing brief, 3), a full screen on a laptop, laid out like a gallery's wall:
// - the frame, large, centred a little left, in the case's own shape;
// - the title to the right of the frame, low: the case in italic serif, its years (or "Sealed") small under it;
// - the editorial block at the bottom left: the headline large (Old Standard TT), the subline under it;
// - on the first section, a "Scroll" cue at the bottom centre; on every section but the last, the next frame peeking
//   in at the bottom right, sliding up and away as the page scrolls.
// Motion: the frame rises in (`paper.move`) as the section arrives (the first one as the wordmark docks), and drifts
// up and away as it leaves (scrubbed with the scroll); the headline comes in line by line (`ink.in`). Phones: the
// same pieces stacked, simple fades. Reduced motion: everything in place, fades only.
import { useRef, type ReactNode } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import type { Exhibit } from '@/cases';
import Frame from '@/features/landing/Frame';
import { INK_RISE, LINEAR, MOTION_QUERIES, STEP, tween } from '@/lib/motion';
import { DESKTOP_QUERY } from '@/lib/use-media-query';

gsap.registerPlugin(useGSAP);

interface ExhibitSectionProps {
  exhibit: Exhibit;
  index: number;
  /** The next case, peeking in at the bottom right. */
  next?: Exhibit;
  /** The first section rises in as the wordmark docks: until then it waits. */
  revealed: boolean;
  /** The frame, wrapped in whatever it does when pressed (a link, or the sealed plaque's button: Landing.tsx). */
  children?: (frame: ReactNode) => ReactNode;
}

export default function ExhibitSection({ exhibit, index, next, revealed, children }: ExhibitSectionProps) {
  const rootRef = useRef<HTMLLIElement>(null);
  const first = index === 0;
  const titleId = `exhibit-${exhibit.id}-title`;

  useGSAP(
    () => {
      const root = rootRef.current;
      if (root === null || typeof window.matchMedia !== 'function') {
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
      const peek = q('[data-exhibit-part="peek"]');
      const veil = q('[data-frame-part="veil"]');
      if (rise === null || anchor === null || words === null || headline === null || subline === null || title === null) {
        return;
      }
      const mm = gsap.matchMedia();
      mm.add({ desktop: `${DESKTOP_QUERY} and ${MOTION_QUERIES.full}`, phone: `not all and ${DESKTOP_QUERY}`, reduced: MOTION_QUERIES.reduced }, context => {
        const { desktop, reduced } = context.conditions ?? {};
        const triggers: ScrollTrigger[] = [];
        const splits: SplitText[] = [];
        // What arrives, and how: on a laptop the frame rises and the headline comes in by line; otherwise fades.
        // The lines are found once the fonts are in (split before, they break in the wrong places).
        const arrive = gsap.timeline({ paused: true });
        let wanted = false;
        const play = () => {
          wanted = true;
          arrive.play();
        };
        const build = context.add('build', () => {
          if (desktop === true) {
            const split = SplitText.create(headline, { type: 'lines', aria: 'auto' });
            splits.push(split);
            gsap.set([...split.lines, subline, title], { opacity: 0, y: INK_RISE });
            arrive
              .to(rise, { y: 0, opacity: 1, ...tween('paper.move'), onStart: () => void (rise.style.willChange = 'transform'), onComplete: () => void (rise.style.willChange = '') }, 0)
              .to(title, { y: 0, opacity: 1, ...tween('ink.in') }, STEP.fast)
              .to(split.lines, { y: 0, opacity: 1, ...tween('ink.in'), stagger: STEP.fast / 2 }, STEP.fast)
              .to(subline, { y: 0, opacity: 1, ...tween('ink.in') }, STEP.base);
          } else {
            arrive.to([rise, title, words], { opacity: 1, ...tween('ink.in'), stagger: reduced === true ? 0 : STEP.fast / 2 });
          }
          if (wanted) {
            arrive.play();
          }
        });
        if (desktop === true) {
          gsap.set(rise, { y: 140, opacity: 0 });
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
          if (revealed) {
            play();
          }
        } else {
          triggers.push(ScrollTrigger.create({ trigger: root, start: 'top 70%', once: true, onEnter: play }));
        }
        if (desktop === true) {
          // Leaving: the frame drifts up and away, scrubbed with the scroll; the next frame's peek slides up and goes.
          triggers.push(
            ScrollTrigger.create({
              trigger: root,
              start: 'top top',
              end: 'bottom top',
              scrub: true,
              animation: gsap.fromTo(anchor, { y: 0, opacity: 1 }, { y: -90, opacity: 0.25, ease: LINEAR, immediateRender: false }),
            })
          );
          if (peek !== null) {
            triggers.push(
              ScrollTrigger.create({
                trigger: root,
                start: 'top top',
                end: 'bottom 40%',
                scrub: true,
                animation: gsap.fromTo(peek, { y: 0, opacity: 0.85 }, { y: '-60svh', opacity: 0, ease: LINEAR, immediateRender: false }),
              })
            );
          }
          // A sealed case's veil sways, very slightly, all the time.
          if (veil !== null) {
            gsap.to(veil, { skewX: 0.7, scaleY: 1.008, ...tween('ghost'), yoyo: true, repeat: -1 });
          }
        }
        return () => {
          live = false;
          triggers.forEach(trigger => trigger.kill());
          splits.forEach(split => split.revert());
          arrive.kill();
        };
      });
      return () => mm.revert();
    },
    { scope: rootRef, dependencies: [revealed] }
  );

  const frame = <Frame exhibit={exhibit} className="w-full lg:h-(--frame-h) lg:w-auto" />;
  return (
    <li
      ref={rootRef}
      id={`exhibit-${exhibit.id}`}
      data-exhibit={exhibit.id}
      data-exhibit-index={index}
      aria-labelledby={titleId}
      className="relative flex flex-col gap-8 px-4 pt-24 pb-16 sm:px-8 lg:block lg:h-svh lg:min-h-[40rem] lg:overflow-hidden lg:p-0"
    >
      {/* The frame, and its title to its right, low. */}
      <div data-exhibit-part="anchor" className="lg:absolute lg:top-[40%] lg:left-[45%] lg:-translate-x-1/2 lg:-translate-y-1/2">
        <div data-exhibit-part="rise" className="relative flex flex-col gap-5 lg:block [perspective:1400px]">
          <span aria-hidden="true" className="haunted-frame-shadow" />
          {children === undefined ? frame : children(frame)}
          <div data-exhibit-part="title" className="lg:absolute lg:bottom-1 lg:left-[calc(100%+2.75rem)] lg:w-[17rem]">
            <h2 id={titleId} className="font-record text-[clamp(1.5rem,1.2rem+0.9vw,2.125rem)] leading-tight italic">
              {exhibit.title}
            </h2>
            <p className="mt-2 font-voice text-[0.75rem] tracking-[0.2em] text-night-ink/60 uppercase">{exhibit.status === 'open' ? exhibit.years : 'Sealed'}</p>
          </div>
        </div>
      </div>

      {/* The editorial block: bottom left on a laptop. */}
      <div data-exhibit-part="words" className="max-w-[44rem] lg:absolute lg:bottom-[7svh] lg:left-[5.5vw]">
        <p data-exhibit-part="headline" className="font-record text-[clamp(2rem,1.1rem+2.7vw,3.75rem)] leading-[1.06] text-night-ink">
          {exhibit.headline}
        </p>
        <p data-exhibit-part="subline" className="mt-4 max-w-xl font-record text-[clamp(1rem,0.92rem+0.35vw,1.25rem)] leading-snug text-night-ink/70">
          {exhibit.subline}
        </p>
      </div>

      {first && (
        <div aria-hidden="true" data-exhibit-part="cue" className="pointer-events-none absolute bottom-6 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-3 lg:flex">
          <span className="font-voice text-[0.6875rem] tracking-[0.3em] text-night-ink/60 uppercase">Scroll</span>
          <span className="landing-cue-line relative block h-12 w-px overflow-hidden bg-night-ink/20" />
        </div>
      )}

      {next !== undefined && (
        <div aria-hidden="true" data-exhibit-part="peek" className="pointer-events-none absolute right-[4vw] bottom-0 hidden translate-y-[62%] lg:block">
          <Frame exhibit={next} peek className="h-[26svh] w-auto" />
        </div>
      )}
    </li>
  );
}
