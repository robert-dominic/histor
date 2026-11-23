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

// ---- The story's sounds (polish brief, B3)

/** A chapter enters: a soft, low swell, like the sea lifting the ship. */
const swell: Voice = {
  seconds: 3.8,
  play: (ctx, out, { at, gain, pitch }) => {
    noiseBurst(ctx, out, { at, kind: 'brown', filter: 'lowpass', frequency: 260 * pitch, sweepTo: 520 * pitch, peak: 0.34 * gain, attack: 1.4, hold: 0.2, release: 2.2 });
    tone(ctx, out, { at, frequency: 55 * pitch, peak: 0.07 * gain, attack: 1.2, hold: 0.3, release: 2.2 });
  },
};

/** The pen: one faint scratch, a tick of high-passed noise, a little different every time. */
const scratch: Voice = {
  seconds: 0.06,
  play: (ctx, out, { at, gain, pitch }) =>
    noiseBurst(ctx, out, { at, filter: 'highpass', frequency: 3600 * pitch * vary(0.12), q: 0.8, peak: 0.05 * gain * vary(0.3), attack: 0.004, release: 0.035, rate: vary(0.1) }),
};

/** As the hook's text snaps in: one low, distant boom. */
const boom: Voice = {
  seconds: 3,
  play: (ctx, out, { at, gain, pitch }) => {
    tone(ctx, out, { at, frequency: 48 * pitch, glideTo: 31 * pitch, peak: 0.36 * gain, attack: 0.025, release: 2.7 });
    noiseBurst(ctx, out, { at, kind: 'brown', filter: 'lowpass', frequency: 170 * pitch, sweepTo: 70, peak: 0.3 * gain, attack: 0.02, release: 1.9 });
  },
};

/** The hook decays: a soft whoosh played as if reversed, rising out of nothing and cut off softly. */
const whoosh: Voice = {
  seconds: 1.05,
  play: (ctx, out, { at, gain, pitch }) =>
    noiseBurst(ctx, out, { at, filter: 'bandpass', frequency: 520 * pitch, sweepTo: 2100 * pitch, q: 0.9, peak: 0.14 * gain, attack: 0.85, release: 0.16 }),
};

/** A name un-written: a breathy hiss; the table lowers its pitch for each name. */
const hiss: Voice = {
  seconds: 0.45,
  play: (ctx, out, { at, gain, pitch }) =>
    noiseBurst(ctx, out, { at, filter: 'bandpass', frequency: 2800 * pitch, sweepTo: 2000 * pitch, q: 1.3, peak: 0.075 * gain, attack: 0.06, hold: 0.04, release: 0.32 }),
};

/** The inharmonic partials of a bell (as ratios of its strike tone), and each one's level. */
const BELL_PARTIALS: readonly [number, number][] = [
  [0.5, 0.55],
  [1, 1],
  [1.19, 0.5],
  [1.5, 0.35],
  [2, 0.42],
  [2.51, 0.2],
  [2.66, 0.18],
  [3.01, 0.12],
];

/** A ship's bell, far away: a few sine partials with a long decay, the upper ones dying first, through a low-pass. */
const bell: Voice = {
  seconds: 7,
  play: (ctx, out, { at, gain, pitch }) => {
    const far = ctx.createBiquadFilter();
    far.type = 'lowpass';
    far.frequency.value = 2400;
    far.connect(out);
    BELL_PARTIALS.forEach(([ratio, level]) =>
      tone(ctx, far, { at, frequency: 392 * ratio * pitch, detune: (Math.random() - 0.5) * 6, peak: 0.05 * level * gain, attack: 0.004, release: 6.5 / Math.sqrt(ratio) })
    );
  },
};

/** A line of the question: a faint, low pulse. */
const pulse: Voice = {
  seconds: 1,
  play: (ctx, out, { at, gain, pitch }) => tone(ctx, out, { at, frequency: 52 * pitch, peak: 0.2 * gain, attack: 0.08, release: 0.8 }),
};

/** The fork's modal: a sheet of paper slid across the desk. */
const paperSlide: Voice = {
  seconds: 0.55,
  play: (ctx, out, { at, gain, pitch }) =>
    noiseBurst(ctx, out, { at, filter: 'bandpass', frequency: 1900 * pitch, sweepTo: 900 * pitch, q: 0.7, peak: 0.09 * gain, attack: 0.12, hold: 0.1, release: 0.3 }),
};

/**
 * The hook's drone: two detuned low oscillators, fading in under the hook and held until it leaves. Not a one-shot:
 * it returns a function that fades it out and stops it.
 */
export function drone(ctx: AudioContext, out: AudioNode, level: number): (release: number) => void {
  const amp = ctx.createGain();
  amp.gain.value = 0.0001;
  const low = ctx.createBiquadFilter();
  low.type = 'lowpass';
  low.frequency.value = 240;
  low.connect(amp).connect(out);
  const at = ctx.currentTime;
  const oscs = [41.2, 41.7, 82.1].map((frequency, index) => {
    const osc = ctx.createOscillator();
    osc.type = index === 2 ? 'sine' : 'triangle';
    osc.frequency.value = frequency;
    const part = ctx.createGain();
    part.gain.value = index === 2 ? 0.25 : 0.5;
    osc.connect(part).connect(low);
    osc.start(at);
    return osc;
  });
  amp.gain.setValueAtTime(0.0001, at);
  amp.gain.linearRampToValueAtTime(level, at + 2.4);
  return release => {
    const now = ctx.currentTime;
    amp.gain.cancelScheduledValues(now);
    amp.gain.setValueAtTime(amp.gain.value, now);
    amp.gain.linearRampToValueAtTime(0.0001, now + release);
    oscs.forEach(osc => osc.stop(now + release + 0.05));
  };
}

// ---- The desk's sounds (polish brief, B4)

/** A folder picked up: a quick swish of paper. */
const paperLift: Voice = {
  seconds: 0.2,
  play: (ctx, out, { at, gain, pitch }) =>
    noiseBurst(ctx, out, { at, filter: 'bandpass', frequency: 2300 * pitch, sweepTo: 3600 * pitch, q: 0.8, peak: 0.07 * gain, attack: 0.02, release: 0.14 }),
};

/** A thud on the desk, from soft (`weight` small) to heavy: a short low sine that drops, and a knock of low noise. */
function thudOf(weight: number): Voice {
  return {
    seconds: 0.2 + 0.3 * weight,
    play: (ctx, out, { at, gain, pitch }) => {
      tone(ctx, out, { at, frequency: (70 + 40 * weight) * pitch, glideTo: 44 * pitch, peak: 0.55 * weight * gain, attack: 0.004, release: 0.12 + 0.26 * weight });
      noiseBurst(ctx, out, { at, kind: 'brown', filter: 'lowpass', frequency: 420 * pitch, sweepTo: 110, peak: 0.4 * weight * gain, attack: 0.003, release: 0.08 + 0.12 * weight });
    },
  };
}
const thudSoft = thudOf(0.4);
const thud = thudOf(0.7);
const thudHeavy = thudOf(1);

/** A folder opens: its cover flips (a swish), and settles with a soft thud. */
const coverFlip: Voice = {
  seconds: 0.5,
  play: (ctx, out, options) => {
    const { at, gain, pitch } = options;
    noiseBurst(ctx, out, { at, filter: 'bandpass', frequency: 1100 * pitch, sweepTo: 2600 * pitch, q: 0.7, peak: 0.09 * gain, attack: 0.05, release: 0.2 });
    thudSoft.play(ctx, out, { ...options, at: at + 0.22, gain: gain * 0.7 });
  },
};

/** A pin: a small metallic tick, then a faint creak of string as the thread draws. */
const pinTick: Voice = {
  seconds: 0.45,
  play: (ctx, out, { at, gain, pitch }) => {
    [
      [3150, 0.05, 0.06],
      [4720, 0.03, 0.045],
      [6290, 0.018, 0.03],
    ].forEach(([frequency, peak, release]) => tone(ctx, out, { at, frequency: frequency * pitch, peak: peak * gain, attack: 0.002, release }));
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(205 * pitch, at + 0.06);
    osc.frequency.linearRampToValueAtTime(240 * pitch, at + 0.4);
    const string = ctx.createBiquadFilter();
    string.type = 'bandpass';
    string.frequency.value = 950;
    string.Q.value = 6;
    const amp = ctx.createGain();
    const end = envelope(amp.gain, at + 0.06, 0.025 * gain, 0.06, 0.08, 0.2);
    osc.connect(string).connect(amp).connect(out);
    osc.start(at + 0.06);
    osc.stop(end + 0.05);
  },
};

/** A disputed stamp's pen: a short stroke of scratches in the margin. */
const penStroke: Voice = {
  seconds: 0.5,
  play: (ctx, out, options) => {
    for (let i = 0; i < 5; i += 1) {
      scratch.play(ctx, out, { ...options, at: options.at + i * 0.075 + Math.random() * 0.02, gain: options.gain * 1.3 });
    }
  },
};

/** A legend's ink drains: an eerie, detuned music-box phrase, falling in pitch, each note sagging a little. */
const MUSIC_BOX = [88, 84, 81, 77, 74, 71];
const musicBox: Voice = {
  seconds: MUSIC_BOX.length * 0.34 + 1.4,
  play: (ctx, out, { at, gain, pitch }) =>
    MUSIC_BOX.forEach((note, index) => {
      const frequency = 440 * 2 ** ((note - 69) / 12) * pitch;
      const t = at + index * 0.34 + Math.random() * 0.03;
      const detune = (Math.random() - 0.5) * 40;
      tone(ctx, out, { at: t, type: 'triangle', frequency, glideTo: frequency * 0.985, detune, peak: 0.05 * gain, attack: 0.003, release: 1.2 });
      tone(ctx, out, { at: t, frequency: frequency * 2.01, detune, peak: 0.012 * gain, attack: 0.002, release: 0.5 });
    }),
};

/** Under "You almost believed this.": a faint whisper of noise. */
const whisper: Voice = {
  seconds: 2.6,
  play: (ctx, out, { at, gain, pitch }) =>
    noiseBurst(ctx, out, { at, filter: 'bandpass', frequency: 3100 * pitch, sweepTo: 2300 * pitch, q: 0.6, peak: 0.03 * gain, attack: 0.7, hold: 0.6, release: 1.3 }),
};

/** The rank revealed: a single typewriter bell. */
const ding: Voice = {
  seconds: 1.5,
  play: (ctx, out, { at, gain, pitch }) => {
    tone(ctx, out, { at, frequency: 2093 * pitch, peak: 0.08 * gain, attack: 0.002, release: 1.4 });
    tone(ctx, out, { at, frequency: 5230 * pitch, peak: 0.02 * gain, attack: 0.002, release: 0.6 });
  },
};

// ---- The interface's sounds (music brief, 4): subtle, short, never annoying

/** Any button or link pressed: a soft paper tick. */
const paperTick: Voice = {
  seconds: 0.05,
  play: (ctx, out, { at, gain, pitch }) =>
    noiseBurst(ctx, out, { at, filter: 'bandpass', frequency: 3000 * pitch * vary(0.08), q: 1.4, peak: 0.035 * gain, attack: 0.002, release: 0.025 }),
};

/** The ? guide opened (or, quieter, closed): a page turning, a swish with the flutter of its edge. */
const pageFlip: Voice = {
  seconds: 0.45,
  play: (ctx, out, { at, gain, pitch }) => {
    noiseBurst(ctx, out, { at, filter: 'bandpass', frequency: 900 * pitch, sweepTo: 3200 * pitch, q: 0.8, peak: 0.07 * gain, attack: 0.06, release: 0.22 });
    [0.05, 0.11, 0.16].forEach((offset, index) =>
      noiseBurst(ctx, out, { at: at + offset, filter: 'highpass', frequency: 2600 * pitch, q: 0.7, peak: (0.025 - index * 0.006) * gain, attack: 0.003, release: 0.03 })
    );
  },
};

/** A modal closing: a paper slid back out, falling where the slide in rises. */
const slideOut: Voice = {
  seconds: 0.45,
  play: (ctx, out, { at, gain, pitch }) =>
    noiseBurst(ctx, out, { at, filter: 'bandpass', frequency: 1000 * pitch, sweepTo: 1900 * pitch, q: 0.7, peak: 0.07 * gain, attack: 0.08, hold: 0.06, release: 0.24 }),
};

/** The pointer onto a file on the floor: a very faint brush. */
const brush: Voice = {
  seconds: 0.18,
  play: (ctx, out, { at, gain, pitch }) =>
    noiseBurst(ctx, out, { at, filter: 'bandpass', frequency: 1500 * pitch * vary(0.1), q: 0.6, peak: 0.016 * gain, attack: 0.03, release: 0.13 }),
};

/** A toggle switched: a small click. */
const switchClick: Voice = {
  seconds: 0.06,
  play: (ctx, out, { at, gain, pitch }) => {
    noiseBurst(ctx, out, { at, filter: 'highpass', frequency: 5000 * pitch, peak: 0.03 * gain, attack: 0.001, release: 0.012 });
    tone(ctx, out, { at, frequency: 1800 * pitch, peak: 0.02 * gain, attack: 0.001, release: 0.03 });
  },
};

/** Every one-shot sound, by name. */
export const VOICES = {
  'paper-tick': paperTick,
  'page-flip': pageFlip,
  'slide-out': slideOut,
  brush,
  'switch-click': switchClick,
  'paper-lift': paperLift,
  'cover-flip': coverFlip,
  'thud-soft': thudSoft,
  thud,
  'thud-heavy': thudHeavy,
  'pin-tick': pinTick,
  'pen-stroke': penStroke,
  'music-box': musicBox,
  whisper,
  ding,
  swell,
  scratch,
  boom,
  whoosh,
  hiss,
  bell,
  pulse,
  'paper-slide': paperSlide,
} satisfies Record<string, Voice>;

export type SoundName = keyof typeof VOICES;
