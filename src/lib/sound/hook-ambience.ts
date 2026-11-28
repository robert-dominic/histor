// src/lib/sound/hook-ambience.ts
// The sea and the wind under the case's hook screen (the first screen of a case): two long noises, nothing more.
// There is no sea or wind sound file, so this is made in code, small: brown noise through a low-pass that swells like
// waves (the sea), and band-passed noise with a slow, uneven sweep (the wind). It starts when the hook screen opens
// and fades out as it ends; the story itself is not under it. Like every loop it sits in the lowest tier of the mix
// (`loop`), so anything else that plays has the focus.
import { glide, type SoundEngine } from '@/lib/sound/engine';
import { MIX } from '@/lib/sound/levels';
import { mix } from '@/lib/sound/mix';

/** Seconds of noise in the loop. Brown noise through a low-pass has no edge to hear at the seam. */
const NOISE_SECONDS = 6;

function brownNoise(ctx: BaseAudioContext): AudioBuffer {
  const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * NOISE_SECONDS), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let last = 0;
  for (let i = 0; i < data.length; i += 1) {
    last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
    data[i] = last * 3.5;
  }
  return buffer;
}

/** A slow sine moving `param` by ±`depth`. */
function sway(ctx: AudioContext, param: AudioParam, rate: number, depth: number): OscillatorNode {
  const osc = ctx.createOscillator();
  osc.frequency.value = rate;
  const amount = ctx.createGain();
  amount.gain.value = depth;
  osc.connect(amount).connect(param);
  osc.start();
  return osc;
}

export class HookAmbience {
  private amp: GainNode | null = null;
  private sources: AudioScheduledSourceNode[] = [];
  private stopTimer: ReturnType<typeof setTimeout> | null = null;

  get playing(): boolean {
    return this.amp !== null;
  }

  /** Fades in over `fade` seconds. Already playing, it only comes back up. */
  start(engine: SoundEngine, fade: number = MIX.hookAmbience.fadeIn): void {
    const ctx = engine.context;
    const out = mix.input(engine, 'loop');
    if (ctx === null || out === null) {
      return;
    }
    if (this.stopTimer !== null) {
      clearTimeout(this.stopTimer);
      this.stopTimer = null;
    }
    if (this.amp !== null) {
      glide(this.amp.gain, MIX.hookAmbience.level, fade, ctx.currentTime);
      return;
    }
    try {
      const amp = ctx.createGain();
      amp.gain.value = 0;
      amp.connect(out);
      const noise = brownNoise(ctx);
      const loop = () => {
        const source = ctx.createBufferSource();
        source.buffer = noise;
        source.loop = true;
        source.start(ctx.currentTime, Math.random() * NOISE_SECONDS);
        return source;
      };
      // The sea: low and wide, swelling slowly, two unrelated swells so it never repeats exactly.
      const sea = loop();
      const seaFilter = ctx.createBiquadFilter();
      seaFilter.type = 'lowpass';
      seaFilter.frequency.value = 380;
      const swell = ctx.createGain();
      swell.gain.value = 0.7;
      sea.connect(seaFilter).connect(swell).connect(amp);
      // The wind: a thin band that drifts, quieter than the sea.
      const wind = loop();
      const windFilter = ctx.createBiquadFilter();
      windFilter.type = 'bandpass';
      windFilter.frequency.value = 650;
      windFilter.Q.value = 0.8;
      const gust = ctx.createGain();
      gust.gain.value = MIX.hookAmbience.wind;
      wind.connect(windFilter).connect(gust).connect(amp);
      this.sources = [
        sea,
        wind,
        sway(ctx, swell.gain, 0.09, 0.25),
        sway(ctx, swell.gain, 0.047, 0.12),
        sway(ctx, windFilter.frequency, 0.063, 220),
        sway(ctx, gust.gain, 0.051, MIX.hookAmbience.wind * 0.6),
      ];
      this.amp = amp;
      glide(amp.gain, MIX.hookAmbience.level, fade, ctx.currentTime);
    } catch {
      // A browser without these nodes simply has no ambience.
      this.kill();
    }
  }

  /** Fades out over `fade` seconds, then stops. */
  stop(engine: SoundEngine, fade: number = MIX.hookAmbience.fadeOut): void {
    const ctx = engine.context;
    const amp = this.amp;
    if (amp === null || this.stopTimer !== null) {
      return;
    }
    if (ctx !== null) {
      glide(amp.gain, 0, fade, ctx.currentTime);
    }
    this.stopTimer = setTimeout(() => this.kill(), fade * 1000 + 100);
  }

  /** Everything off at once. */
  kill(): void {
    if (this.stopTimer !== null) {
      clearTimeout(this.stopTimer);
      this.stopTimer = null;
    }
    this.sources.forEach(source => {
      try {
        source.stop();
      } catch {
        // Already stopped.
      }
    });
    this.sources = [];
    this.amp?.disconnect();
    this.amp = null;
  }
}
