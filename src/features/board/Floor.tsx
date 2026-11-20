// src/features/board/Floor.tsx
// The floor of the desktop desk: the files lie flat, tossed on the table and seen from above, each with a slight
// tilt, a little overlapping, every tab and label showing. Where each one lies comes from `floorLayout` (lib/floor.ts),
// the same every visit. A file that was opened but not pinned lies here too, with its status stamp.
// Positions are written to the folders by GSAP, never through React state. When the floor changes size or the set of
// files on it changes, the folders move to their new places with Flip (the `layout` token).
// Reduced motion: the folders are simply placed.
import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import Folder from '@/features/board/Folder';
import { Flip } from '@/features/board/flight';
import { floorLayout, type FolderBox } from '@/lib/floor';
import type { DeskLayout } from '@/lib/desk';
import { MOTION_QUERIES, tween } from '@/lib/motion';
import { emitStoryEvent } from '@/lib/story-events';

/** How much a folder grows when it lifts under the pointer. */
const LIFT = 1.04;
/** The hover media query of the design: a mouse or trackpad. */
const FINE_HOVER = '(hover: hover) and (pointer: fine)';

interface FloorProps {
  layout: DeskLayout;
  filesHref: string;
}

/** A folder's natural size, and the part of it (tab and label) that must stay visible, as measured on screen. */
function measureFolder(folders: HTMLElement[]): FolderBox | null {
  const first = folders[0];
  if (first === undefined || first.offsetWidth === 0) {
    return null;
  }
  // offsetLeft, offsetTop and the sizes are in the folder's own units, so the scale and tilt already applied to
  // it do not matter.
  let left = Infinity;
  let top = Infinity;
  let right = 0;
  let bottom = 0;
  for (const folder of folders) {
    for (const part of folder.querySelectorAll<HTMLElement>('[data-folder="tab"], [data-folder="label"]')) {
      // offsetLeft/offsetTop are in the folder's own units; the link is the offset parent of the parts.
      let x = part.offsetLeft;
      let y = part.offsetTop;
      for (let parent = part.offsetParent as HTMLElement | null; parent !== null && parent !== folder; parent = parent.offsetParent as HTMLElement | null) {
        x += parent.offsetLeft;
        y += parent.offsetTop;
      }
      left = Math.min(left, x);
      top = Math.min(top, y);
      right = Math.max(right, x + part.offsetWidth);
      bottom = Math.max(bottom, y + part.offsetHeight);
    }
  }
  if (!Number.isFinite(left)) {
    return { width: first.offsetWidth, height: first.offsetHeight, label: { x: 0, y: 0, width: first.offsetWidth, height: 28 } };
  }
  return {
    width: first.offsetWidth,
    height: first.offsetHeight,
    label: { x: left, y: top, width: right - left, height: bottom - top },
  };
}

export default function Floor({ layout, filesHref }: FloorProps) {
  const rootRef = useRef<HTMLElement>(null);
  const files = layout.pile;
  const openedIds = new Set(layout.folders.filter(f => f.place.kind === 'pile' && f.place.opened).map(f => f.evidence.id));
  const numberOf = new Map(layout.folders.map(folder => [folder.evidence.id, folder.number]));
  const order = files.map(evidence => evidence.id).join(',');

  useEffect(() => {
    const root = rootRef.current;
    if (root === null) {
      return;
    }
    const canQuery = typeof window.matchMedia === 'function';
    const reduced = !canQuery || window.matchMedia(MOTION_QUERIES.reduced).matches;
    const finePointer = canQuery && window.matchMedia(FINE_HOVER).matches;
    const folders = () => [...root.querySelectorAll<HTMLElement>('[data-board="folder"]')];
    /** Where each folder lies now: its scale and stacking, so a hover can come back to them. */
    const resting = new Map<string, { scale: number; z: number }>();
    const known = new Set<string>();
    let placed = false;

    const place = () => {
      const list = folders();
      const width = root.clientWidth;
      const height = root.clientHeight;
      const box = measureFolder(list);
      if (list.length === 0 || width === 0 || height === 0 || box === null) {
        return;
      }
      const { places, scale } = floorLayout(
        list.map(folder => folder.dataset.evidenceId ?? ''),
        { width, height },
        box
      );
      // Where they were, for the move: only the folders that were already on the floor.
      const before = !reduced && placed ? Flip.getState(list.filter(folder => known.has(folder.dataset.evidenceId ?? ''))) : null;
      for (const spot of places) {
        const folder = list.find(item => item.dataset.evidenceId === spot.id);
        if (folder !== undefined) {
          gsap.set(folder, { x: spot.x, y: spot.y, rotation: spot.rotate, scale, zIndex: spot.z });
          resting.set(spot.id, { scale, z: spot.z });
        }
      }
      if (before !== null) {
        Flip.from(before, { ...tween('layout'), scale: true, nested: false });
      }
      // A folder that has just come back to the floor fades in; the first placement of all fades in together.
      const arriving = list.filter(folder => !known.has(folder.dataset.evidenceId ?? ''));
      if (!reduced && arriving.length > 0) {
        gsap.fromTo(arriving, { opacity: 0 }, { opacity: 1, ...tween('paper.lift'), stagger: placed ? 0 : 0.015, clearProps: 'opacity' });
      }
      list.forEach(folder => known.add(folder.dataset.evidenceId ?? ''));
      placed = true;
      root.dataset.placed = 'true';
    };
    place();

    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(place) : null;
    observer?.observe(root);

    // The folder under the pointer lifts a little and comes to the top. Behind the hover media query.
    const lift = (folder: HTMLElement, up: boolean) => {
      const spot = resting.get(folder.dataset.evidenceId ?? '');
      if (spot === undefined) {
        return;
      }
      gsap.set(folder, { zIndex: up ? files.length + 10 : spot.z });
      gsap.to(folder, { scale: up ? spot.scale * LIFT : spot.scale, ...tween('hover'), overwrite: 'auto' });
    };
    const onOver = (event: PointerEvent) => {
      const folder = (event.target as Element).closest<HTMLElement>('[data-board="folder"]');
      if (folder !== null && !folder.contains(event.relatedTarget as Node | null)) {
        lift(folder, true);
      }
    };
    const onOut = (event: PointerEvent) => {
      const folder = (event.target as Element).closest<HTMLElement>('[data-board="folder"]');
      if (folder !== null && !folder.contains(event.relatedTarget as Node | null)) {
        lift(folder, false);
      }
    };
    // The desk's sound: the hand comes over the files.
    const onEnter = () => emitStoryEvent({ type: 'pile-hover' });
    root.addEventListener('pointerenter', onEnter);
    if (finePointer && !reduced) {
      root.addEventListener('pointerover', onOver);
      root.addEventListener('pointerout', onOut);
    }
    return () => {
      observer?.disconnect();
      root.removeEventListener('pointerenter', onEnter);
      root.removeEventListener('pointerover', onOver);
      root.removeEventListener('pointerout', onOut);
      gsap.killTweensOf(folders());
    };
    // The folders on the floor change with `order`; the effect places the new set.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order]);

  return (
    <section ref={rootRef} aria-labelledby="floor-title" data-board="floor" className="relative h-full w-full">
      <h3 id="floor-title" className="sr-only">
        The files on the floor
      </h3>
      <ol className="absolute inset-0 [&>li]:absolute [&>li]:top-0 [&>li]:left-0">
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
