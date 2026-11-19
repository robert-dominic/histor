// src/features/board/CaseFile.tsx
// The route for one case file: /case/:id/files/:evidenceId. An id the case does not have shows
// "File not found" with a way back to the board.

import { Link, useParams } from 'react-router-dom';
import { useInvestigation } from '@/app/InvestigationProvider';
import OpenedFile from '@/features/board/OpenedFile';

export default function CaseFile() {
  const { evidenceId } = useParams();
  const { caseData } = useInvestigation();
  const index = caseData.evidence.findIndex(evidence => evidence.id === evidenceId);
  const board = `/case/${caseData.id}/files`;

  if (index === -1) {
    return (
      <div role="dialog" aria-modal="true" aria-label="File not found" className="fixed inset-0 z-40 bg-night px-5 pt-[calc(var(--case-header)+2rem)] text-night-ink">
        <p className="font-voice text-base">File not found</p>
        <Link
          to={board}
          className="mt-3 inline-block font-voice text-sm text-brass underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass"
        >
          Back to the board
        </Link>
      </div>
    );
  }

  // Keyed by file: moving to the next file starts it fresh, with its own stamp.
  return <OpenedFile key={caseData.evidence[index].id} evidence={caseData.evidence[index]} index={index} />;
}
