// src/components/icons.tsx
// Line icons in the site's style (ui-pass brief, 3): one ink stroke, about 1.5px, round ends, on a 24px grid, so they
// sit together in a row at one size. Decorative: the button around each says what it does.
import type { ReactNode } from 'react';

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="size-5">
      {children}
    </svg>
  );
}

/** A sheet with an arrow down into a tray: download the report. */
export function DownloadIcon() {
  return (
    <Icon>
      <path d="M12 4v10.5M7.5 10l4.5 4.5 4.5-4.5" />
      <path d="M5 15.5V19h14v-3.5" />
    </Icon>
  );
}

/** An arrow up out of a box: share. */
export function ShareIcon() {
  return (
    <Icon>
      <path d="M12 15V4M8 7.5L12 4l4 3.5" />
      <path d="M8.5 11H6v9h12v-9h-2.5" />
    </Icon>
  );
}

/** A framed picture: save the card image. */
export function ImageIcon() {
  return (
    <Icon>
      <rect x="4" y="5.5" width="16" height="13" rx="1" />
      <path d="M4.5 16l4.5-4.5 3.5 3.5 2.5-2.5 4.5 4.5" />
      <circle cx="15.5" cy="9.5" r="1.3" />
    </Icon>
  );
}

/** Two links of a chain: copy the link. */
export function LinkIcon() {
  return (
    <Icon>
      <path d="M10.5 13.5a3.5 3.5 0 0 0 5 0l3-3a3.5 3.5 0 0 0-5-5l-1 1" />
      <path d="M13.5 10.5a3.5 3.5 0 0 0-5 0l-3 3a3.5 3.5 0 0 0 5 5l1-1" />
    </Icon>
  );
}

/** An arrow up to a line: back to the top. */
export function ArrowUpIcon() {
  return (
    <Icon>
      <path d="M12 19V7M7 11.5L12 6.5l5 5" />
      <path d="M6 4h12" />
    </Icon>
  );
}

/** An ⓘ: credits and sources. */
export function InfoIcon() {
  return (
    <Icon>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11v5.5" />
      <circle cx="12" cy="7.8" r="0.4" fill="currentColor" />
    </Icon>
  );
}

/** A note with a beam: music. */
export function MusicIcon() {
  return (
    <Icon>
      <path d="M9 18V6l10-2v12" />
      <circle cx="6.5" cy="18" r="2.5" />
      <circle cx="16.5" cy="16" r="2.5" />
    </Icon>
  );
}
