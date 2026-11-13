// @vitest-environment jsdom
// src/features/legend/__tests__/LegendIntro.test.tsx
// The legend intro renders everything from its data, Skip jumps to the end state, and Continue calls onDone.
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import LegendIntro from '@/features/legend/LegendIntro';
import { stubMatchMedia } from '@/test/match-media';
import type { LegendIntro as LegendIntroData } from '@/types/case';

/** Test data, not history. */
const legendIntro: LegendIntroData = {
  lines: ['First line of the myth.', 'Second line.', 'Third and last line.'],
  stamp: 'Test stamp... really.',
  debunk: 'This is the debunk. It has a second sentence.',
};

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

  test('starts with every letter, the stamp, the quill, the caret and Continue hidden', () => {
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

  test('Skip shows the end state: every letter of every line and of the debunk, the stamp and Continue', () => {
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

  test('Skip goes away once the end state is shown, and focus moves to Continue', () => {
    renderIntro();
    const skip = screen.getByRole('button', { name: 'Skip' });
    skip.focus();

    fireEvent.click(skip);

    expect(screen.queryByRole('button', { name: 'Skip' })).toBeNull();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Continue' }));
  });

  test('Continue calls onDone', () => {
    const { onDone } = renderIntro();
    fireEvent.click(screen.getByRole('button', { name: 'Skip' }));

    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    expect(onDone).toHaveBeenCalledTimes(1);
  });

  test('Skip and Continue are real buttons, so Tab and Enter work', () => {
    renderIntro();

    const skip = screen.getByRole('button', { name: 'Skip' });
    expect(skip.tagName).toBe('BUTTON');
    expect(skip.getAttribute('tabindex')).toBeNull();
    fireEvent.click(skip);
    const next = screen.getByRole('button', { name: 'Continue' });
    expect(next.tagName).toBe('BUTTON');
    expect(next.getAttribute('tabindex')).toBeNull();
  });
});

describe('LegendIntro: onEnded', () => {
  test('is called once when Skip reaches the end state, and not again by Continue', () => {
    const onEnded = vi.fn();
    renderIntro({ onEnded });
    expect(onEnded).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Skip' }));
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    expect(onEnded).toHaveBeenCalledTimes(1);
  });
});

describe('LegendIntro: a returning visitor (startAtEnd)', () => {
  test('opens at the end state: every letter, the stamp and Continue are shown at once', () => {
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

  test('has no Skip, and Continue has the focus', () => {
    renderIntro({ startAtEnd: true });

    expect(screen.queryByRole('button', { name: 'Skip' })).toBeNull();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Continue' }));
  });

  test('does not call onEnded again, and Continue still calls onDone', () => {
    const onEnded = vi.fn();
    const { onDone } = renderIntro({ startAtEnd: true, onEnded });

    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    expect(onEnded).not.toHaveBeenCalled();
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  test('a first-time visitor does not get focus moved to Continue', () => {
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

  test('labels the video "Illustration" and shows its credit beside the label', () => {
    const { container } = renderIntro({ video });

    const label = screen.getByText('Illustration');
    expect(label.parentElement?.textContent).toContain(video.credit);
    expect(one(container, 'credit').textContent).toBe(video.credit);
    expect(label.closest('[aria-hidden="true"]')).toBeNull();
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

  test('Skip shows everything, and Continue works the same way', () => {
    const { container, onDone } = renderIntro();

    fireEvent.click(screen.getByRole('button', { name: 'Skip' }));
    for (const block of [...all(container, 'line'), one(container, 'stamp'), one(container, 'debunk')]) {
      expect(block.style.opacity).toBe('1');
    }
    expect(one(container, 'myth').style.opacity).toBe('0.5');
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

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
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    expect(onDone).toHaveBeenCalledTimes(1);
  });
});
