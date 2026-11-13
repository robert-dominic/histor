// src/pages/Case.tsx
// One case, looked up from the route. An open case starts with its legend intro.
// What follows the intro is still the plain page: the designed story comes later.

import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { InvestigationProvider } from '@/app/InvestigationProvider';
import { getCaseById } from '@/cases';
import LegendIntro from '@/features/legend/LegendIntro';
import { hasSeenIntro, markIntroSeen } from '@/lib/intro-seen';
import { validateCase } from '@/lib/validate-case';

export default function Case() {
  const { id } = useParams();
  const entry = getCaseById(id);
  const caseData = entry !== undefined && !entry.sealed ? entry.data : undefined;
  // The id of the case whose intro has been finished. Keyed by case, so every case starts with its own intro.
  const [introDoneFor, setIntroDoneFor] = useState<string | null>(null);
  // Read once per case, when the page opens. A first-time visitor gets the full intro even after it is marked seen.
  const caseId = caseData?.id;
  const introSeenBefore = useMemo(() => (caseId === undefined ? false : hasSeenIntro(caseId)), [caseId]);

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
      {introDoneFor === caseData.id ? (
        <main>
          <h1>{caseData.title}</h1>
          <p>
            <Link to="/">Return to home</Link>
          </p>
        </main>
      ) : (
        <main>
          <LegendIntro
            key={caseData.id}
            legendIntro={caseData.legendIntro}
            video={caseData.theme.legendVideo}
            startAtEnd={introSeenBefore}
            onEnded={() => markIntroSeen(caseData.id)}
            onDone={() => setIntroDoneFor(caseData.id)}
          />
        </main>
      )}
    </InvestigationProvider>
  );
}
