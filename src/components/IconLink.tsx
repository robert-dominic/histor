// src/components/IconLink.tsx
// An icon that goes somewhere (the fix list: the report's ⓘ "Credits & sources"): a round link with the same tooltip
// as the icon buttons (use-tooltip.ts), its aria-label the same words.
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useTooltip } from '@/lib/use-tooltip';

export default function IconLink({ to, label, icon, ...rest }: { to: string; label: string; icon: ReactNode; 'data-result'?: string }) {
  const { tip, handlers } = useTooltip();
  return (
    <span className="relative inline-flex">
      <Link
        to={to}
        aria-label={label}
        {...rest}
        {...handlers}
        className="grid size-10 place-items-center rounded-full text-night-ink/85 transition-[scale,color,background-color] duration-(--motion-hover-duration) ease-(--motion-hover-ease) hover:bg-night-ink/10 hover:text-night-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass active:scale-[0.94]"
      >
        {icon}
      </Link>
      <span
        aria-hidden="true"
        data-tooltip=""
        data-shown={tip}
        className="desk-slip deckle-2 pointer-events-none absolute top-[calc(100%+0.4rem)] right-0 z-50 -translate-y-1 rounded-[2px] px-2.5 py-1 font-voice text-[0.75rem] whitespace-nowrap text-ink opacity-0 shadow-md shadow-black/40 transition-[opacity,translate] duration-(--motion-hover-duration) ease-(--motion-hover-ease) data-[shown=true]:translate-y-0 data-[shown=true]:opacity-100"
      >
        {label}
      </span>
    </span>
  );
}
