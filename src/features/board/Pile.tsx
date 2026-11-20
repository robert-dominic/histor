// src/features/board/Pile.tsx
// The pile of files on the phone desk: a horizontal fanned stack to swipe through; the folder in the middle lifts.
// (The desktop desk lays its files out flat on the floor instead: Floor.tsx.)
import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import Folder from '@/features/board/Folder';
import type { DeskLayout } from '@/lib/desk';

interface PileProps {
  layout: DeskLayout;
  filesHref: string;
}

export default function Pile({ layout, filesHref }: PileProps) {
  const rootRef = useRef<HTMLElement>(null);
  const files = layout.pile;
  const openedIds = new Set(layout.folders.filter(f => f.place.kind === 'pile' && f.place.opened).map(f => f.evidence.id));
  const numberOf = new Map(layout.folders.map(folder => [folder.evidence.id, folder.number]));
  const order = files.map(evidence => evidence.id).join(',');

  // The folder in the middle of the strip lifts. Written to the element as an attribute.
  useGSAP(
    () => {
      const root = rootRef.current;
      if (root === null || typeof IntersectionObserver !== 'function') {
        return;
      }
      const strip = root.querySelector('ol');
      const observer = new IntersectionObserver(
        entries => {
          for (const entry of entries) {
            (entry.target as HTMLElement).dataset.centred = String(entry.isIntersecting);
          }
        },
        { root: strip, rootMargin: '0px -45% 0px -45%', threshold: 0 }
      );
      root.querySelectorAll('[data-board="folder"]').forEach(folder => observer.observe(folder));
      return () => observer.disconnect();
    },
    { scope: rootRef, dependencies: [order] }
  );

  return (
    <section ref={rootRef} aria-labelledby="pile-title" data-board="pile" className="relative">
      <h3 id="pile-title" className="sr-only">
        The pile of sealed files
      </h3>
      <ol className="-mx-4 flex snap-x snap-mandatory overflow-x-auto px-[calc(50%-5.25rem)] pt-4 pb-6 [&>li]:snap-center [&>li+li]:-ml-14">
        {files.map(evidence => (
          <Folder
            key={evidence.id}
            evidence={evidence}
            number={numberOf.get(evidence.id) ?? ''}
            href={`${filesHref}/${evidence.id}`}
            opened={openedIds.has(evidence.id)}
          />
        ))}
      </ol>
    </section>
  );
}
