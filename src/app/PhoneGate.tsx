// src/app/PhoneGate.tsx
// Shown instead of the investigation on a screen narrower than 1024px. The desk is built for a laptop; the gate
// says so plainly and lets the visitor go on anyway. Everything here is the app's own voice, so no case content.
interface PhoneGateProps {
  /** "Continue anyway": show the investigation as it is on a small screen. */
  onContinue: () => void;
}

export default function PhoneGate({ onContinue }: PhoneGateProps) {
  return (
    <main
      data-page="case"
      data-phone-gate=""
      className="flex min-h-svh flex-col items-center justify-center gap-6 bg-night px-6 pt-[calc(var(--case-header)+2rem)] pb-12 text-center"
    >
      <h2 className="max-w-[16ch] font-legend text-[clamp(2rem,1.4rem+3vw,3.5rem)] leading-[1.05] text-balance text-night-ink">
        This case is too big for a small screen.
      </h2>
      <p className="max-w-[28ch] font-voice text-[1.0625rem] leading-relaxed text-ghost-night">
        Open Histor on a laptop to investigate.
      </p>
      <button
        type="button"
        onClick={onContinue}
        className="inline-flex min-h-11 items-center px-3 font-voice text-sm tracking-[0.1em] text-night-ink underline underline-offset-4 transition-[color] duration-(--motion-hover-duration) ease-(--motion-hover-ease) hover:text-brass focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brass"
      >
        Continue anyway
      </button>
    </main>
  );
}
