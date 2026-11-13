// src/cases/mary-celeste/case.ts
import type { Case } from '@/types/case';
import legendVideoPoster from './assets/video/legend-night-poster.webp';
import legendVideoSrc from './assets/video/legend-night.mp4';

/**
 * Minimal valid Case object for Mary Celeste.
 * Contains placeholder content marked with "TODO: real content" 
 * to indicate this is not final content.
 */
export const maryCeleste: Case = {
  id: 'mary-celeste',
  title: 'The Mystery of the Mary Celeste',
  year: 1872,
  teaser: 'TODO: real content - one line teaser for home page',
  
  legendIntro: {
    lines: [
      'December 1872. A ship is found drifting in the Atlantic.',
      'Not a soul aboard.',
      "In the captain's cabin, breakfast is laid out.",
      'Half-eaten. The tea is still warm.',
      'As if everyone simply vanished.',
    ],
    stamp: 'Not in the record',
    debunk:
      'Well... that never happened. The men who boarded her found nothing to eat or drink on the table. The warm breakfast grew out of a short story Arthur Conan Doyle published in 1884, and the retellings that followed it.',
  },
  
  story: [
    {
      id: 's1',
      kicker: 'TODO: real content - location and date',
      heading: 'TODO: real content - section heading',
      body: [
        'TODO: real content - story paragraph 1',
        'TODO: real content - story paragraph 2'
      ],
      hook: 'TODO: real content - optional closing line'
    }
  ],
  
  centralQuestion: 'TODO: real content - central question about the mystery',
  
  fork: {
    prompt: 'TODO: real content - continue investigating?',
    investigateLabel: 'TODO: real content - label for investigate button',
    leaveLabel: 'TODO: real content - label for leave button'
  },
  
  theories: [
    {
      id: 't-1',
      title: 'TODO: real content - theory title',
      claim: 'TODO: real content - one-line theory claim',
      standing: 'leading',
      standingReason: 'TODO: real content - why historians rate this theory'
    }
  ],
  
  evidence: [
    {
      id: 'e-1',
      title: 'TODO: real content - evidence title',
      detail: [
        'TODO: real content - evidence detail paragraph 1',
        'TODO: real content - evidence detail paragraph 2'
      ],
      sources: ['src-1'],
      reading: {
        supports: ['t-1'],
        weakens: [],
        note: 'TODO: real content - how historians read this'
      },
      status: 'record'
    }
  ],
  
  sources: [
    {
      id: 'src-1',
      title: 'TODO: real content - source title',
      kind: 'testimony',
      author: 'TODO: real content - author name',
      year: 1872,
      url: 'https://example.com/mary-celeste',
      citation: 'TODO: real content - citation if available'
    }
  ],
  
  references: [],
  
  historiansSummary: [
    'TODO: real content - historian summary paragraph 1',
    'TODO: real content - historian summary paragraph 2'
  ],
  
  closeThreshold: 1,
  
  theme: {
    id: 'mary-celeste-theme',
    ambientAudio: undefined,
    sounds: undefined,
    legendVideo: { src: legendVideoSrc, poster: legendVideoPoster }
  }
};

export default maryCeleste;
