// @vitest-environment jsdom
// src/features/story/__tests__/Story.test.tsx
// The story renders every chapter from the case data: kicker, heading, body, hook and image, then the central question.
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import maryCeleste from '@/cases/mary-celeste/case';
import Story from '@/features/story/Story';
import { parseRefs } from '@/lib/parse-refs';
import { splitIntoPhrases } from '@/lib/phrases';
import { stubMatchMedia } from '@/test/match-media';
import type { Case, StorySection } from '@/types/case';

/** The text a reader sees: every {{ref:id|label}} shown as its label. */
const plainText = (text: string) =>
  parseRefs(text)
    .map(segment => (segment.kind === 'text' ? segment.text : segment.label))
    .join('');
const withoutSpaces = (text: string) => text.replace(/\s/g, '');

function renderStory(caseData: Pick<Case, 'story' | 'centralQuestion' | 'references' | 'sources'> = maryCeleste) {
  return render(
    <Story
      story={caseData.story}
      centralQuestion={caseData.centralQuestion}
      references={caseData.references}
      sources={caseData.sources}
    />
  );
}

const chapterOf = (container: HTMLElement, section: StorySection) =>
  container.querySelector(`[data-story="chapter"][data-chapter="${section.id}"]`) as HTMLElement;

/** Test data, not history. */
const testCase: Pick<Case, 'story' | 'centralQuestion' | 'references' | 'sources'> = {
  story: [
    {
      id: 's-one',
      kicker: 'Test place, test year',
      heading: 'First test heading',
      body: ['A first paragraph about {{ref:thing|the thing}}.', 'A second paragraph.'],
      hook: 'A test hook.',
      image: { src: '/one.webp', alt: 'Test alt one.', credit: 'Test credit one.', isIllustration: true },
    },
    { id: 's-two', heading: 'Second test heading', body: ['Only one paragraph, with {{ref:nobody|an unknown id}}.'] },
  ],
  centralQuestion: 'A test question, in two parts?',
  references: [{ id: 'thing', kind: 'term', label: 'The thing', profile: ['A test profile.'] }],
  sources: [],
};

beforeEach(() => {
  stubMatchMedia();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('Story: the Mary Celeste', () => {
  test('has six chapters, in the order of the case data', () => {
    const { container } = renderStory();

    const chapters = [...container.querySelectorAll('[data-story="chapter"]')];
    expect(maryCeleste.story).toHaveLength(6);
    expect(chapters.map(chapter => chapter.getAttribute('data-chapter'))).toEqual(
      maryCeleste.story.map(section => section.id)
    );
  });

  test.each(maryCeleste.story.map(section => [section.id, section] as const))(
    'chapter "%s" shows its kicker, heading, every paragraph and its hook',
    (_id, section) => {
      const { container } = renderStory();
      const chapter = chapterOf(container, section);

      expect(chapter.querySelector('[data-story="kicker"]')?.textContent).toBe(section.kicker);
      expect(within(chapter).getByRole('heading', { level: 2, name: section.heading })).toBeDefined();

      const lines = [...chapter.querySelectorAll('[data-story="line"]')].map(line => line.textContent);
      const expected = [...section.body, ...(section.hook === undefined ? [] : [section.hook])].map(plainText);
      expect(lines).toEqual(expected);
      expect(chapter.querySelectorAll('[data-hook="true"]')).toHaveLength(section.hook === undefined ? 0 : 1);
    }
  );

  test.each(maryCeleste.story.map(section => [section.id, section] as const))(
    'chapter "%s" shows its image with alt text and its credit',
    (_id, section) => {
      const { container } = renderStory();
      const chapter = chapterOf(container, section);
      const image = section.image;

      expect(image).toBeDefined();
      expect(image?.alt.trim()).not.toBe('');
      expect(image?.credit.trim()).not.toBe('');
      expect(within(chapter).getByRole('img', { name: image?.alt })).toBeDefined();
      expect(chapter.querySelector('[data-story="credit"]')?.textContent).toBe(image?.credit);
      // Only an illustration is labelled as one.
      expect(within(chapter).queryByText('Illustration') !== null).toBe(image?.isIllustration);
    }
  );

  test('exactly one chapter image is an illustration: the AI-generated deck', () => {
    renderStory();

    expect(maryCeleste.story.filter(section => section.image?.isIllustration)).toHaveLength(1);
    expect(screen.getAllByText('Illustration')).toHaveLength(1);
  });

  test('ends on the central question, whole for screen readers and in phrases for the eyes', () => {
    const { container } = renderStory();

    const question = container.querySelector('[data-story="question"]') as HTMLElement;
    expect(within(question).getByRole('heading', { name: maryCeleste.centralQuestion })).toBeDefined();
    const phrases = [...question.querySelectorAll('[data-story="phrase"]')].map(phrase => phrase.textContent?.trim());
    expect(phrases).toEqual(splitIntoPhrases(maryCeleste.centralQuestion));
    expect(phrases.length).toBeGreaterThan(1);
    // Nothing comes after the question yet.
    expect(container.querySelector('[data-story="root"]')?.lastElementChild).toBe(question);
  });

  test('every portal in the text is a keyboard-reachable button, and its id is a reference of the case', () => {
    const { container } = renderStory();

    const triggers = [...container.querySelectorAll<HTMLElement>('[data-portal-trigger]')];
    const ids = new Set(maryCeleste.references.map(reference => reference.id));
    expect(triggers.length).toBeGreaterThan(0);
    for (const trigger of triggers) {
      expect(trigger.getAttribute('role')).toBe('button');
      expect(trigger.tabIndex).toBe(0);
      expect(ids.has(trigger.getAttribute('data-portal-trigger') ?? '')).toBe(true);
    }
  });
});

describe('Story: structure and loading', () => {
  test('the heading the quill writes is hidden from screen readers and split into letters', () => {
    const { container } = renderStory(testCase);

    const written = container.querySelector('[data-story="heading"]') as HTMLElement;
    expect(written.getAttribute('aria-hidden')).toBe('true');
    const letters = [...written.querySelectorAll<HTMLElement>('*')].filter(element => element.children.length === 0);
    expect(letters.map(letter => letter.textContent).join('')).toBe(withoutSpaces('First test heading'));
    expect(container.querySelector('[data-story="quill"]')?.getAttribute('aria-hidden')).toBe('true');
  });

  test('a chapter without a kicker, hook or image leaves them out', () => {
    const { container } = renderStory(testCase);
    const chapter = chapterOf(container, testCase.story[1]);

    expect(chapter.querySelector('[data-story="kicker"]')).toBeNull();
    expect(chapter.querySelector('[data-hook="true"]')).toBeNull();
    expect(chapter.querySelector('img')).toBeNull();
    expect(chapter.querySelector('[data-story="credit"]')).toBeNull();
  });

  test('a reference id the case does not know falls back to plain text', () => {
    const { container } = renderStory(testCase);
    const chapter = chapterOf(container, testCase.story[1]);

    expect(chapter.querySelector('[data-portal-trigger]')).toBeNull();
    expect(chapter.textContent).toContain('Only one paragraph, with an unknown id.');
  });

  test('images are lazy: before the reader reaches the story, only the first chapter has a source', () => {
    const { container } = renderStory();

    const sources = [...container.querySelectorAll('[data-story="image"]')].map(image => image.getAttribute('src'));
    expect(sources[0]).toBe(maryCeleste.story[0].image?.src);
    expect(sources.slice(1).every(source => source === null)).toBe(true);
  });

  test('the image grade gets darker with every chapter', () => {
    const { container } = renderStory();

    const brightness = [...container.querySelectorAll<HTMLElement>('[data-story="image"]')].map(image =>
      Number(/brightness\(([\d.]+)\)/.exec(image.style.filter)?.[1])
    );
    expect(brightness[0]).toBe(1);
    expect(brightness[brightness.length - 1]).toBe(0.55);
    expect(brightness.every((value, index) => index === 0 || value < brightness[index - 1])).toBe(true);
  });

  test('body text takes its colour from the sky: every text cell follows the tone set on the grid', () => {
    const { container } = renderStory();

    const grid = container.querySelector('[data-story="grid"]') as HTMLElement;
    // Before the reader reaches the story it is still under the legend's night.
    expect(grid.getAttribute('data-tone')).toBe('night-ink');
    for (const cell of container.querySelectorAll('[data-story="text"]')) {
      expect(cell.className).toContain('text-ink');
      expect(cell.className).toContain('group-data-[tone=black]/sky:text-black');
      expect(cell.className).toContain('group-data-[tone=white]/sky:text-white');
      expect(cell.className).toContain('group-data-[tone=night-ink]/sky:text-night-ink');
    }
  });
});

describe('Story: image credits and labels', () => {
  test('every chapter image has an ⓘ button, and the credit is its tooltip, not printed on the image', () => {
    const { container } = renderStory();

    for (const section of maryCeleste.story) {
      const chapter = chapterOf(container, section);
      const button = within(chapter).getByRole('button', { name: 'Image credit' });
      const tooltip = within(chapter).getByRole('tooltip', { hidden: true });
      expect(button.getAttribute('aria-describedby')).toBe(tooltip.id);
      expect(tooltip.textContent).toBe(section.image?.credit);
      expect(tooltip.className).toContain('opacity-0');
      expect(chapter.querySelectorAll('[data-story="credit"]')).toHaveLength(1);
    }
  });

  test('a tap on the ⓘ pins the credit open, and a second tap closes it', () => {
    const { container } = renderStory();
    const chapter = chapterOf(container, maryCeleste.story[0]);
    const button = within(chapter).getByRole('button', { name: 'Image credit' });

    fireEvent.click(button);
    expect(button.getAttribute('aria-expanded')).toBe('true');
    expect(button.parentElement?.getAttribute('data-open')).toBe('true');

    fireEvent.click(button);
    expect(button.getAttribute('aria-expanded')).toBe('false');
  });

  test('a tap anywhere else, or Escape, closes a pinned credit', () => {
    const { container } = renderStory();
    const chapter = chapterOf(container, maryCeleste.story[0]);
    const button = within(chapter).getByRole('button', { name: 'Image credit' });

    fireEvent.click(button);
    fireEvent.pointerDown(document.body);
    expect(button.getAttribute('aria-expanded')).toBe('false');

    fireEvent.click(button);
    fireEvent.keyDown(document.body, { key: 'Escape' });
    expect(button.getAttribute('aria-expanded')).toBe('false');
  });

  test('the "Illustration" label is always visible, and only on the illustration', () => {
    const { container } = renderStory();

    for (const section of maryCeleste.story) {
      const label = chapterOf(container, section).querySelector('[data-story="illustration"]');
      expect(label !== null).toBe(section.image?.isIllustration);
    }
  });

  test('chapter 3 carries its caption, "The Mary Celeste, 1861", and no other chapter has one', () => {
    const { container } = renderStory();

    const captions = maryCeleste.story.map(
      section => chapterOf(container, section).querySelector('[data-story="caption"]')?.textContent ?? null
    );
    expect(captions).toEqual([null, null, 'The Mary Celeste, 1861', null, null, null]);
  });

  test('the image starts below the case header: its sticky offset is the header height', () => {
    const { container } = renderStory();

    for (const pane of container.querySelectorAll('[data-story="pane"]')) {
      expect(pane.className).toContain('top-[var(--case-header)]');
    }
  });
});

describe('Story: reduced motion', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    stubMatchMedia({ reducedMotion: true });
  });

  test('no quill: headings are not split into letters', () => {
    const { container } = renderStory(testCase);

    expect(container.querySelector('[data-story="heading"]')?.children).toHaveLength(0);
  });

  test('paragraphs start hidden and are not moved: they only fade', () => {
    const { container } = renderStory(testCase);

    for (const line of container.querySelectorAll<HTMLElement>('[data-story="line"]')) {
      expect(line.style.opacity).toBe('0');
      expect(line.style.transform).toBe('');
    }
  });
});

describe('Story: without matchMedia', () => {
  test('shows every chapter at once, with all images loaded and nothing hidden', () => {
    vi.unstubAllGlobals();
    const { container } = renderStory();

    const sources = [...container.querySelectorAll('[data-story="image"]')].map(image => image.getAttribute('src'));
    expect(sources).toEqual(maryCeleste.story.map(section => section.image?.src));
    for (const element of container.querySelectorAll<HTMLElement>('[data-story]')) {
      expect(element.style.opacity).toBe('');
    }
    expect(screen.getByRole('heading', { name: maryCeleste.centralQuestion })).toBeDefined();
  });
});
