// src/lib/sound/mix.ts
// The mix: one thing in focus (sound-files brief, 4). Every sound file plays through its tier's gain (TIERS, in
// priority order: voice > stamp > dread > question > file > writing > ui > loop), and the tiers sit under the effects
// bus. While a sound plays, every tier below it dips (`MIX.focusDuck`) and comes back as it ends; the voice holds the
// dip for as long as it speaks. Built once per context, lazily.
import type { SoundEngine } from '@/lib/sound/engine';
import { glide } from '@/lib/sound/engine';
import { MIX, TIERS, type Tier } from '@/lib/sound/levels';

export class Mix {
  private gains: Map<Tier, GainNode> | null = null;
  private ctx: BaseAudioContext | null = null;
  /** Until when (context time) each tier is held down, and by whom. */
  private readonly downUntil = new Map<Tier, number>();
  private readonly timers = new Map<Tier, ReturnType<typeof setTimeout>>();

  /** The gain a tier's sounds connect to, or null while the effects cannot be heard. */
  input(engine: SoundEngine, tier: Tier): AudioNode | null {
    const ctx = engine.context;
    const out = engine.bus('effects');
    if (ctx === null || out === null) {
      return null;
    }
    if (this.gains === null || this.ctx !== ctx) {
      this.ctx = ctx;
      this.gains = new Map(
        TIERS.map(name => {
          const gain = ctx.createGain();
          gain.gain.value = 1;
          gain.connect(out);
          return [name, gain] as const;
        })
      );
    }
    return this.gains.get(tier) ?? null;
  }

  /** How far a tier is turned down now (1 = not at all), for tests and the dev page. */
  level(tier: Tier): number {
    return this.gains?.get(tier)?.gain.value ?? 1;
  }

  /** The gain node of a tier (tests). */
  gain(tier: Tier): GainNode | null {
    return this.gains?.get(tier) ?? null;
  }

  /** A sound of `tier` plays for `seconds` (Infinity: until `end`): every tier below it dips meanwhile. */
  focus(engine: SoundEngine, tier: Tier, seconds: number): void {
    const ctx = engine.context;
    if (ctx === null || this.gains === null) {
      return;
    }
    const now = ctx.currentTime;
    const until = now + seconds;
    for (const lower of TIERS.slice(TIERS.indexOf(tier) + 1)) {
      const gain = this.gains.get(lower);
      if (gain === undefined) {
        continue;
      }
      if (until > (this.downUntil.get(lower) ?? 0)) {
        this.downUntil.set(lower, until);
      }
      glide(gain.gain, MIX.focusDuck, MIX.focusIn, now);
      this.schedule(engine, lower);
    }
  }

  /** The voice (or any held focus) has ended: the tiers below come back, unless something else still holds them. */
  end(engine: SoundEngine, tier: Tier): void {
    for (const lower of TIERS.slice(TIERS.indexOf(tier) + 1)) {
      if (this.downUntil.get(lower) === Number.POSITIVE_INFINITY) {
        this.downUntil.set(lower, 0);
      }
      this.restore(engine, lower);
    }
  }

  private schedule(engine: SoundEngine, tier: Tier): void {
    const ctx = engine.context;
    const until = this.downUntil.get(tier) ?? 0;
    if (ctx === null || !Number.isFinite(until)) {
      return;
    }
    const existing = this.timers.get(tier);
    if (existing !== undefined) {
      clearTimeout(existing);
    }
    this.timers.set(
      tier,
      setTimeout(() => this.restore(engine, tier), Math.max(0, until - ctx.currentTime) * 1000)
    );
  }

  private restore(engine: SoundEngine, tier: Tier): void {
    const ctx = engine.context;
    const gain = this.gains?.get(tier);
    if (ctx === null || gain === undefined) {
      return;
    }
    if (ctx.currentTime + 0.001 < (this.downUntil.get(tier) ?? 0)) {
      this.schedule(engine, tier);
      return;
    }
    this.timers.delete(tier);
    glide(gain.gain, 1, MIX.focusOut, ctx.currentTime);
  }
}

/** The app's mix. */
export const mix = new Mix();
