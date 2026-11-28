// src/features/story/PenText.tsx
// A paragraph of a chapter's page, split for the pen by React itself: each word, and each letter inside it, is its
// own span, so the pen can write them one at a time (Story.tsx). A {{ref:…}} is one word and one unit, its portal
// trigger whole inside it, so portal names stay clickable in the written text. A weighted phrase (`emphasis`) is
// wrapped so the pen can breathe before it, write it a touch slower, and leave it slightly brighter.
// For the eyes only: the full text is elsewhere for screen readers.
import { Fragment } from 'react';
import PortalText from '@/features/portals/PortalText';
import { parseRefs } from '@/lib/parse-refs';
import { splitInline } from '@/lib/inline-markup';
import { weightedPieces } from '@/lib/story-emphasis';

/** Words and the spaces between them, in order. */
function tokens(text: string): string[] {
  return text.split(/(\s+)/).filter(token => token !== '');
}

function Units({ text }: { text: string }) {
  return (
    <>
      {parseRefs(text).map((segment, index) =>
        segment.kind === 'ref' ? (
          <span key={index} data-pen="word">
            <span data-pen="char" data-pen-whole="">
              <PortalText text={segment.raw} tabbable={false} />
            </span>
          </span>
        ) : (
          tokens(segment.text).map((token, tokenIndex) =>
            /^\s+$/.test(token) ? (
              <Fragment key={`${index}-${tokenIndex}`}>{token}</Fragment>
            ) : (
              <span key={`${index}-${tokenIndex}`} data-pen="word">
                {[...token].map((letter, letterIndex) => (
                  <span key={letterIndex} data-pen="char">
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

/** One run of the paragraph, with its weighted phrases. */
function Run({ text, emphasis }: { text: string; emphasis?: string[] }) {
  return (
    <>
      {weightedPieces(text, emphasis).map((piece, index) =>
        piece.weighted ? (
          <span key={index} data-pen="weighted" className="text-night-ink [text-shadow:0_0_14px_rgb(230_225_211/0.28)]">
            <Units text={piece.text} />
          </span>
        ) : (
          <Units key={index} text={piece.text} />
        )
      )}
    </>
  );
}

/** A paragraph: **bold** and *italic* runs wrapped, lines kept (the page shows them with `whitespace-pre-line`). */
export default function PenText({ text, emphasis }: { text: string; emphasis?: string[] }) {
  return (
    <>
      {splitInline(text).map((part, index) =>
        part.style === 'bold' ? (
          <strong key={index} className="font-semibold">
            <Run text={part.text} emphasis={emphasis} />
          </strong>
        ) : part.style === 'italic' ? (
          <em key={index}>
            <Run text={part.text} emphasis={emphasis} />
          </em>
        ) : (
          <Run key={index} text={part.text} emphasis={emphasis} />
        )
      )}
    </>
  );
}
