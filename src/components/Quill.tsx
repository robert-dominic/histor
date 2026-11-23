// src/components/Quill.tsx
// The quill that writes the legend's voice: the myth, the case title and the chapter headings.
// It renders a zero-sized point with the drawing of a quill hanging from it, nib on the point.
// src/lib/quill-writing.ts moves the point to the letter being written.
// Place it as a direct child of the positioned element that the text sits in.

interface QuillProps {
  /** Attribute that marks the point, so the animation can find it, e.g. `data-legend`. */
  attribute: string;
  /** Tailwind height class for the drawing. */
  sizeClassName?: string;
  /** Tailwind colour class for the quill: light at night, dark ink on paper. */
  toneClassName?: string;
}

export default function Quill({ attribute, sizeClassName = 'h-[clamp(2.75rem,5.5vw,4.25rem)]', toneClassName = 'text-night-ink' }: QuillProps) {
  return (
    <div
      {...{ [attribute]: 'quill' }}
      aria-hidden="true"
      className="pointer-events-none absolute top-0 left-0 z-10 h-0 w-0"
    >
      <svg
        {...{ [attribute]: 'quill-body' }}
        viewBox="0 0 48 48"
        fill="none"
        className={`absolute bottom-0 left-0 w-auto origin-bottom-left opacity-0 ${toneClassName} ${sizeClassName}`}
      >
        {/* Vane */}
        <path
          d="M45 2C33 4 22 11 16 22c-2 4-3 8-3 11l4-3c-1 3-1 5 0 7 9-3 17-10 22-19 3-5 5-11 6-16Z"
          fill="currentColor"
          fillOpacity="0.9"
        />
        {/* Splits in the vane */}
        <path d="M29 12l-3 6M36 10l-4 9M24 20l-2 6" stroke="var(--color-night)" strokeWidth="0.9" strokeLinecap="round" />
        {/* Shaft */}
        <path d="M41 6C30 16 18 29 8 40" stroke="var(--color-night)" strokeWidth="1" strokeLinecap="round" />
        {/* Nib */}
        <path d="M13 34L1.5 46.5l2.2-9.2Z" fill="currentColor" />
        <path d="M8 40L2 46" stroke="var(--color-night)" strokeWidth="0.8" strokeLinecap="round" />
      </svg>
    </div>
  );
}
