// src/features/board/SetAsideTray.tsx
// The tray on the desk for files the user set aside: pinned to "None of them". It is also a drop target for a
// folder in hand (dropping it here means "None of them").

import HangingTab from '@/features/board/HangingTab';
import type { DeskSlips } from '@/features/board/TheoryBoard';
import type { DeskLayout } from '@/lib/desk';

interface SetAsideTrayProps {
  layout: DeskLayout;
  filesHref: string;
  slips: DeskSlips;
}

export default function SetAsideTray({ layout, filesHref, slips }: SetAsideTrayProps) {
  const numberOf = new Map(layout.folders.map(folder => [folder.evidence.id, folder.number]));
  return (
    <section
      aria-labelledby="aside-title"
      data-board="aside"
      data-drop-target="none"
      className="desk-tray group/tray relative rounded-sm px-4 pt-3 pb-4 transition-[filter] duration-150 ease-out data-[drop-hot=true]:brightness-125"
    >
      <h3 id="aside-title" className="font-voice text-[0.75rem] tracking-[0.2em] text-night-ink uppercase">
        Set aside
      </h3>
      {layout.aside.length === 0 ? (
        <p className="mt-2 font-voice text-[0.8125rem] text-night-ink/80">Nothing yet.</p>
      ) : (
        <ul aria-label="Files set aside" className="mt-3 flex flex-col [&>li+li]:-mt-1.5">
          {layout.aside.map(evidence => (
            <HangingTab
              key={evidence.id}
              evidence={evidence}
              number={numberOf.get(evidence.id) ?? ''}
              href={`${filesHref}/${evidence.id}`}
              reading={slips.readings.get(evidence.id)}
              slipOpen={slips.open === evidence.id}
              onToggleSlip={slips.onToggle}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
