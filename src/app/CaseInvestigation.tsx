// src/app/CaseInvestigation.tsx
// The layout for a case's investigation: the board, an opened file, the verdict and the report.
// It finds the case, gives every screen inside it one investigation (so a pin or a verdict survives moving from
// screen to screen), and lets case text open portals. The screens render in the <Outlet /> and read the case
// with useInvestigation(). Below 1024px wide, the phone gate takes the place of every screen until the visitor
// chooses to continue anyway (once per session).

import { useEffect, useState } from 'react';
import { Link, Outlet, useParams } from 'react-router-dom';
import { InvestigationProvider } from '@/app/InvestigationProvider';
import PhoneGate from '@/app/PhoneGate';
import CaseHeader from '@/components/CaseHeader';
import { getCaseById } from '@/cases';
import PortalProvider from '@/features/portals/PortalProvider';
import { formatCaseYears } from '@/lib/case-years';
import { emitStoryEvent } from '@/lib/story-events';
import { continuePastGate, hasContinuedPastGate } from '@/lib/phone-gate';
import { DESKTOP_QUERY, useMediaQuery } from '@/lib/use-media-query';

export default function CaseInvestigation() {
  const { id } = useParams();
  const entry = getCaseById(id);
  const isDesktop = useMediaQuery(DESKTOP_QUERY);
  const [continued, setContinued] = useState(hasContinuedPastGate);
  // A browser that cannot measure its screen gets the investigation: better a cramped desk than a closed door.
  const canMeasure = typeof window !== 'undefined' && typeof window.matchMedia === 'function';
  // The sound's place: the desk's room, for the desk, the verdict and the report (src/lib/sound).
  const theme = entry !== undefined && !entry.sealed ? entry.data?.theme : undefined;
  const ambience = theme?.ambience;
  const playlists = theme?.playlists;
  useEffect(() => {
    emitStoryEvent({ type: 'place', place: 'desk', ambience, playlists });
    return () => emitStoryEvent({ type: 'place', place: 'away' });
  }, [ambience, playlists]);

  if (entry === undefined) {
    return (
      <main>
        <p>Case not found</p>
        <Link to="/">Return to home</Link>
      </main>
    );
  }
  if (entry.sealed || !entry.data) {
    return (
      <main>
        <p>This case is sealed.</p>
        <Link to="/">Return to home</Link>
      </main>
    );
  }

  const caseData = entry.data;
  return (
    <InvestigationProvider key={caseData.id} caseData={caseData}>
      <CaseHeader
        caseId={caseData.id}
        title={caseData.title}
        years={formatCaseYears(caseData.year, caseData.yearEnd)}
        unsolved={caseData.unsolved === true}
      />
      <PortalProvider references={caseData.references} sources={caseData.sources}>
        {canMeasure && !isDesktop && !continued ? (
          <PhoneGate
            onContinue={() => {
              continuePastGate();
              setContinued(true);
            }}
          />
        ) : (
          <Outlet />
        )}
      </PortalProvider>
    </InvestigationProvider>
  );
}
