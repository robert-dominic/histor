// @vitest-environment jsdom
// src/features/legend/__tests__/LegendIntro.test.tsx
// The legend intro renders everything from its data, Skip jumps to the end state, and the scroll cue calls onDone.
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import CaseHeader from '@/components/CaseHeader';
import LegendIntro from '@/features/legend/LegendIntro';
import { stubMatchMedia } from '@/test/match-media';
import type { LegendIntro as LegendIntroData } from '@/types/case';

/** Test data, not history. */
const legendIntro: LegendIntroData = {
  lines: ['First line of the myth.', 'Second line.', 'Third and last line.'],
  stamp: 'Test stamp... really.',
  debunk: 'This is the debunk. It has a second sentence.',
};

/** The scroll cue at the end of the intro. */
const CUE = 'See what really happened';


const video = { src: '/test-video.mp4', poster: '/test-poster.webp', credit: 'Test credit (not real)' };

function renderIntro(props: Partial<Parameters<typeof LegendIntro>[0]> = {}) {
  const onDone = vi.fn();
  const view = render(<LegendIntro legendIntro={legendIntro} onDone={onDone} {...props} />);
  return { ...view, onDone };
}

const one = (container: HTMLElement, name: string) =>
  container.querySelector(`[data-legend="${name}"]`) as HTMLElement;
const all = (container: HTMLElement, name: string) => [
  ...container.querySelectorAll<HTMLElement>(`[data-legend="${name}"]`),
];
/** The single letters inside a block that has been split for writing or typing. */
const lettersOf = (block: HTMLElement) =>
  [...block.querySelectorAll<HTMLElement>('*')].filter(element => element.children.length === 0);
const withoutSpaces = (text: string) => text.replace(/\s/g, '');

beforeEach(() => {
  stubMatchMedia();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('LegendIntro: content', () => {
  test('renders every line of the myth, in order', () => {
    const { container } = renderIntro();

    expect(all(container, 'line').map(line => line.textContent)).toEqual(legendIntro.lines);
  });

  test('renders the stamp text as stored (CSS makes it uppercase)', () => {
    const { container } = renderIntro();

    const stamp = one(container, 'stamp');
    expect(stamp.textContent).toBe(legendIntro.stamp);
    expect(stamp.className).toContain('uppercase');
  });

  test('renders the whole debunk', () => {
    const { container } = renderIntro();

    expect(one(container, 'debunk').textContent).toBe(legendIntro.debunk);
  });

  test('sets the debunk in the app voice (typewriter) and the myth in the legend face', () => {
    const { container } = renderIntro();

    expect((one(container, 'debunk').parentElement as HTMLElement).className).toContain('font-voice');
    expect((one(container, 'line').parentElement as HTMLElement).className).toContain('font-legend');
  });
});

describe('LegendIntro: screen readers', () => {
  test('every line and the debunk exist as whole, unsplit text for screen readers', () => {
    const { container } = renderIntro();

    const readable = [...container.querySelectorAll('.sr-only')].map(element => element.textContent);
    expect(readable).toEqual([...legendIntro.lines, legendIntro.debunk]);
    for (const element of container.querySelectorAll('.sr-only')) {
      expect(element.children).toHaveLength(0);
      expect(element.closest('[aria-hidden="true"]')).toBeNull();
    }
  });

  test('the copies that are written and typed letter by letter are hidden from screen readers', () => {
    const { container } = renderIntro();

    for (const block of [...all(container, 'line'), one(container, 'debunk')]) {
      expect(block.getAttribute('aria-hidden')).toBe('true');
    }
  });

  test('the quill and the caret are decoration, hidden from screen readers', () => {
    const { container } = renderIntro();

    expect(one(container, 'quill').getAttribute('aria-hidden')).toBe('true');
    expect(one(container, 'caret').getAttribute('aria-hidden')).toBe('true');
  });

  test('the stamp is plain readable text', () => {
    const { container } = renderIntro();

    const stamp = one(container, 'stamp');
    expect(stamp.closest('[aria-hidden="true"]')).toBeNull();
    expect(stamp.querySelector('strong')?.children).toHaveLength(0);
  });
});

describe('LegendIntro: the sequence', () => {
  test('splits each line into letters for the quill, one element per letter', () => {
    const { container } = renderIntro();

    all(container, 'line').forEach((line, index) => {
      const letters = lettersOf(line);
      expect(letters.map(letter => letter.textContent).join('')).toBe(withoutSpaces(legendIntro.lines[index]));
      expect(letters.every(letter => letter.textContent?.length === 1)).toBe(true);
    });
  });

  test('splits the debunk into letters for the typewriter', () => {
    const { container } = renderIntro();

    const letters = lettersOf(one(container, 'debunk'));
    expect(letters.map(letter => letter.textContent).join('')).toBe(withoutSpaces(legendIntro.debunk));
  });

  test('starts with every letter, the stamp, the quill, the caret and the scroll cue hidden', () => {
    const { container } = renderIntro();

    for (const block of [...all(container, 'line'), one(container, 'debunk')]) {
      for (const letter of lettersOf(block)) {
        expect(letter.style.opacity).toBe('0');
      }
    }
    expect(one(container, 'stamp').style.opacity).toBe('0');
    expect(one(container, 'quill-body').style.opacity).toBe('0');
    expect(one(container, 'caret').className).toContain('opacity-0');
    expect(one(container, 'continue').style.visibility).toBe('hidden');
  });

  test('Skip is there from the first frame', () => {
    renderIntro();

    expect(screen.getByRole('button', { name: 'Skip' })).toBeDefined();
  });

  test('Skip shows the end state: every letter of every line and of the debunk, the stamp and the scroll cue', () => {
    const { container } = renderIntro();

    fireEvent.click(screen.getByRole('button', { name: 'Skip' }));

    for (const block of [...all(container, 'line'), one(container, 'debunk')]) {
      for (const letter of lettersOf(block)) {
        expect(letter.style.opacity).toBe('1');
      }
    }
    expect(one(container, 'stamp').style.opacity).toBe('1');
    const next = one(container, 'continue');
    expect(next.style.visibility).not.toBe('hidden');
    expect(next.style.opacity).toBe('1');
  });

  test('in the end state the quill and the caret are gone', () => {
    const { container } = renderIntro();

    fireEvent.click(screen.getByRole('button', { name: 'Skip' }));

    expect(one(container, 'quill-body').style.opacity).toBe('0');
    expect(one(container, 'caret').style.opacity).toBe('0');
  });

  test('in the end state the myth is dimmed to 50% behind the stamp, but still there', () => {
    const { container } = renderIntro();

    fireEvent.click(screen.getByRole('button', { name: 'Skip' }));

    expect(one(container, 'myth').style.opacity).toBe('0.5');
    expect(all(container, 'line').map(line => line.textContent)).toEqual(legendIntro.lines);
  });

  test('Skip does not end the intro: onDone is not called', () => {
    const { onDone } = renderIntro();

    fireEvent.click(screen.getByRole('button', { name: 'Skip' }));

    expect(onDone).not.toHaveBeenCalled();
  });

  test('Skip goes away once the end state is shown, and focus moves to the scroll cue', () => {
    renderIntro();
    const skip = screen.getByRole('button', { name: 'Skip' });
    skip.focus();

    fireEvent.click(skip);

    expect(screen.queryByRole('button', { name: 'Skip' })).toBeNull();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: CUE }));
  });

  test('the scroll cue calls onDone', () => {
    const { onDone } = renderIntro();
    fireEvent.click(screen.getByRole('button', { name: 'Skip' }));

    fireEvent.click(screen.getByRole('button', { name: CUE }));

    expect(onDone).toHaveBeenCalledTimes(1);
  });

  test('Skip and the scroll cue are real buttons, so Tab and Enter work', () => {
    renderIntro();

    const skip = screen.getByRole('button', { name: 'Skip' });
    expect(skip.tagName).toBe('BUTTON');
    expect(skip.getAttribute('tabindex')).toBeNull();
    fireEvent.click(skip);
    const next = screen.getByRole('button', { name: CUE });
    expect(next.tagName).toBe('BUTTON');
    expect(next.getAttribute('tabindex')).toBeNull();
  });
});

describe('LegendIntro: onEnded', () => {
  test('is called once when Skip reaches the end state, and not again by the scroll cue', () => {
    const onEnded = vi.fn();
    renderIntro({ onEnded });
    expect(onEnded).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Skip' }));
    fireEvent.click(screen.getByRole('button', { name: CUE }));

    expect(onEnded).toHaveBeenCalledTimes(1);
  });
});

describe('LegendIntro: a returning visitor (startAtEnd)', () => {
  test('opens at the end state: every letter, the stamp and the scroll cue are shown at once', () => {
    const { container } = renderIntro({ startAtEnd: true });

    for (const block of [...all(container, 'line'), one(container, 'debunk')]) {
      for (const letter of lettersOf(block)) {
        expect(letter.style.opacity).toBe('1');
      }
    }
    expect(one(container, 'myth').style.opacity).toBe('0.5');
    expect(one(container, 'stamp').style.opacity).toBe('1');
    expect(one(container, 'continue').style.visibility).not.toBe('hidden');
    expect(one(container, 'quill-body').style.opacity).toBe('0');
    expect(one(container, 'caret').style.opacity).toBe('0');
  });

  test('has no Skip, and the scroll cue has the focus', () => {
    renderIntro({ startAtEnd: true });

    expect(screen.queryByRole('button', { name: 'Skip' })).toBeNull();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: CUE }));
  });

  test('does not call onEnded again, and the scroll cue still calls onDone', () => {
    const onEnded = vi.fn();
    const { onDone } = renderIntro({ startAtEnd: true, onEnded });

    fireEvent.click(screen.getByRole('button', { name: CUE }));

    expect(onEnded).not.toHaveBeenCalled();
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  test('a first-time visitor does not get focus moved to the scroll cue', () => {
    renderIntro();

    expect(document.activeElement).toBe(document.body);
  });
});

describe('LegendIntro: video', () => {
  test('plays the video muted, looping and inline, with the poster, hidden from screen readers', () => {
    const { container } = renderIntro({ video });

    const element = container.querySelector('video') as HTMLVideoElement;
    expect(element.getAttribute('src')).toBe(video.src);
    expect(element.getAttribute('poster')).toBe(video.poster);
    expect(element.muted).toBe(true);
    expect(element.autoplay).toBe(true);
    expect(element.loop).toBe(true);
    expect(element.playsInline).toBe(true);
    expect(element.closest('[aria-hidden="true"]')).not.toBeNull();
  });

  test('labels the video "Illustration", always visible, and puts its credit behind an ⓘ button', () => {
    const { container } = renderIntro({ video });

    const label = screen.getByText('Illustration');
    expect(label.closest('[aria-hidden="true"]')).toBeNull();
    // The credit is not printed beside the label any more.
    expect(label.textContent).toBe('Illustration');
    expect(label.textContent).not.toContain(video.credit);

    const button = screen.getByRole('button', { name: 'Image credit' });
    const tooltip = screen.getByRole('tooltip', { hidden: true });
    expect(tooltip.textContent).toBe(video.credit);
    expect(one(container, 'credit').textContent).toBe(video.credit);
    expect(button.getAttribute('aria-describedby')).toBe(tooltip.id);

    fireEvent.click(button);
    expect(button.getAttribute('aria-expanded')).toBe('true');
  });

  test('without a video there is no video element, no label and no credit', () => {
    const { container } = renderIntro();

    expect(container.querySelector('video')).toBeNull();
    expect(screen.queryByText('Illustration')).toBeNull();
    expect(container.querySelector('[data-legend="credit"]')).toBeNull();
  });
});

describe('LegendIntro: reduced motion', () => {
  beforeEach(() => {
    stubMatchMedia({ reducedMotion: true });
  });

  test('shows the poster image instead of the video, still labelled and credited', () => {
    const { container } = renderIntro({ video });

    expect(container.querySelector('video')).toBeNull();
    expect(container.querySelector('img')?.getAttribute('src')).toBe(video.poster);
    expect(screen.getByText('Illustration')).toBeDefined();
    expect(one(container, 'credit').textContent).toBe(video.credit);
  });

  test('no quill and no typing: the lines and the debunk are not split into letters', () => {
    const { container } = renderIntro();

    for (const block of [...all(container, 'line'), one(container, 'debunk')]) {
      expect(block.children).toHaveLength(0);
    }
    expect(one(container, 'quill-body').style.opacity).toBe('');
    expect(one(container, 'quill-body').getAttribute('class')).toContain('opacity-0');
    expect(one(container, 'caret').style.opacity).toBe('');
  });

  test('the lines, the stamp and the debunk start hidden and fade in whole', () => {
    const { container } = renderIntro();

    for (const block of [...all(container, 'line'), one(container, 'stamp'), one(container, 'debunk')]) {
      expect(block.style.opacity).toBe('0');
    }
  });

  test('fades only: nothing is moved, scaled or blurred', () => {
    const { container } = renderIntro();

    for (const element of container.querySelectorAll<HTMLElement>('[data-legend]')) {
      expect(element.style.transform).toBe('');
      expect(element.style.filter).toBe('');
    }
  });

  test('Skip shows everything, and the scroll cue works the same way', () => {
    const { container, onDone } = renderIntro();

    fireEvent.click(screen.getByRole('button', { name: 'Skip' }));
    for (const block of [...all(container, 'line'), one(container, 'stamp'), one(container, 'debunk')]) {
      expect(block.style.opacity).toBe('1');
    }
    expect(one(container, 'myth').style.opacity).toBe('0.5');
    fireEvent.click(screen.getByRole('button', { name: CUE }));

    expect(onDone).toHaveBeenCalledTimes(1);
  });
});

describe('LegendIntro: without matchMedia', () => {
  test('shows everything at once when the browser cannot report a motion preference', () => {
    vi.stubGlobal('matchMedia', undefined);
    const { container, onDone } = renderIntro();

    expect(one(container, 'line').style.opacity).toBe('');
    expect(one(container, 'line').children).toHaveLength(0);
    expect(screen.queryByRole('button', { name: 'Skip' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: CUE }));

    expect(onDone).toHaveBeenCalledTimes(1);
  });
});

describe('LegendIntro: no title card', () => {
  // The case title is in the case header once the story starts; the legend intro starts straight on the myth.
  test('the intro has no title card, title, years or UNSOLVED stamp', () => {
    const { container } = renderIntro();
    expect(container.querySelector('[data-legend="title-card"]')).toBeNull();
    expect(container.querySelector('[data-legend="title"]')).toBeNull();
    expect(container.querySelector('[data-legend="years"]')).toBeNull();
    expect(container.querySelector('[data-legend="unsolved"]')).toBeNull();
  });

  test('it does not touch the case header: the header is not its business any more', () => {
    const { container } = render(
      <MemoryRouter>
        <CaseHeader caseId="test-case" title="Test Case" years="1900 – 1901" unsolved startHidden />
        <LegendIntro legendIntro={legendIntro} onDone={vi.fn()} />
      </MemoryRouter>
    );
    const bar = container.querySelector('[data-case-header="bar"]') as HTMLElement;
    fireEvent.click(screen.getByRole('button', { name: 'Skip' }));
    // Still hidden: only the story shows the header, once it starts.
    expect(bar.style.opacity).toBe('0');
  });

  test('the myth starts at once: the first line is hidden for the quill, the stamp is waiting', () => {
    const { container } = renderIntro();
    expect(lettersOf(one(container, 'line')).length).toBeGreaterThan(0);
    expect(one(container, 'stamp').style.opacity).toBe('0');
  });
});

describe('LegendIntro: the editorial layout on a laptop (ui-pass 8)', () => {
  test('left-aligned in the left 55%, below the top third; the image bleeding off the right; the cue bottom left; stacked and centred on a phone', () => {
    const { container } = renderIntro({ video });
    const section = container.querySelector<HTMLElement>('section[aria-label="The legend"]')!;
    // A phone: centred, as before.
    expect(section.className).toContain('items-center');
    expect(section.className).toContain('text-center');
    // A laptop: left-aligned, starting a little below the top third.
    expect(section.className).toContain('lg:text-left');
    expect(section.className).toContain('lg:items-start');
    expect(section.className).toContain('lg:pt-[36svh]');
    expect(container.querySelector('[data-legend="stage"]')!.className).toContain('lg:max-w-[49vw]');
    // The image starts at 35% and runs off the right edge, under a shade dark on the text's side.
    expect(container.querySelector('[data-legend="media"]')!.className).toContain('lg:left-[35%]');
    // The stamp toward the right, over the last line; the cue bottom left.
    expect(container.querySelector('[data-legend="stamp"]')!.parentElement!.className).toContain('lg:place-items-end');
    expect(container.querySelector('[data-legend="continue"]')!.className).toContain('lg:left-[6vw]');
  });
});
