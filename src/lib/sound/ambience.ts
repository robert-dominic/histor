// src/lib/sound/ambience.ts
// The case's ambience, generated (polish brief, B2): a few long-running nodes per layer, never new ones every frame.
// - Sea: brown noise through a slowly moving low-pass, swelling like waves (two slow, unrelated LFOs on the filter
//   and two on the gain, so the swell never repeats exactly).
// - Wind: band-passed noise with a slow, uneven sweep; rarely, a gust.
// - Timber: an occasional low creak, a short resonant pulse, every 8 to 20 seconds.
// - At the desk: a room tone, a lamp's faint hum, the sea far away.
// As the story darkens, the sea gets lower and the wind louder. Which layers play comes from the case's theme
// (`CaseTheme.ambience`); without one there is silence.

import type { AmbienceLayer } from '@/types/case';
import { glide } from '@/lib/sound/engine';
import { AMBIENCE } from '@/lib/sound/levels';
import { envelope, noiseBuffer } from '@/lib/sound/voices';

/** Stops nodes that may have stopped already (stopping twice throws). */
function stopAll(nodes: AudioScheduledSourceNode[]): void {
  nodes.forEach(node => {
    try {
      node.stop();
    } catch {
      // Already stopped.
    }
  });
}

/** A layer playing: its own level, how the darkness moves it, and how it stops. */
interface Layer {
  gain: GainNode;
  /** The darkness of the story, 0 (day) to 1 (night). */
  darken?: (darkness: number, now: number) => void;
  stop: () => void;
}

const between = ([low, high]: readonly [number, number]) => low + Math.random() * (high - low);

/** A looping noise source. */
function loopNoise(ctx: AudioContext, kind: 'white' | 'brown'): AudioBufferSourceNode {
  const source = ctx.createBufferSource();
  source.buffer = noiseBuffer(ctx, kind);
  source.loop = true;
  source.start(ctx.currentTime, Math.random() * 1.5);
  return source;
}

/** A slow sine LFO moving `param` by ±`depth`. */
function lfo(ctx: AudioContext, param: AudioParam, rate: number, depth: number): OscillatorNode {
  const osc = ctx.createOscillator();
  osc.frequency.value = rate;
  const amount = ctx.createGain();
  amount.gain.value = depth;
  osc.connect(amount).connect(param);
  osc.start(ctx.currentTime);
  return osc;
}

function sea(ctx: AudioContext, out: GainNode, cutoff: number): Pick<Layer, 'darken' | 'stop'> {
  const source = loopNoise(ctx, 'brown');
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.Q.value = 0.4;
  filter.frequency.value = cutoff;
  const swell = ctx.createGain();
  swell.gain.value = 1 - AMBIENCE.sea.swell;
  source.connect(filter).connect(swell).connect(out);
  const lfos = [
    lfo(ctx, filter.frequency, 0.071, cutoff * 0.38),
    lfo(ctx, filter.frequency, 0.113, cutoff * 0.2),
    lfo(ctx, swell.gain, 0.083, AMBIENCE.sea.swell * 0.65),
    lfo(ctx, swell.gain, 0.047, AMBIENCE.sea.swell * 0.35),
  ];
  return {
    darken: (darkness, now) => {
      const target = cutoff + (AMBIENCE.sea.darkCutoff - AMBIENCE.sea.cutoff) * darkness * (cutoff / AMBIENCE.sea.cutoff);
      filter.frequency.cancelScheduledValues(now);
      filter.frequency.setTargetAtTime(target, now, AMBIENCE.darkGlide / 3);
    },
    stop: () => stopAll([source, ...lfos]),
  };
}

function wind(ctx: AudioContext, out: GainNode): Pick<Layer, 'stop'> {
  const source = loopNoise(ctx, 'white');
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.Q.value = 0.9;
  filter.frequency.value = AMBIENCE.wind.centre;
  const gust = ctx.createGain();
  gust.gain.value = 1;
  source.connect(filter).connect(gust).connect(out);
  const lfos = [
    lfo(ctx, filter.frequency, 0.05, AMBIENCE.wind.centre * 0.4),
    lfo(ctx, filter.frequency, 0.031, AMBIENCE.wind.centre * 0.22),
    lfo(ctx, gust.gain, 0.067, 0.28),
  ];
  // Rarely, a gust: the wind rises and falls away, and its pitch with it.
  let timer: ReturnType<typeof setTimeout> | null = null;
  const next = () => {
    timer = setTimeout(() => {
      const now = ctx.currentTime;
      const { rise, fall, by } = AMBIENCE.wind.gust;
      gust.gain.cancelScheduledValues(now);
      gust.gain.setValueAtTime(gust.gain.value, now);
      gust.gain.linearRampToValueAtTime(1 + by / AMBIENCE.wind.level, now + rise);
      gust.gain.linearRampToValueAtTime(1, now + rise + fall);
      next();
    }, between(AMBIENCE.wind.gust.every) * 1000);
  };
  next();
  return {
    stop: () => {
      if (timer !== null) {
        clearTimeout(timer);
      }
      stopAll([source, ...lfos]);
    },
  };
}

/** One creak of the hull's timber: a short, resonant, low pulse that bends a little in pitch. */
export function creak(ctx: AudioContext, out: AudioNode, at: number, level = 1): void {
  const osc = ctx.createOscillator();
  osc.type = 'sawtooth';
  const pitch = 70 + Math.random() * 60;
  osc.frequency.setValueAtTime(pitch, at);
  osc.frequency.exponentialRampToValueAtTime(pitch * (0.82 + Math.random() * 0.3), at + 0.55);
  const body = ctx.createBiquadFilter();
  body.type = 'bandpass';
  body.Q.value = 11;
  body.frequency.value = 380 + Math.random() * 320;
  const amp = ctx.createGain();
  const end = envelope(amp.gain, at, 0.22 * level, 0.09, 0.12, 0.36);
  osc.connect(body).connect(amp).connect(out);
  osc.start(at);
  osc.stop(end + 0.05);
}

function timber(ctx: AudioContext, out: GainNode): Pick<Layer, 'stop'> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const next = () => {
    timer = setTimeout(() => {
      creak(ctx, out, ctx.currentTime + 0.01);
      // Sometimes the hull answers itself.
      if (Math.random() < 0.35) {
        creak(ctx, out, ctx.currentTime + 0.5 + Math.random() * 0.4, 0.6);
      }
      next();
    }, between(AMBIENCE.timber.every) * 1000);
  };
  next();
  return {
    stop: () => {
      if (timer !== null) {
        clearTimeout(timer);
      }
    },
  };
}

function roomTone(ctx: AudioContext, out: GainNode): Pick<Layer, 'stop'> {
  const source = loopNoise(ctx, 'brown');
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = AMBIENCE['room-tone'].cutoff;
  source.connect(filter).connect(out);
  return { stop: () => stopAll([source]) };
}

function lampHum(ctx: AudioContext, out: GainNode): Pick<Layer, 'stop'> {
  const oscs = [
    { frequency: 60, level: 1 },
    { frequency: 120, level: 0.45 },
  ].map(({ frequency, level }) => {
    const osc = ctx.createOscillator();
    osc.frequency.value = frequency;
    const amp = ctx.createGain();
    amp.gain.value = level;
    osc.connect(amp).connect(out);
    osc.start(ctx.currentTime);
    return osc;
  });
  return { stop: () => stopAll(oscs) };
}

const BUILD: Record<AmbienceLayer, (ctx: AudioContext, out: GainNode) => Pick<Layer, 'darken' | 'stop'>> = {
  sea: (ctx, out) => sea(ctx, out, AMBIENCE.sea.cutoff),
  wind,
  timber,
  'room-tone': roomTone,
  'lamp-hum': lampHum,
  'distant-sea': (ctx, out) => sea(ctx, out, AMBIENCE['distant-sea'].cutoff),
};

/** Each layer's level at a darkness: the sea lower, the wind louder, as the story goes into the night. */
export function layerLevel(layer: AmbienceLayer, darkness: number): number {
  const d = Math.min(1, Math.max(0, darkness));
  if (layer === 'sea') {
    return AMBIENCE.sea.level + (AMBIENCE.sea.darkLevel - AMBIENCE.sea.level) * d;
  }
  if (layer === 'wind') {
    return AMBIENCE.wind.level + (AMBIENCE.wind.darkLevel - AMBIENCE.wind.level) * d;
  }
  return AMBIENCE[layer].level;
}

/** The ambience: the layers of one place at a time, faded in and out, following the story's darkness. */
export class Ambience {
  private layers: { name: AmbienceLayer; layer: Layer }[] = [];
  private wanted: readonly AmbienceLayer[] = [];
  private darkness = 0;

  /** The layers playing now, by name. */
  get playing(): AmbienceLayer[] {
    return this.layers.map(entry => entry.name);
  }

  /**
   * Plays `layers` on `out` (the ambience bus), or nothing when `ctx` is null (no sound yet): layers already playing
   * stay as they are, the others fade out, the new ones fade in.
   */
  set(ctx: AudioContext | null, out: AudioNode | null, layers: readonly AmbienceLayer[]): void {
    this.wanted = layers;
    if (ctx === null || out === null) {
      this.stopAll();
      return;
    }
    const now = ctx.currentTime;
    const keep = this.layers.filter(entry => layers.includes(entry.name));
    this.layers.filter(entry => !layers.includes(entry.name)).forEach(entry => this.fadeOut(ctx, entry.layer));
    const started = layers
      .filter(name => !keep.some(entry => entry.name === name))
      .map(name => {
        const gain = ctx.createGain();
        gain.gain.value = 0;
        gain.connect(out);
        const built = BUILD[name](ctx, gain);
        glide(gain.gain, layerLevel(name, this.darkness), AMBIENCE.fadeIn, now);
        built.darken?.(this.darkness, now);
        return { name, layer: { gain, ...built } };
      });
    this.layers = [...keep, ...started];
  }

  /** Starts the wanted layers again (the sound has just started, or come back on). */
  restart(ctx: AudioContext | null, out: AudioNode | null): void {
    this.stopAll();
    this.set(ctx, out, this.wanted);
  }

  /** The story's darkness, 0 (day) to 1 (night). */
  setDarkness(ctx: AudioContext | null, darkness: number): void {
    this.darkness = Math.min(1, Math.max(0, darkness));
    if (ctx === null) {
      return;
    }
    const now = ctx.currentTime;
    this.layers.forEach(({ name, layer }) => {
      glide(layer.gain.gain, layerLevel(name, this.darkness), AMBIENCE.darkGlide, now);
      layer.darken?.(this.darkness, now);
    });
  }

  private fadeOut(ctx: AudioContext, layer: Layer): void {
    glide(layer.gain.gain, 0, AMBIENCE.fadeOut, ctx.currentTime);
    setTimeout(() => {
      layer.stop();
      layer.gain.disconnect();
    }, (AMBIENCE.fadeOut + 0.2) * 1000);
  }

  /** Stops every layer at once (the sound is off, and the master has faded). */
  stopAll(): void {
    this.layers.forEach(({ layer }) => {
      layer.stop();
      layer.gain.disconnect();
    });
    this.layers = [];
  }
}
