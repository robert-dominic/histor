// @vitest-environment jsdom
// src/features/story/__tests__/Story.test.tsx
// The story in steps (docs/briefs/story-steps.md): every chapter's full text is in the DOM, the written page is for
// the eyes only, one gesture moves exactly one step, the play modal comes first, playing can be paused, and reduced
// motion gives plain stacked sections on a normal page.
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import maryCeleste from '@/cases/mary-celeste/case';
import CaseHeader from '@/components/CaseHeader';
import Story from '@/features/story/Story';
import { parseRefs } from '@/lib/parse-refs';
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

type Start = { mode: 'play' | 'read'; token: number } | null;

function renderStory(caseData: StoryData = maryCeleste, start: Start = null) {
  return render(
    <Story
      story={caseData.story}
      centralQuestion={caseData.centralQuestion}
      references={caseData.references}
      sources={caseData.sources}
      voyage={caseData.voyage}
      start={start}
    />
  );
}

/** The story, begun: the reader has chosen "Read at my pace" (or "Play the story") in the play modal. */
const READ: Start = { mode: 'read', token: 1 };
const PLAY: Start = { mode: 'play', token: 1 };

/** Runs every step animation now under way to its end (they are marked `data: 'story-step'`). */
function settleSteps() {
  act(() => {
    for (let pass = 0; pass < 3; pass += 1) {
      gsap.globalTimeline
        .getChildren(false, false, true)
        .filter(child => child.data === 'story-step')
        .forEach(child => child.progress(1));
    }
  });
}

/** Writes the page on screen at once (a click on its panel). */
function finishWriting(container: HTMLElement) {
  act(() => {
    container.querySelectorAll<HTMLElement>('[data-story="chapter"][data-active="true"] [data-story="page"]').forEach(page => fireEvent.click(page));
  });
}

let wheelClock = 1_000;
/** A burst of wheel events, `apart` ms from each other, starting `after` ms after the last one: one flick. */
function wheelBurst(target: Element, { count = 1, deltaY = 60, apart = 8, after = 1_000 } = {}) {
  wheelClock += after;
  act(() => {
    for (let index = 0; index < count; index += 1) {
      const event = new WheelEvent('wheel', { deltaY, bubbles: true, cancelable: true });
      Object.defineProperty(event, 'timeStamp', { value: wheelClock });
      target.dispatchEvent(event);
      wheelClock += apart;
    }
  });
}

const stepOf = (container: HTMLElement) => (container.querySelector('[data-story="root"]') as HTMLElement).dataset.step;
const stageOf = (container: HTMLElement) => container.querySelector('[data-story="stage"]') as HTMLElement;

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
  vi.restoreAllMocks();
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



  test('ends on the central question, whole for screen readers and in phrases for the eyes', () => {
    const { container } = renderStory();

    const question = container.querySelector('[data-story="question"]') as HTMLElement;
    expect(within(question).getByRole('heading', { name: maryCeleste.centralQuestion })).toBeDefined();
    const phrases = [...question.querySelectorAll('[data-story="phrase"]')].map(phrase => phrase.textContent?.trim());
    expect(phrases).toEqual(splitQuestion(maryCeleste.centralQuestion));
  });
});

describe('Story: a page per chapter', () => {

  test('each chapter has a page on one side of its image: kicker, heading and every paragraph, and only those', () => {
    const { container } = renderStory();
    for (const section of maryCeleste.story) {
      const chapter = chapterOf(container, section);
      const page = chapter.querySelector<HTMLElement>('[data-story="page"]')!;
      expect(page.className).toContain('lg:w-[calc(42%+var(--heading-widen,0px))]');
      expect(page.className).toContain('lg:right-auto');
      expect(page.querySelector('[data-story="kicker"]')?.textContent).toBe(section.kicker);
      expect(page.querySelector('[data-story="heading"]')?.textContent).toBe(section.heading);
      const paragraphs = [...page.querySelectorAll('[data-story="paragraph"]')].map(paragraph => paragraph.textContent);
      expect(paragraphs).toEqual(section.body.map(plainText));
      // The roll call is never in the page: it has its own column on the other side.
      expect(page.querySelectorAll('[data-story="name"]')).toHaveLength(0);
    }
  });

  test('the roll call has its own quiet column on the other side of the screen from the page', () => {
    const { container } = renderStory();
    const section = maryCeleste.story.find(entry => entry.rollCall !== undefined)!;
    const chapter = chapterOf(container, section);
    const column = chapter.querySelector<HTMLElement>('[data-story="roll-call-column"]')!;
    expect(column.closest('[data-story="page"]')).toBeNull();
    expect(column.querySelectorAll('[data-story="name"]')).toHaveLength(section.rollCall!.length);
    // The page is on the left; the column on the right (along the top on phones, with the page at the bottom).
    expect(column.className).toContain('lg:right-[');
    expect(column.className).toContain('lg:inset-x-auto');
    expect(column.className).toContain('top-[');
    expect(column.querySelector('[data-story="crew-slip"]')).not.toBeNull();
    // Its own pen, in its own column.
    expect(column.querySelector('[data-roll="quill"]')).not.toBeNull();
  });

  test('every heading in the case is set to a single line: no wrapping, fitted to the panel, which can widen', () => {
    for (const reducedMotion of [false, true]) {
      cleanup();
      vi.unstubAllGlobals();
      stubMatchMedia({ reducedMotion });
      vi.stubGlobal('scrollTo', vi.fn());
      const { container } = renderStory();
      for (const section of maryCeleste.story) {
        const page = chapterOf(container, section).querySelector<HTMLElement>('[data-story="page"]')!;
        const heading = page.querySelector<HTMLElement>('h2')!;
        expect(heading.textContent).toContain(section.heading);
        expect(heading.dataset.fit).toBe('heading');
        expect(heading.className).toContain('whitespace-nowrap');
        expect(heading.className).not.toContain('text-balance');
        expect(page.className).toContain('var(--heading-widen,0px)');
      }
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

  test('on a phone-width screen each page lies along the bottom, over the image', () => {
    const { container } = renderStory();
    const page = container.querySelector<HTMLElement>('[data-story="page"]')!;
    expect(page.className).toContain('inset-x-0');
    expect(page.className).toContain('bottom-0');
    expect(page.className).toContain('max-h-[78svh]');
  });
});

describe('Story: scenes', () => {
  test('one full-screen scene per chapter, in one fixed stage, in the order of the case data', () => {
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

  test('every image keeps its credit behind an ⓘ and its caption; no visible "Illustration" tag, the ⓘ says it', () => {
    for (const reducedMotion of [false, true]) {
      cleanup();
      vi.unstubAllGlobals();
      stubMatchMedia({ reducedMotion });
      vi.stubGlobal('scrollTo', vi.fn());
      const { container } = renderStory();
      for (const section of maryCeleste.story) {
        const chapter = chapterOf(container, section);
        const image = section.image!;
        expect(within(chapter).getByRole('img', { name: image.alt })).toBeDefined();
        const credit = within(chapter).getByRole('tooltip', { hidden: true }).textContent ?? '';
        expect(credit.startsWith('AI illustration.')).toBe(image.isIllustration);
        expect(credit).toContain(image.credit);
        expect(chapter.querySelector('[data-story="illustration"]')).toBeNull();
        expect(chapter.textContent).not.toMatch(/^Illustration$/m);
      }
    }
    cleanup();
    vi.unstubAllGlobals();
    stubMatchMedia();
    vi.stubGlobal('scrollTo', vi.fn());
    const { container } = renderStory();
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
  test('chapter 1\'s roll call is a crew list: a slip of aged paper, headed from the case data, with dark ink', () => {
    const { container } = renderStory();
    const section = maryCeleste.story[0];
    const slip = chapterOf(container, section).querySelector<HTMLElement>('[data-story="crew-slip"]')!;
    expect(slip.className).toContain('story-crew-slip');
    expect(slip.className).toMatch(/rotate-\[/);
    expect(slip.querySelector('[data-story="crew-title"]')?.textContent).toBe(section.rollCallTitle);
    expect(section.rollCallTitle).toBe('Crew list · Mary Celeste · Nov. 1872');
    expect(slip.closest('[data-story="page"]')).toBeNull();
    // Dark ink on paper, never light text straight on the image.
    for (const name of slip.querySelectorAll<HTMLElement>('[data-story="name"] > span')) {
      expect(name.className).toMatch(/text-ink/);
      expect(name.className).not.toMatch(/text-night-ink|text-ghost-night/);
    }
    expect(slip.querySelector('[data-roll="quill-body"]')?.getAttribute('class')).toContain('text-ink');
  });

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

  test('each chapter shows its image with the whole page already written, then the hook as plain text', () => {
    const { container } = renderStory();
    for (const section of maryCeleste.story) {
      const chapter = chapterOf(container, section);
      const page = chapter.querySelector<HTMLElement>('[data-story="page"]')!;
      expect(page.className).toContain('lg:w-[calc(42%+var(--heading-widen,0px))]');
      expect(chapter.querySelector('[data-story="pane"] img')).not.toBeNull();
      // No pen: nothing is split to be written.
      expect(page.querySelector('[data-pen]')).toBeNull();
      expect(page.querySelector('[data-story="quill"]')).toBeNull();
      const hook = chapter.querySelector('[data-hook="true"]');
      expect(hook?.textContent).toBe(section.hook === undefined ? undefined : plainText(section.hook));
      if (hook !== null) {
        expect(page.contains(hook)).toBe(false);
      }
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

describe('Story: step 0 is the play modal', () => {
  test('before the reader has chosen, no gesture moves the story, and the page still scrolls', () => {
    const { container } = renderStory(testCase);
    expect(stepOf(container)).toBe('none');
    wheelBurst(stageOf(container), { count: 20 });
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    expect(stepOf(container)).toBe('none');
    expect(document.documentElement.dataset.storyStage).toBeUndefined();
    expect(container.querySelector<HTMLElement>('[data-story="rail"]')?.dataset.visible).toBe('false');
  });

  test('once chosen, the story begins on the first page: the stage holds the screen and the pen starts writing', () => {
    const scrollTo = vi.fn();
    vi.stubGlobal('scrollTo', scrollTo);
    const { container } = renderStory(testCase, READ);
    expect(stepOf(container)).toBe('page-0');
    expect(document.documentElement.dataset.storyStage).toBe('held');
    // The page is put at the story's top at once.
    expect(scrollTo).toHaveBeenCalled();
    const page = container.querySelector<HTMLElement>('[data-story="page"]')!;
    expect(page.dataset.written).toBeUndefined();
    expect(container.querySelector<HTMLElement>('[data-story="rail"]')?.dataset.visible).toBe('true');
  });

  test('when the story leaves the page, the screen scrolls again', () => {
    const { unmount } = renderStory(testCase, READ);
    unmount();
    expect(document.documentElement.dataset.storyStage).toBeUndefined();
  });
});

describe('Story: one gesture, one step', () => {
  test('a burst of 50 wheel events moves exactly one step', () => {
    const { container } = renderStory(maryCeleste, READ);
    finishWriting(container);
    wheelBurst(stageOf(container), { count: 50 });
    expect(stepOf(container)).toBe('hook-0');
    settleSteps();
    expect(stepOf(container)).toBe('hook-0');
  });

  test('while a step animates, input is ignored, and a burst that met it is swallowed, tail and all', () => {
    const { container } = renderStory(maryCeleste, READ);
    finishWriting(container);
    wheelBurst(stageOf(container));
    expect((container.querySelector('[data-story="root"]') as HTMLElement).dataset.animating).toBe('true');
    // A new flick while the hook comes in: nothing.
    wheelBurst(stageOf(container), { count: 10, after: 400 });
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    expect(stepOf(container)).toBe('hook-0');
    settleSteps();
    // The same flick's tail, after the step is done: still nothing.
    wheelBurst(stageOf(container), { count: 5, after: 20 });
    expect(stepOf(container)).toBe('hook-0');
    // A new flick: the next step.
    wheelBurst(stageOf(container));
    expect(stepOf(container)).toBe('page-1');
  });

  test('a forward gesture while the pen writes finishes the page and stays; the next one moves on', () => {
    const { container } = renderStory(testCase, READ);
    const page = container.querySelector<HTMLElement>('[data-story="page"]')!;
    wheelBurst(stageOf(container));
    expect(stepOf(container)).toBe('page-0');
    expect(page.dataset.written).toBe('true');
    wheelBurst(stageOf(container));
    expect(stepOf(container)).toBe('hook-0');
  });

  test('back works the same way, one step at a time, and a page returned to is already written', () => {
    const { container } = renderStory(testCase, READ);
    finishWriting(container);
    wheelBurst(stageOf(container));
    settleSteps();
    wheelBurst(stageOf(container));
    settleSteps();
    expect(stepOf(container)).toBe('page-1');
    wheelBurst(stageOf(container), { deltaY: -60 });
    settleSteps();
    expect(stepOf(container)).toBe('hook-0');
    wheelBurst(stageOf(container), { deltaY: -60 });
    settleSteps();
    expect(stepOf(container)).toBe('page-0');
    expect(container.querySelector<HTMLElement>('[data-story="page"]')?.dataset.written).toBe('true');
    // Before the first page there is only the play modal: back goes nowhere.
    wheelBurst(stageOf(container), { deltaY: -60 });
    settleSteps();
    expect(stepOf(container)).toBe('page-0');
  });

  test('the keyboard: ↓, PageDown and Space forward; ↑ and PageUp back; Home to the start', () => {
    const { container } = renderStory(maryCeleste, READ);
    finishWriting(container);
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    settleSteps();
    expect(stepOf(container)).toBe('hook-0');
    fireEvent.keyDown(window, { key: 'PageDown' });
    settleSteps();
    expect(stepOf(container)).toBe('page-1');
    finishWriting(container);
    fireEvent.keyDown(window, { key: ' ' });
    settleSteps();
    expect(stepOf(container)).toBe('hook-1');
    fireEvent.keyDown(window, { key: 'ArrowUp' });
    settleSteps();
    expect(stepOf(container)).toBe('page-1');
    fireEvent.keyDown(window, { key: 'PageUp' });
    settleSteps();
    expect(stepOf(container)).toBe('hook-0');
    fireEvent.keyDown(window, { key: 'Home' });
    settleSteps();
    expect(stepOf(container)).toBe('page-0');
  });

  test('the keys do nothing while a portal card is open', () => {
    const { container } = renderStory(testCase, READ);
    finishWriting(container);
    fireEvent.click(container.querySelector('[data-story="page"] [data-portal-trigger="thing"]') as HTMLElement);
    expect(screen.getByRole('dialog', { name: 'The thing' })).toBeDefined();
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    wheelBurst(stageOf(container));
    expect(stepOf(container)).toBe('page-0');
  });
});

describe('Story: hooks', () => {
  const hookOf = (container: HTMLElement, index: number) =>
    chapterOf(container, maryCeleste.story[index]).querySelector<HTMLElement>('[data-story="hook-moment"]')!;
  const lettersOf = (hook: HTMLElement) => [...hook.querySelectorAll<HTMLElement>('[data-story="hook-char"]')];

  test('a hook snaps in whole on a timer once its step is reached, its letters settling from out of line', () => {
    const { container } = renderStory(maryCeleste, READ);
    const hook = hookOf(container, 0);
    expect(hook.textContent?.replace(/\s+/g, ' ').trim()).toBe(maryCeleste.story[0].hook);
    const letters = lettersOf(hook);
    const snap = gsap.getTweensOf(letters[0]).find(tween => tween.vars.opacity === 1 && tween.vars.ease === 'back.out(2.2)')!;
    expect(snap.parent!.duration()).toBeCloseTo(STORY_PACE.hookIn, 5);
    const from = snap.vars.startAt as { rotation: (index: number) => number };
    expect(letters.map((_, index) => Math.abs(from.rotation(index))).every(value => value <= 12)).toBe(true);
    finishWriting(container);
    wheelBurst(stageOf(container));
    settleSteps();
    expect(hook.style.opacity).toBe('1');
    expect(letters.every(letter => letter.style.opacity === '1')).toBe(true);
  });

  test('only the current step\'s hook can be visible: entering a step hides every other hook and page at once', () => {
    const { container } = renderStory(maryCeleste, READ);
    // A stray fragment of another chapter's hook, left on screen.
    const stray = hookOf(container, 3);
    gsap.set([stray, ...lettersOf(stray)], { opacity: 1 });
    finishWriting(container);
    wheelBurst(stageOf(container));
    expect(stray.style.opacity).toBe('0');
    expect(lettersOf(stray).every(letter => letter.style.opacity === '0')).toBe(true);
    settleSteps();
    const scenes = [...container.querySelectorAll<HTMLElement>('[data-story="chapter"]')];
    expect(scenes.map(scene => scene.style.opacity)).toEqual(scenes.map((_, index) => (index === 0 ? '1' : '0')));
    expect(scenes.map(scene => scene.dataset.active)).toEqual(scenes.map((_, index) => String(index === 0)));
  });

  test('leaving a hook, its letters decay one at a time in an uneven order; then the next image dissolves in', () => {
    const { container } = renderStory(maryCeleste, READ);
    finishWriting(container);
    wheelBurst(stageOf(container));
    settleSteps();
    wheelBurst(stageOf(container));
    const letters = lettersOf(hookOf(container, 0));
    const decay = gsap.getTweensOf(letters[0]).find(tween => tween.vars.opacity === 0 && tween.vars.ease === 'power1.in')!;
    expect(decay).toBeDefined();
    const order = (decay.targets() as HTMLElement[]).map(target => letters.indexOf(target));
    expect(order).not.toEqual(letters.map((_, index) => index));
    const next = chapterOf(container, maryCeleste.story[1]);
    const dissolve = gsap.getTweensOf(next).find(tween => tween.vars.opacity === 1)!;
    expect(dissolve.startTime()).toBeGreaterThanOrEqual(decay.startTime());
    settleSteps();
    expect(stepOf(container)).toBe('page-1');
    expect(hookOf(container, 0).style.opacity).toBe('0');
  });

  test('before the hook: the names fade off the crew list last to first, the page and corners dim, the chart goes quiet', () => {
    const { container } = renderStory(maryCeleste, READ);
    finishWriting(container);
    const chapter = chapterOf(container, maryCeleste.story[0]);
    const chart = container.querySelector<HTMLElement>('[data-chart="frame"][data-variant="live"]')!;
    wheelBurst(stageOf(container));
    const names = [...chapter.querySelectorAll<HTMLElement>('[data-story="name"]')];
    const outAt = (name: Element) => gsap.getTweensOf(name).find(tween => tween.vars.opacity === 0 && tween.vars.ease === 'power2.in')!.startTime();
    expect(outAt(names.at(-1)!)).toBeLessThan(outAt(names[0]));
    const pageOut = gsap.getTweensOf(chapter.querySelector('[data-story="page"]')!).find(tween => tween.vars.opacity === 0)!;
    expect(pageOut.startTime()).toBeGreaterThan(outAt(names[0]));
    expect(gsap.getTweensOf(chapter.querySelector('[data-story="corners"]')!).some(tween => tween.vars.opacity === 0)).toBe(true);
    expect(chart.dataset.hushed).toBe('true');
    // The paper itself stays, and is left empty.
    const slip = chapter.querySelector<HTMLElement>('[data-story="crew-slip"]')!;
    expect(gsap.getTweensOf(slip)).toHaveLength(0);
    settleSteps();
    expect(chart.dataset.hushed).toBe('true');
    expect(names.every(name => name.style.opacity === '0')).toBe(true);
    expect(slip.style.opacity).toBe('');
    // Back on the page, the names are there again.
    wheelBurst(stageOf(container), { deltaY: -60 });
    settleSteps();
    expect(names.every(name => name.style.opacity === '1')).toBe(true);
  });

  test('story events: each chapter is entered, each hook comes, in order', () => {
    const events: StoryEvent[] = [];
    const stop = onStoryEvent(event => events.push(event));
    try {
      const { container } = renderStory(testCase, READ);
      finishWriting(container);
      for (let step = 0; step < 2; step += 1) {
        wheelBurst(stageOf(container));
        settleSteps();
        finishWriting(container);
      }
    } finally {
      stop();
    }
    expect(events.filter(event => event.type !== 'beat').map(event => `${event.type}:${(event as { chapter?: string }).chapter}`)).toEqual([
      'chapter-enter:s-one',
      'hook:s-one',
      'chapter-enter:s-two',
    ]);
  });
});

describe('Story: the pen writes the page', () => {
  const pageOf = (container: HTMLElement, section: StorySection) => chapterOf(container, section).querySelector<HTMLElement>('[data-story="page"]')!;
  const lettersOf = (container: HTMLElement, section: StorySection) =>
    [...chapterOf(container, section).querySelectorAll<HTMLElement>('[data-story="heading"] *')].filter(element => element.children.length === 0);
  const writingOf = (letter: HTMLElement) =>
    gsap.getTweensOf(letter).find(tween => tween.parent !== gsap.globalTimeline)!.parent as gsap.core.Timeline;
  const unitsOf = (container: HTMLElement, section: StorySection) =>
    [...pageOf(container, section).querySelectorAll<HTMLElement>('[data-story="body"] [data-pen="char"]')];

  test('each page has its own timed writing, paused until its step is reached', () => {
    const { container } = renderStory(testCase);
    const writing = writingOf(lettersOf(container, testCase.story[1])[0]);
    expect(writing.paused()).toBe(true);
    expect(writing.data).not.toBe('story-step');
  });

  test('reaching a page starts its pen', () => {
    const { container } = renderStory(testCase, READ);
    const writing = writingOf(lettersOf(container, testCase.story[1])[0]);
    finishWriting(container);
    wheelBurst(stageOf(container));
    settleSteps();
    wheelBurst(stageOf(container));
    // The dissolve: the pen waits for it.
    expect(writing.paused()).toBe(true);
    act(() => {
      gsap.globalTimeline
        .getChildren(false, false, true)
        .filter(child => child.data === 'story-step')
        .forEach(child => child.progress(1));
    });
    expect(writing.paused()).toBe(false);
    expect(writing.progress()).toBeLessThan(1);
  });

  test('the same pen writes the heading, then the whole body, after the kicker is typed', () => {
    const { container } = renderStory(testCase);
    const heading = lettersOf(container, testCase.story[1]);
    const body = unitsOf(container, testCase.story[1]);
    expect(body.length).toBeGreaterThan(0);
    expect(writingOf(body[0])).toBe(writingOf(heading[0]));
    const lastHeading = gsap.getTweensOf(heading.at(-1)!)[0];
    expect(gsap.getTweensOf(body[0])[0].startTime()).toBeGreaterThanOrEqual(lastHeading.startTime());
    expect(body.every(unit => unit.style.opacity === '0')).toBe(true);
  });

  test('it writes at a steady pace that leads the eye, and is done in seconds', () => {
    const { container } = renderStory();
    for (const section of maryCeleste.story) {
      expect(writingOf(lettersOf(container, section)[0]).duration()).toBeLessThanOrEqual(11);
    }
  });

  test('a click on the panel finishes the writing at once', () => {
    const { container } = renderStory(testCase, READ);
    const writing = writingOf(lettersOf(container, testCase.story[0])[0]);
    expect(writing.progress()).toBeLessThan(1);
    fireEvent.click(pageOf(container, testCase.story[0]));
    expect(writing.progress()).toBe(1);
    expect(pageOf(container, testCase.story[0]).dataset.written).toBe('true');
  });

  test('a jump from the rail: the pages before it count as written, with no pen', () => {
    const { container } = renderStory(maryCeleste, READ);
    const ticks = [...container.querySelectorAll<HTMLButtonElement>('[data-story="rail-tick"]')];
    fireEvent.click(ticks[3]);
    settleSteps();
    expect(stepOf(container)).toBe('page-3');
    for (const section of maryCeleste.story.slice(0, 3)) {
      expect(pageOf(container, section).dataset.written).toBe('true');
    }
  });

  test('weighted phrases are written slightly brighter, with no line', () => {
    const { container } = renderStory();
    const voyage = maryCeleste.story.find(section => section.id === 's-voyage')!;
    const weighted = [...pageOf(container, voyage).querySelectorAll<HTMLElement>('[data-pen="weighted"]')];
    expect(weighted.map(span => span.textContent)).toEqual(voyage.emphasis);
    expect(weighted[0].className).toContain('text-night-ink');
    expect(container.querySelector('[data-story="weight-line"]')).toBeNull();
  });

  test('the roll call is written after the body, by the pen in its own place', () => {
    const { container } = renderStory();
    const chapter = chapterOf(container, maryCeleste.story.find(section => section.rollCall !== undefined)!);
    const lastBody = [...chapter.querySelectorAll<HTMLElement>('[data-story="body"] [data-pen="word"]')].at(-1)!;
    const firstName = chapter.querySelector<HTMLElement>('[data-story="roll-call"] [data-pen="word"]')!;
    const at = (element: HTMLElement) =>
      gsap.getTweensOf(element)[0]?.startTime() ?? gsap.getTweensOf(element.querySelector('[data-pen="char"]')!)[0].startTime();
    expect(at(firstName)).toBeGreaterThan(at(lastBody));
  });
});

describe('Story: the progress rail', () => {
  test('one tick per chapter and one for the question, each named by its heading; the current one is lit', () => {
    const { container } = renderStory(maryCeleste, READ);
    const ticks = [...container.querySelectorAll<HTMLButtonElement>('[data-story="rail-tick"]')];
    expect(ticks).toHaveLength(maryCeleste.story.length + 1);
    expect(ticks.slice(0, -1).map(tick => tick.getAttribute('aria-label'))).toEqual(maryCeleste.story.map(section => section.heading));
    expect(ticks.map(tick => tick.dataset.current)).toEqual(ticks.map((_, index) => String(index === 0)));
    finishWriting(container);
    wheelBurst(stageOf(container));
    settleSteps();
    // The hook is still chapter 1's.
    expect(ticks[0].dataset.current).toBe('true');
  });

  test('clicking the question tick goes to its first line; the rail hides while the fork is open', () => {
    const { container } = render(
      <MemoryRouter>
        <Story
          story={testCase.story}
          centralQuestion={maryCeleste.centralQuestion}
          references={testCase.references}
          sources={testCase.sources}
          fork={{ fork: maryCeleste.fork, historiansSummary: maryCeleste.historiansSummary, filesHref: '/files' }}
          start={READ}
        />
      </MemoryRouter>
    );
    const ticks = [...container.querySelectorAll<HTMLButtonElement>('[data-story="rail-tick"]')];
    fireEvent.click(ticks.at(-1)!);
    settleSteps();
    expect(stepOf(container)).toBe('line-0');
    expect(ticks.at(-1)?.dataset.current).toBe('true');
  });
});

describe('Story: the central question, one line per step', () => {
  const FORK = { fork: maryCeleste.fork, historiansSummary: maryCeleste.historiansSummary, filesHref: '/case/mary-celeste/files' };
  function renderQuestion(start: Start = READ) {
    return render(
      <MemoryRouter>
        <Story
          story={testCase.story}
          centralQuestion={maryCeleste.centralQuestion}
          centralQuestionEmphasis={maryCeleste.centralQuestionEmphasis}
          references={testCase.references}
          sources={testCase.sources}
          fork={FORK}
          start={start}
        />
      </MemoryRouter>
    );
  }
  /** To the question's first line, by the rail. */
  const toQuestion = (container: HTMLElement) => {
    fireEvent.click([...container.querySelectorAll<HTMLButtonElement>('[data-story="rail-tick"]')].at(-1)!);
    settleSteps();
  };
  const settleFork = () =>
    act(() => {
      const choices = document.querySelector('[data-fork="choices"]');
      gsap.getTweensOf(choices).forEach(tween => (tween.parent ?? tween).progress(1));
    });

  test('a full-black screen over the stage; screen readers get the whole question at once', () => {
    const { container } = renderQuestion(null);
    const layer = container.querySelector<HTMLElement>('[data-story="question-layer"]')!;
    expect(stageOf(container).contains(layer)).toBe(true);
    expect(layer.querySelector('[data-story="question"]')?.className).toContain('bg-black');
    expect(within(layer).getByRole('heading', { name: maryCeleste.centralQuestion })).toBeDefined();
    expect(container.querySelector('[data-story="after-question"]')).toBeNull();
  });

  test('each line is a step: it plays in on a timer when reached, and leaves when the reader goes back', () => {
    const { container } = renderQuestion();
    const phrases = [...container.querySelectorAll<HTMLElement>('[data-story="phrase"]')];
    toQuestion(container);
    expect(phrases.map(phrase => phrase.style.opacity)).toEqual(phrases.map((_, index) => (index === 0 ? '1' : '0')));
    wheelBurst(stageOf(container));
    const playIn = gsap.getTweensOf(phrases[1]).find(tween => tween.vars.ease === 'power3.out')!;
    expect(playIn.vars.duration).toBe(STORY_PACE.questionPhrase);
    settleSteps();
    expect(stepOf(container)).toBe('line-1');
    expect(phrases[1].style.opacity).toBe('1');
    wheelBurst(stageOf(container), { deltaY: -60 });
    settleSteps();
    expect(stepOf(container)).toBe('line-0');
    expect(phrases[1].style.opacity).toBe('0');
  });

  test('the lines come from the case data when it has them, and the weighted parts still land', () => {
    const { container } = render(
      <Story
        story={testCase.story}
        centralQuestion={maryCeleste.centralQuestion}
        centralQuestionEmphasis={maryCeleste.centralQuestionEmphasis}
        centralQuestionLines={maryCeleste.centralQuestionLines}
        references={testCase.references}
        sources={testCase.sources}
        start={READ}
      />
    );
    const phrases = [...container.querySelectorAll<HTMLElement>('[data-story="phrase"]')].map(phrase => phrase.textContent);
    expect(phrases).toEqual(maryCeleste.centralQuestionLines);
    const weighted = [...container.querySelectorAll('[data-story="question"] [data-story="weighted"]')].map(span => span.textContent);
    expect(weighted).toEqual(maryCeleste.centralQuestionEmphasis);
    // One step per line.
    fireEvent.click([...container.querySelectorAll<HTMLButtonElement>('[data-story="rail-tick"]')].at(-1)!);
    settleSteps();
    for (let line = 1; line < phrases.length; line += 1) {
      wheelBurst(stageOf(container));
      settleSteps();
    }
    expect(stepOf(container)).toBe(`line-${phrases.length - 1}`);
  });

  test('its weighted parts land on their own after their line, slightly brighter, and no red line anywhere', () => {
    const { container } = renderQuestion();
    const weighted = [...container.querySelectorAll<HTMLElement>('[data-story="question"] [data-story="weighted"]')];
    expect(weighted.map(span => span.textContent)).toEqual(maryCeleste.centralQuestionEmphasis);
    const land = gsap.getTweensOf(weighted[1])[0];
    expect(land.vars).toMatchObject({ opacity: 1, ease: 'power4.out' });
    const phraseIn = gsap.getTweensOf(weighted[1].closest('[data-story="phrase"]')!)[0];
    expect(land.parent).toBe(phraseIn.parent);
    expect(land.startTime()).toBeGreaterThan(phraseIn.startTime() + phraseIn.duration());
    expect(weighted[1].className).toContain('text-night-ink');
    expect(container.querySelector('[class*="bg-rust"]')).toBeNull();
  });

  test('after the last line, the next step opens the fork: rising, then settling', () => {
    const { container } = renderQuestion();
    toQuestion(container);
    const lines = container.querySelectorAll('[data-story="phrase"]').length;
    for (let line = 1; line < lines; line += 1) {
      wheelBurst(stageOf(container));
      settleSteps();
    }
    expect(screen.queryByRole('dialog', { name: 'What next' })).toBeNull();
    wheelBurst(stageOf(container));
    settleSteps();
    expect(stepOf(container)).toBe('fork');
    const dialog = screen.getByRole('dialog', { name: 'What next' });
    expect(gsap.getTweensOf(dialog).map(tween => tween.vars.ease)).toEqual(['power2.out', 'back.out(1.15)']);
    settleFork();
    expect(within(dialog).getByRole('link', { name: maryCeleste.fork.investigateLabel }).getAttribute('href')).toBe(FORK.filesHref);
    // No gesture moves on past the fork.
    wheelBurst(stageOf(container));
    expect(stepOf(container)).toBe('fork');
  });

  test('Escape on the fork closes it, back to the whole question; so does a gesture back', async () => {
    const { container } = renderQuestion();
    toQuestion(container);
    const lines = container.querySelectorAll('[data-story="phrase"]').length;
    for (let line = 0; line < lines; line += 1) {
      wheelBurst(stageOf(container));
      settleSteps();
    }
    const dialog = screen.getByRole('dialog', { name: 'What next' });
    fireEvent.keyDown(dialog, { key: 'Escape' });
    settleSteps();
    expect(stepOf(container)).toBe(`line-${lines - 1}`);
    await vi.waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    wheelBurst(stageOf(container));
    settleSteps();
    expect(screen.getByRole('dialog', { name: 'What next' })).toBeDefined();
    wheelBurst(stageOf(container), { deltaY: -60 });
    settleSteps();
    expect(stepOf(container)).toBe(`line-${lines - 1}`);
  });

  test('"I\'ve heard enough" shows where historians stand, with two quiet links', () => {
    const { container } = renderQuestion();
    toQuestion(container);
    const lines = container.querySelectorAll('[data-story="phrase"]').length;
    for (let line = 0; line < lines; line += 1) {
      wheelBurst(stageOf(container));
      settleSteps();
    }
    const dialog = screen.getByRole('dialog', { name: 'What next' });
    settleFork();
    fireEvent.click(within(dialog).getByRole('button', { name: maryCeleste.fork.leaveLabel }));
    for (const paragraph of maryCeleste.historiansSummary) {
      expect(within(dialog).getByText(paragraph)).toBeDefined();
    }
    expect(within(dialog).getByRole('link', { name: 'Back to all cases' }).getAttribute('href')).toBe('/');
  });

  test('reduced motion: on a normal page the question is shown whole, and the fork appears without animation', () => {
    vi.unstubAllGlobals();
    stubMatchMedia({ reducedMotion: true });
    vi.stubGlobal('scrollTo', vi.fn());
    const { container } = renderQuestion(null);
    expect(container.querySelector('[data-story="stage"]')).toBeNull();
    const phrases = [...container.querySelectorAll<HTMLElement>('[data-story="phrase"]')];
    expect(new Set(phrases.map(phrase => gsap.getTweensOf(phrase)[0])).size).toBe(1);
    expect(container.querySelector('[data-story="after-question"]')?.className).toContain('bg-black');
    const opener = ScrollTrigger.getAll().find(trigger => trigger.vars.start === 'bottom 60%')!;
    act(() => opener.vars.onEnter?.(opener));
    expect(gsap.getTweensOf(screen.getByRole('dialog', { name: 'What next' }))).toHaveLength(0);
  });
});

describe('Story: play the story', () => {
  test('it waits for the pen, then holds the page for its reading time, then moves one step on', async () => {
    const { container } = renderStory(testCase, PLAY);
    // Spied after render, so only the player's holds are seen (GSAP's Observer keeps a timer of its own).
    const delayed = vi.spyOn(gsap, 'delayedCall');
    const flush = () =>
      act(async () => {
        for (let tick = 0; tick < 4; tick += 1) {
          await Promise.resolve();
        }
      });
    /** Ends the hold now under way. */
    const endHold = () =>
      act(() => {
        (delayed.mock.results.at(-1)?.value as gsap.core.Tween | undefined)?.progress(1);
      });
    const control = container.querySelector('[data-story="play-control"]') as HTMLButtonElement;
    expect(control.getAttribute('aria-pressed')).toBe('true');
    await flush();
    // The pen is still writing: no hold yet.
    expect(delayed).not.toHaveBeenCalled();
    expect(stepOf(container)).toBe('page-0');
    const writing = gsap
      .getTweensOf(container.querySelector('[data-story="page"] [data-pen="char"]')!)
      .find(tween => tween.parent !== gsap.globalTimeline)!.parent as gsap.core.Timeline;
    act(() => {
      writing.progress(1);
    });
    await flush();
    expect(delayed).toHaveBeenCalledTimes(1);
    expect(delayed.mock.calls[0][0]).toBeGreaterThanOrEqual(STORY_PACE.playHoldAtLeast);
    endHold();
    await flush();
    expect(stepOf(container)).toBe('hook-0');
    settleSteps();
    await flush();
    expect(delayed.mock.calls[1][0]).toBe(STORY_PACE.hookHold);
  });

  test('any wheel, touch, pointer or key input pauses it; the floating control plays and pauses it', () => {
    const { container } = renderStory(testCase, PLAY);
    const control = container.querySelector('[data-story="play-control"]') as HTMLButtonElement;
    expect(control.getAttribute('aria-pressed')).toBe('true');
    wheelBurst(stageOf(container));
    expect(control.getAttribute('aria-pressed')).toBe('false');
    act(() => {
      fireEvent.click(control);
    });
    expect(control.getAttribute('aria-label')).toBe('Pause the story');
    act(() => {
      fireEvent.keyDown(window, { key: 'ArrowDown' });
    });
    expect(control.getAttribute('aria-pressed')).toBe('false');
  });

  test('a key pressed on the control itself does not count as taking over', () => {
    const { container } = renderStory(testCase, PLAY);
    const control = container.querySelector('[data-story="play-control"]') as HTMLButtonElement;
    act(() => {
      fireEvent.keyDown(control, { key: 'Enter' });
    });
    expect(control.getAttribute('aria-pressed')).toBe('true');
  });

  test('opening a portal pauses it', () => {
    const { container } = renderStory(testCase, PLAY);
    const control = container.querySelector('[data-story="play-control"]') as HTMLButtonElement;
    act(() => {
      fireEvent.click(container.querySelector('[data-story="page"] [data-portal-trigger="thing"]') as HTMLElement);
    });
    expect(control.getAttribute('aria-pressed')).toBe('false');
  });

  test('only the scene on screen takes clicks: the first is active, the others are not', () => {
    const { container } = renderStory();
    const scenes = [...container.querySelectorAll<HTMLElement>('[data-story="chapter"]')];
    expect(scenes.map(scene => scene.dataset.active)).toEqual(scenes.map((_, index) => String(index === 0)));
  });
});

describe('Story: the chart and the sky follow the steps', () => {
  test('each stretch of the voyage is drawn once its chapter\'s page is on screen, in order', () => {
    const { container } = renderStory(maryCeleste, READ);
    const reveals = [...container.querySelectorAll<SVGElement>('[data-chart="frame"][data-variant="live"] [data-chart="reveal"]')];
    expect(reveals.length).toBeGreaterThan(0);
    const offsets = () => reveals.map(reveal => reveal.getAttribute('stroke-dashoffset'));
    fireEvent.click([...container.querySelectorAll<HTMLButtonElement>('[data-story="rail-tick"]')].at(-2)!);
    settleSteps();
    // Every stretch that ends before the last chapter is drawn.
    expect(offsets().slice(0, -1).every(offset => offset === '0')).toBe(true);
  });

  test('day into night: the sky darkens chapter by chapter, and the question is full night', () => {
    const { container } = renderStory(maryCeleste, READ);
    const root = container.querySelector('[data-story="root"]') as HTMLElement;
    const morning = root.style.getPropertyValue('--story-sky');
    const ticks = [...container.querySelectorAll<HTMLButtonElement>('[data-story="rail-tick"]')];
    fireEvent.click(ticks.at(-1)!);
    settleSteps();
    expect(root.style.getPropertyValue('--story-sky')).not.toBe(morning);
    expect(root.dataset.tone).toBe('night-ink');
  });

  test('no scene image carries a permanent will-change; only the one on screen moves', () => {
    const { container } = renderStory(maryCeleste, READ);
    const images = [...container.querySelectorAll<HTMLElement>('[data-story="image"]')];
    for (const image of images) {
      expect(image.className).not.toContain('will-change');
    }
    expect(images.slice(1).every(image => image.style.willChange === '')).toBe(true);
  });
});
