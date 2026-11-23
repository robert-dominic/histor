// src/features/board/desk-outlet.ts
// What the desk hands to the screen it shows over itself (an open file, through the router's Outlet).
import { useOutletContext } from 'react-router-dom';

export interface DeskOutlet {
  /** Forgets where the player dropped a file on the floor: it goes back to its own spot ("Back to the floor"). */
  forgetFloorSpot: (evidenceId: string) => void;
}

/** The desk's outlet context, or null outside a desk (an open file rendered on its own, in a test). */
export function useDeskOutlet(): DeskOutlet | null {
  return useOutletContext<DeskOutlet | undefined>() ?? null;
}
