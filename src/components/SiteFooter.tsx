// src/components/SiteFooter.tsx
// The site's footer (landing brief, 5): a normal, standard footer at the end of a page that scrolls, after its last
// section: the landing page, the credits and the sources (no case page has one). The Histor wordmark and its
// description; Credits, Sources, GitHub and "Built with Kiro"; "Designed and built by Robert", Robert linking to
// DESIGNER_URL; © and "Back to the top". Small, quiet, in Special Elite, a thin rule above. Nothing moves.
import { Link } from 'react-router-dom';
import IconButton from '@/components/IconButton';
import { ArrowUpIcon } from '@/components/icons';
import { DESIGNER_URL, FOOTER } from '@/lib/footer-links';
import { MOTION_QUERIES } from '@/lib/motion';

const LINK =
  'inline-flex min-h-11 items-center underline-offset-4 transition-colors duration-(--motion-hover-duration) ease-(--motion-hover-ease) hover:text-night-ink hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass';

export default function SiteFooter() {
  const toTop = () => {
    const reduced = typeof window.matchMedia === 'function' && window.matchMedia(MOTION_QUERIES.reduced).matches;
    window.scrollTo?.({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
  };
  return (
    <footer data-site-footer="" className="relative z-[21] border-t border-night-ink/15 font-voice text-[0.8125rem] leading-relaxed text-night-ink/60">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 pt-12 pb-10 sm:px-8 lg:flex-row lg:items-start lg:justify-between lg:px-10">
        <div className="max-w-sm">
          <img src="/brand/histor-logo-cream.svg" alt="Histor" className="h-6 w-auto opacity-90" />
          <p data-footer="description" className="mt-4">
            {FOOTER.description}
          </p>
        </div>
        <nav aria-label="About Histor" className="flex flex-wrap gap-x-6 gap-y-0 lg:justify-end">
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
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 border-t border-night-ink/10 px-4 py-5 sm:px-8 lg:px-10">
        <p data-footer="byline">
          Designed and built by{' '}
          <a href={DESIGNER_URL} target="_blank" rel="noreferrer" className="text-night-ink/85 underline underline-offset-4 hover:text-night-ink">
            Robert
          </a>
          <span className="tabular-nums"> · © {FOOTER.year} Histor</span>
        </p>
        <IconButton label="Back to the top" icon={<ArrowUpIcon />} tipSide="above" data-footer="top" onClick={toTop} />
      </div>
    </footer>
  );
}
