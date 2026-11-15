// src/pages/Case.tsx
// One case, looked up from the route. An open case starts with its title card and legend intro.
// Once the intro has reached its end, the story follows below it: the reader scrolls on, or presses the scroll cue.

import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { InvestigationProvider } from '@/app/InvestigationProvider';
import { getCaseById } from '@/cases';
import LegendIntro, { type TitleCard } from '@/features/legend/LegendIntro';
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
  const titleCard = useMemo<TitleCard | undefined>(
    () =>
      title === undefined || year === undefined
        ? undefined
        : { title, years: formatCaseYears(year, yearEnd), unsolved },
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
      <main>
        <LegendIntro
          key={caseData.id}
          legendIntro={caseData.legendIntro}
          titleCard={titleCard}
          video={caseData.theme.legendVideo}
          startAtEnd={introSeenBefore}
          onEnded={() => {
            markIntroSeen(caseData.id);
            setIntroEndedFor(caseData.id);
          }}
          onDone={scrollToStory}
        />
        {showStory && (
          <div ref={storyRef}>
            <Story
              key={caseData.id}
              story={caseData.story}
              centralQuestion={caseData.centralQuestion}
              references={caseData.references}
              sources={caseData.sources}
            />
          </div>
        )}
      </main>
    </InvestigationProvider>
  );
}
