// src/features/verdict/ReportSection.tsx
// One section of the case report: a heading in the app's voice, then its content.

import type { ReactNode } from 'react';

interface ReportSectionProps {
  /** Short id for the section, used for its heading id and its `data-report` attribute. */
  name: string;
  heading: string;
  children: ReactNode;
}

export default function ReportSection({ name, heading, children }: ReportSectionProps) {
  return (
    <section data-report={name} aria-labelledby={`report-${name}`} className="border-t border-ink/15 pt-6">
      <h3 id={`report-${name}`} className="font-voice text-[0.8125rem] tracking-[0.2em] text-ink/80 uppercase">
        {heading}
      </h3>
      <div className="mt-3">{children}</div>
    </section>
  );
}
