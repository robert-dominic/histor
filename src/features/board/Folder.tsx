// src/features/board/Folder.tsx
// One case file on the board, as a paper folder. Unopened, it shows only its number and title: its status is
// earned by opening it. Opened, it carries its status stamp and, once pinned, the theory it points to.

import { Link } from 'react-router-dom';
import Stamp from '@/components/Stamp';
import { STATUS_LABEL } from '@/lib/case-files';
import type { Evidence } from '@/types/case';

interface FolderProps {
  evidence: Evidence;
  /** e.g. "07". */
  number: string;
  href: string;
  opened: boolean;
  /** The title of the theory it was pinned to, "None of them", or undefined when not pinned. */
  pinnedTo?: string;
}

export default function Folder({ evidence, number, href, opened, pinnedTo }: FolderProps) {
  return (
    <li data-board="folder" data-evidence-id={evidence.id} data-opened={opened} className="relative pt-2">
      {/* The folder's tab. */}
      <span aria-hidden="true" className="absolute top-0 left-3 h-3 w-14 rounded-t-sm bg-paper/90" />
      <Link
        to={href}
        className="relative flex min-h-[5.75rem] flex-col gap-1.5 rounded-sm rounded-tl-none bg-paper px-3.5 pt-3 pb-3 text-ink shadow-md shadow-night/50 transition-[translate,box-shadow] duration-150 ease-out hover:-translate-y-0.5 hover:shadow-lg hover:shadow-brass/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass active:scale-[0.97]"
      >
        <span className="font-voice text-[0.75rem] tracking-[0.16em] text-ink/75 tabular-nums">
          <span className="sr-only">File </span>
          {number}
        </span>
        <span className="font-record text-[1rem] leading-snug text-ink">{evidence.title}</span>
        {opened && (
          <span className="mt-auto flex flex-wrap items-center gap-x-2.5 gap-y-1 pt-1">
            <Stamp label={STATUS_LABEL[evidence.status]} tone={evidence.status} />
            {pinnedTo !== undefined && (
              <span data-board="pinned-to" className="font-voice text-[0.6875rem] tracking-[0.06em] text-ink/80">
                <span aria-hidden="true">→ </span>
                <span className="sr-only">Pinned to </span>
                {pinnedTo}
              </span>
            )}
          </span>
        )}
      </Link>
    </li>
  );
}
