// src/features/board/PinHint.tsx
// The second hint, beside the Pin menu in the open file: drag it, or pin it. Shown only while the hints are on
// that step, so the first file of a first visit gets it and no other.
import HintLine from '@/features/board/HintLine';
import { hintText, useDeskHints } from '@/features/board/hints';

export default function PinHint() {
  const hints = useDeskHints();
  if (hints === null || hints.step !== 2) {
    return null;
  }
  return (
    <div role="status" data-hint="pin" className="mt-3">
      <HintLine text={hintText(2, { threshold: hints.threshold, drag: hints.wantsDrag() })} tone="paper" />
    </div>
  );
}
