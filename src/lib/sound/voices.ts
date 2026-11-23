// src/lib/sound/voices.ts
// The one-shot sounds, each generated in code from noise, oscillators, filters and envelopes (polish brief, part B):
// nothing to download or license. Every sound has an attack and a release, so none of them clicks. Each recipe says
// how long it lasts, so the engine can count it against the cap on voices.

/** A recipe's options: when it starts (context time), and small variations the table asks for. */
export interface VoiceOptions {
  at: number;
  /** A multiplier on the recipe's own level. */
  gain: number;
  /** A multiplier on its pitch (1 = as written). */
  pitch: number;
}

export interface Voice {
  /** How long it sounds, in seconds, release included. */
  seconds: number;
  play: (ctx: AudioContext, out: AudioNode, options: VoiceOptions) => void;
}

// ---- Building blocks

const noiseCache = new WeakMap<BaseAudioContext, Record<string, AudioBuffer>>();

/** Two seconds of noise, made once per context and kind: white, or brown (deep, like the sea). */
export function noiseBuffer(ctx: BaseAudioContext, kind: 'white' | 'brown' = 'white'): AudioBuffer {
  const cached = noiseCache.get(ctx) ?? {};
  noiseCache.set(ctx, cached);
  const existing = cached[kind];
  if (existing !== undefined) {
    return existing;
  }
  const length = Math.floor(ctx.sampleRate * 2);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let last = 0;
  for (let i = 0; i < length; i += 1) {
    const white = Math.random() * 2 - 1;
    if (kind === 'brown') {
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.5;
    } else {
      data[i] = white;
    }
  }
  cached[kind] = buffer;
  return buffer;
}

/**
 * An envelope on `param`: from silence up to `peak` over `attack`, held for `hold`, then down to silence over
 * `release`. Exponential on the way down, so it dies away like a real sound. Returns when it ends.
 */
export function envelope(param: AudioParam, at: number, peak: number, attack: number, hold: number, release: number): number {
  const floor = 0.0001;
  param.cancelScheduledValues(at);
  param.setValueAtTime(floor, at);
  param.linearRampToValueAtTime(Math.max(floor, peak), at + Math.max(0.003, attack));
  param.setValueAtTime(Math.max(floor, peak), at + attack + hold);
  param.exponentialRampToValueAtTime(floor, at + attack + hold + Math.max(0.01, release));
  return at + attack + hold + release;
}

/** A burst of filtered noise through its own envelope. */
export function noiseBurst(
  ctx: AudioContext,
  out: AudioNode,
  {
    at,
    kind = 'white',
    filter,
    frequency,
    sweepTo,
    q = 1,
    peak,
    attack,
    hold = 0,
    release,
    rate = 1,
  }: {
    at: number;
    kind?: 'white' | 'brown';
    filter: BiquadFilterType;
    frequency: number;
    sweepTo?: number;
    q?: number;
    peak: number;
    attack: number;
    hold?: number;
    release: number;
    rate?: number;
  }
): void {
  const source = ctx.createBufferSource();
  source.buffer = noiseBuffer(ctx, kind);
  source.playbackRate.value = rate;
  const shape = ctx.createBiquadFilter();
  shape.type = filter;
  shape.Q.value = q;
  shape.frequency.setValueAtTime(frequency, at);
  if (sweepTo !== undefined) {
    shape.frequency.exponentialRampToValueAtTime(Math.max(20, sweepTo), at + attack + hold + release);
  }
  const amp = ctx.createGain();
  const end = envelope(amp.gain, at, peak, attack, hold, release);
  source.connect(shape).connect(amp).connect(out);
  // A random place in the noise, so no two bursts sound the same.
  source.start(at, Math.random() * 1.5);
  source.stop(end + 0.05);
}

/** One oscillator through its own envelope, optionally gliding in pitch. */
export function tone(
  ctx: AudioContext,
  out: AudioNode,
  {
    at,
    type = 'sine',
    frequency,
    glideTo,
    detune = 0,
    peak,
    attack,
    hold = 0,
    release,
  }: {
    at: number;
    type?: OscillatorType;
    frequency: number;
    glideTo?: number;
    detune?: number;
    peak: number;
    attack: number;
    hold?: number;
    release: number;
  }
): void {
  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, at);
  if (glideTo !== undefined) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, glideTo), at + attack + hold + release);
  }
  osc.detune.value = detune;
  const amp = ctx.createGain();
  const end = envelope(amp.gain, at, peak, attack, hold, release);
  osc.connect(amp).connect(out);
  osc.start(at);
  osc.stop(end + 0.05);
}

/** A little randomness, so a repeated sound never repeats exactly. */
export function vary(amount: number): number {
  return 1 + (Math.random() * 2 - 1) * amount;
}

/** Every one-shot sound, by name. The story's and the desk's recipes are added below. */
export const VOICES = {} satisfies Record<string, Voice>;

export type SoundName = keyof typeof VOICES;
