// src/features/landing/Landing.tsx
// The landing page (landing brief): an archive of cases in the style of a gallery's dark rooms. It opens black with
// the Histor wordmark, which docks into the header; then one full-screen section per case, each a frame.
import { useCallback, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import LandingHeader from '@/features/landing/LandingHeader';
import Opening from '@/features/landing/Opening';
import { exhibits } from '@/cases';

export default function Landing() {
  const markRef = useRef<HTMLImageElement>(null);
  /** The wordmark has docked (or is docking): the header shows, and the first frame rises in. */
  const [docked, setDocked] = useState(false);
  const dock = useCallback(() => setDocked(true), []);
  const start = exhibits.find(exhibit => exhibit.status === 'open');
  return (
    <main data-page="landing" data-docked={docked} className="relative min-h-svh bg-night text-night-ink">
      <LandingHeader startHref={start === undefined ? '/' : `/case/${start.id}`} markRef={markRef} docked={docked} />
      <Opening targetRef={markRef} onDock={dock} />
      <ol aria-label="The cases">
        {exhibits.map(exhibit => (
          <li key={exhibit.id} data-exhibit={exhibit.id} className="min-h-svh px-6 pt-24">
            <h2 className="font-record text-3xl italic">{exhibit.status === 'open' ? <Link to={`/case/${exhibit.id}`}>{exhibit.title}</Link> : exhibit.title}</h2>
            <p>{exhibit.headline}</p>
          </li>
        ))}
      </ol>
    </main>
  );
}
