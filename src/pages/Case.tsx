// src/pages/Case.tsx
// One case, looked up from the route. An open case starts with its legend intro. Once the intro has reached its
// end, the story follows below it: the reader scrolls on, or presses the scroll cue. The case header shows the
// case's title once the story starts (Story.tsx).

import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { InvestigationProvider } from '@/app/InvestigationProvider';
import CaseHeader from '@/components/CaseHeader';
import { getCaseById } from '@/cases';
import LegendIntro from '@/features/legend/LegendIntro';
import PlayChoice, { type PlayMode } from '@/features/story/PlayChoice';
import Story from '@/features/story/Story';
import { formatCaseYears } from '@/lib/case-years';
import { hasSeenIntro, markIntroSeen } from '@/lib/intro-seen';
import { validateCase } from '@/lib/validate-case';

/** The story has "arrived" once its top is this far up the screen (an IntersectionObserver root margin). */
const STORY_ARRIVAL_MARGIN = '0px 0px -35% 0px';

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
  /** The play choice is open: the reader has gone on from the legend intro and must choose how to hear the story. */
  const [choosing, setChoosing] = useState(false);
  /** The reader's choice, each time it is made: the story starts with it. */
  const [start, setStart] = useState<{ mode: PlayMode; token: number } | null>(null);
  /** The play choice has been shown on this page load (it shows once, before chapter 1, however the reader arrives). */
  const choiceShownRef = useRef(false);
  const openChoice = () => {
    choiceShownRef.current = true;
    setChoosing(true);
  };

  const title = caseData?.title;
  const year = caseData?.year;
  const yearEnd = caseData?.yearEnd;
  const unsolved = caseData?.unsolved === true;
  /** What the case header shows: the title, the years and, for an open case, a small UNSOLVED tag. */
  const headerCard = useMemo<{ title: string; years: string; unsolved: boolean } | undefined>(
    () => (title === undefined || year === undefined ? undefined : { title, years: formatCaseYears(year, yearEnd), unsolved }),
    [title, year, yearEnd, unsolved]
  );

  // The story is only there to scroll to once the intro has made its point (or was seen on an earlier visit).
  const showStory = caseData !== undefined && (introSeenBefore || introEndedFor === caseData.id);

  // However the reader reaches the story (the scroll cue, scrolling past the intro, a return visit, a reload or a
  // direct link), the play choice opens once on this page load, before chapter 1 starts: as soon as the story comes
  // up the screen. (The scroll cue opens it too, each time it is pressed.)
  useEffect(() => {
    const story = storyRef.current;
    if (!showStory || story === null || typeof IntersectionObserver !== 'function') {
      return;
    }
    const observer = new IntersectionObserver(
      entries => {
        if (entries.some(entry => entry.isIntersecting) && !choiceShownRef.current) {
          observer.disconnect();
          openChoice();
        }
      },
      { rootMargin: STORY_ARRIVAL_MARGIN }
    );
    observer.observe(story);
    return () => observer.disconnect();
  }, [showStory]);

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


  return (
    // The key gives every case its own provider, so one case never starts with another case's investigation.
    <InvestigationProvider key={caseData.id} caseData={caseData}>
      {/* The title stays at the top for the whole page. It is hidden until the story starts (Story.tsx). */}
      {headerCard !== undefined && (
        <CaseHeader title={headerCard.title} years={headerCard.years} unsolved={headerCard.unsolved} startHidden />
      )}
      {/* After the legend intro: how to hear the story. The reader must choose; Escape means "Read at my pace". */}
      {choosing && showStory && (
        <PlayChoice
          title={caseData.title}
          onChoose={mode => {
            setChoosing(false);
            setStart(current => ({ mode, token: (current?.token ?? 0) + 1 }));
          }}
        />
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
          onDone={openChoice}
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
              start={start}
              fork={{ fork: caseData.fork, historiansSummary: caseData.historiansSummary, filesHref: `/case/${caseData.id}/files` }}
            />
          </div>
        )}
      </main>
    </InvestigationProvider>
  );
}
