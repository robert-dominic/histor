// src/components/SiteFooter.tsx
// A quiet footer, for the credits and sources pages and the future landing page only (the fix list: no case page has
// one any more: not the story, the desk, the verdict or the report). It works without a case. "Histor" in Grenze Gotisch with its line, then the case's sources and credits (music, images), the GitHub
// repository and "Built with Kiro", and © 2026, in Special Elite at a small size, the muted tone, a thin rule above.
// The sources and the credits open in place, under the links, so they work on any page.
// With life (ui-pass brief, 7): a slow, faint fog drifts across it; its brass rule draws in when it comes into view,
// and its line is typed in then; the logo carries "Histor" large; the links' underlines draw in; a small "Back to the
// top" icon button. Under reduced motion it is all simply there and still.
import { useRef, useState } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import IconButton from '@/components/IconButton';
import { ArrowUpIcon } from '@/components/icons';
import { MOTION_QUERIES, tween } from '@/lib/motion';
import { typeElement } from '@/lib/typewriter';
import { FOOTER } from '@/lib/footer-links';
import { storyImageCredit } from '@/lib/image-credit';
import { MUSIC_ENABLED } from '@/lib/sound/levels';
import { SOUND_CREDIT } from '@/lib/sound-credit';
import type { Case } from '@/types/case';

gsap.registerPlugin(useGSAP);

const LINK =
  'footer-link group inline-flex min-h-11 items-center transition-colors duration-(--motion-hover-duration) ease-(--motion-hover-ease) hover:text-night-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass';

/** Each credit once: the case's images (the legend's video, the chapters' images) and its music. */
function creditsOf(caseData: Case) {
  const images = [
    ...(caseData.theme.legendVideo === undefined ? [] : [{ what: 'The legend intro (video)', credit: caseData.theme.legendVideo.credit }]),
    ...caseData.story.flatMap(section => (section.image === undefined ? [] : [{ what: section.heading, credit: storyImageCredit(section.image) }])),
  ];
  // The music is off (sound-files brief, 3): none is credited until it plays again.
  const music = (MUSIC_ENABLED ? [...(caseData.theme.playlists?.story ?? []), ...(caseData.theme.playlists?.desk ?? [])] : []).filter(
    (track, index, all) => all.findIndex(other => other.src === track.src) === index
  );
  return { images, music };
}

interface SiteFooterProps {
  /** The case whose sources and credits it lists; none on a page that is not a case's. */
  caseData?: Case;
  /** Inside a panel (the fork's close): less space around it. */
  compact?: boolean;
}

export default function SiteFooter({ caseData, compact = false }: SiteFooterProps) {
  const credits = caseData === undefined ? null : creditsOf(caseData);
  /** Which list is open under the links: the case's sources, or its credits. */
  const [shown, setShown] = useState<'sources' | 'credits' | null>(null);
  const rootRef = useRef<HTMLElement>(null);

  // When it comes into view: the brass rule draws in, then the line is typed. Once. Reduced motion: simply there.
  useGSAP(
    () => {
      const root = rootRef.current;
      const rule = root?.querySelector<HTMLElement>('[data-footer="rule"]');
      const line = root?.querySelector<HTMLElement>('[data-footer="tagline"]');
      if (root == null || rule == null || line == null || typeof window.matchMedia !== 'function' || typeof IntersectionObserver !== 'function') {
        return;
      }
      if (window.matchMedia(MOTION_QUERIES.reduced).matches) {
        return;
      }
      gsap.set(rule, { scaleX: 0 });
      const timeline = gsap.timeline({ paused: true });
      timeline.to(rule, { scaleX: 1, ...tween('scene') }, 0);
      const typed = typeElement(timeline, line, tween('paper.lift').duration);
      if (typed !== null) {
        timeline.call(() => typed.split.revert(), undefined, typed.end);
      }
      const observer = new IntersectionObserver(entries => {
        if (entries.some(entry => entry.isIntersecting)) {
          observer.disconnect();
          timeline.play();
        }
      });
      observer.observe(root);
      return () => {
        observer.disconnect();
        timeline.kill();
        typed?.split.revert();
      };
    },
    { scope: rootRef }
  );

  /** Back to the top of whatever scrolls it: the panel it sits in, or the page. */
  const toTop = () => {
    const reduced = typeof window.matchMedia === 'function' && window.matchMedia(MOTION_QUERIES.reduced).matches;
    const behavior: ScrollBehavior = reduced ? 'auto' : 'smooth';
    const panel = rootRef.current?.closest<HTMLElement>('[data-lenis-prevent]');
    if (panel != null && panel.scrollHeight > panel.clientHeight) {
      panel.scrollTo?.({ top: 0, behavior });
    } else {
      window.scrollTo?.({ top: 0, behavior });
    }
  };

  return (
    <footer
      ref={rootRef}
      data-site-footer=""
      className={`relative z-[21] font-voice text-[0.8125rem] leading-relaxed text-night-ink/60 ${
        compact ? 'mt-10 pt-6 pb-1' : 'mx-auto mt-16 max-w-6xl px-4 pt-12 pb-14 lg:px-10'
      }`}
    >
      <div aria-hidden="true" className="footer-fog" />
      {/* The brass rule above it, drawn in as it comes into view. */}
      <span aria-hidden="true" data-footer="rule" className="absolute inset-x-0 top-0 block h-px origin-left bg-brass/60" />
      <div className="relative flex flex-col items-center gap-3 text-center">
        <img src="/brand/histor-logo-cream.svg" alt="Histor" className={`w-auto opacity-90 ${compact ? 'h-9' : 'h-12 sm:h-14'}`} />
        <p data-footer="tagline">{FOOTER.tagline}</p>
      </div>
      <nav aria-label="About Histor" className="relative mt-5 flex flex-wrap items-center justify-center gap-x-6 gap-y-0">
        {credits !== null &&
          (['sources', 'credits'] as const).map(list => (
            <button
              key={list}
              type="button"
              data-footer={list}
              aria-expanded={shown === list}
              aria-controls={`footer-${list}`}
              onClick={() => setShown(current => (current === list ? null : list))}
              className={LINK}
            >
              {list === 'sources' ? 'Sources' : 'Credits'}
              <span aria-hidden="true" className="ml-1.5 inline-block transition-transform duration-(--motion-hover-duration) ease-(--motion-hover-ease) group-aria-expanded:rotate-90">
                ›
              </span>
            </button>
          ))}
        <a href={FOOTER.repository} target="_blank" rel="noreferrer" className={LINK}>
          GitHub
        </a>
        <a href={FOOTER.kiro} target="_blank" rel="noreferrer" className={LINK}>
          Built with Kiro
        </a>
      </nav>
      {caseData !== undefined && credits !== null && shown !== null && <FooterList list={shown} caseData={caseData} credits={credits} />}
      <div className="relative mt-5 flex items-center justify-center">
        <p className="text-center tabular-nums">© {FOOTER.year} Histor</p>
        <span className="absolute right-0">
          <IconButton label="Back to the top" icon={<ArrowUpIcon />} tipSide="above" data-footer="top" onClick={toTop} />
        </span>
      </div>
    </footer>
  );
}

/** The list a link opened, under the row of links. */
function FooterList({ list, caseData, credits }: { list: 'sources' | 'credits'; caseData: Case; credits: ReturnType<typeof creditsOf> }) {
  const items = 'flex flex-col gap-1.5 font-record text-[0.9375rem] leading-snug text-night-ink/75';
  if (list === 'sources') {
    return (
      <section id="footer-sources" aria-label="Sources" data-footer-list="sources" className="relative mx-auto mt-4 max-w-3xl text-left">
        <ul className={items}>
          {caseData.sources.map(source => (
            <li key={source.id}>
              {source.url !== undefined ? (
                <a href={source.url} target="_blank" rel="noreferrer" className="text-night-ink underline underline-offset-2 hover:text-brass">
                  {source.title}
                </a>
              ) : (
                <span className="text-night-ink">{source.title}</span>
              )}
              {source.author !== undefined && <span>, {source.author}</span>}
              {source.year !== undefined && <span> ({source.year})</span>}
              {source.citation !== undefined && <span className="text-night-ink/60"> · {source.citation}</span>}
            </li>
          ))}
        </ul>
      </section>
    );
  }
  return (
    <section id="footer-credits" aria-label="Credits" data-footer-list="credits" className="relative mx-auto mt-4 max-w-3xl text-left">
      {credits.images.length > 0 && (
        <>
          <h3 className="text-[0.6875rem] tracking-[0.16em] uppercase">Images</h3>
          <ul className={`mt-1.5 ${items}`}>
            {credits.images.map(({ what, credit }) => (
              <li key={what}>
                <span className="text-night-ink">{what}</span> · {credit}
              </li>
            ))}
          </ul>
        </>
      )}
      <h3 className="mt-4 text-[0.6875rem] tracking-[0.16em] uppercase">Sound</h3>
      <p className={`mt-1.5 ${items}`}>
        <span className="text-night-ink">{SOUND_CREDIT.source}</span> · {SOUND_CREDIT.note}
      </p>
      {credits.music.length > 0 && (
        <>
          <h3 className="mt-4 text-[0.6875rem] tracking-[0.16em] uppercase">Music</h3>
          <ul className={`mt-1.5 ${items}`}>
            {credits.music.map(track => (
              <li key={track.src}>
                <span className="text-night-ink">{track.title}</span> · {track.credit}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
