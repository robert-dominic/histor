// src/lib/sound/samples.ts
// The sound files (sound-files brief, 2): every effect is a real recording now (Mixkit, imported by `npm run
// sfx:import` into public/audio/sfx/), nothing is generated. The bank loads them all once the sound has started (the
// first gesture), about 1.4 MB, decoded once. A one-shot plays through the effects bus with its level from the tune
// table (`SAMPLES` in levels.ts), and, for a sound heard again and again (the pen, the typewriter, a click), a small
// random change of pitch and level each time. A loop (the question, the room tone, the heartbeat, the murmur) plays
// through its own gain and fades in and out. Every sound goes through its tier of the mix (mix.ts).
import type { SoundEngine } from '@/lib/sound/engine';
import { glide } from '@/lib/sound/engine';
import { MIX, SAMPLES } from '@/lib/sound/levels';
import { mix } from '@/lib/sound/mix';
import { sfxSrc } from '@/lib/sfx-import';

/** Every sound file, by name (the files `npm run sfx:import` writes; a test keeps the two lists the same). */
export const SAMPLE_NAMES = [
  'click',
  'modal',
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
  /** A dread sound that may start before the mixer's usual gap has passed (the hook screen's tones). */
  free?: boolean;
}

/** What the mixer remembers per context (dread pass, 7): when each sound last played, and the last dread sound. */
interface MixerMemory {
  last: Map<SampleName, number>;
  dreadStart: number;
  dreadEnd: number;
}
const mixerMemory = new WeakMap<BaseAudioContext, MixerMemory>();

/**
 * The mixer's rules, so sounds never pile up (dread pass, 7): only one dread sound at a time, at least
 * `MIX.dreadGapMs` apart (the jump sting excepted: it is the moment); a ui or paper sound not again within its own
 * cooldown. True when the sound may play now (and it is then counted as playing). Times in ms of the context's clock.
 */
export function mixerAllows(ctx: BaseAudioContext, name: SampleName, durationMs: number, free = false): boolean {
  const memory = mixerMemory.get(ctx) ?? { last: new Map(), dreadStart: Number.NEGATIVE_INFINITY, dreadEnd: Number.NEGATIVE_INFINITY };
  mixerMemory.set(ctx, memory);
  const now = ctx.currentTime * 1000;
  const tune = SAMPLES[name];
  if (tune.category === 'dread' && name !== 'jump-sting' && !free) {
    if (now < memory.dreadEnd || now - memory.dreadStart < MIX.dreadGapMs) {
      return false;
    }
    memory.dreadStart = now;
    memory.dreadEnd = now + durationMs;
  }
  if (tune.cooldownMs > 0) {
    if (now - (memory.last.get(name) ?? Number.NEGATIVE_INFINITY) < tune.cooldownMs) {
      return false;
    }
    memory.last.set(name, now);
  }
  return true;
}

/** Plays one file once on the effects bus, if it is loaded, the mixer allows it, and a voice is free. */
export function playSample(engine: SoundEngine, cue: SampleCue, bank: SampleBank = samples): void {
  const ctx = engine.context;
  const out = mix.input(engine, SAMPLES[cue.sound].tier);
  const buffer = bank.get(cue.sound);
  const tune = SAMPLES[cue.sound];
  const rate = (cue.pitch ?? 1) * (tune.vary ? vary(SAMPLES_VARY.pitch) : 1);
  if (ctx === null || out === null || buffer === null || !mixerAllows(ctx, cue.sound, (buffer.duration / rate) * 1000, cue.free)) {
    return;
  }
  if (!engine.voice(buffer.duration / rate + (cue.delay ?? 0))) {
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

/** How long before a crossfaded loop's next pass is due that it is made, in seconds. */
const LOOP_LEAD = 1;

/** How far a repeated sound's pitch and level wander, each time. */
export const SAMPLES_VARY = { pitch: 0.04, level: 0.12 } as const;

/**
 * One loop: started, faded in to a level, faded out and stopped. Never two of the same at once. With `crossfade`
 * (seconds), the loop is seamless (the fix list): instead of jumping back to its start, each pass starts a little
 * before the last ends and the two cross over, so there is no seam; without, it simply loops.
 */
export class LoopPlayer {
  private source: AudioBufferSourceNode | null = null;
  private amp: GainNode | null = null;
  private stopTimer: ReturnType<typeof setTimeout> | null = null;
  private nextTimer: ReturnType<typeof setTimeout> | null = null;
  /** Every pass playing now (with a crossfade, two overlap at each seam). */
  private passes: AudioBufferSourceNode[] = [];
  readonly name: LoopName;
  readonly crossfade: number;

  constructor(name: LoopName, crossfade = 0) {
    this.name = name;
    this.crossfade = crossfade;
  }

  get playing(): boolean {
    return this.amp !== null;
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
    if (this.amp !== null) {
      glide(this.amp.gain, target, fade, ctx.currentTime);
      return;
    }
    const buffer = bank.get(this.name);
    if (buffer === null) {
      return;
    }
    const amp = ctx.createGain();
    amp.gain.value = 0;
    amp.connect(out);
    this.amp = amp;
    glide(amp.gain, target, fade, ctx.currentTime);
    if (this.crossfade > 0 && buffer.duration > this.crossfade * 2) {
      this.pass(ctx, buffer, ctx.currentTime, true);
      return;
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.connect(amp);
    source.start(ctx.currentTime);
    this.source = source;
    this.passes = [source];
  }

  /** One pass of a crossfaded loop, from `at`: it fades in (but the first), plays, fades out as the next fades in. */
  private pass(ctx: BaseAudioContext, buffer: AudioBuffer, at: number, first: boolean): void {
    const amp = this.amp;
    if (amp === null) {
      return;
    }
    const xf = this.crossfade;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(first ? 1 : 0, at);
    if (!first) {
      gain.gain.linearRampToValueAtTime(1, at + xf);
    }
    gain.gain.setValueAtTime(1, at + buffer.duration - xf);
    gain.gain.linearRampToValueAtTime(0, at + buffer.duration);
    source.connect(gain).connect(amp);
    source.start(at);
    source.stop(at + buffer.duration + 0.05);
    source.onended = () => {
      this.passes = this.passes.filter(other => other !== source);
      source.disconnect();
      gain.disconnect();
    };
    this.source = source;
    this.passes.push(source);
    // The next pass is made a moment before it is due, and starts exactly as this one begins to fade.
    const nextAt = at + buffer.duration - xf;
    this.nextTimer = setTimeout(() => {
      this.nextTimer = null;
      if (this.amp === amp) {
        this.pass(ctx, buffer, nextAt, false);
      }
    }, Math.max(0, (nextAt - ctx.currentTime - LOOP_LEAD) * 1000));
  }

/** Moves its speed (and pitch) to `rate` over `seconds`: the heartbeat quickening. */
  setRate(engine: SoundEngine, rate: number, seconds: number): void {
    const ctx = engine.context;
    if (ctx === null || this.source === null) {
      return;
    }
    const param = this.source.playbackRate;
    param.cancelScheduledValues(ctx.currentTime);
    param.setValueAtTime(param.value, ctx.currentTime);
    param.linearRampToValueAtTime(rate, ctx.currentTime + seconds);
  }

  /** Fades out over `fade` seconds, then stops. */
  stop(engine: SoundEngine, fade: number): void {
    const amp = this.amp;
    const passes = this.passes;
    if (amp === null) {
      return;
    }
    if (this.nextTimer !== null) {
      clearTimeout(this.nextTimer);
      this.nextTimer = null;
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
      if (this.amp === amp) {
        this.source = null;
        this.amp = null;
        this.passes = [];
      }
      for (const source of passes) {
        try {
          source.stop();
        } catch {
          // Already stopped.
        }
        source.disconnect();
      }
      amp.disconnect();
    }, (fade + 0.05) * 1000);
  }

  /** Stops at once (the page is left). */
  kill(): void {
    [this.stopTimer, this.nextTimer].forEach(timer => timer !== null && clearTimeout(timer));
    this.stopTimer = null;
    this.nextTimer = null;
    for (const source of this.passes) {
      try {
        source.stop();
      } catch {
        // Already stopped.
      }
      source.disconnect();
    }
    this.amp?.disconnect();
    this.passes = [];
    this.source = null;
    this.amp = null;
  }
}
