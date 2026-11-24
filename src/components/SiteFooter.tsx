// src/components/SiteFooter.tsx
// A quiet footer for the pages that scroll (review-fixes brief, 9): the end of the story (after the fork) and the
// report; the home page will take it when it is designed (it works without a case). The fixed one-screen desk has
// none. "Histor" in Grenze Gotisch with its line, then the case's sources and credits (music, images), the GitHub
// repository and "Built with Kiro", and © 2026, in Special Elite at a small size, the muted tone, a thin rule above.
// The sources and the credits open in place, under the links, so they work on any page.
import { useState } from 'react';
import { FOOTER } from '@/lib/footer-links';
import { storyImageCredit } from '@/lib/image-credit';
import type { Case } from '@/types/case';


const LINK =
  'group inline-flex min-h-11 items-center underline-offset-4 transition-colors duration-(--motion-hover-duration) ease-(--motion-hover-ease) hover:text-night-ink hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass';

/** Each credit once: the case's images (the legend's video, the chapters' images) and its music. */
function creditsOf(caseData: Case) {
  const images = [
    ...(caseData.theme.legendVideo === undefined ? [] : [{ what: 'The legend intro (video)', credit: caseData.theme.legendVideo.credit }]),
    ...caseData.story.flatMap(section => (section.image === undefined ? [] : [{ what: section.heading, credit: storyImageCredit(section.image) }])),
  ];
  const music = [...(caseData.theme.playlists?.story ?? []), ...(caseData.theme.playlists?.desk ?? [])].filter(
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
  return (
    <footer
      data-site-footer=""
      className={`relative z-[21] border-t border-night-ink/15 font-voice text-[0.8125rem] leading-relaxed text-night-ink/60 ${
        compact ? 'mt-10 pt-6 pb-1' : 'mx-auto mt-16 max-w-6xl px-4 pt-10 pb-14 lg:px-10'
      }`}
    >
      <div className="flex flex-col items-center gap-1 text-center">
        <p className="font-legend text-[1.75rem] leading-none text-night-ink/80">Histor</p>
        <p>{FOOTER.tagline}</p>
      </div>
      <nav aria-label="About Histor" className="mt-5 flex flex-wrap items-center justify-center gap-x-6 gap-y-0">
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
      <p className="mt-5 text-center tabular-nums">© {FOOTER.year} Histor</p>
    </footer>
  );
}

/** The list a link opened, under the row of links. */
function FooterList({ list, caseData, credits }: { list: 'sources' | 'credits'; caseData: Case; credits: ReturnType<typeof creditsOf> }) {
  const items = 'flex flex-col gap-1.5 font-record text-[0.9375rem] leading-snug text-night-ink/75';
  if (list === 'sources') {
    return (
      <section id="footer-sources" aria-label="Sources" data-footer-list="sources" className="mx-auto mt-4 max-w-3xl text-left">
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
    <section id="footer-credits" aria-label="Credits" data-footer-list="credits" className="mx-auto mt-4 max-w-3xl text-left">
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
