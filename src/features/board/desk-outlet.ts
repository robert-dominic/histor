// src/features/board/desk-outlet.ts
// What the desk hands to the screen it shows over itself (an open file, through the router's Outlet).
import { useOutletContext } from 'react-router-dom';

export interface DeskOutlet {
  /** Forgets where the player dropped a file on the floor: it goes back to its own spot ("Back to the floor"). */
  forgetFloorSpot: (evidenceId: string) => void;
  /**
   * Lays a file on the floor where it was let go (review-fixes brief, 4): `point` is the folder's centre on the screen;
   * the floor keeps it inside. `unpin` takes it off its theory or the tray first. Done at once (before the file
   * closes), so the floor has placed it by the time the folder flies home.
   */
  dropOnFloor: (evidenceId: string, point: { x: number; y: number }, unpin: boolean) => void;
}

/** The desk's outlet context, or null outside a desk (an open file rendered on its own, in a test). */
export function useDeskOutlet(): DeskOutlet | null {
  return useOutletContext<DeskOutlet | undefined>() ?? null;
}
