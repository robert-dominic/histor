// src/features/board/DeskHintsProvider.tsx
// Runs the first-visit hints. They go one at a time: the pile, the Pin menu, the progress line. The step follows
// what the user does (opening a file, pinning one), and the flag is saved once the third has shown.
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useInvestigation } from '@/app/InvestigationProvider';
import {
  DeskHintsContext,
  rememberShownThisLoad,
  wasShownThisLoad,
  type DeskHintsApi,
  type HintStep,
} from '@/features/board/hints';
import { canDrag } from '@/features/board/drag';
import { hasSeenDeskHints, markDeskHintsSeen } from '@/lib/desk-hints';
import type { InvestigationState } from '@/types/case';

/** Where in the hints a visit starts: someone who already opened or pinned files skips what they have done. */
function startStep(state: InvestigationState): HintStep {
  if (Object.keys(state.pins).length > 0) {
    return 3;
  }
  return state.opened.length > 0 ? 2 : 1;
}

type LastInput = 'pointer' | 'touch' | 'key';

export default function DeskHintsProvider({ children }: { children: ReactNode }) {
  const { state, caseData } = useInvestigation();
  const caseId = caseData.id;
  const [started] = useState(() => !hasSeenDeskHints(caseId) && !wasShownThisLoad(caseId));
  const [chosenStep, setStep] = useState<HintStep>(() => (started ? startStep(state) : 4));
  const lastInput = useRef<LastInput>('pointer');
  const pinned = Object.keys(state.pins).length > 0;

  // The first pin moves on to the last hint.
  const step: HintStep = started && pinned && chosenStep < 3 ? 3 : chosenStep;

  // The last hint, once shown, is the last: remember it, and let the user's next action put it away.
  useEffect(() => {
    if (step !== 3) {
      return;
    }
    markDeskHintsSeen(caseId);
    rememberShownThisLoad(caseId);
    const putAway = () => setStep(4);
    window.addEventListener('pointerdown', putAway, { once: true, capture: true });
    window.addEventListener('keydown', putAway, { once: true, capture: true });
    return () => {
      window.removeEventListener('pointerdown', putAway, { capture: true });
      window.removeEventListener('keydown', putAway, { capture: true });
    };
  }, [step, caseId]);

  // What the user last used decides hint 2's wording: a pointer can drag, a finger or a key pins.
  useEffect(() => {
    if (step === 4) {
      return;
    }
    const handlePointer = (event: PointerEvent) => {
      lastInput.current = event.pointerType === 'mouse' || event.pointerType === 'pen' || event.pointerType === '' ? 'pointer' : 'touch';
    };
    const handleKey = () => {
      lastInput.current = 'key';
    };
    window.addEventListener('pointerdown', handlePointer, true);
    window.addEventListener('keydown', handleKey, true);
    return () => {
      window.removeEventListener('pointerdown', handlePointer, true);
      window.removeEventListener('keydown', handleKey, true);
    };
  }, [step]);

  const reachPinMenu = useCallback(() => setStep(current => (current < 2 ? 2 : current)), []);
  const wantsDrag = useCallback(() => canDrag() && lastInput.current === 'pointer', []);

  const api: DeskHintsApi = {
    step,
    active: started,
    threshold: caseData.closeThreshold,
    reachPinMenu,
    wantsDrag,
  };
  return <DeskHintsContext.Provider value={api}>{children}</DeskHintsContext.Provider>;
}
