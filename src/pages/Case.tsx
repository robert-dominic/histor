// src/pages/Case.tsx
// One case, looked up from the route. An open case starts with its legend intro. Once the intro has reached its
// end, the story follows below it: the reader scrolls on, or presses the scroll cue. The case header shows the
// case's title once the story starts (Story.tsx).

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { InvestigationProvider } from '@/app/InvestigationProvider';
import CaseHeader, { type StoryStartState } from '@/components/CaseHeader';
import SiteFooter from '@/components/SiteFooter';
import Preloader from '@/features/dread/Preloader';
import { getCaseById } from '@/cases';
import LegendIntro from '@/features/legend/LegendIntro';
import PlayChoice, { type PlayMode } from '@/features/story/PlayChoice';
import Story from '@/features/story/Story';
import { formatCaseYears } from '@/lib/case-years';
import { hasSeenIntro, markIntroSeen } from '@/lib/intro-seen';
import { emitStoryEvent } from '@/lib/story-events';
import { loadStoryMode } from '@/lib/story-mode';
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
  // The sound's place: the case's story, with its legend intro (src/lib/sound).
  const ambience = caseData?.theme.ambience;
  const playlists = caseData?.theme.playlists;
  useEffect(() => {
    emitStoryEvent({ type: 'place', place: 'story', ambience, playlists });
    return () => emitStoryEvent({ type: 'place', place: 'away' });
  }, [ambience, playlists]);
  /** The play choice is open: the reader has gone on from the legend intro and must choose how to hear the story. */
  const [choosing, setChoosing] = useState(false);
  /** The reader's choice, each time it is made: the story starts with it. */
  const [start, setStart] = useState<{ mode: PlayMode; token: number } | null>(null);
  /** The play choice has been shown on this page load (it shows once, before chapter 1, however the reader arrives). */
  const choiceShownRef = useRef(false);
  /** The reader's saved choice (ui-pass brief, 2): once made, the modal never shows again. Read once per page. */
  const [savedMode] = useState(() => (caseData === undefined ? null : loadStoryMode()));
  /**
   * Time for the reader to choose: the modal, for someone who has never chosen; otherwise the story starts at once,
   * at its very beginning, in the saved mode.
   */
  const openChoice = useCallback(() => {
    choiceShownRef.current = true;
    if (savedMode !== null) {
      setStart(current => ({ mode: savedMode.mode, token: (current?.token ?? 0) + 1 }));
      return;
    }
    setChoosing(true);
  }, [savedMode]);

  const title = caseData?.title;
  const year = caseData?.year;
  const yearEnd = caseData?.yearEnd;
  const unsolved = caseData?.unsolved === true;
  /** What the case header shows: the title, the years and, for an open case, a small UNSOLVED tag. */
  const headerCard = useMemo<{ title: string; years: string; unsolved: boolean } | undefined>(
    () => (title === undefined || year === undefined ? undefined : { title, years: formatCaseYears(year, yearEnd), unsolved }),
    [title, year, yearEnd, unsolved]
  );

  // The header's title was clicked (review-fixes brief, 5): back to the start, which is the legend intro.
  const storyStart = (useLocation().state as Partial<StoryStartState> | null)?.storyStart;
  // The story is only there to scroll to once the intro has made its point, or was seen on an earlier visit. Nothing
  // else brings it up first (sound-files brief, 1): the legend intro is always the first screen.
  const showStory = caseData !== undefined && (introSeenBefore || introEndedFor === caseData.id);

  // The legend intro is always the first screen, on every visit and from every path (sound-files brief, 1). The bug
  // was that the play modal came first: a reload kept the title link's state (which brought the story up at once)
  // and the browser put the page back where it was, with the story in view, which opened the modal. The page now
  // always opens at its top, with the browser's own scroll restoration off while it is here.
  useEffect(() => {
    const history = window.history;
    const before = 'scrollRestoration' in history ? history.scrollRestoration : null;
    if (before !== null) {
      history.scrollRestoration = 'manual';
    }
    window.scrollTo?.(0, 0);
    return () => {
      if (before !== null) {
        history.scrollRestoration = before;
      }
    };
  }, []);

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
  }, [showStory, openChoice]);

  // The title clicked, from anywhere (the desk, a file, the verdict, the report, or already in the story): back to the
  // legend intro at the top. The story is drawn afresh (its key), so a stage holding the screen lets go. The play
  // modal then comes after the intro, as on any visit, and only to a reader who has never chosen.
  useEffect(() => {
    if (storyStart === undefined) {
      return;
    }
    choiceShownRef.current = false;
    const frame = requestAnimationFrame(() => window.scrollTo?.(0, 0));
    return () => cancelAnimationFrame(frame);
  }, [storyStart]);

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
        <CaseHeader caseId={caseData.id} title={headerCard.title} years={headerCard.years} unsolved={headerCard.unsolved} startHidden />
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
      {/* On the first load: the files being recovered, while the fonts and the first images load (dread pass, 1). */}
      <Preloader images={[caseData.theme.legendVideo?.poster, caseData.story[0]?.image?.src].filter((src): src is string => src !== undefined)} />
      {/* data-page lets the page's background (and so its scrollbar gutter) be night, like the header: index.css. */}
      <main data-page="case">
        <LegendIntro
          key={`${caseData.id}:${storyStart ?? 0}`}
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
              key={`${caseData.id}:${storyStart ?? 0}`}
              story={caseData.story}
              centralQuestion={caseData.centralQuestion}
              centralQuestionEmphasis={caseData.centralQuestionEmphasis}
              centralQuestionLines={caseData.centralQuestionLines}
              centralQuestionNarration={caseData.centralQuestionNarration}
              references={caseData.references}
              sources={caseData.sources}
              voyage={caseData.voyage}
              start={start}
              fork={{ fork: caseData.fork, historiansSummary: caseData.historiansSummary, filesHref: `/case/${caseData.id}/files` }}
              footer={compact => <SiteFooter caseData={caseData} compact={compact} />}
            />
          </div>
        )}
      </main>
    </InvestigationProvider>
  );
}
