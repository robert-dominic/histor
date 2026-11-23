// src/pages/DevSound.tsx
// /dev/sound, in development builds only (music brief, 4): every generated sound on one page, each with a button that
// plays it, grouped as the event table groups them, with the moments that play it. For tuning by ear. The first press
// is the gesture that starts the sound; the Effects control must be on.
import { useSoundChannel, playCue, sound } from '@/lib/sound';
import { VOICES, type SoundName } from '@/lib/sound/voices';

const GROUPS: { title: string; sounds: [SoundName, string][] }[] = [
  {
    title: 'The story',
    sounds: [
      ['swell', 'A chapter enters'],
      ['scratch', 'The pen writes (throttled)'],
      ['boom', 'A hook snaps in'],
      ['whoosh', 'A hook decays'],
      ['hiss', 'A name un-written'],
      ['bell', "The ship's bell (s-found)"],
      ['pulse', 'A line of the question'],
    ],
  },
  {
    title: 'The desk',
    sounds: [
      ['paper-lift', 'A folder picked up'],
      ['cover-flip', 'A folder opened'],
      ['thud-soft', 'A folder landing'],
      ['pin-tick', 'Pinning'],
      ['thud-heavy', 'stamp:record, and "Chosen"'],
      ['thud', 'stamp:disputed (lighter), stamp:legend, the close stamp'],
      ['pen-stroke', 'stamp:disputed: the pen in the margin'],
      ['music-box', 'stamp:legend: the ink drains'],
      ['whisper', '"You almost believed this."'],
      ['ding', 'The rank revealed'],
    ],
  },
  {
    title: 'The interface',
    sounds: [
      ['paper-tick', 'Any button or link'],
      ['switch-click', 'A toggle switch'],
      ['page-flip', 'The ? guide opens (closes at 55%)'],
      ['paper-slide', 'A modal opens'],
      ['slide-out', 'A modal closes'],
      ['brush', 'Hovering a file on the floor (4 a second at most)'],
    ],
  },
];

export default function DevSound() {
  const effects = useSoundChannel('effects');
  const listed = new Set(GROUPS.flatMap(group => group.sounds.map(([name]) => name)));
  const unlisted = (Object.keys(VOICES) as SoundName[]).filter(name => !listed.has(name));
  const play = (name: SoundName) => {
    sound.unlock();
    playCue(sound, { sound: name });
  };
  return (
    <main data-page="dev-sound" className="min-h-svh bg-night px-6 py-10 text-night-ink" data-ui-sound="off">
      <h1 className="font-legend text-4xl">Sounds</h1>
      <p className="mt-3 max-w-xl font-record text-[1.0625rem] text-night-ink/80">
        Every generated sound, for tuning by ear. Levels are in <code>src/lib/sound/levels.ts</code>, recipes in{' '}
        <code>voices.ts</code>, the moments in <code>sound-map.ts</code>.
      </p>
      <p className="mt-3 font-voice text-sm">
        Effects: {effects.on ? 'on' : 'off'} ·{' '}
        <button type="button" className="underline" onClick={() => effects.setOn(!effects.on)}>
          turn {effects.on ? 'off' : 'on'}
        </button>
      </p>
      {[...GROUPS, ...(unlisted.length > 0 ? [{ title: 'Other', sounds: unlisted.map(name => [name, ''] as [SoundName, string]) }] : [])].map(group => (
        <section key={group.title} className="mt-8">
          <h2 className="font-voice text-xs tracking-[0.2em] text-night-ink/70 uppercase">{group.title}</h2>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {group.sounds.map(([name, moment]) => (
              <li key={name}>
                <button
                  type="button"
                  data-dev-sound={name}
                  onClick={() => play(name)}
                  className="flex min-h-11 w-full flex-col items-start rounded-sm border border-night-ink/25 px-4 py-2 text-left hover:border-night-ink/60 focus-visible:outline-2 focus-visible:outline-brass"
                >
                  <span className="font-voice text-sm">{name}</span>
                  {moment !== '' && <span className="font-record text-[0.875rem] text-night-ink/65">{moment}</span>}
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}
