// src/features/board/SetAsideTray.tsx
// The tray on the desk for files the user set aside: pinned to "None of them". It is also a drop target for a
// folder in hand (dropping it here means "None of them").

import { useRef } from 'react';
import HangingTab from '@/features/board/HangingTab';
import type { DeskSlips } from '@/features/board/TheoryBoard';
import type { DeskLayout } from '@/lib/desk';
import { useTabFit } from '@/lib/use-tab-fit';

interface SetAsideTrayProps {
  layout: DeskLayout;
  filesHref: string;
  slips: DeskSlips;
  /** The one-screen desk: the tray fills the room beside the floor, and its files overlap to fit it. */
  fitted?: boolean;
}

export default function SetAsideTray({ layout, filesHref, slips, fitted = false }: SetAsideTrayProps) {
  const trayRef = useRef<HTMLElement>(null);
  useTabFit(
    trayRef,
    tray => {
      if (!fitted) {
        return [];
      }
      const style = getComputedStyle(tray);
      const inner = tray.clientHeight - parseFloat(style.paddingTop || '0') - parseFloat(style.paddingBottom || '0');
      const heading = tray.querySelector<HTMLElement>('h3');
      const tabs = [...tray.querySelectorAll<HTMLElement>('[data-board="tab"] > button')];
      // The list starts 0.75rem below the heading (mt-3).
      return [{ count: tabs.length, tabHeight: tabs[0]?.offsetHeight ?? 0, available: inner - (heading?.offsetHeight ?? 0) - 12 }];
    },
    `${fitted}:${layout.aside.length}`
  );
  const numberOf = new Map(layout.folders.map(folder => [folder.evidence.id, folder.number]));
  return (
    <section
      ref={trayRef}
      aria-labelledby="aside-title"
      data-board="aside"
      data-fitted={fitted}
      data-drop-target="none"
      className="desk-tray group/tray relative rounded-sm px-4 pt-3 pb-4 data-[drop-hot=true]:z-[22] data-[fitted=true]:h-full data-[fitted=true]:min-h-0"
    >
      {/* The glow while a folder is held over the tray: a layer whose opacity changes. */}
      <span
        aria-hidden="true"
        data-board="glow"
        className="pointer-events-none absolute inset-0 rounded-sm bg-brass/20 opacity-0 transition-opacity duration-(--motion-hover-duration) ease-(--motion-hover-ease) group-data-[drop-hot=true]/tray:opacity-100"
      />
      <h3 id="aside-title" className="font-voice text-[0.75rem] tracking-[0.2em] text-night-ink uppercase">
        None of them
      </h3>
      {layout.aside.length === 0 ? (
        <p className="mt-2 font-voice text-[0.8125rem] text-night-ink/80">Nothing yet.</p>
      ) : (
        <ul aria-label="Files set aside" className="mt-3 flex flex-col [&>li+li]:-mt-[var(--tab-overlap,0.375rem)]">
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
