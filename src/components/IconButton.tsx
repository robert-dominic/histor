// src/components/IconButton.tsx
// A round icon button with a tooltip (ui-pass brief, 3): resting on it with a mouse, or reaching it with the keyboard,
// shows a small paper label after a short delay (about 400ms); leaving, blurring, pressing or Escape hides it. The
// button's aria-label carries the same words, so the label itself stays out of the accessibility tree.
import { useId, type ButtonHTMLAttributes, type ReactNode, type Ref } from 'react';
import { useTooltip } from '@/lib/use-tooltip';

interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  /** What it does: its aria-label and its tooltip. */
  label: string;
  /** What the tooltip says, when it is not the label (the music button names the track playing). */
  tip?: string;
  icon: ReactNode;
  /** Keeps the tooltip away (its menu is open). */
  quiet?: boolean;
  /** Where the tooltip sits. */
  tipSide?: 'below' | 'above';
  ref?: Ref<HTMLButtonElement>;
}

export default function IconButton({ label, tip: tipText, icon, quiet = false, tipSide = 'below', className = '', ref, onPointerEnter, onPointerLeave, onFocus, onBlur, onPointerDown, ...rest }: IconButtonProps) {
  const { tip, handlers } = useTooltip();
  const id = useId();
  const shown = tip && !quiet;
  return (
    <span className="relative inline-flex">
      <button
        ref={ref}
        type="button"
        aria-label={label}
        {...rest}
        onPointerEnter={event => {
          handlers.onPointerEnter(event);
          onPointerEnter?.(event);
        }}
        onPointerLeave={event => {
          handlers.onPointerLeave();
          onPointerLeave?.(event);
        }}
        onPointerDown={event => {
          handlers.onPointerDown();
          onPointerDown?.(event);
        }}
        onFocus={event => {
          handlers.onFocus(event);
          onFocus?.(event);
        }}
        onBlur={event => {
          handlers.onBlur();
          onBlur?.(event);
        }}
        className={`grid size-10 place-items-center rounded-full text-night-ink/85 transition-[scale,color,background-color] duration-(--motion-hover-duration) ease-(--motion-hover-ease) hover:bg-night-ink/10 hover:text-night-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass active:scale-[0.94] ${className}`}
      >
        {icon}
      </button>
      <span
        id={id}
        aria-hidden="true"
        data-tooltip=""
        data-shown={shown}
        className={`desk-slip pointer-events-none absolute right-0 z-50 rounded-[2px] px-2.5 py-1 font-voice text-[0.75rem] whitespace-nowrap text-ink opacity-0 shadow-md shadow-black/40 transition-[opacity,translate] duration-(--motion-hover-duration) ease-(--motion-hover-ease) data-[shown=true]:translate-y-0 data-[shown=true]:opacity-100 ${
          tipSide === 'below' ? 'top-[calc(100%+0.4rem)] -translate-y-1' : 'bottom-[calc(100%+0.4rem)] translate-y-1'
        }`}
      >
        {tipText ?? label}
      </span>
    </span>
  );
}
