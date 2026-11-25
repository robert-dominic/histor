// src/pages/DevSound.tsx
// /dev/sound, in development builds only: every sound file on one page (sound-files brief, 4), each with its level
// from the tune table (`SAMPLES` in levels.ts), the moments it belongs to, and a button that plays it. For tuning by
// ear. The first press is the gesture that starts the sound (and loads the files); Sound must be on.
import { useSoundChannel, playCue, sound } from '@/lib/sound';
import { SAMPLES } from '@/lib/sound/levels';
import { SAMPLE_NAMES, samples, type SampleName } from '@/lib/sound/samples';

/** What each file is for (the sound-files brief's table, and the dread pass). */
const USED_FOR: Record<SampleName, string> = {
  click: 'Every button and toggle',
  modal: 'Every modal and popover opening and closing, the ? guide',
  pen: 'All pen writing: headings, pages, the crew list, the signature, file titles',
  'pen-legend': 'The legend intro’s pen, and “You almost believed this.”',
  'typewriter-key': 'All typed text: kickers, years, notes, hints, the guide',
  'typewriter-ding': 'The rank appearing; the end of long typed lines',
  stamp: 'Every stamp: Record, Disputed, Legend, UNSOLVED, Close the case, Chosen',
  chapter: 'A new chapter appearing',
  'dread-1': 'A hook line (the pool)',
  'dread-2': 'A hook line (the pool)',
  'dread-3': 'A hook line (the pool)',
  'dread-4': 'A hook line (the pool)',
  question: 'Held under the central question (a loop)',
  'question-pulse': 'Each line of the question',
  'room-tone': 'The desk’s atmosphere (a loop)',
  'file-pickup': 'Picking up a file',
  'file-open': 'A file opening',
  pin: 'Pinning to a theory or “None of them”',
  'file-drop': 'A file dropped on the floor',
  heartbeat: 'Hovering a final choice at the verdict (a loop)',
  murmur: 'Ghost text on the desk (a loop)',
  eye: 'The eye appearing',
  creak: 'Too quiet for too long on the desk',
  'jump-sting': '“You trusted a legend.”',
};

export default function DevSound() {
  const effects = useSoundChannel('effects');
  const play = (name: SampleName) => {
    sound.unlock();
    const ctx = sound.context;
    if (ctx !== null) {
      void samples.load(ctx).then(() => playCue(sound, { sound: name }));
    }
  };
  return (
    <main data-page="dev-sound" className="min-h-svh bg-night px-6 py-10 text-night-ink" data-ui-sound="off">
      <h1 className="font-legend text-4xl">Sounds</h1>
      <p className="mt-3 max-w-xl font-record text-[1.0625rem] text-night-ink/80">
        Every sound file, for tuning by ear. Levels are in <code>src/lib/sound/levels.ts</code> (<code>SAMPLES</code>), the
        moments in <code>sound-map.ts</code>, the files in <code>public/audio/sfx/</code> (<code>npm run sfx:import</code>).
      </p>
      <p className="mt-3 font-voice text-sm">
        Sound: {effects.on ? 'on' : 'off'} ·{' '}
        <button type="button" className="underline" onClick={() => effects.setOn(!effects.on)}>
          turn {effects.on ? 'off' : 'on'}
        </button>
      </p>
      <ul className="mt-8 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {SAMPLE_NAMES.map(name => (
          <li key={name}>
            <button
              type="button"
              data-dev-sound={name}
              onClick={() => play(name)}
              className="flex min-h-11 w-full flex-col items-start rounded-sm border border-night-ink/25 px-4 py-2 text-left hover:border-night-ink/60 focus-visible:outline-2 focus-visible:outline-brass"
            >
              <span className="flex w-full items-baseline justify-between gap-3 font-voice text-sm">
                <span>{name}</span>
                <span data-dev-level className="tabular-nums text-night-ink/70">
                  level {SAMPLES[name].level}
                  {SAMPLES[name].vary ? ' · varies' : ''}
                </span>
              </span>
              <span className="font-record text-[0.875rem] text-night-ink/70">{USED_FOR[name]}</span>
            </button>
          </li>
        ))}
      </ul>
    </main>
  );
}
