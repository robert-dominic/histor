// src/pages/Sources.tsx
// /sources (the fix list): each case's sources, grouped by case, from its data: title, author, year, citation and,
// when there is one, a link. It scrolls, so it carries the footer.
import { Link } from 'react-router-dom';
import SiteFooter from '@/components/SiteFooter';
import { registry } from '@/cases';

export default function Sources() {
  const cases = registry.flatMap(entry => (entry.sealed || entry.data === undefined ? [] : [entry.data]));
  return (
    <>
    <main data-page="sources" className="min-h-svh bg-night px-4 pt-14 pb-24 text-night-ink sm:px-8">
      <div className="mx-auto max-w-3xl">
        <h1 className="font-legend text-[clamp(2.25rem,1.8rem+2vw,3.25rem)] leading-none">Sources</h1>
        <p className="mt-3 font-voice text-[0.875rem] text-night-ink/70">
          Where each case's record comes from. <Link to="/credits" className="underline underline-offset-4 hover:text-brass">The credits</Link> are on their own page.
        </p>
        {cases.map(caseData => (
          <article key={caseData.id} id={caseData.id} data-sources-case={caseData.id} className="mt-12 scroll-mt-6 border-t border-night-ink/15 pt-6">
            <h2 className="font-legend text-[1.875rem] leading-none">{caseData.title}</h2>
            <ol className="mt-4 flex list-decimal flex-col gap-2.5 pl-6 font-record text-[1rem] leading-snug text-night-ink/85 marker:font-voice marker:text-night-ink/50">
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
            </ol>
          </article>
        ))}
      </div>
    </main>
    <SiteFooter />
    </>
  );
}
