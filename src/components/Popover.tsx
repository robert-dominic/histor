// src/components/Popover.tsx
// The one popover panel (ui-pass brief, 4), used by the header's volume controls and the Share menu, so they are all
// alike: paper (`.popover-paper`: a faint border, uneven corners, a soft shadow), at least 14px inside. It opens with a
// small rise and fade (`paper.lift`) and closes quicker (`QUICK_OUT`, the `ink.out` ease), staying drawn until it has
// gone. Reduced motion: it fades only. Its place (above, below, which side) comes from `className`.
import { useState, type HTMLAttributes, type Ref } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { MOTION_QUERIES, QUICK_OUT, tween } from '@/lib/motion';

gsap.registerPlugin(useGSAP);

interface PopoverProps extends HTMLAttributes<HTMLDivElement> {
  open: boolean;
  /** Which way it rises from: from below (it opens under its trigger) or from above. */
  from?: 'below' | 'above';
  ref?: Ref<HTMLDivElement>;
}

export default function Popover({ open, from = 'below', className = '', ref, children, ...rest }: PopoverProps) {
  const [panel, setPanel] = useState<HTMLDivElement | null>(null);
  // Drawn while open, and until it has finished leaving.
  const [shown, setShown] = useState(open);
  if (open && !shown) {
    setShown(true);
  }
  // Where nothing can animate (no matchMedia), it simply goes.
  if (!open && shown && typeof window !== 'undefined' && typeof window.matchMedia !== 'function') {
    setShown(false);
  }

  useGSAP(
    () => {
      if (panel === null) {
        return;
      }
      const reduced = typeof window.matchMedia !== 'function' || window.matchMedia(MOTION_QUERIES.reduced).matches;
      const rise = from === 'below' ? -6 : 6;
      if (open) {
        gsap.fromTo(panel, reduced ? { opacity: 0 } : { opacity: 0, y: rise, scale: 0.97 }, { opacity: 1, y: 0, scale: 1, ...tween('paper.lift'), overwrite: true });
      } else {
        gsap.to(panel, { opacity: 0, ...(reduced ? {} : { y: rise / 2 }), ...QUICK_OUT, overwrite: true, onComplete: () => setShown(false) });
      }
    },
    { dependencies: [open, panel] }
  );

  if (!shown) {
    return null;
  }
  return (
    <div
      {...rest}
      ref={element => {
        setPanel(element);
        if (typeof ref === 'function') {
          ref(element);
        } else if (ref != null) {
          ref.current = element;
        }
      }}
      data-popover=""
      data-open={open}
      className={`popover-paper absolute z-40 p-3.5 ${className}`}
    >
      {children}
    </div>
  );
}
