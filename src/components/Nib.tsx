// src/components/Nib.tsx
// A small dip-pen nib, about 24px, that writes a file's title when the file is first opened. It is the app's
// pen, on paper; the legend's quill (Quill.tsx) is the legend's voice, in the dark.
// Same contract as the quill: a zero-sized point, marked `attribute="quill"`, with the drawing hanging from it,
// marked `attribute="quill-body"`, its tip exactly on the point. src/lib/quill-writing.ts moves the point to the
// letter being written. Place it as a direct child of the positioned element that the text sits in.
interface NibProps {
  /** Attribute that marks the point, so the animation can find it, e.g. `data-file-nib`. */
  attribute: string;
}

export default function Nib({ attribute }: NibProps) {
  return (
    <div
      {...{ [attribute]: 'quill' }}
      aria-hidden="true"
      className="pointer-events-none absolute top-0 left-0 z-10 h-0 w-0"
    >
      <svg
        {...{ [attribute]: 'quill-body' }}
        viewBox="0 0 24 24"
        fill="none"
        className="absolute bottom-0 left-0 h-6 w-6 origin-bottom-left text-ink opacity-0"
      >
        {/* The holder. */}
        <path d="M23 1.5 12.5 12" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
        {/* The nib: a wedge with a slit and a breather hole, its tip on the bottom-left corner. */}
        <path d="M7 11.5 12.5 17 .6 23.4Z" fill="currentColor" />
        <path d="M6.2 17.2 2.6 21" stroke="var(--color-paper)" strokeWidth="0.7" strokeLinecap="round" />
        <circle cx="8.6" cy="14.6" r="0.9" fill="var(--color-paper)" />
      </svg>
    </div>
  );
}
