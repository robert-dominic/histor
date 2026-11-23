// src/features/board/InnerCover.tsx
// The inside of a folder's front cover: manila, with a typed label ("HISTOR · CASE FILE 07 · THE GALLEY") and a
// small index card listing the file's sources by title, linked where the source has an address.
// On a desktop it is the back of the cover that flips open, on the left; on phones it sits above the document.

import type { Source } from '@/types/case';

interface InnerCoverProps {
  /** The typed label, e.g. "Histor · Case file 07 · The galley". Set in capitals by CSS. */
  label: string;
  sources: Source[];
}

export default function InnerCover({ label, sources }: InnerCoverProps) {
  return (
    <div className="flex flex-col gap-6 px-5 pt-5 pb-6 sm:px-8 sm:pt-7 lg:pb-10">
      {/* The typed label, on a paper strip stuck to the manila. */}
      <p
        data-file="label"
        className="self-start rounded-[1px] bg-paper/85 px-3 py-1.5 font-voice text-[0.8125rem] leading-snug tracking-[0.14em] text-ink uppercase shadow-[0_1px_2px] shadow-black/25"
      >
        {label}
      </p>

      {sources.length > 0 && (
        <section
          data-file="index-card"
          aria-labelledby="file-sources"
          className="desk-index-card max-w-sm -rotate-1 rounded-[2px] px-4 pt-3 pb-4 text-ink shadow-[0_2px_6px] shadow-black/35"
        >
          <h3 id="file-sources" className="font-voice text-[0.6875rem] tracking-[0.18em] text-rust uppercase">
            Sources
          </h3>
          <ul className="mt-2 flex flex-col gap-1.5 font-record text-[0.9375rem] leading-snug lg:text-[1.0625rem]">
            {sources.map(source => (
              <li key={source.id}>
                {source.url !== undefined && source.url.trim() !== '' ? (
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-[0.12em] text-record underline decoration-record/45 underline-offset-[0.2em] transition-[text-decoration-color] duration-150 ease-out hover:decoration-record focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass"
                  >
                    {source.title}
                  </a>
                ) : (
                  <span>{source.title}</span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
