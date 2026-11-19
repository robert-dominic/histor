// src/features/board/Pile.tsx
// The pile of files, lower left on the desk: manila folders lying in a real pile, each a little offset and turned
// (the same for the same file, every time).
//   Desktop: hovering the pile (or tabbing into it) fans it into an arc so every tab shows; the folder under the
//   pointer lifts.
//   Phones and tablets: a horizontal fanned stack to swipe through; the folder in the middle lifts.
//   Reduced motion: the pile lies fanned from the start, and nothing moves.
// Positions are written to the folders by GSAP, never through React state.

import { useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import Folder from '@/features/board/Folder';
import { scatter, type DeskLayout } from '@/lib/desk';
import { EASE, MOTION_QUERIES } from '@/lib/motion';
import { emitStoryEvent } from '@/lib/story-events';
import { DESKTOP_QUERY, useMediaQuery } from '@/lib/use-media-query';

gsap.registerPlugin(useGSAP);

interface PileProps {
  layout: DeskLayout;
  filesHref: string;
}

interface Place {
  x: number;
  y: number;
  rotation: number;
}

/** Where folder `index` of `count` lies in the resting pile. */
function restingPlace(id: string, index: number): Place {
  const { rotate, x, y } = scatter(id, 4, 6);
  // Each folder lies a hair higher than the one beneath it.
  return { x, y: y - index * 0.6, rotation: rotate };
}

/** Where folder `index` of `count` lies on the fanned arc, for a pile `width` wide. */
function fannedPlace(index: number, count: number, width: number): Place {
  // A shallow arc: wide enough for every tab to show, flat enough that its ends stay on the desk.
  const spread = Math.min(46, 8 + count * 1.8);
  const angle = count <= 1 ? 0 : -spread + (2 * spread * index) / (count - 1);
  const radians = (angle * Math.PI) / 180;
  const radius = Math.min(560, Math.max(260, width * 0.48));
  return { x: radius * Math.sin(radians), y: radius * (1 - Math.cos(radians)) - 60, rotation: angle * 0.7 };
}

export default function Pile({ layout, filesHref }: PileProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const isDesktop = useMediaQuery(DESKTOP_QUERY);
  const files = layout.pile;
  const openedIds = new Set(layout.folders.filter(f => f.place.kind === 'pile' && f.place.opened).map(f => f.evidence.id));
  const numberOf = new Map(layout.folders.map(folder => [folder.evidence.id, folder.number]));
  const order = files.map(evidence => evidence.id).join(',');

  useGSAP(
    () => {
      const root = rootRef.current;
      if (root === null || !isDesktop) {
        return;
      }
      const folders = gsap.utils.toArray<HTMLElement>('[data-board="folder"]', root);
      const width = root.offsetWidth || 900;
      const resting = folders.map((folder, index) => restingPlace(folder.dataset.evidenceId ?? '', index));
      const fanned = folders.map((_, index) => fannedPlace(index, folders.length, width));
      const canQuery = typeof window.matchMedia === 'function';
      const reduced = !canQuery || window.matchMedia(MOTION_QUERIES.reduced).matches;

      if (reduced) {
        // Still: the pile lies fanned, so every tab can be read, and nothing moves.
        folders.forEach((folder, index) => gsap.set(folder, { ...fanned[index], xPercent: -50, yPercent: -50 }));
        root.dataset.fanned = 'true';
        return;
      }

      folders.forEach((folder, index) => gsap.set(folder, { ...resting[index], xPercent: -50, yPercent: -50 }));
      let open = false;
      const fan = (toOpen: boolean) => {
        if (open === toOpen) {
          return;
        }
        open = toOpen;
        root.dataset.fanned = String(toOpen);
        if (toOpen) {
          emitStoryEvent({ type: 'pile-hover' });
        }
        folders.forEach((folder, index) =>
          gsap.to(folder, {
            ...(toOpen ? fanned[index] : resting[index]),
            duration: toOpen ? 0.45 : 0.3,
            ease: EASE.out,
            delay: toOpen ? index * 0.012 : 0,
            overwrite: 'auto',
          })
        );
      };
      const lift = (folder: HTMLElement, up: boolean) => {
        const index = folders.indexOf(folder);
        if (index === -1 || !open) {
          return;
        }
        gsap.to(folder, { y: fanned[index].y - (up ? 16 : 0), duration: 0.16, ease: EASE.out, overwrite: 'auto' });
      };

      const onEnter = () => fan(true);
      const onLeave = (event: PointerEvent) => {
        if (!root.contains(document.activeElement)) {
          fan(false);
        }
        void event;
      };
      const onFocusIn = () => fan(true);
      const onFocusOut = (event: FocusEvent) => {
        if (!root.contains(event.relatedTarget as Node | null)) {
          fan(false);
        }
      };
      const onOver = (event: PointerEvent) => {
        const folder = (event.target as Element).closest<HTMLElement>('[data-board="folder"]');
        if (folder !== null) {
          lift(folder, true);
        }
      };
      const onOut = (event: PointerEvent) => {
        const folder = (event.target as Element).closest<HTMLElement>('[data-board="folder"]');
        if (folder !== null && !folder.contains(event.relatedTarget as Node | null)) {
          lift(folder, false);
        }
      };
      root.addEventListener('pointerenter', onEnter);
      root.addEventListener('pointerleave', onLeave);
      root.addEventListener('focusin', onFocusIn);
      root.addEventListener('focusout', onFocusOut);
      root.addEventListener('pointerover', onOver);
      root.addEventListener('pointerout', onOut);
      return () => {
        root.removeEventListener('pointerenter', onEnter);
        root.removeEventListener('pointerleave', onLeave);
        root.removeEventListener('focusin', onFocusIn);
        root.removeEventListener('focusout', onFocusOut);
        root.removeEventListener('pointerover', onOver);
        root.removeEventListener('pointerout', onOut);
      };
    },
    { scope: rootRef, dependencies: [isDesktop, order], revertOnUpdate: true }
  );

  // Phones: the folder in the middle of the strip lifts. Written to the element as an attribute.
  useGSAP(
    () => {
      const root = rootRef.current;
      if (root === null || isDesktop || typeof IntersectionObserver !== 'function') {
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
    { scope: rootRef, dependencies: [isDesktop, order] }
  );

  return (
    <section ref={rootRef} aria-labelledby="pile-title" data-board="pile" data-fanned="false" className="relative">
      <h3 id="pile-title" className="sr-only">
        The pile of sealed files
      </h3>
      {isDesktop ? (
        <ol className="relative h-[22rem] w-full [&>li]:absolute [&>li]:top-1/2 [&>li]:left-1/2">
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
      ) : (
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
      )}
    </section>
  );
}
