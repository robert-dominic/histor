// src/features/story/StoryWords.tsx
// A chapter's hook, split for its entrance by React itself rather than measured and split afterwards: fast, the
// same on every render, and with every portal kept whole (a {{ref:…}} is one unit, its trigger inside).
// HookLetters keeps each word together and each letter on its own, so a hook's letters can start out of line and
// snap into place, then decay one at a time. Story.tsx animates `data-story="hook-char"`.
// The text is for the eyes only: the full text is elsewhere for screen readers.
import { Fragment } from 'react';
import PortalText from '@/features/portals/PortalText';
import { parseRefs } from '@/lib/parse-refs';

/** Words and the spaces between them, in order. */
function tokens(text: string): string[] {
  return text.split(/(\s+)/).filter(token => token !== '');
}

export function HookLetters({ text }: { text: string }) {
  return (
    <>
      {parseRefs(text).map((segment, index) =>
        segment.kind === 'ref' ? (
          <span key={index} data-story="hook-word" className="inline-block whitespace-nowrap">
            <span data-story="hook-char" className="inline-block">
              <PortalText text={segment.raw} tabbable={false} />
            </span>
          </span>
        ) : (
          tokens(segment.text).map((token, tokenIndex) =>
            /^\s+$/.test(token) ? (
              <Fragment key={`${index}-${tokenIndex}`}>{token}</Fragment>
            ) : (
              <span key={`${index}-${tokenIndex}`} data-story="hook-word" className="inline-block whitespace-nowrap">
                {[...token].map((letter, letterIndex) => (
                  <span key={letterIndex} data-story="hook-char" className="inline-block">
                    {letter}
                  </span>
                ))}
              </span>
            )
          )
        )
      )}
    </>
  );
}
