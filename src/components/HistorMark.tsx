// src/components/HistorMark.tsx
// The Histor mark (quick fixes, 4), inline, in the current colour (cream on the night). Decorative unless labelled.
import { MARK_PATH, MARK_VIEWBOX } from '@/lib/brand';

export default function HistorMark({ className = '', label }: { className?: string; label?: string }) {
  return (
    <svg
      viewBox={MARK_VIEWBOX.join(' ')}
      className={className}
      data-histor-mark=""
      {...(label === undefined ? { 'aria-hidden': true } : { role: 'img', 'aria-label': label })}
    >
      <path fill="currentColor" fillRule="evenodd" d={MARK_PATH} />
    </svg>
  );
}
