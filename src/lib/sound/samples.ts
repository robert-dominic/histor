// src/lib/sound/samples.ts
// The sound files (sound-files brief, 2): every effect is a real recording now (Mixkit, imported by `npm run
// sfx:import` into public/audio/sfx/), nothing is generated. The bank loads them all once the sound has started (the
// first gesture), about 1.4 MB, decoded once. A one-shot plays through the effects bus with its level from the tune
// table (`SAMPLES` in levels.ts), and, for a sound heard again and again (the pen, the typewriter, a click), a small
// random change of pitch and level each time. A loop (the question, the room tone, the heartbeat, the murmur) plays
// through its own gain and fades in and out. Every sound goes through its tier of the mix (mix.ts).
import type { SoundEngine } from '@/lib/sound/engine';
import { glide } from '@/lib/sound/engine';
import { SAMPLES } from '@/lib/sound/levels';
import { mix } from '@/lib/sound/mix';
import { sfxSrc } from '@/lib/sfx-import';

/** Every sound file, by name (the files `npm run sfx:import` writes; a test keeps the two lists the same). */
export const SAMPLE_NAMES = [
  'click',
  'modal',
  'pen',
  'pen-legend',
  'typewriter-key',
  'typewriter-ding',
  'stamp',
  'chapter',
  'dread-1',
  'dread-2',
  'dread-3',
  'dread-4',
  'question',
  'question-pulse',
  'room-tone',
  'file-pickup',
  'file-open',
  'pin',
  'file-drop',
  'heartbeat',
  'murmur',
  'eye',
  'creak',
  'jump-sting',
] as const;
export type SampleName = (typeof SAMPLE_NAMES)[number];

/** The loops: held under something, faded in and out. */
export type LoopName = Extract<SampleName, 'question' | 'room-tone' | 'heartbeat' | 'murmur'>;

export function isSample(name: string): name is SampleName {
  return (SAMPLE_NAMES as readonly string[]).includes(name);
}

/** A little randomness, so a repeated sound never repeats exactly: 1 ± `amount`. */
function vary(amount: number): number {
  return 1 + (Math.random() * 2 - 1) * amount;
}

/** The decoded files. */
export class SampleBank {
  private readonly buffers = new Map<SampleName, AudioBuffer>();
  private loading: Promise<void> | null = null;
  private readonly fetchBytes: (src: string) => Promise<ArrayBuffer>;

  constructor(fetchBytes: (src: string) => Promise<ArrayBuffer> = src => fetch(src).then(response => response.arrayBuffer())) {
    this.fetchBytes = fetchBytes;
  }

  /** Loads and decodes every file, once. A file that fails is simply silent. */
  load(ctx: BaseAudioContext): Promise<void> {
    this.loading ??= Promise.all(
      SAMPLE_NAMES.map(async name => {
        try {
          const bytes = await this.fetchBytes(sfxSrc(name));
          this.buffers.set(name, await ctx.decodeAudioData(bytes));
        } catch {
          // Missing or undecodable: that sound is silent, nothing else changes.
        }
      })
    ).then(() => undefined);
    return this.loading;
  }

  get(name: SampleName): AudioBuffer | null {
    return this.buffers.get(name) ?? null;
  }

  /** For tests and the dev page: a buffer put in by hand. */
  set(name: SampleName, buffer: AudioBuffer): void {
    this.buffers.set(name, buffer);
  }
}

/** The app's bank. */
export const samples = new SampleBank();

export interface SampleCue {
  sound: SampleName;
  /** A multiplier on the file's level. */
  gain?: number;
  /** A multiplier on its playback rate (and so its pitch). */
  pitch?: number;
  /** Seconds after the moment. */
  delay?: number;
}

/** Plays one file once on the effects bus, if it is loaded and a voice is free. */
export function playSample(engine: SoundEngine, cue: SampleCue, bank: SampleBank = samples): void {
  const ctx = engine.context;
  const out = mix.input(engine, SAMPLES[cue.sound].tier);
  const buffer = bank.get(cue.sound);
  const tune = SAMPLES[cue.sound];
  const rate = (cue.pitch ?? 1) * (tune.vary ? vary(SAMPLES_VARY.pitch) : 1);
  if (ctx === null || out === null || buffer === null || !engine.voice(buffer.duration / rate + (cue.delay ?? 0))) {
    return;
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.playbackRate.value = rate;
  const amp = ctx.createGain();
  amp.gain.value = tune.level * (cue.gain ?? 1) * (tune.vary ? vary(SAMPLES_VARY.level) : 1);
  source.connect(amp).connect(out);
  source.start(ctx.currentTime + 0.005 + (cue.delay ?? 0));
  // One thing in focus: everything of a lower tier dips while it plays (sound-files brief, 4).
  mix.focus(engine, tune.tier, buffer.duration / rate + (cue.delay ?? 0));
  source.onended = () => {
    source.disconnect();
    amp.disconnect();
  };
}

/** How far a repeated sound's pitch and level wander, each time. */
export const SAMPLES_VARY = { pitch: 0.04, level: 0.12 } as const;

/** One loop: started, faded in to a level, faded out and stopped. Never two of the same at once. */
export class LoopPlayer {
  private source: AudioBufferSourceNode | null = null;
  private amp: GainNode | null = null;
  private stopTimer: ReturnType<typeof setTimeout> | null = null;
  readonly name: LoopName;

  constructor(name: LoopName) {
    this.name = name;
  }

  get playing(): boolean {
    return this.source !== null;
  }

  /** Fades in to `level` (a multiplier on the file's own) over `fade` seconds; already playing, it just moves there. */
  start(engine: SoundEngine, level: number, fade: number, bank: SampleBank = samples): void {
    const ctx = engine.context;
    const out = mix.input(engine, SAMPLES[this.name].tier);
    if (ctx === null || out === null) {
      return;
    }
    if (this.stopTimer !== null) {
      clearTimeout(this.stopTimer);
      this.stopTimer = null;
    }
    const target = SAMPLES[this.name].level * level;
    if (this.source !== null && this.amp !== null) {
      glide(this.amp.gain, target, fade, ctx.currentTime);
      return;
    }
    const buffer = bank.get(this.name);
    if (buffer === null) {
      return;
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    const amp = ctx.createGain();
    amp.gain.value = 0;
    source.connect(amp).connect(out);
    source.start(ctx.currentTime);
    glide(amp.gain, target, fade, ctx.currentTime);
    this.source = source;
    this.amp = amp;
  }

  /** Fades out over `fade` seconds, then stops. */
  stop(engine: SoundEngine, fade: number): void {
    const source = this.source;
    const amp = this.amp;
    if (source === null || amp === null) {
      return;
    }
    const ctx = engine.context;
    if (ctx !== null) {
      glide(amp.gain, 0, fade, ctx.currentTime);
    }
    if (this.stopTimer !== null) {
      clearTimeout(this.stopTimer);
    }
    this.stopTimer = setTimeout(() => {
      this.stopTimer = null;
      if (this.source === source) {
        this.source = null;
        this.amp = null;
      }
      try {
        source.stop();
      } catch {
        // Already stopped.
      }
      source.disconnect();
      amp.disconnect();
    }, (fade + 0.05) * 1000);
  }

  /** Stops at once (the page is left). */
  kill(): void {
    if (this.stopTimer !== null) {
      clearTimeout(this.stopTimer);
      this.stopTimer = null;
    }
    try {
      this.source?.stop();
    } catch {
      // Already stopped.
    }
    this.source?.disconnect();
    this.amp?.disconnect();
    this.source = null;
    this.amp = null;
  }
}
