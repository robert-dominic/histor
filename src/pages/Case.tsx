// src/pages/Case.tsx
// One case, looked up from the route. An open case starts with its legend intro. Once the intro has reached its
// end, the story follows below it: the reader scrolls on, or presses the scroll cue. The case header shows the
// case's title once the story starts (Story.tsx).

import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { InvestigationProvider } from '@/app/InvestigationProvider';
import CaseHeader from '@/components/CaseHeader';
import { getCaseById } from '@/cases';
import Fork from '@/features/fork/Fork';
import LegendIntro from '@/features/legend/LegendIntro';
import Story from '@/features/story/Story';
import { formatCaseYears } from '@/lib/case-years';
import { hasSeenIntro, markIntroSeen } from '@/lib/intro-seen';
import { useReducedMotion } from '@/lib/use-reduced-motion';
import { validateCase } from '@/lib/validate-case';

export default function Case() {
  const { id } = useParams();
  const entry = getCaseById(id);
  const caseData = entry !== undefined && !entry.sealed ? entry.data : undefined;
  // The id of the case whose intro has reached its end. Keyed by case, so every case starts with its own intro.
  const [introEndedFor, setIntroEndedFor] = useState<string | null>(null);
  // Read once per case, when the page opens. A first-time visitor gets the full intro even after it is marked seen.
  const caseId = caseData?.id;
  const introSeenBefore = useMemo(() => (caseId === undefined ? false : hasSeenIntro(caseId)), [caseId]);
  const storyRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();

  const title = caseData?.title;
  const year = caseData?.year;
  const yearEnd = caseData?.yearEnd;
  const unsolved = caseData?.unsolved === true;
  /** What the case header shows: the title, the years and, for an open case, a small UNSOLVED tag. */
  const headerCard = useMemo<{ title: string; years: string; unsolved: boolean } | undefined>(
    () => (title === undefined || year === undefined ? undefined : { title, years: formatCaseYears(year, yearEnd), unsolved }),
    [title, year, yearEnd, unsolved]
  );

  // In development, check the case content and report every problem in the console.
  useEffect(() => {
    if (!import.meta.env.DEV || !caseData) {
      return;
    }
    const errors = validateCase(caseData);
    if (errors.length > 0) {
      console.error(`Case "${caseData.id}" has ${errors.length} validation error(s):`, errors);
    }
  }, [caseData]);

  if (entry === undefined) {
    return (
      <main>
        <p>Case not found</p>
        <Link to="/">Return to home</Link>
      </main>
    );
  }

  if (entry.sealed) {
    return (
      <main>
        <p>This case is sealed.</p>
        <Link to="/">Return to home</Link>
      </main>
    );
  }

  // The types say an open entry always has data. This guards against a broken registry entry at runtime.
  if (!caseData) {
    return (
      <main>
        <p>Case could not be loaded</p>
        <Link to="/">Return to home</Link>
      </main>
    );
  }

  // The story is only there to scroll to once the intro has made its point (or was seen on an earlier visit).
  const showStory = introSeenBefore || introEndedFor === caseData.id;

  /** The scroll cue: glide down to the first chapter. Reduced motion jumps there instead. */
  const scrollToStory = () => {
    storyRef.current?.scrollIntoView?.({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
  };

  return (
    // The key gives every case its own provider, so one case never starts with another case's investigation.
    <InvestigationProvider key={caseData.id} caseData={caseData}>
      {/* The title stays at the top for the whole page. It is hidden until the story starts (Story.tsx). */}
      {headerCard !== undefined && (
        <CaseHeader title={headerCard.title} years={headerCard.years} unsolved={headerCard.unsolved} startHidden />
      )}
      {/* data-page lets the page's background (and so its scrollbar gutter) be night, like the header: index.css. */}
      <main data-page="case">
        <LegendIntro
          key={caseData.id}
          legendIntro={caseData.legendIntro}
          video={caseData.theme.legendVideo}
          startAtEnd={introSeenBefore}
          onEnded={() => {
            markIntroSeen(caseData.id);
            setIntroEndedFor(caseData.id);
          }}
          onDone={scrollToStory}
        />
        {showStory && (
          // The scroll cue stops with the first chapter filling the screen.
          <div ref={storyRef}>
            <Story
              key={caseData.id}
              story={caseData.story}
              centralQuestion={caseData.centralQuestion}
              centralQuestionEmphasis={caseData.centralQuestionEmphasis}
              references={caseData.references}
              sources={caseData.sources}
              voyage={caseData.voyage}
            />
            {/* After the central question: stop here, or open the case files. */}
            <Fork
              fork={caseData.fork}
              historiansSummary={caseData.historiansSummary}
              filesHref={`/case/${caseData.id}/files`}
            />
          </div>
        )}
      </main>
    </InvestigationProvider>
  );
}
