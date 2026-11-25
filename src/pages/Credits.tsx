// src/pages/Credits.tsx
// /credits (the fix list): every credit, grouped by case and built from each case's data (each case has its own
// anchor, #{caseId}, which the report's ⓘ links to), then the app's own credits. It scrolls, so it carries the footer.
import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import SiteFooter from '@/components/SiteFooter';
import { registry } from '@/cases';
import { APP_CREDITS, caseCredits, type CreditLine } from '@/lib/credits';

function Lines({ heading, lines }: { heading: string; lines: CreditLine[] }) {
  if (lines.length === 0) {
    return null;
  }
  return (
    <section className="mt-6">
      <h3 className="font-voice text-[0.75rem] tracking-[0.16em] text-night-ink/70 uppercase">{heading}</h3>
      <ul className="mt-2 flex flex-col gap-1.5 font-record text-[1rem] leading-snug text-night-ink/85">
        {lines.map(line => (
          <li key={`${line.what}:${line.credit}`}>
            <span className="text-night-ink">{line.what}</span>
            <span className="text-night-ink/65"> · {line.credit}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function Credits() {
  const { hash } = useLocation();
  // To a case's credits when the link names one.
  useEffect(() => {
    if (hash !== '') {
      document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView?.({ block: 'start' });
    }
  }, [hash]);
  const cases = registry.flatMap(entry => (entry.sealed || entry.data === undefined ? [] : [caseCredits(entry.data)]));
  return (
    <main data-page="credits" className="min-h-svh bg-night px-4 pt-14 text-night-ink sm:px-8">
      <div className="mx-auto max-w-3xl">
        <h1 className="font-legend text-[clamp(2.25rem,1.8rem+2vw,3.25rem)] leading-none">Credits</h1>
        <p className="mt-3 font-voice text-[0.875rem] text-night-ink/70">
          Every image, sound and face used, case by case. <Link to="/sources" className="underline underline-offset-4 hover:text-brass">The sources</Link> are on their own page.
        </p>
        {cases.map(group => (
          <article key={group.caseId} id={group.caseId} data-credits-case={group.caseId} className="mt-12 scroll-mt-6 border-t border-night-ink/15 pt-6">
            <h2 className="font-legend text-[1.875rem] leading-none">{group.title}</h2>
            <Lines heading="Images" lines={group.images} />
            <Lines heading="Sound" lines={group.sound} />
            <Lines heading="Music" lines={group.music} />
          </article>
        ))}
        <article id="histor" data-credits-case="app" className="mt-12 scroll-mt-6 border-t border-night-ink/15 pt-6">
          <h2 className="font-legend text-[1.875rem] leading-none">Histor</h2>
          {APP_CREDITS.map(group => (
            <Lines key={group.heading} heading={group.heading} lines={group.lines} />
          ))}
        </article>
      </div>
      <SiteFooter />
    </main>
  );
}
