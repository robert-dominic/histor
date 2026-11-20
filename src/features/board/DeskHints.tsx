// src/features/board/DeskHints.tsx
// The hints that sit on the desk itself: "Open a file from the pile." beside the pile, and the close-the-case
// line beside the progress line. The second hint lives in the open file, beside the Pin menu (PinHint.tsx).
// The row is a live region that keeps its height for the whole first visit, so nothing on the desk moves when a
// hint comes or goes (a shift between pressing a folder and releasing it could miss the click).
import HintLine from '@/features/board/HintLine';
import { hintText, useDeskHints } from '@/features/board/hints';

export default function DeskHints() {
  const hints = useDeskHints();
  if (hints === null || !hints.active) {
    return null;
  }
  const text =
    hints.step === 1 || hints.step === 3 ? hintText(hints.step, { threshold: hints.threshold, drag: false }) : null;
  return (
    // Above the lamp's shadow, like the progress line: a hint must always be readable.
    <div role="status" data-hint="desk" className="relative z-[21] mt-2 min-h-8">
      {text !== null && <HintLine key={hints.step} text={text} tone="night" />}
    </div>
  );
}
