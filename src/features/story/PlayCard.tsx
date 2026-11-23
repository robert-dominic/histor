// src/features/story/PlayCard.tsx
// The small card at the bottom centre that offers "Play the story" or "Read at my pace". It slides up after the
// reader's first scroll past the opening scene, and goes away when either is chosen. It never waits for an answer:
// if the reader keeps scrolling while it is shown (`AUTO_LEAVE` of a screen past where it appeared), it slides away
// by itself, and that counts as "Read at my pace" (scrolling is the answer). It is not a dialog: it takes
// no layout space, does not lock the scroll and sits over nothing that has to stay clickable (it leaves again when
// the story is behind the reader). It shows once per visit until it is chosen, and never under reduced motion,
// where there is nothing to play.
import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import gsap from 'gsap';
import type { StoryPlayer } from '@/features/story/use-story-player';
import { tween } from '@/lib/motion';

const CHOICE_CLASSES =
  'inline-flex min-h-11 items-center justify-center rounded-sm px-5 font-voice text-sm tracking-[0.14em] uppercase transition-[scale,background-color,color,border-color] duration-(--motion-hover-duration) ease-(--motion-hover-ease) focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brass active:scale-[0.97]';

interface PlayCardProps {
  /** Null under reduced motion: there is nothing to play, so no card. */
  player: StoryPlayer | null;
  /** "Read at my pace": goes to the first scene. */
  onRead: () => void;
  /** The story's root: the opening scene is found inside it. */
  storyRef: RefObject<HTMLElement | null>;
}

/** How far the reader scrolls on while the card is shown, as a share of the screen's height, before it leaves. */
export const AUTO_LEAVE = 0.6;

/** True once the reader has scrolled into the story: its top has reached the top of the screen. */
function pastOpening(story: HTMLElement): boolean {
  return story.getBoundingClientRect().top <= 0;
}

/** True once the story is mostly behind the reader: the card leaves, so it never sits over the fork. */
function pastStory(story: HTMLElement): boolean {
  return story.getBoundingClientRect().bottom < window.innerHeight * 0.3;
}

export default function PlayCard({ player, onRead, storyRef }: PlayCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const shownRef = useRef(false);
  const chosenRef = useRef(false);
  const [gone, setGone] = useState(false);
  const active = player !== null && !gone;

  /** Sends the card away, then does what was chosen. */
  const choose = useCallback((action: () => void) => {
    chosenRef.current = true;
    gsap.killTweensOf(cardRef.current);
    gsap.to(cardRef.current, {
      autoAlpha: 0,
      y: 12,
      ...tween('ink.out'),
      onComplete: () => setGone(true),
    });
    action();
  }, []);

  useEffect(() => {
    const story = storyRef.current;
    const card = cardRef.current;
    if (!active || story === null || card === null) {
      return;
    }
    /** Where the page was scrolled when the card last appeared. */
    let shownAt = 0;
    const slide = (show: boolean) => {
      if (shownRef.current === show || chosenRef.current) {
        return;
      }
      shownRef.current = show;
      gsap.killTweensOf(card);
      if (show) {
        shownAt = window.scrollY;
        gsap.fromTo(card, { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, ...tween('paper.lift') });
      } else {
        gsap.to(card, { autoAlpha: 0, y: 12, ...tween('ink.out') });
      }
    };
    const check = () => {
      // Scrolling on is the answer: "Read at my pace". The card slides away and does not come back.
      if (shownRef.current && !chosenRef.current && window.scrollY - shownAt > window.innerHeight * AUTO_LEAVE) {
        choose(() => undefined);
        return;
      }
      slide(pastOpening(story) && !pastStory(story));
    };
    window.addEventListener('scroll', check, { passive: true });
    check();
    return () => {
      window.removeEventListener('scroll', check);
      gsap.killTweensOf(card);
    };
  }, [active, storyRef, choose]);

  if (!active) {
    return null;
  }


  return (
    <div
      ref={cardRef}
      data-story="play-card"
      role="group"
      aria-label="How to read the story"
      // Hidden until the first scroll past the opening (GSAP writes opacity and visibility).
      style={{ opacity: 0, visibility: 'hidden' }}
      className="fixed bottom-[calc(max(1rem,env(safe-area-inset-bottom))+3.75rem)] left-1/2 z-30 flex w-[min(22rem,calc(100vw-1.5rem))] -translate-x-1/2 flex-col items-center gap-3 rounded-sm border border-night-ink/20 bg-night/90 px-4 pt-4 pb-3.5 text-center text-night-ink shadow-xl shadow-black/50 sm:bottom-3 sm:w-[36rem] sm:flex-row sm:justify-between sm:gap-5 sm:py-2"
    >
      <p data-story="hint" className="font-voice text-[0.9375rem] tracking-[0.04em]">
        Scroll, or press play.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 sm:flex-nowrap">
        <button
          type="button"
          data-story-control=""
          onClick={() => choose(() => player?.play())}
          className={`${CHOICE_CLASSES} border border-brass text-brass hover:bg-brass hover:text-night`}
        >
          Play the story
        </button>
        <button
          type="button"
          data-story-control=""
          onClick={() => choose(onRead)}
          className={`${CHOICE_CLASSES} underline underline-offset-4 opacity-85 hover:opacity-100`}
        >
          Read at my pace
        </button>
      </div>
    </div>
  );
}
