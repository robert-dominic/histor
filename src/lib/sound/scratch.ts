// src/lib/sound/scratch.ts
// The pen's scratch, generated (the fix list): the one sound that is not a file. Every stroke of writing (headings,
// pages, the crew list, the signature, file titles, the legend's own pen) is a faint tick of high-passed noise with a
// little random pitch and level, so it never repeats exactly. Throttled by the event table (`SOUND.penTicksPerSecond`).
// It goes through the mix's writing tier like the typewriter.
import type { SoundEngine } from '@/lib/sound/engine';
import { mix } from '@/lib/sound/mix';

/** To tune: the scratch's level, its centre (Hz), and how long it rings (s). */
export const SCRATCH = { peak: 0.05, frequency: 3600, attack: 0.004, release: 0.035 } as const;

/** A little randomness: 1 ± `amount`. */
function vary(amount: number): number {
  return 1 + (Math.random() * 2 - 1) * amount;
}

const noiseCache = new WeakMap<BaseAudioContext, AudioBuffer>();

/** Two seconds of white noise, made once per context. */
function noise(ctx: BaseAudioContext): AudioBuffer {
  const cached = noiseCache.get(ctx);
  if (cached !== undefined) {
    return cached;
  }
  const length = Math.floor(ctx.sampleRate * 2);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) {
    data[i] = Math.random() * 2 - 1;
  }
  noiseCache.set(ctx, buffer);
  return buffer;
}

/** One stroke of the pen: `pitch` lower for the legend's own pen. */
export function playScratch(engine: SoundEngine, { gain = 1, pitch = 1 }: { gain?: number; pitch?: number } = {}): void {
  const ctx = engine.context;
  const out = mix.input(engine, 'writing');
  const length = SCRATCH.attack + SCRATCH.release;
  if (ctx === null || out === null || !engine.voice(length + 0.05)) {
    return;
  }
  const at = ctx.currentTime + 0.005;
  const source = ctx.createBufferSource();
  source.buffer = noise(ctx);
  source.playbackRate.value = vary(0.1);
  const shape = ctx.createBiquadFilter();
  shape.type = 'highpass';
  shape.Q.value = 0.8;
  shape.frequency.setValueAtTime(SCRATCH.frequency * pitch * vary(0.12), at);
  const amp = ctx.createGain();
  // From silence, up, and an exponential fall back to silence: it never clicks.
  const floor = 0.0001;
  const peak = Math.max(floor, SCRATCH.peak * gain * vary(0.3));
  amp.gain.setValueAtTime(floor, at);
  amp.gain.linearRampToValueAtTime(peak, at + SCRATCH.attack);
  amp.gain.exponentialRampToValueAtTime(floor, at + length);
  source.connect(shape).connect(amp).connect(out);
  source.start(at, Math.random() * 1.5);
  source.stop(at + length + 0.05);
  mix.focus(engine, 'writing', length);
}
