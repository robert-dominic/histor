// src/features/board/Folder.tsx
// One file in the pile: a manila folder with a tab (its number) and a typed title label.
// Sealed, every folder looks the same outside: no status. A file that was opened but not pinned goes back on top
// of the pile with its status stamp on the tab (D1).
// The folder is a link, so Tab and Enter open it. Its place in the pile is set by Pile.tsx, from outside.

import { Link } from 'react-router-dom';
import Stamp from '@/components/Stamp';
import { STATUS_LABEL } from '@/lib/case-files';
import type { Evidence } from '@/types/case';

interface FolderProps {
  evidence: Evidence;
  /** e.g. "07". */
  number: string;
  href: string;
  /** Opened before, but not pinned: its stamp shows. */
  opened: boolean;
}

export default function Folder({ evidence, number, href, opened }: FolderProps) {
  return (
    <li
      data-board="folder"
      data-evidence-id={evidence.id}
      data-opened={opened}
      data-flip-id={`file-${evidence.id}`}
      // In the phone strip the folder in the middle lifts (data-centred, set by Pile.tsx). On a desktop GSAP places it.
      className="desk-folder w-[10.5rem] shrink-0 motion-safe:transition-[translate] motion-safe:duration-200 motion-safe:ease-out data-[centred=true]:-translate-y-2.5 lg:w-[11.5rem]"
    >
      <Link
        to={href}
        className="group/folder relative block pt-3 outline-offset-2 focus-visible:outline-2 focus-visible:outline-brass"
      >
        {/* The tab, with the file's number. */}
        <span className="desk-manila absolute top-0 left-3 flex h-4 items-center rounded-t-[3px] px-2.5 font-voice text-[0.6875rem] tracking-[0.14em] text-ink/80 tabular-nums">
          <span className="sr-only">File </span>
          {number}
        </span>
        <span className="desk-manila relative flex min-h-[6.5rem] flex-col justify-between gap-2 rounded-[3px] rounded-tl-none px-3.5 pt-3 pb-3 shadow-[0_2px_6px] shadow-black/60">
          {/* The typed title label. */}
          <span className="self-start rounded-[1px] bg-paper/80 px-2 py-1 font-voice text-[0.8125rem] leading-snug text-ink">
            {evidence.title}
          </span>
          {opened && (
            <span className="self-end">
              <Stamp label={STATUS_LABEL[evidence.status]} tone={evidence.status} />
            </span>
          )}
        </span>
      </Link>
    </li>
  );
}
