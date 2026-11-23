// src/features/board/Floor.tsx
// The floor of the desktop desk: the files lie flat in rows on the table, seen from above, each a little off its
// spot and slightly tilted, none covering another. Where each one lies comes from `floorLayout` (lib/floor.ts),
// worked out once for every file of the case and the floor's size, so the same every visit. A file that was opened
// but not pinned lies here too, with its status stamp.
// Nothing moves by itself: opening, closing or pinning a file never moves another. A pinned file leaves a gap; a file
// sent back returns to its own spot, or to where the player dropped it. Dropping a folder somewhere else on the floor
// moves only that folder, and the desk keeps the spot in storage (lib/floor-positions.ts).
// Positions are written to the folders by GSAP, never through React state. When the floor changes size, the folders
// move to their new places with Flip (the `layout` token). Reduced motion: the folders are simply placed.
import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import Folder from '@/features/board/Folder';
import type { DropOutcome } from '@/features/board/drag';
import { createDeskDrag } from '@/features/board/use-desk-drag';
import { Flip, pendingFlight } from '@/features/board/flight';
import { droppedSpot, floorLayout, placeOnFloor, type DroppedSpot, type FloorPlace, type FolderBox } from '@/lib/floor';
import type { DeskLayout } from '@/lib/desk';
import { MOTION_QUERIES, tween } from '@/lib/motion';
import type { Theory } from '@/types/case';
import { emitStoryEvent } from '@/lib/story-events';

/** How much a folder grows when it lifts under the pointer. */
const LIFT = 1.04;
/** The hover media query of the design: a mouse or trackpad. */
const FINE_HOVER = '(hover: hover) and (pointer: fine)';

interface FloorProps {
  layout: DeskLayout;
  filesHref: string;
  theories: Theory[];
  /** Folders the player dropped on the floor, in the order they were dropped. Held (and stored) by the desk. */
  dropped: ReadonlyMap<string, DroppedSpot>;
  /** A folder was dropped somewhere on the floor: the desk remembers the spot. */
  onRearrange: (id: string, spot: DroppedSpot) => void;
  /** A folder was dropped somewhere other than the floor: the desk opens it, or pins it. */
  onDrop: (id: string, outcome: DropOutcome, element: HTMLElement) => void;
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
  for (const part of first.querySelectorAll<HTMLElement>('[data-folder="tab"], [data-folder="label"]')) {
    let x = part.offsetLeft;
    let y = part.offsetTop;
    for (let parent = part.offsetParent as HTMLElement | null; parent !== null && parent !== first; parent = parent.offsetParent as HTMLElement | null) {
      x += parent.offsetLeft;
      y += parent.offsetTop;
    }
    left = Math.min(left, x);
    top = Math.min(top, y);
    right = Math.max(right, x + part.offsetWidth);
    bottom = Math.max(bottom, y + part.offsetHeight);
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

export default function Floor({ layout, filesHref, theories, dropped, onRearrange, onDrop }: FloorProps) {
  const onDropRef = useRef(onDrop);
  const onRearrangeRef = useRef(onRearrange);
  useEffect(() => {
    onDropRef.current = onDrop;
    onRearrangeRef.current = onRearrange;
  }, [onDrop, onRearrange]);
  const rootRef = useRef<HTMLElement>(null);
  const files = layout.pile;
  const openedIds = new Set(layout.folders.filter(f => f.place.kind === 'pile' && f.place.opened).map(f => f.evidence.id));
  const numberOf = new Map(layout.folders.map(folder => [folder.evidence.id, folder.number]));
  // Every file of the case has a spot, on the floor now or not: the spots never depend on which files are here.
  const allIds = layout.folders.map(folder => folder.evidence.id);
  const allKey = allIds.join(',');
  const order = files.map(evidence => evidence.id).join(',');
  /** Where each folder on the floor rests now, so a hover or a drop can come back to it. Survives a change of files. */
  const resting = useRef(new Map<string, FloorPlace & { scale: number }>());
  /** The floor's size and folder box the folders were last placed for. */
  const placedFor = useRef<{ width: number; height: number; box: FolderBox } | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (root === null) {
      return;
    }
    const canQuery = typeof window.matchMedia === 'function';
    const reduced = !canQuery || window.matchMedia(MOTION_QUERIES.reduced).matches;
    const finePointer = canQuery && window.matchMedia(FINE_HOVER).matches;
    const folders = () => [...root.querySelectorAll<HTMLElement>('[data-board="folder"]')];
    const idOf = (folder: HTMLElement) => folder.dataset.evidenceId ?? '';
    const ids = allKey === '' ? [] : allKey.split(',');

    /** Where every folder of the case lies on this floor, for the folder box measured. */
    const placesFor = (width: number, height: number, box: FolderBox) => {
      const plan = floorLayout(ids, { width, height }, box);
      return { scale: plan.scale, places: placeOnFloor(plan, { width, height }, box, dropped) };
    };

    const place = () => {
      const list = folders();
      const width = root.clientWidth;
      const height = root.clientHeight;
      const box = measureFolder(list) ?? placedFor.current?.box ?? null;
      if (list.length === 0 || width === 0 || height === 0 || box === null) {
        return;
      }
      const before = placedFor.current;
      const resized = before !== null && (before.width !== width || before.height !== height);
      const { places, scale } = placesFor(width, height, box);
      // Only a change of the floor's size moves folders that were already lying here; that move is a Flip.
      const lying = list.filter(folder => resting.current.has(idOf(folder)));
      const flip = !reduced && resized && lying.length > 0 ? Flip.getState(lying) : null;
      const arriving: HTMLElement[] = [];
      for (const folder of list) {
        const id = idOf(folder);
        const spot = places.find(candidate => candidate.id === id);
        if (spot === undefined) {
          continue;
        }
        const was = resting.current.get(id);
        if (was === undefined) {
          arriving.push(folder);
        }
        if (was === undefined || resized || was.x !== spot.x || was.y !== spot.y || was.scale !== scale) {
          gsap.set(folder, { x: spot.x, y: spot.y, rotation: spot.rotate, scale, zIndex: spot.z });
        }
        resting.current.set(id, { ...spot, scale });
      }
      // Folders that have left the floor (pinned) are forgotten, so they come back as arrivals.
      const here = new Set(list.map(idOf));
      for (const id of [...resting.current.keys()]) {
        if (!here.has(id)) {
          resting.current.delete(id);
        }
      }
      if (flip !== null) {
        Flip.from(flip, { ...tween('layout'), scale: true, nested: false });
      }
      // A folder that has just come back to the floor fades in; the first placement of all fades in together.
      // A folder arriving from a tab flies in with Flip (Desk.tsx): it must not fade as well.
      const flying = pendingFlight('out')?.id;
      const fading = arriving.filter(folder => idOf(folder) !== flying);
      if (!reduced && fading.length > 0) {
        gsap.fromTo(fading, { opacity: 0 }, { opacity: 1, ...tween('paper.lift'), stagger: before === null ? 0.015 : 0, clearProps: 'opacity' });
      }
      placedFor.current = { width, height, box };
      root.dataset.placed = 'true';
    };
    place();

    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(place) : null;
    observer?.observe(root);

    // Dragging, where a mouse can (a desktop with a fine pointer and full motion): a folder can be picked up and put
    // on a note, the tray, the board or the floor. What each drop does is decided by dropOutcome.
    const returnHome = (folder: HTMLElement) => {
      const spot = resting.current.get(idOf(folder));
      if (spot !== undefined) {
        gsap.to(folder, { x: spot.x, y: spot.y, scale: spot.scale, opacity: 1, ...tween('paper.move'), overwrite: 'auto', onComplete: () => { gsap.set(folder, { zIndex: spot.z }); } });
      }
    };
    const stopDragging = createDeskDrag({
      elements: folders(),
      theories,
      sourceOf: folder => ({ from: 'floor', sealed: folder.dataset.opened !== 'true' }),
      restingScale: folder => resting.current.get(idOf(folder))?.scale ?? 1,
      onDrop: (folder, outcome) => {
        const id = idOf(folder);
        const spot = resting.current.get(id);
        const frame = placedFor.current;
        if (spot === undefined) {
          return;
        }
        if (outcome.kind === 'return') {
          returnHome(folder);
        } else if (outcome.kind === 'settle' && frame !== null) {
          // It settles where it was let go, on top, and keeps its tilt. Only this folder moves.
          const size = { width: frame.width, height: frame.height };
          onRearrangeRef.current(id, droppedSpot(outcome.x + frame.box.width / 2, outcome.y + frame.box.height / 2, size));
          const now = placesFor(frame.width, frame.height, frame.box).places.find(candidate => candidate.id === id);
          if (now === undefined) {
            returnHome(folder);
            return;
          }
          resting.current.set(id, { ...now, scale: spot.scale });
          gsap.set(folder, { zIndex: now.z });
          gsap.to(folder, { x: now.x, y: now.y, scale: spot.scale, opacity: 1, ...tween('paper.land'), overwrite: 'auto' });
        } else {
          // Opened, or pinned: the desk takes it from here, from where it was let go. The folder's own place is kept
          // ready for when it comes back.
          onDropRef.current(id, outcome, folder);
          gsap.set(folder, { x: spot.x, y: spot.y, scale: spot.scale, opacity: 1, zIndex: spot.z });
        }
      },
    });

    // The folder under the pointer lifts a little and comes to the top. Behind the hover media query.
    const lift = (folder: HTMLElement, up: boolean) => {
      // A folder in the hand is not lifted by hovering.
      if (document.documentElement.dataset.dragging === 'true') {
        return;
      }
      const spot = resting.current.get(idOf(folder));
      if (spot === undefined) {
        return;
      }
      gsap.set(folder, { zIndex: up ? allIds.length * 2 + 10 : spot.z });
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
      stopDragging();
      observer?.disconnect();
      root.removeEventListener('pointerenter', onEnter);
      root.removeEventListener('pointerover', onOver);
      root.removeEventListener('pointerout', onOut);
      gsap.killTweensOf(folders());
    };
    // The folders on the floor change with `order`; the effect places the new ones and leaves the others be.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order, allKey]);

  return (
    <section
      ref={rootRef}
      aria-labelledby="floor-title"
      data-board="floor"
      data-drop-target="floor"
      className="relative h-full w-full"
    >
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
