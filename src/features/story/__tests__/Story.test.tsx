// @vitest-environment jsdom
// src/features/story/__tests__/Story.test.tsx
// The cinematic story (docs/briefs/story-redesign.md): every chapter's full text is in the DOM, the beats are for
// the eyes only, the roll call and the chart come from the data, playing can be paused, and reduced motion gives
// plain stacked sections.
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import maryCeleste from '@/cases/mary-celeste/case';
import Story from '@/features/story/Story';
import { parseRefs } from '@/lib/parse-refs';
import { splitIntoBeats } from '@/lib/story-beats';
import { splitIntoPhrases } from '@/lib/phrases';
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

  test('the beats, one sentence each, are for the eyes only', () => {
    const { container } = renderStory();

    for (const section of maryCeleste.story) {
      const chapter = chapterOf(container, section);
      const beats = chapter.querySelector('[data-story="beats"]') as HTMLElement;
      expect(beats.getAttribute('aria-hidden')).toBe('true');
      expect([...beats.querySelectorAll('[data-story="beat"]')].map(beat => beat.textContent)).toEqual(
        section.body.flatMap(splitIntoBeats).map(plainText)
      );
      if (section.hook !== undefined) {
        expect(chapter.querySelector('[data-story="hook-moment"]')?.getAttribute('aria-hidden')).toBe('true');
      }
    }
  });

  test('portals in the beats stay tappable but out of the Tab order; the full text has them for the keyboard', () => {
    const { container } = renderStory();

    const inBeats = [...container.querySelectorAll<HTMLElement>('[data-story="beats"] [data-portal-trigger]')];
    const inText = [...container.querySelectorAll<HTMLElement>('[data-story="text"] [data-portal-trigger]')];
    expect(inBeats.length).toBeGreaterThan(0);
    expect(inBeats.every(trigger => trigger.tabIndex === -1)).toBe(true);
    expect(inText.length).toBeGreaterThan(0);
    expect(inText.every(trigger => trigger.tabIndex === 0)).toBe(true);
    const ids = new Set(maryCeleste.references.map(reference => reference.id));
    expect(inText.every(trigger => ids.has(trigger.dataset.portalTrigger ?? ''))).toBe(true);
  });

  test('tapping a portal in a beat opens its card', () => {
    const { container } = renderStory(testCase);

    fireEvent.click(container.querySelector('[data-story="beats"] [data-portal-trigger="thing"]') as HTMLElement);

    expect(screen.getByRole('dialog', { name: 'The thing' })).toBeDefined();
  });

  test('ends on the central question, whole for screen readers and in phrases for the eyes', () => {
    const { container } = renderStory();

    const question = container.querySelector('[data-story="question"]') as HTMLElement;
    expect(within(question).getByRole('heading', { name: maryCeleste.centralQuestion })).toBeDefined();
    const phrases = [...question.querySelectorAll('[data-story="phrase"]')].map(phrase => phrase.textContent?.trim());
    expect(phrases).toEqual(splitIntoPhrases(maryCeleste.centralQuestion));
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

  test('starts with the hint, "Play the story" and "Read at my pace"', () => {
    const { container } = renderStory();
    const start = container.querySelector('[data-story="start"]') as HTMLElement;

    expect(start.querySelector('[data-story="hint"]')?.textContent).toBe('Scroll, or press play.');
    expect(within(start).getByRole('button', { name: 'Play the story' })).toBeDefined();
    expect(within(start).getByRole('button', { name: 'Read at my pace' })).toBeDefined();
  });

  test('play and pause toggle, from the start and from the floating control', () => {
    const { container } = renderStory();
    const control = container.querySelector('[data-story="play-control"]') as HTMLButtonElement;
    expect(control.getAttribute('aria-label')).toBe('Play the story');

    act(() => {
      fireEvent.click(within(container.querySelector('[data-story="start"]') as HTMLElement).getByRole('button', { name: 'Play the story' }));
    });
    expect(control.getAttribute('aria-label')).toBe('Pause the story');
    expect(control.getAttribute('aria-pressed')).toBe('true');
    expect((container.querySelector('[data-story="hint"]') as HTMLElement).dataset.gone).toBe('true');

    act(() => {
      fireEvent.click(control);
    });
    expect(control.getAttribute('aria-label')).toBe('Play the story');

    act(() => {
      fireEvent.click(control);
    });
    expect(control.getAttribute('aria-label')).toBe('Pause the story');
  });

  test.each([
    ['a wheel', () => fireEvent.wheel(window, { deltaY: 40 })],
    ['a touch', () => fireEvent.touchStart(window)],
    ['a key', () => fireEvent.keyDown(document.body, { key: 'ArrowDown' })],
  ])('%s pauses playback at once', (_label, input) => {
    const { container } = renderStory();
    const control = container.querySelector('[data-story="play-control"]') as HTMLButtonElement;

    act(() => {
      fireEvent.click(control);
    });
    expect(control.getAttribute('aria-pressed')).toBe('true');

    act(() => {
      input();
    });
    expect(control.getAttribute('aria-pressed')).toBe('false');
  });

  test('opening a portal pauses playback', () => {
    const { container } = renderStory(testCase);
    const control = container.querySelector('[data-story="play-control"]') as HTMLButtonElement;

    act(() => {
      fireEvent.click(control);
    });
    act(() => {
      fireEvent.click(container.querySelector('[data-story="beats"] [data-portal-trigger="thing"]') as HTMLElement);
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

  test('plain stacked scenes: no stage, no beats, still images, the full text shown', () => {
    const { container } = renderStory();

    const root = container.querySelector('[data-story="root"]') as HTMLElement;
    expect(root.dataset.mode).toBe('stacked');
    expect(container.querySelector('[data-story="stage"]')).toBeNull();
    expect(container.querySelector('[data-story="beats"]')).toBeNull();
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
    expect(document.querySelector('[data-story="hint"]')?.textContent).toBe('Scroll to read.');
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
