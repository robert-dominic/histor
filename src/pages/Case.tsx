// src/pages/Case.tsx
// One case, looked up from the route. An open case starts with its hook screen, on every visit. As the hook dissolves
// the story comes up under it, and the play choice opens once it has gone. The case header shows the case's title
// once the story starts (Story.tsx).

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { InvestigationProvider } from '@/app/InvestigationProvider';
import CaseHeader, { type StoryStartState } from '@/components/CaseHeader';
import Preloader from '@/features/dread/Preloader';
import { useLoading } from '@/lib/loading';
import { loadersEnabled } from '@/lib/preloader';
import { getCaseById } from '@/cases';
import HookScreen from '@/features/hook/HookScreen';
import PlayChoice, { type PlayMode } from '@/features/story/PlayChoice';
import Story from '@/features/story/Story';
import { formatCaseYears } from '@/lib/case-years';
import { emitStoryEvent } from '@/lib/story-events';
import { loadStoryMode } from '@/lib/story-mode';
import { validateCase } from '@/lib/validate-case';

export default function Case() {
  const { id } = useParams();
  const entry = getCaseById(id);
  const caseData = entry !== undefined && !entry.sealed ? entry.data : undefined;
  // Where the hook is, for this case: its dissolve into chapter 1 has begun (the story is up under it), or it has gone.
  // Keyed by case, so every case starts with its own hook. It shows on every visit: nothing is remembered.
  const [hookPhase, setHookPhase] = useState<{ visit: string; phase: 'dissolving' | 'gone' } | null>(null);
  // The sound's place: the case's story, with its hook screen (src/lib/sound).
  const ambience = caseData?.theme.ambience;
  const playlists = caseData?.theme.playlists;
  useEffect(() => {
    emitStoryEvent({ type: 'place', place: 'story', ambience, playlists });
    return () => emitStoryEvent({ type: 'place', place: 'away' });
  }, [ambience, playlists]);
  /** The play choice is open: the hook has gone and the reader must choose how to hear the story. */
  const [choosingFor, setChoosingFor] = useState<string | null>(null);
  /** The reader's choice, each time it is made: the story starts with it. */
  const [startRaw, setStart] = useState<{ mode: PlayMode; token: number; visit: string } | null>(null);
  /** The reader's saved choice (ui-pass brief, 2): once made, the modal never shows again. Read once per page. */
  const [savedMode] = useState(() => (caseData === undefined ? null : loadStoryMode()));
  // The header's title was clicked (review-fixes brief, 5): back to the start, which is the hook. Each visit of the page
  // (the case, and each press of the title) has its own key: the hook, the play choice and the story belong to it, so
  // pressing the title starts them over without anything having to be reset.
  const storyStart = (useLocation().state as Partial<StoryStartState> | null)?.storyStart;
  const visitKey = `${caseData?.id ?? ''}:${storyStart ?? 0}`;

  /**
   * Time for the reader to choose: the modal, for someone who has never chosen; otherwise the story starts at once,
   * at its very beginning, in the saved mode.
   */
  const openChoice = useCallback(() => {
    if (savedMode !== null) {
      setStart(current => ({ mode: savedMode.mode, token: (current?.token ?? 0) + 1, visit: visitKey }));
      return;
    }
    setChoosingFor(visitKey);
  }, [savedMode, visitKey]);

  const title = caseData?.title;
  const year = caseData?.year;
  const yearEnd = caseData?.yearEnd;
  const unsolved = caseData?.unsolved === true;
  /** What the case header shows: the title, the years and, for an open case, a small UNSOLVED tag. */
  const headerCard = useMemo<{ title: string; years: string; unsolved: boolean } | undefined>(
    () => (title === undefined || year === undefined ? undefined : { title, years: formatCaseYears(year, yearEnd), unsolved }),
    [title, year, yearEnd, unsolved]
  );

  // Nothing runs behind a loader (src/lib/loading.ts): the hook, the play choice and the story wait for it.
  // The page's own loader (below) says when it has gone; until then nothing starts.
  const [loaded, setLoaded] = useState(() => !loadersEnabled());
  const loading = useLoading() || !loaded;
  const choosing = choosingFor === visitKey;
  /** The reader's choice for this visit only. */
  const start = startRaw?.visit === visitKey ? startRaw : null;
  const hookOf = hookPhase?.visit === visitKey ? hookPhase.phase : null;
  /** The story is mounted once the hook starts to dissolve (it shows through), and stays. */
  const showStory = !loading && hookOf !== null;
  /** The hook is on screen from the loader's end until it has dissolved. */
  const showHook = !loading && caseData !== undefined && hookOf !== 'gone';

  // The hook is always the first screen, on every visit and from every path. The page always opens at its top, with
  // the browser's own scroll restoration off while it is here.
  // (The browser's restoration is off for the whole app: ScrollToTop, quick fixes 2.)
  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
    window.scrollTo?.(0, 0);
  }, []);

  // The title clicked, from anywhere (the desk, a file, the verdict, the report, or already in the story): back to the
  // hook at the top. The story is taken down and drawn afresh after it, so a stage holding the screen lets go. The play
  // modal then comes after the hook, as on any visit, and only to a reader who has never chosen.
  useEffect(() => {
    if (storyStart === undefined) {
      return;
    }
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
        <CaseHeader caseId={caseData.id} title={headerCard.title} years={headerCard.years} unsolved={headerCard.unsolved} startHidden soundHint={!(choosing && showStory)} />
      )}
      {/* After the hook: how to hear the story. The reader must choose; Escape means "Read at my pace". */}
      {choosing && showStory && (
        <PlayChoice
          title={caseData.title}
          onChoose={mode => {
            setChoosingFor(null);
            setStart(current => ({ mode, token: (current?.token ?? 0) + 1, visit: visitKey }));
          }}
        />
      )}
      {/* "Opening the case…", only if the fonts and the first images take longer than about 400ms (landing v2 brief, 5). */}
      <Preloader label="Opening the case…" showAfterMs={400} onDone={() => setLoaded(true)} images={[caseData.story[0]?.image?.src].filter((src): src is string => src !== undefined)} />
      {/* data-page lets the page's background (and so its scrollbar gutter) be night, like the header: index.css. */}
      <main data-page="case">
        {/* The hook: the first screen, on every visit. The story mounts under it as it dissolves. */}
        {showHook && (
          <HookScreen
            key={visitKey}
            hook={caseData.hook}
            image={caseData.story[0]?.image}
            onEnded={() => setHookPhase({ visit: visitKey, phase: 'dissolving' })}
            onDone={() => {
              setHookPhase({ visit: visitKey, phase: 'gone' });
              openChoice();
            }}
          />
        )}
        {showStory && (
          <div>
            <Story
              key={visitKey}
              story={caseData.story}
              centralQuestion={caseData.centralQuestion}
              centralQuestionEmphasis={caseData.centralQuestionEmphasis}
              centralQuestionLines={caseData.centralQuestionLines}
              centralQuestionNarration={caseData.centralQuestionNarration}
              references={caseData.references}
              sources={caseData.sources}
              voyage={caseData.voyage}
              start={start}
              fork={{ fork: caseData.fork, filesHref: `/case/${caseData.id}/files` }}
            />
          </div>
        )}
      </main>
    </InvestigationProvider>
  );
}
