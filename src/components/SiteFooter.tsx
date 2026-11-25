// src/components/SiteFooter.tsx
// The site's footer (landing v2 brief, 4): big and typographic, in Histor's dark palette. A thin rule, then "HISTOR"
// set across nearly the full width in the logo's own letterforms (the H keeps its missing-person crossbar), with
// "LEGEND OR HISTORY" running up the right edge (a line under it on a phone); below, two columns spread across the
// width (v3: the archive at the left, about at the right end; no line of personality); at the foot "© 2026 Histor"
// and "Designed and built by Robert". The letters rise in one by one as the footer scrolls into view (a fade under reduced motion).
// On the landing page, the credits and the sources; no case page has one.
import { useRef } from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { exhibits } from '@/cases';
import { DESIGNER_URL, FOOTER } from '@/lib/footer-links';
import { MOTION_QUERIES, STEP, tween } from '@/lib/motion';
import { WORDMARK_LETTERS, WORDMARK_VIEWBOX } from '@/lib/wordmark';

gsap.registerPlugin(useGSAP);

const LINK = 'draw-link min-h-6 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brass';
const HEADING = 'font-voice text-[0.75rem] tracking-[0.22em] text-night-ink/55 uppercase';

export default function SiteFooter() {
  const rootRef = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const root = rootRef.current;
      if (root === null || typeof window.matchMedia !== 'function') {
        return;
      }
      gsap.registerPlugin(ScrollTrigger);
      const letters = gsap.utils.toArray<SVGGElement>('[data-footer-letter]', root);
      const mm = gsap.matchMedia();
      mm.add({ full: MOTION_QUERIES.full, reduced: MOTION_QUERIES.reduced }, context => {
        const reduced = context.conditions?.reduced === true;
        // The letters sit below their line (the svg clips them) and rise one by one; reduced: a fade in place.
        gsap.set(letters, reduced ? { opacity: 0 } : { y: WORDMARK_VIEWBOX[3] });
        const rise = gsap.to(letters, {
          ...(reduced ? { opacity: 1 } : { y: 0 }),
          ...tween(reduced ? 'ink.in' : 'paper.move'),
          stagger: reduced ? 0 : STEP.fast / 2,
          paused: true,
        });
        const trigger = ScrollTrigger.create({ trigger: root, start: 'top 85%', once: true, onEnter: () => void rise.play() });
        return () => {
          trigger.kill();
          rise.kill();
          gsap.set(letters, { clearProps: 'all' });
        };
      });
      return () => mm.revert();
    },
    { scope: rootRef }
  );

  return (
    <footer ref={rootRef} data-site-footer="" className="relative z-[21] border-t border-night-ink/20 bg-night font-voice text-[0.875rem] leading-relaxed text-night-ink/70">
      {/* The giant wordmark, and the line up its right edge. */}
      <div className="flex items-stretch gap-3 px-4 pt-12 sm:px-8 lg:gap-6 lg:pt-16">
        <svg
          viewBox={WORDMARK_VIEWBOX.join(' ')}
          role="img"
          aria-label="Histor"
          data-footer="wordmark"
          className="block h-auto min-w-0 flex-1 overflow-hidden"
        >
          {WORDMARK_LETTERS.map(({ letter, path }) => (
            <g key={letter} data-footer-letter={letter}>
              <path d={path} fill="var(--color-night-ink)" fillRule="evenodd" />
            </g>
          ))}
        </svg>
        <p
          aria-hidden="true"
          data-footer="vertical"
          className="hidden shrink-0 rotate-180 font-voice text-[0.8125rem] tracking-[0.5em] text-night-ink/70 uppercase [writing-mode:vertical-rl] lg:block"
        >
          {FOOTER.vertical}
        </p>
      </div>
      <p data-footer="line" className="px-4 pt-3 text-[0.75rem] tracking-[0.4em] text-night-ink/60 uppercase sm:px-8 lg:hidden">
        {FOOTER.vertical}
      </p>

      {/* The columns, under a thin rule. */}
      <div className="mx-4 mt-10 grid gap-10 border-t border-night-ink/15 pt-8 sm:mx-8 lg:grid-cols-2 lg:gap-12">
        <nav aria-label="The archive" data-footer="archive">
          <h2 className={HEADING}>The archive</h2>
          <ul className="mt-4 flex flex-col gap-2">
            {exhibits.map(exhibit => (
              <li key={exhibit.id} className="flex items-baseline gap-3">
                {exhibit.status === 'open' ? (
                  <Link to={`/case/${exhibit.id}`} className={`${LINK} text-night-ink`}>
                    {exhibit.title}
                  </Link>
                ) : (
                  <span data-footer="sealed" className="text-night-ink/50">
                    {exhibit.title}
                  </span>
                )}
                {exhibit.status === 'sealed' && <span className="text-[0.6875rem] tracking-[0.18em] text-night-ink/40 uppercase">Sealed</span>}
              </li>
            ))}
          </ul>
        </nav>

        <div data-footer="about" className="lg:justify-self-end lg:text-left">
          <h2 className={HEADING}>About</h2>
          <p data-footer="description" className="mt-4 max-w-sm">
            {FOOTER.about}
          </p>
          <nav aria-label="About Histor" className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
            <Link to="/credits" className={LINK}>
              Credits
            </Link>
            <Link to="/sources" className={LINK}>
              Sources
            </Link>
            <a href={FOOTER.repository} target="_blank" rel="noreferrer" className={LINK}>
              GitHub
            </a>
            <a href={FOOTER.kiro} target="_blank" rel="noreferrer" className={LINK}>
              Built with Kiro
            </a>
          </nav>
        </div>

      </div>

      {/* The foot. */}
      <div className="mx-4 mt-12 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-t border-night-ink/15 py-5 sm:mx-8">
        <p data-footer="copyright" className="tabular-nums">
          © {FOOTER.year} Histor
        </p>
        <p data-footer="byline">
          Designed and built by{' '}
          <a href={DESIGNER_URL} target="_blank" rel="noreferrer" className={`${LINK} text-night-ink`}>
            Robert
          </a>
        </p>
      </div>
    </footer>
  );
}
