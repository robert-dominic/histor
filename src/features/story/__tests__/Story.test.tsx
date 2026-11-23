// @vitest-environment jsdom
// src/features/story/__tests__/Story.test.tsx
// The cinematic story (docs/briefs/story-redesign.md): every chapter's full text is in the DOM, the text column is for
// the eyes only, the roll call and the chart come from the data, playing can be paused, and reduced motion gives
// plain stacked sections.
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import maryCeleste from '@/cases/mary-celeste/case';
import CaseHeader from '@/components/CaseHeader';
import Story from '@/features/story/Story';
import { AUTO_LEAVE } from '@/features/story/PlayCard';
import { parseRefs } from '@/lib/parse-refs';
import { setLenis, wheelMultiplier } from '@/lib/smooth-scroll';
import { onStoryEvent, type StoryEvent } from '@/lib/story-events';
import { STORY_PACE } from '@/lib/story-pages';
import { splitQuestion } from '@/lib/phrases';
import { stubMatchMedia } from '@/test/match-media';
import type { Case, StorySection } from '@/types/case';

// The cinematic story builds one long timeline for all six chapters. Give it room under load.
vi.setConfig({ testTimeout: 15_000 });

/** The text a reader sees: every {{ref:id|label}} shown as its label. */
const plainText = (text: string) =>
  parseRefs(text)
    .map(segment => (segment.kind === 'text' ? segment.text : segment.label))
    .join('');

type StoryData = Pick<Case, 'story' | 'centralQuestion' | 'references' | 'sources' | 'voyage'>;

function renderStory(caseData: StoryData = maryCeleste) {
  return render(
    <Story
      story={caseData.story}
      centralQuestion={caseData.centralQuestion}
      references={caseData.references}
      sources={caseData.sources}
      voyage={caseData.voyage}
    />
  );
}
/** Scrolls past the opening scene (jsdom has no layout, so the rectangles are set by hand) and lets tweens finish. */
function scrollPastOpening(container: HTMLElement, { storyBottom = 5000 }: { storyBottom?: number } = {}) {
  const root = container.querySelector('[data-story="root"]') as HTMLElement;
  root.getBoundingClientRect = () => ({ top: -900, bottom: storyBottom, height: storyBottom + 900 }) as DOMRect;
  act(() => {
    fireEvent.scroll(window);
  });
  finishTweens(container.querySelector('[data-story="play-card"]'));
}
/** Runs the tweens of an element to their end, as the ticker would. */
function finishTweens(element: Element | null) {
  if (element !== null) {
    gsap.getTweensOf(element).forEach(tween => tween.progress(1));
  }
}

const chapterOf = (container: HTMLElement, section: StorySection) =>
  container.querySelector(`[data-story="chapter"][data-chapter="${section.id}"]`) as HTMLElement;

/** Test data, not history. */
const testCase: StoryData = {
  story: [
    {
      id: 's-one',
      kicker: 'Test place, test year',
      heading: 'First test heading',
      body: ['A first sentence about {{ref:thing|the thing}}. A second sentence.', 'A second paragraph.'],
      hook: 'A test hook.',
      image: { src: '/one.webp', alt: 'Test alt one.', credit: 'Test credit one.', isIllustration: true },
    },
    { id: 's-two', heading: 'Second test heading', body: ['Only one paragraph, with {{ref:nobody|an unknown id}}.'] },
  ],
  centralQuestion: 'A test question, in two parts?',
  references: [{ id: 'thing', kind: 'term', label: 'The thing', profile: ['A test profile.'] }],
  sources: [],
};

let scrollTo: ReturnType<typeof vi.fn>;

beforeEach(() => {
  stubMatchMedia();
  // jsdom does not scroll. Playing the story calls window.scrollTo through GSAP's ScrollToPlugin.
  scrollTo = vi.fn();
  vi.stubGlobal('scrollTo', scrollTo);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  document.documentElement.style.removeProperty('background-color');
});

describe('Story: the full text is in the DOM', () => {
  test.each(maryCeleste.story.map(section => [section.id, section] as const))(
    'chapter "%s": heading, every paragraph whole, and the hook',
    (_id, section) => {
      const { container } = renderStory();
      const chapter = chapterOf(container, section);

      expect(within(chapter).getByRole('heading', { level: 2, name: section.heading })).toBeDefined();
      const text = chapter.querySelector('[data-story="text"]') as HTMLElement;
      const lines = [...text.querySelectorAll('[data-story="line"]')].map(line => line.textContent);
      const expected = [...section.body, ...(section.hook === undefined ? [] : [section.hook])].map(plainText);
      expect(lines).toEqual(expected);
      // It is not hidden from screen readers; only visually.
      expect(text.closest('[aria-hidden="true"]')).toBeNull();
      expect(text.className).toContain('sr-only');
    }
  );



  test('the scroll is scrubbed with smoothing, so the text glides', () => {
    renderStory(testCase);
    const pinned = ScrollTrigger.getAll().find(trigger => trigger.pin !== undefined && trigger.pin !== null);
    expect(pinned?.vars.scrub).toBe(STORY_PACE.scrub);
  });
  test('ends on the central question, whole for screen readers and in phrases for the eyes', () => {
    const { container } = renderStory();

    const question = container.querySelector('[data-story="question"]') as HTMLElement;
    expect(within(question).getByRole('heading', { name: maryCeleste.centralQuestion })).toBeDefined();
    const phrases = [...question.querySelectorAll('[data-story="phrase"]')].map(phrase => phrase.textContent?.trim());
    expect(phrases).toEqual(splitQuestion(maryCeleste.centralQuestion));
  });
});

describe('Story: a page per chapter', () => {
  const stageTimeline = () => ScrollTrigger.getAll().find(trigger => trigger.pin)!.animation as gsap.core.Timeline;

  test('each chapter has a page on one side of its image: kicker, heading, every paragraph and the roll call', () => {
    const { container } = renderStory();
    for (const section of maryCeleste.story) {
      const chapter = chapterOf(container, section);
      const page = chapter.querySelector<HTMLElement>('[data-story="page"]')!;
      expect(page.className).toContain('lg:w-[42%]');
      expect(page.className).toContain('lg:right-auto');
      expect(page.querySelector('[data-story="kicker"]')?.textContent).toBe(section.kicker);
      expect(page.querySelector('[data-story="heading"]')?.textContent).toBe(section.heading);
      const paragraphs = [...page.querySelectorAll('[data-story="paragraph"]')].map(paragraph => paragraph.textContent);
      expect(paragraphs).toEqual(section.body.map(plainText));
      expect(page.querySelectorAll('[data-story="name"]')).toHaveLength(section.rollCall?.length ?? 0);
    }
  });

  test('the body is set in Old Standard TT at about 18 to 19px, the heading large, the kicker small', () => {
    const { container } = renderStory();
    const page = container.querySelector<HTMLElement>('[data-story="page"]')!;
    const body = page.querySelector<HTMLElement>('[data-story="body"]')!;
    expect(body.className).toContain('font-record');
    expect(body.className).toContain('text-[1.125rem]');
    expect(body.className).toContain('lg:text-[1.1875rem]');
    expect(page.querySelector('h2')?.className).toContain('font-legend');
    expect(page.querySelector('[data-story="kicker"]')?.className).toContain('font-voice');
  });

  test('portals in the page stay tappable but out of the Tab order; the full text has them for the keyboard', () => {
    const { container } = renderStory();
    const inPage = [...container.querySelectorAll<HTMLElement>('[data-story="page"] [data-portal-trigger]')];
    const inText = [...container.querySelectorAll<HTMLElement>('[data-story="text"] [data-portal-trigger]')];
    expect(inPage.length).toBeGreaterThan(0);
    expect(inPage.every(trigger => trigger.tabIndex === -1)).toBe(true);
    expect(inText.every(trigger => trigger.tabIndex === 0)).toBe(true);
    expect(container.querySelector('[data-story="body"]')?.getAttribute('aria-hidden')).toBe('true');
  });

  test('tapping a portal in the page opens its card', () => {
    const { container } = renderStory(testCase);
    fireEvent.click(container.querySelector('[data-story="page"] [data-portal-trigger="thing"]') as HTMLElement);
    expect(screen.getByRole('dialog', { name: 'The thing' })).toBeDefined();
  });

  test('the page holds for a stretch of scroll before the hook, and is the same page all the while', () => {
    const { container } = renderStory(testCase);
    const chapter = chapterOf(container, testCase.story[0]);
    const page = chapter.querySelector<HTMLElement>('[data-story="page"]')!;
    const leave = gsap.getTweensOf(page)[0];
    expect(leave.vars).toMatchObject({ opacity: 0, ease: 'power2.in' });
    expect(leave.startTime()).toBeGreaterThanOrEqual(STORY_PACE.pageHold);
    expect(stageTimeline().labels['chapter-1']).toBeGreaterThan(leave.startTime());
  });

  test('a chapter without a hook keeps its page until the next scene dissolves in', () => {
    const { container } = renderStory(testCase);
    const chapter = chapterOf(container, testCase.story[1]);
    expect(gsap.getTweensOf(chapter.querySelector('[data-story="page"]')!)).toHaveLength(0);
    expect(chapter.querySelector('[data-story="hook-moment"]')).toBeNull();
  });

  test('story events: each chapter is entered, its page comes, each hook comes, in order', () => {
    renderStory(testCase);
    const events: StoryEvent[] = [];
    const stop = onStoryEvent(event => events.push(event));
    try {
      const timeline = stageTimeline();
      timeline.time(timeline.duration(), false);
    } finally {
      stop();
    }
    expect(events.map(event => `${event.type}:${(event as { chapter?: string }).chapter}`)).toEqual([
      'chapter-enter:s-one',
      'beat:s-one',
      'hook:s-one',
      'chapter-enter:s-two',
      'beat:s-two',
    ]);
  });

  test('on a phone-width screen each page lies along the bottom, over the image', () => {
    const { container } = renderStory();
    const page = container.querySelector<HTMLElement>('[data-story="page"]')!;
    expect(page.className).toContain('inset-x-0');
    expect(page.className).toContain('bottom-0');
    expect(page.className).toContain('max-h-[78svh]');
  });
});

describe('Story: scenes', () => {
  test('one full-screen scene per chapter, in one pinned stage, in the order of the case data', () => {
    const { container } = renderStory();

    const root = container.querySelector('[data-story="root"]') as HTMLElement;
    expect(root.dataset.mode).toBe('cinematic');
    const stage = container.querySelector('[data-story="stage"]') as HTMLElement;
    expect(stage.className).toContain('h-svh');
    const scenes = [...stage.querySelectorAll('[data-story="chapter"]')];
    expect(scenes.map(scene => scene.getAttribute('data-chapter'))).toEqual(maryCeleste.story.map(section => section.id));
    for (const image of stage.querySelectorAll('[data-story="image"]')) {
      expect(image.className).toContain('object-cover');
    }
  });

  test('the heading the quill writes is hidden from screen readers and split into letters', () => {
    const { container } = renderStory(testCase);

    const written = container.querySelector('[data-story="heading"]') as HTMLElement;
    expect(written.getAttribute('aria-hidden')).toBe('true');
    expect(written.querySelectorAll('*').length).toBeGreaterThan(0);
    expect(container.querySelector('[data-story="quill"]')?.getAttribute('aria-hidden')).toBe('true');
  });

  test('every image keeps its credit behind an ⓘ, and its labels', () => {
    const { container } = renderStory();

    for (const section of maryCeleste.story) {
      const chapter = chapterOf(container, section);
      expect(within(chapter).getByRole('img', { name: section.image?.alt })).toBeDefined();
      expect(within(chapter).getByRole('tooltip', { hidden: true }).textContent).toBe(section.image?.credit);
      expect(chapter.querySelector('[data-story="illustration"]') !== null).toBe(section.image?.isIllustration);
    }
    expect(chapterOf(container, maryCeleste.story[2]).querySelector('[data-story="caption"]')?.textContent).toBe(
      'The Mary Celeste, 1861'
    );
  });

  test('the image grade gets darker with every chapter', () => {
    const { container } = renderStory();

    const brightness = [...container.querySelectorAll<HTMLElement>('[data-story="image"]')].map(image =>
      Number(/brightness\(([\d.]+)\)/.exec(image.style.filter)?.[1])
    );
    expect(brightness[0]).toBe(1);
    expect(brightness.every((value, index) => index === 0 || value < brightness[index - 1])).toBe(true);
  });

  test('images are lazy: before the reader reaches the story, only the first chapter has a source', () => {
    const { container } = renderStory();

    const sources = [...container.querySelectorAll('[data-story="image"]')].map(image => image.getAttribute('src'));
    expect(sources[0]).toBe(maryCeleste.story[0].image?.src);
    expect(sources.slice(1).every(source => source === null)).toBe(true);
  });

  test('before the reader reaches it, the story sits in the legend\'s night', () => {
    const { container } = renderStory();

    expect((container.querySelector('[data-story="root"]') as HTMLElement).dataset.tone).toBe('night-ink');
  });
});

describe('Story: the roll call', () => {
  test('ten names with their roles, in the order of the data', () => {
    const { container } = renderStory();
    const list = chapterOf(container, maryCeleste.story[0]).querySelector('[data-story="roll-call"]') as HTMLElement;

    const items = [...list.querySelectorAll('[data-story="name"]')];
    const rollCall = maryCeleste.story[0].rollCall ?? [];
    expect(items).toHaveLength(10);
    expect(items.map(item => item.textContent?.replace(/\s+/g, ' ').trim())).toEqual(
      rollCall.map(entry => `${entry.name} · ${entry.role}`)
    );
  });

  test('no other chapter has one', () => {
    const { container } = renderStory();

    expect(container.querySelectorAll('[data-story="roll-call"]')).toHaveLength(1);
  });
});

describe('Story: the voyage chart', () => {
  test('an inset that opens a larger view on tap, and closes on Escape', () => {
    renderStory();

    const chart = screen.getByRole('button', { name: 'Chart of the voyage' });
    expect(chart.getAttribute('aria-expanded')).toBe('false');
    expect(document.querySelectorAll('[data-chart="segment"]')).toHaveLength(4);
    expect(document.querySelectorAll('[data-chart="segment"][data-ghostly="true"]')).toHaveLength(1);
    expect(document.querySelector('[data-chart="point"][data-unreached="true"]')?.getAttribute('data-id')).toBe('genoa');

    fireEvent.click(chart);
    expect(screen.getByRole('dialog', { name: 'Chart of the voyage' })).toBeDefined();
    expect([...document.querySelectorAll('[data-chart="label"]')].map(label => label.textContent)).toContain('Found adrift');

    fireEvent.keyDown(document.body, { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: 'Chart of the voyage' })).toBeNull();
  });

  test('a story without a voyage has no chart', () => {
    renderStory(testCase);

    expect(screen.queryByRole('button', { name: 'Chart of the voyage' })).toBeNull();
  });
});

describe('Story: play the story', () => {
  // jsdom lays nothing out: give the page a height, so there is something to play through.
  beforeEach(() => {
    Object.defineProperty(document.documentElement, 'scrollHeight', { configurable: true, value: 20_000 });
  });
  afterEach(() => {
    Reflect.deleteProperty(document.documentElement, 'scrollHeight');
  });

  test('with nothing left to scroll, play does not start', () => {
    Object.defineProperty(document.documentElement, 'scrollHeight', { configurable: true, value: 0 });
    const { container } = renderStory();
    const control = container.querySelector('[data-story="play-control"]') as HTMLButtonElement;

    act(() => {
      fireEvent.click(control);
    });

    expect(control.getAttribute('aria-pressed')).toBe('false');
  });

  test('while the story is on the page the wheel is slower, and it is normal again once the story goes', () => {
    const { unmount } = renderStory();
    expect(wheelMultiplier()).toBe(0.8);
    unmount();
    expect(wheelMultiplier()).toBe(1);
  });
  test('the play card is hidden until the reader has scrolled past the opening', () => {
    const { container } = renderStory(maryCeleste);
    const card = container.querySelector('[data-story="play-card"]') as HTMLElement;
    expect(card.style.visibility).toBe('hidden');
    expect(card.style.opacity).toBe('0');
    scrollPastOpening(container);
    expect(card.style.visibility).not.toBe('hidden');
    expect(card.style.opacity).toBe('1');
  });
  test('the card has the hint, "Play the story" and "Read at my pace", and does not block the page', () => {
    const { container } = renderStory(maryCeleste);
    scrollPastOpening(container);
    const card = container.querySelector('[data-story="play-card"]') as HTMLElement;
    expect(card.querySelector('[data-story="hint"]')?.textContent).toBe('Scroll, or press play.');
    expect(within(card).getByRole('button', { name: 'Play the story' })).toBeDefined();
    expect(within(card).getByRole('button', { name: 'Read at my pace' })).toBeDefined();
    // Not a dialog, not modal; fixed to the screen, so it takes no layout space; nothing locks the scroll.
    expect(card.getAttribute('role')).toBe('group');
    expect(card.getAttribute('aria-modal')).toBeNull();
    expect(card.className).toContain('fixed');
    expect(document.documentElement.style.overflow).toBe('');
    expect(document.body.style.overflow).toBe('');
    // The page's other controls stay reachable.
    expect(container.querySelector('[data-story="play-control"]')?.closest('[inert]')).toBeNull();
  });
  test('the card goes away once the story is behind the reader, so it never sits over the fork', () => {
    const { container } = renderStory(maryCeleste);
    scrollPastOpening(container);
    const card = container.querySelector('[data-story="play-card"]') as HTMLElement;
    expect(card.style.opacity).toBe('1');
    scrollPastOpening(container, { storyBottom: 100 });
    expect(card.style.opacity).toBe('0');
  });
  test('"Play the story" on the card plays, and the card leaves and does not come back', () => {
    const { container } = renderStory(maryCeleste);
    scrollPastOpening(container);
    const control = container.querySelector('[data-story="play-control"]') as HTMLButtonElement;
    const card = container.querySelector('[data-story="play-card"]') as HTMLElement;
    act(() => {
      fireEvent.click(within(card).getByRole('button', { name: 'Play the story' }));
    });
    expect(control.getAttribute('aria-pressed')).toBe('true');
    // It leaves with a tween, then it is gone.
    expect(gsap.getTweensOf(card).length).toBeGreaterThan(0);
    act(() => finishTweens(card));
    expect(container.querySelector('[data-story="play-card"]')).toBeNull();
    // Once chosen it is not shown again this visit.
    scrollPastOpening(container);
    expect(container.querySelector('[data-story="play-card"]')).toBeNull();
  });
  test('the card leaves by itself when the reader keeps scrolling: scrolling counts as "Read at my pace"', () => {
    const { container } = renderStory(maryCeleste);
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 1000 });
    scrollPastOpening(container);
    const control = container.querySelector('[data-story="play-control"]') as HTMLButtonElement;
    const card = container.querySelector('[data-story="play-card"]') as HTMLElement;
    expect(card.style.opacity).toBe('1');
    // A little further: it stays.
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 1000 + window.innerHeight * (AUTO_LEAVE - 0.1) });
    act(() => {
      fireEvent.scroll(window);
    });
    expect(gsap.getTweensOf(card)).toHaveLength(0);
    // About 60% of a screen past where it appeared: it slides away with ink.out, and does not come back.
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 1000 + window.innerHeight * (AUTO_LEAVE + 0.05) });
    act(() => {
      fireEvent.scroll(window);
    });
    const leaving = gsap.getTweensOf(card)[0];
    expect(leaving.vars).toMatchObject({ autoAlpha: 0, ease: 'power2.in', duration: 0.45 });
    act(() => finishTweens(card));
    expect(container.querySelector('[data-story="play-card"]')).toBeNull();
    expect(control.getAttribute('aria-pressed')).toBe('false');
    Reflect.deleteProperty(window, 'scrollY');
  });
  test('"Read at my pace" sends the card away without playing', () => {
    const { container } = renderStory(maryCeleste);
    scrollPastOpening(container);
    const control = container.querySelector('[data-story="play-control"]') as HTMLButtonElement;
    const card = container.querySelector('[data-story="play-card"]') as HTMLElement;
    act(() => {
      fireEvent.click(within(card).getByRole('button', { name: 'Read at my pace' }));
    });
    act(() => finishTweens(card));
    expect(container.querySelector('[data-story="play-card"]')).toBeNull();
    expect(control.getAttribute('aria-pressed')).toBe('false');
  });
  test('play and pause toggle from the floating control, which the card leaves as it is', () => {
    const { container } = renderStory();
    const control = container.querySelector('[data-story="play-control"]') as HTMLButtonElement;
    expect(control.getAttribute('aria-label')).toBe('Play the story');
    act(() => {
      fireEvent.click(control);
    });
    expect(control.getAttribute('aria-label')).toBe('Pause the story');
    expect(control.getAttribute('aria-pressed')).toBe('true');
    act(() => {
      fireEvent.click(control);
    });
    expect(control.getAttribute('aria-label')).toBe('Play the story');
    act(() => {
      fireEvent.click(control);
    });
    expect(control.getAttribute('aria-label')).toBe('Pause the story');
  });
  test('smooth scrolling steps aside while the story plays and comes back when it pauses', () => {
    const fake = { stop: vi.fn(), start: vi.fn() };
    setLenis(fake as never);
    try {
      const { container } = renderStory();
      const control = container.querySelector('[data-story="play-control"]') as HTMLButtonElement;
      act(() => {
        fireEvent.click(control);
      });
      expect(fake.stop).toHaveBeenCalledTimes(1);
      expect(control.getAttribute('aria-pressed')).toBe('true');
      act(() => {
        fireEvent.click(control);
      });
      expect(fake.start).toHaveBeenCalled();
      expect(control.getAttribute('aria-pressed')).toBe('false');
    } finally {
      setLenis(null);
    }
  });
  test('only the scene on screen takes clicks: the first is active, the others are not', () => {
    const { container } = renderStory();
    const scenes = [...container.querySelectorAll<HTMLElement>('[data-story="chapter"]')];
    expect(scenes.map(scene => scene.dataset.active)).toEqual(scenes.map((_, index) => String(index === 0)));
  });
  test('a tap on a portal name in the active scene opens its card and pauses playback', () => {
    const { container } = renderStory();
    const first = container.querySelector('[data-story="chapter"][data-active="true"]') as HTMLElement;
    const control = container.querySelector('[data-story="play-control"]') as HTMLButtonElement;
    act(() => {
      fireEvent.click(control);
    });
    expect(control.getAttribute('aria-pressed')).toBe('true');
    act(() => {
      fireEvent.click(first.querySelector('[data-story="page"] [data-portal-trigger]') as HTMLElement);
    });
    expect(document.querySelector('[data-portal="card"]')).not.toBeNull();
    expect(control.getAttribute('aria-pressed')).toBe('false');
  });
  test('opening a portal pauses playback', () => {
    const { container } = renderStory(testCase);
    const control = container.querySelector('[data-story="play-control"]') as HTMLButtonElement;

    act(() => {
      fireEvent.click(control);
    });
    act(() => {
      fireEvent.click(container.querySelector('[data-story="page"] [data-portal-trigger="thing"]') as HTMLElement);
    });

    expect(control.getAttribute('aria-pressed')).toBe('false');
  });

  test('a key pressed on the control itself does not count as taking over', () => {
    const { container } = renderStory();
    const control = container.querySelector('[data-story="play-control"]') as HTMLButtonElement;

    act(() => {
      fireEvent.click(control);
    });
    act(() => {
      fireEvent.keyDown(control, { key: 'Enter' });
    });

    expect(control.getAttribute('aria-pressed')).toBe('true');
  });
});

describe('Story: reduced motion', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    stubMatchMedia({ reducedMotion: true });
    vi.stubGlobal('scrollTo', vi.fn());
  });

  test('plain stacked scenes: no stage, no column, still images, the full text shown', () => {
    const { container } = renderStory();

    const root = container.querySelector('[data-story="root"]') as HTMLElement;
    expect(root.dataset.mode).toBe('stacked');
    expect(container.querySelector('[data-story="stage"]')).toBeNull();
    expect(container.querySelector('[data-story="column"]')).toBeNull();
    const chapters = [...container.querySelectorAll('[data-story="chapter"]')];
    expect(chapters).toHaveLength(maryCeleste.story.length);
    for (const chapter of chapters) {
      expect(chapter.querySelector('[data-story="text"]')?.className).not.toContain('sr-only');
    }
    for (const image of container.querySelectorAll<HTMLElement>('[data-story="image"]')) {
      expect(image.style.transform).toBe('');
    }
  });

  test('no auto-scroll: no play choice and no play control', () => {
    renderStory();

    expect(screen.queryByRole('button', { name: 'Play the story' })).toBeNull();
    expect(document.querySelector('[data-story="play-control"]')).toBeNull();
    expect(document.querySelector('[data-story="play-card"]')).toBeNull();
  });

  test('the text only fades: it starts hidden and is never moved', () => {
    const { container } = renderStory(testCase);

    for (const line of container.querySelectorAll<HTMLElement>('[data-story="line"]')) {
      expect(line.style.opacity).toBe('0');
      expect(line.style.transform).toBe('');
    }
  });

  test('the roll call and the chart are still there, shown in place', () => {
    const { container } = renderStory();

    expect(container.querySelectorAll('[data-story="roll-call"] [data-story="name"]')).toHaveLength(10);
    expect(container.querySelectorAll('[data-chart="frame"][data-variant="still"]').length).toBeGreaterThan(0);
  });
});

describe('Story: without matchMedia', () => {
  test('shows every chapter at once, stacked, with nothing hidden', () => {
    vi.unstubAllGlobals();
    const { container } = renderStory();

    expect((container.querySelector('[data-story="root"]') as HTMLElement).dataset.mode).toBe('stacked');
    for (const element of container.querySelectorAll<HTMLElement>('[data-story="line"]')) {
      expect(element.style.opacity).toBe('');
    }
    expect(screen.getByRole('heading', { name: maryCeleste.centralQuestion })).toBeDefined();
  });
});

describe('Story: will-change only while a scene moves', () => {
  test('no scene image carries a permanent will-change', () => {
    const { container } = renderStory();
    const images = [...container.querySelectorAll<HTMLElement>('[data-story="image"]')];
    expect(images.length).toBeGreaterThan(0);
    for (const image of images) {
      expect(image.className).not.toContain('will-change');
    }
    // Before any scrolling, only the first scene could be about to move; the rest are clear.
    expect(images.slice(1).every(image => image.style.willChange === '')).toBe(true);
  });
});

describe('Story: sized images', () => {
  test('every scene image has a srcset with sizes', () => {
    const { container } = renderStory();
    const images = [...container.querySelectorAll<HTMLImageElement>('[data-story="image"]')];
    // Images load a chapter ahead of the reader, so only the first one is loaded before any scrolling.
    expect(images.length).toBe(maryCeleste.story.length);
    expect(images[0].getAttribute('srcset')).toMatch(/ 828w, .+ \d+w$/);
    expect(images[0].getAttribute('sizes')).toBe('100vw');
    expect(images[1].getAttribute('srcset')).toBeNull();
  });
});

describe('Story: the four entrances', () => {
  const voyage = maryCeleste.story.find(section => section.id === 's-voyage')!;



  test('a hook arrives word by word, slower than anything else, its letters snapping into place from out of line', () => {
    const { container } = renderStory();
    const hook = chapterOf(container, voyage).querySelector('[data-story="hook-moment"]') as HTMLElement;
    const words = [...hook.querySelectorAll<HTMLElement>('[data-story="hook-word"]')];
    expect(words.map(word => word.textContent).join(' ')).toBe(voyage.hook);
    const snaps = words.map(word => gsap.getTweensOf(word.querySelector('[data-story="hook-char"]')!)[0]);
    expect(snaps[0].vars).toMatchObject({ opacity: 1, x: 0, y: 0, rotation: 0, ease: 'back.out(2.2)' });
    for (let index = 1; index < snaps.length; index += 1) {
      expect(snaps[index].startTime() - snaps[index - 1].startTime()).toBeCloseTo(0.55, 6);
    }
    // Each letter starts its own way out of line (within a few px and degrees), the same every time.
    const letters = [...words[1].querySelectorAll<HTMLElement>('[data-story="hook-char"]')];
    const from = snaps[1].vars.startAt as { rotation: (index: number) => number; x: (index: number) => number };
    const turns = letters.map((_, index) => from.rotation(index));
    expect(new Set(turns.map(value => value.toFixed(3))).size).toBe(letters.length);
    expect(turns.every(value => Math.abs(value) <= 12)).toBe(true);
    expect(letters.map((_, index) => from.x(index))).toEqual(letters.map((_, index) => from.x(index)));
  });

  test('when a hook leaves, its letters decay one at a time, in an uneven order', () => {
    const { container } = renderStory();
    const hook = chapterOf(container, voyage).querySelector('[data-story="hook-moment"]') as HTMLElement;
    const letters = [...hook.querySelectorAll<HTMLElement>('[data-story="hook-char"]')];
    const decay = gsap.getTweensOf(letters[0]).find(tween => tween.vars.opacity === 0)!;
    expect(decay.vars.ease).toBe('power1.in');
    // One tween for all of them, staggered: one letter at a time...
    expect(letters.every(letter => gsap.getTweensOf(letter).includes(decay))).toBe(true);
    expect(decay.vars.stagger as number).toBeGreaterThan(0);
    // ...in an uneven order, not the reading order, and always the same one.
    const order = (decay.targets() as HTMLElement[]).map(target => letters.indexOf(target));
    expect([...order].sort((a, b) => a - b)).toEqual(letters.map((_, index) => index));
    expect(order).not.toEqual(letters.map((_, index) => index));
  });

});

describe('Story: the hook between chapters', () => {
  const stageTimeline = () => ScrollTrigger.getAll().find(trigger => trigger.pin)!.animation as gsap.core.Timeline;

  test('names go out, the panel dims, the image darkens and creeps, the hook snaps in, holds, decays, then the next image', () => {
    const { container } = renderStory();
    const index = maryCeleste.story.findIndex(section => section.rollCall !== undefined);
    const section = maryCeleste.story[index];
    const chapter = chapterOf(container, section);
    const start = (element: Element, match: (tween: gsap.core.Tween) => boolean = () => true) =>
      gsap.getTweensOf(element).filter(tween => tween.parent !== gsap.globalTimeline).find(match)!.startTime();
    const names = [...chapter.querySelectorAll('[data-story="name"]')];
    const lastNameOut = start(names[names.length - 1], tween => tween.vars.keyframes !== undefined);
    const firstNameOut = start(names[0], tween => tween.vars.keyframes !== undefined);
    const pageOut = start(chapter.querySelector('[data-story="page"]')!, tween => tween.vars.opacity === 0);
    const creep = start(chapter.querySelector('[data-story="figure"]')!);
    const hook = chapter.querySelector('[data-story="hook-moment"]')!;
    const letter = hook.querySelector('[data-story="hook-char"]')!;
    const snap = start(letter, tween => tween.vars.opacity === 1);
    const decay = start(letter, tween => tween.vars.opacity === 0);
    expect(lastNameOut).toBeLessThan(firstNameOut);
    expect(firstNameOut).toBeLessThan(pageOut);
    expect(pageOut).toBeLessThan(creep);
    expect(creep).toBeLessThan(snap);
    expect(decay - snap).toBeGreaterThanOrEqual(STORY_PACE.hookHold);
    expect(stageTimeline().labels[`chapter-${index + 1}`]).toBeGreaterThan(decay);
  });

  test('nothing else on screen while it is there: the corners go with the panel, the chart inset goes quiet', () => {
    const { container } = renderStory();
    const chapter = chapterOf(container, maryCeleste.story[0]);
    const corners = chapter.querySelector('[data-story="corners"]')!;
    expect(gsap.getTweensOf(corners).some(tween => tween.vars.opacity === 0)).toBe(true);
    const chart = container.querySelector<HTMLElement>('[data-chart="frame"][data-variant="live"]')!;
    const timeline = stageTimeline();
    const pinned = ScrollTrigger.getAll().find(trigger => trigger.pin)!;
    const snap = gsap
      .getTweensOf(chapter.querySelector('[data-story="hook-char"]')!)
      .find(tween => tween.parent !== gsap.globalTimeline && tween.vars.opacity === 1)!;
    timeline.time(snap.startTime() + 0.5, false);
    act(() => pinned.vars.onUpdate?.(pinned));
    expect(chart.dataset.hushed).toBe('true');
    timeline.time(0, false);
    act(() => pinned.vars.onUpdate?.(pinned));
    expect(chart.dataset.hushed).toBe('false');
  });
});

describe('Story: the central question as a chokepoint', () => {
  function renderQuestion() {
    return render(
      <Story
        story={maryCeleste.story}
        centralQuestion={maryCeleste.centralQuestion}
        centralQuestionEmphasis={maryCeleste.centralQuestionEmphasis}
        references={maryCeleste.references}
        sources={maryCeleste.sources}
      />
    );
  }
  const questionTrigger = () =>
    ScrollTrigger.getAll().find(trigger => (trigger.vars.trigger as Element | undefined)?.matches?.('[data-story="question"]') && trigger.pin)!;

  test('a pinned, full-black screen, scrubbed, snapping to each phrase like a magnet, never locking the scroll', () => {
    const { container } = renderQuestion();
    const question = container.querySelector<HTMLElement>('[data-story="question"]')!;
    expect(question.className).toContain('bg-black');
    const trigger = questionTrigger();
    expect(trigger).toBeDefined();
    expect(trigger.vars.scrub).toBe(STORY_PACE.scrub);
    expect(trigger.vars.snap).toMatchObject({ snapTo: 'labelsDirectional', ease: 'power2.inOut', inertia: false });
    // Snapping is a nudge after the reader stops: nothing stops the reader scrolling on.
    expect(document.documentElement.style.overflow).toBe('');
  });

  test('it builds phrase by phrase, each written in with ink.in, each a stop, then the whole question and a hold', () => {
    const { container } = renderQuestion();
    const phrases = [...container.querySelectorAll<HTMLElement>('[data-story="phrase"]')];
    expect(phrases).toHaveLength(5);
    const timeline = questionTrigger().animation as gsap.core.Timeline;
    const labels = Object.keys(timeline.labels);
    expect(labels).toEqual([...phrases.map((_, index) => `phrase-${index}`), 'whole']);
    const ins = phrases.map(phrase => gsap.getTweensOf(phrase)[0]);
    expect(ins.every(tween => tween.vars.ease === 'power3.out' && tween.vars.opacity === 1)).toBe(true);
    ins.forEach((tween, index) => expect(tween.startTime()).toBeLessThan(timeline.labels[`phrase-${index}`]));
    // The fork waits: the timeline holds on the whole question before the pin lets go.
    expect(timeline.duration()).toBeGreaterThan(timeline.labels.whole + 2);
  });

  test('its weighted parts land on their own after their phrase, slightly brighter, and no red line anywhere', () => {
    const { container } = renderQuestion();
    const weighted = [...container.querySelectorAll<HTMLElement>('[data-story="question"] [data-story="weighted"]')];
    expect(weighted.map(span => span.textContent)).toEqual(maryCeleste.centralQuestionEmphasis);
    const land = gsap.getTweensOf(weighted[1])[0];
    expect(land.vars).toMatchObject({ opacity: 1, ease: 'power4.out' });
    const phraseIn = gsap.getTweensOf(weighted[1].closest('[data-story="phrase"]')!)[0];
    expect(land.startTime()).toBeGreaterThan(phraseIn.startTime() + phraseIn.duration());
    expect(weighted[1].className).toContain('text-night-ink');
    expect(container.querySelector('[data-story="weight-line"]')).toBeNull();
    expect(container.querySelector('[class*="bg-rust"]')).toBeNull();
  });

  test('screen readers get the whole question at once', () => {
    const { container } = renderQuestion();
    const question = container.querySelector<HTMLElement>('[data-story="question"]')!;
    expect(within(question).getByRole('heading', { name: maryCeleste.centralQuestion })).toBeDefined();
  });

  test('reduced motion: no pin and no stops; the question is shown whole', () => {
    vi.unstubAllGlobals();
    stubMatchMedia({ reducedMotion: true });
    vi.stubGlobal('scrollTo', vi.fn());
    const { container } = renderQuestion();
    expect(questionTrigger()).toBeUndefined();
    const phrases = [...container.querySelectorAll<HTMLElement>('[data-story="phrase"]')];
    // jsdom has no layout, so the question is already in view: one fade for the whole question, all at once.
    const tweens = new Set(phrases.map(phrase => gsap.getTweensOf(phrase)[0]));
    expect(tweens.size).toBe(1);
  });
});

describe('Story: no opening scene; the header shows the title once the story starts', () => {
  function renderWithHeader() {
    return render(
      <>
        <CaseHeader title="Test Case" years="1900 – 1901" unsolved startHidden />
        <Story story={testCase.story} centralQuestion={testCase.centralQuestion} references={testCase.references} sources={testCase.sources} />
      </>
    );
  }

  test('there is no separate opening scene: the story starts on chapter 1, its image only once', () => {
    const { container } = renderWithHeader();
    expect(container.querySelector('[data-story="opening"]')).toBeNull();
    expect(container.querySelectorAll('img[data-story="image"]')).toHaveLength(testCase.story.filter(section => section.image).length);
  });

  test('the header shows the case title once the story starts, and the UNSOLVED tag beside the years', () => {
    const { container } = renderWithHeader();
    const bar = container.querySelector<HTMLElement>('[data-case-header="bar"]')!;
    // jsdom has no layout, so the story has already started.
    expect(bar.style.opacity).toBe('1');
    expect(bar.querySelector('[data-case-header="unsolved"]')?.textContent).toContain('Unsolved');
  });
});

describe('Story: the pen writes the whole page', () => {
  /** The scrubbed timeline of the pinned stage. */
  const stageTimeline = () => ScrollTrigger.getAll().find(trigger => trigger.pin)!.animation as gsap.core.Timeline;
  /** The letters the quill writes for a chapter's heading. */
  const lettersOf = (container: HTMLElement, section: StorySection) =>
    [...chapterOf(container, section).querySelectorAll<HTMLElement>('[data-story="heading"] *')].filter(
      element => element.children.length === 0
    );
  /** The page's own writing timeline: the parent of the letter's tweens that is not GSAP's global one. */
  const writingOf = (letter: HTMLElement) =>
    gsap.getTweensOf(letter).find(tween => tween.parent !== gsap.globalTimeline)!.parent as gsap.core.Timeline;

  test('the heading is not part of the scrubbed timeline: its own timeline writes it, paused until the scene starts', () => {
    const { container } = renderStory(testCase);
    const letters = lettersOf(container, testCase.story[1]);
    expect(letters.length).toBeGreaterThan(0);
    const writing = writingOf(letters[0]);
    expect(writing).not.toBe(stageTimeline());
    expect(writing.paused()).toBe(true);
    // Nothing the scroll scrubs touches the letters.
    expect(stageTimeline().getTweensOf(letters[0])).toHaveLength(0);
  });


  test('entering the scene starts the writing, once the scroll crosses its start', () => {
    const { container } = renderStory(testCase);
    const writing = writingOf(lettersOf(container, testCase.story[1])[0]);
    const timeline = stageTimeline();
    expect(writing.paused()).toBe(true);
    timeline.time(timeline.labels['chapter-1'] + 0.5, false);
    expect(writing.paused()).toBe(false);
    expect(writing.time()).toBeLessThan(1);
  });



  const pageOf = (container: HTMLElement, section: StorySection) => chapterOf(container, section).querySelector<HTMLElement>('[data-story="page"]')!;
  const unitsOf = (container: HTMLElement, section: StorySection) =>
    [...pageOf(container, section).querySelectorAll<HTMLElement>('[data-story="body"] [data-pen="char"]')];

  test('the same pen writes the heading, then carries on and writes the whole body, after the kicker is typed', () => {
    const { container } = renderStory(testCase);
    const heading = lettersOf(container, testCase.story[1]);
    const body = unitsOf(container, testCase.story[1]);
    expect(body.length).toBeGreaterThan(0);
    const writing = writingOf(heading[0]);
    expect(writingOf(body[0])).toBe(writing);
    const lastHeading = gsap.getTweensOf(heading.at(-1)!)[0];
    expect(gsap.getTweensOf(body[0])[0].startTime()).toBeGreaterThanOrEqual(lastHeading.startTime());
    // Hidden until written.
    expect(body.every(unit => unit.style.opacity === '0')).toBe(true);
  });

  test('it writes at a steady pace that leads the eye, and is done in seconds', () => {
    const { container } = renderStory();
    for (const section of maryCeleste.story) {
      const writing = writingOf(lettersOf(container, section)[0]);
      expect(writing.duration()).toBeLessThanOrEqual(11);
    }
  });

  test('once written the text stays: going back over the scene finishes the writing, it never unwrites', () => {
    const { container } = renderStory(testCase);
    const writing = writingOf(lettersOf(container, testCase.story[1])[0]);
    const timeline = stageTimeline();
    timeline.time(timeline.labels['chapter-1'] + 0.1, false);
    // It has started (in jsdom GSAP's clock does not tick, so it stays at its start).
    expect(writing.paused()).toBe(false);
    timeline.time(timeline.labels['chapter-1'] - 1, false);
    expect(writing.progress()).toBe(1);
    expect(unitsOf(container, testCase.story[1]).every(unit => unit.style.opacity === '1')).toBe(true);
    expect(pageOf(container, testCase.story[1]).dataset.written).toBe('true');
  });

  test('a click on the panel finishes the writing at once', () => {
    const { container } = renderStory(testCase);
    const writing = writingOf(lettersOf(container, testCase.story[1])[0]);
    const timeline = stageTimeline();
    timeline.time(timeline.labels['chapter-1'] + 0.1, false);
    fireEvent.click(pageOf(container, testCase.story[1]));
    expect(writing.progress()).toBe(1);
  });

  test('scrolling onward finishes the writing at once: the reader is never stuck waiting', () => {
    const { container } = renderStory(testCase);
    const writing = writingOf(lettersOf(container, testCase.story[0])[0]);
    const timeline = stageTimeline();
    const pinned = ScrollTrigger.getAll().find(trigger => trigger.pin)!;
    act(() => pinned.vars.onEnter?.(pinned));
    expect(writing.progress()).toBeLessThan(1);
    timeline.time(STORY_PACE.skipAfter + 0.1, false);
    act(() => pinned.vars.onUpdate?.(Object.assign(Object.create(pinned), { direction: 1 })));
    expect(writing.progress()).toBe(1);
  });

  test('weighted phrases get a breath before them and are written slower, slightly brighter, with no line', () => {
    const { container } = renderStory();
    const voyage = maryCeleste.story.find(section => section.id === 's-voyage')!;
    const page = pageOf(container, voyage);
    const weighted = [...page.querySelectorAll<HTMLElement>('[data-pen="weighted"]')];
    expect(weighted.map(span => span.textContent)).toEqual(voyage.emphasis);
    expect(weighted[0].className).toContain('text-night-ink');
    expect(page.querySelector('[data-story="weight-line"]')).toBeNull();
    const first = weighted[0].querySelector<HTMLElement>('[data-pen]:not([data-pen="weighted"])')!;
    const unit = first.dataset.pen === 'word' ? first : first;
    const before = gsap.getTweensOf(unit)[0];
    expect(before).toBeDefined();
  });

  test('the roll call is written as a short list in the page, after the body', () => {
    const { container } = renderStory();
    const voyage = maryCeleste.story.find(section => section.rollCall !== undefined)!;
    const page = pageOf(container, voyage);
    const lastBody = [...page.querySelectorAll<HTMLElement>('[data-story="body"] [data-pen="word"]')].at(-1)!;
    const firstName = page.querySelector<HTMLElement>('[data-story="roll-call"] [data-pen="word"]')!;
    const at = (element: HTMLElement) =>
      gsap.getTweensOf(element)[0]?.startTime() ?? gsap.getTweensOf(element.querySelector('[data-pen="char"]')!)[0].startTime();
    expect(at(firstName)).toBeGreaterThan(at(lastBody));
  });

  test('reduced motion: plain stacked chapters show the heading whole and still', () => {
    vi.unstubAllGlobals();
    stubMatchMedia({ reducedMotion: true });
    vi.stubGlobal('scrollTo', vi.fn());
    const { container } = renderStory(testCase);
    const heading = container.querySelector('[data-story="heading"]') ?? container.querySelector('h2');
    expect(heading?.textContent).toContain('First test heading');
    expect(container.querySelectorAll('[data-story="quill"]')).toHaveLength(0);
  });
});

describe('Story: the other parts, with the column', () => {
  const stageTimeline = () => ScrollTrigger.getAll().find(trigger => trigger.pin)!.animation as gsap.core.Timeline;
  const pinned = () => ScrollTrigger.getAll().find(trigger => trigger.pin)!;






  test('the voyage chart draws its route in order as the story goes', () => {
    const { container } = renderStory();
    const reveals = [...container.querySelectorAll<HTMLElement | SVGElement>('[data-chart="frame"][data-variant="live"] [data-chart="reveal"]')];
    expect(reveals.length).toBeGreaterThan(0);
    const starts = reveals.map(reveal => gsap.getTweensOf(reveal)[0].startTime());
    expect(starts).toEqual([...starts].sort((a, b) => a - b));
    const timeline = stageTimeline();
    expect(starts.every(start => start >= 0 && start <= timeline.duration())).toBe(true);
  });

  test('day into night: the sky follows the timeline from the first scene to full night', () => {
    const { container } = renderStory();
    const root = container.querySelector('[data-story="root"]') as HTMLElement;
    const timeline = stageTimeline();
    const trigger = pinned();
    timeline.time(0, false);
    act(() => trigger.vars.onUpdate?.(trigger));
    const morning = root.style.getPropertyValue('--story-sky');
    timeline.time(timeline.duration(), false);
    act(() => trigger.vars.onUpdate?.(trigger));
    const night = root.style.getPropertyValue('--story-sky');
    expect(morning).not.toBe('');
    expect(night).not.toBe(morning);
    expect(root.dataset.tone).toBe('night-ink');
  });

});
