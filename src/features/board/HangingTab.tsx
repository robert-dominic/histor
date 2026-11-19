// src/features/board/HangingTab.tsx
// A pinned file, hanging beneath its theory note as a small folder tab: its number and title, a brass pin where
// its thread ends. A link that reopens the file.

import { Link } from 'react-router-dom';
import { scatter } from '@/lib/desk';
import type { Evidence } from '@/types/case';

interface HangingTabProps {
  evidence: Evidence;
  number: string;
  href: string;
}

export default function HangingTab({ evidence, number, href }: HangingTabProps) {
  const { rotate } = scatter(evidence.id, 3, 0);
  return (
    <li data-board="tab" data-evidence-id={evidence.id} data-flip-id={`file-${evidence.id}`} className="relative">
      <Link
        to={href}
        className="desk-manila relative flex items-baseline gap-2 rounded-t-[3px] rounded-b-[1px] px-3 pt-3.5 pb-2 text-ink shadow-md shadow-black/60 outline-offset-2 transition-[translate,filter] duration-150 ease-out focus-visible:outline-2 focus-visible:outline-brass active:scale-[0.97]"
        style={{ rotate: `${rotate}deg` }}
      >
        <span aria-hidden="true" data-board="tab-pin" className="desk-pin absolute top-1 left-4 size-2 rounded-full" />
        <span className="font-voice text-[0.6875rem] tracking-[0.14em] text-ink/80 tabular-nums">
          <span className="sr-only">File </span>
          {number}
        </span>
        <span className="truncate font-voice text-[0.8125rem] text-ink">{evidence.title}</span>
      </Link>
    </li>
  );
}
