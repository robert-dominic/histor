// src/lib/sound/engine.ts
// The sound engine (polish brief, B1; music brief, 1): one AudioContext, created lazily on the first user gesture,
// never before. Two channels the player controls separately, each on or off with its own volume, remembered in
// localStorage (`SOUND_KEYS`):
// - music: the music bus (off: `MUSIC_ENABLED`, sound-files brief, 3; kept for when music comes back);
// - effects: the effects bus, and the narrator's voice (narration.ts reads its volume): the one "Sound" control.
// The music side passes through a duck, so it dips under hooks, stamps and the voice. A cap on the one-shot voices
// playing at once. Everything fades out when the tab is hidden.

import { MUSIC_ENABLED, SOUND, SOUND_KEYS } from '@/lib/sound/levels';

export type Channel = 'music' | 'effects';
export type BusName = 'music' | 'ambience' | 'score' | 'effects';
export type DuckName = keyof typeof SOUND.duck;

/** The buses on the music side: they follow the music control, and they duck. */
const MUSIC_SIDE: readonly BusName[] = ['music', 'ambience', 'score'];

export interface Graph {
  master: GainNode;
  /** Each channel's on/off and volume. */
  gate: Record<Channel, GainNode>;
  /** Between the music side's buses and their gate: where they dip. */
  duck: GainNode;
  bus: Record<BusName, GainNode>;
}

export interface SoundEngineOptions {
  /** Makes the AudioContext; null where the browser has none. Tests pass a fake. */
  createContext?: () => AudioContext | null;
}

function browserContext(): AudioContext | null {
  if (typeof window === 'undefined') {
    return null;
  }
  const Context = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (Context === undefined) {
    return null;
  }
  try {
    return new Context();
  } catch {
    return null;
  }
}

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Storage unavailable: the choice lasts until the page is left.
  }
}

/** A channel's remembered state: on unless turned off (or the old single switch was off), at its volume. */
function readChannel(channel: Channel): { on: boolean; volume: number } {
  const stored = read(SOUND_KEYS[channel]);
  const on = stored === null ? read(SOUND_KEYS.legacy) !== '0' : stored !== '0';
  const raw = Number.parseFloat(read(channel === 'music' ? SOUND_KEYS.musicVolume : SOUND_KEYS.effectsVolume) ?? '');
  const volume = Number.isFinite(raw) ? Math.min(1, Math.max(0, raw)) : SOUND.defaultVolume;
  return { on, volume };
}

/** Moves a gain smoothly to `value` over `seconds`, from wherever it is now: never a jump, never a click. */
export function glide(param: AudioParam, value: number, seconds: number, now: number): void {
  param.cancelScheduledValues(now);
  param.setValueAtTime(param.value, now);
  param.linearRampToValueAtTime(value, now + Math.max(0.01, seconds));
}

export class SoundEngine {
  private readonly createContext: () => AudioContext | null;
  private ctx: AudioContext | null = null;
  private graph: Graph | null = null;
  private readonly channels: Record<Channel, { on: boolean; volume: number }>;
  private hidden = false;
  /** When each one-shot voice playing now ends, in the context's time. */
  private voiceEnds: number[] = [];
  /** The deepest duck in force, and until when. */
  private duckDepth = 1;
  private duckUntil = 0;
  private duckTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly changeListeners = new Set<() => void>();
  private readonly startListeners = new Set<(ctx: AudioContext, channel: Channel | null) => void>();

  constructor(options: SoundEngineOptions = {}) {
    this.createContext = options.createContext ?? browserContext;
    this.channels = { music: readChannel('music'), effects: readChannel('effects') };
  }

  /** The player's choice for a channel: on or off. */
  isOn(channel: Channel): boolean {
    return this.channels[channel].on;
  }

  /** A channel's volume, 0 to 1. */
  volume(channel: Channel): number {
    return this.channels[channel].volume;
  }

  /** True while a channel that can be heard is on: Sound (the effects), and the music only while it is enabled. */
  get enabled(): boolean {
    return this.channels.effects.on || (MUSIC_ENABLED && this.channels.music.on);
  }

  /** True once a gesture has started the sound, while either channel is on. */
  get running(): boolean {
    return this.ctx !== null && this.enabled;
  }

  /** True when a channel can be heard now: started, and on. */
  playing(channel: Channel): boolean {
    return this.ctx !== null && this.channels[channel].on;
  }

  get context(): AudioContext | null {
    return this.running ? this.ctx : null;
  }

  /** The graph, for tests and the dev page. Null before the sound starts. */
  get nodes(): Graph | null {
    return this.graph;
  }

  /** A bus to connect a sound to, or null while its channel cannot be heard. */
  bus(name: BusName): AudioNode | null {
    const channel: Channel = MUSIC_SIDE.includes(name) ? 'music' : 'effects';
    return this.playing(channel) ? (this.graph?.bus[name] ?? null) : null;
  }

  /** For React: called whenever a channel or `running` changes. */
  subscribe(listener: () => void): () => void {
    this.changeListeners.add(listener);
    return () => this.changeListeners.delete(listener);
  }

  /**
   * Called with the context when the sound starts (`channel` null) and when a channel comes back on: the music
   * starts (or resumes) then.
   */
  onStart(listener: (ctx: AudioContext, channel: Channel | null) => void): () => void {
    this.startListeners.add(listener);
    return () => this.startListeners.delete(listener);
  }

  private changed(): void {
    this.changeListeners.forEach(listener => listener());
  }

  /**
   * Called from a user gesture (a click, a key): the only place the context is created or resumed, so nothing ever
   * sounds before one. Does nothing while both channels are off.
   */
  unlock(): boolean {
    if (!this.enabled) {
      return false;
    }
    if (this.ctx === null) {
      const ctx = this.createContext();
      if (ctx === null) {
        return false;
      }
      this.ctx = ctx;
      this.graph = this.build(ctx);
      this.startListeners.forEach(listener => listener(ctx, null));
      this.changed();
    }
    if (this.ctx.state === 'suspended' && !this.hidden) {
      void this.ctx.resume().catch(() => undefined);
    }
    return true;
  }

  private gateLevel(channel: Channel): number {
    const { on, volume } = this.channels[channel];
    return on ? volume : 0;
  }

  private build(ctx: AudioContext): Graph {
    const gain = (value: number) => {
      const node = ctx.createGain();
      node.gain.value = value;
      return node;
    };
    const master = gain(0);
    master.connect(ctx.destination);
    // The master fades in, never starts at full.
    glide(master.gain, this.hidden ? 0 : SOUND.master, SOUND.toggleFade, ctx.currentTime);
    const gate = { music: gain(this.gateLevel('music')), effects: gain(this.gateLevel('effects')) };
    gate.music.connect(master);
    gate.effects.connect(master);
    const duck = gain(1);
    duck.connect(gate.music);
    const bus = { music: gain(SOUND.bus.music), ambience: gain(SOUND.bus.ambience), score: gain(SOUND.bus.score), effects: gain(SOUND.bus.effects) };
    bus.music.connect(duck);
    bus.ambience.connect(duck);
    bus.score.connect(duck);
    bus.effects.connect(gate.effects);
    return { master, gate, duck, bus };
  }

  /** A channel on or off, remembered. Turning one on from a gesture starts the sound at once. */
  setOn(channel: Channel, on: boolean): void {
    if (on === this.channels[channel].on) {
      return;
    }
    this.channels[channel].on = on;
    write(SOUND_KEYS[channel], on ? '1' : '0');
    const ctx = this.ctx;
    if (ctx !== null && this.graph !== null) {
      glide(this.graph.gate[channel].gain, this.gateLevel(channel), SOUND.toggleFade, ctx.currentTime);
      if (on) {
        void ctx.resume().catch(() => undefined);
        this.startListeners.forEach(listener => listener(ctx, channel));
      }
    } else if (on) {
      this.unlock();
    }
    this.changed();
  }

  /** A channel's volume, 0 to 1, remembered. */
  setVolume(channel: Channel, volume: number): void {
    const value = Math.min(1, Math.max(0, volume));
    this.channels[channel].volume = value;
    write(channel === 'music' ? SOUND_KEYS.musicVolume : SOUND_KEYS.effectsVolume, String(Math.round(value * 100) / 100));
    if (this.ctx !== null && this.graph !== null) {
      glide(this.graph.gate[channel].gain, this.gateLevel(channel), 0.08, this.ctx.currentTime);
    }
    this.changed();
  }

  /** The tab is hidden (or shown again): everything fades out (or back in). */
  setHidden(hidden: boolean): void {
    this.hidden = hidden;
    const ctx = this.ctx;
    if (ctx === null || this.graph === null) {
      return;
    }
    glide(this.graph.master.gain, hidden ? 0 : SOUND.master, SOUND.hiddenFade, ctx.currentTime);
    if (!hidden && this.enabled) {
      void ctx.resume().catch(() => undefined);
    } else if (hidden) {
      // Once faded, the context rests: no CPU spent on a tab nobody hears.
      setTimeout(() => {
        if (this.hidden) {
          void ctx.suspend().catch(() => undefined);
        }
      }, (SOUND.hiddenFade + 0.1) * 1000);
    }
  }

  /**
   * The music side dips under a moment (a hook, a stamp, the voice), and comes back after its hold. Overlapping
   * ducks keep the deepest dip and the latest end. `hold` of 0 holds until `release()`.
   */
  duck(name: DuckName, hold: number = SOUND.duck[name].hold): void {
    const ctx = this.context;
    if (ctx === null || this.graph === null) {
      return;
    }
    const now = ctx.currentTime;
    const depth = SOUND.duck[name].to;
    const until = hold === 0 ? Number.POSITIVE_INFINITY : now + hold;
    if (now >= this.duckUntil) {
      this.duckDepth = 1;
    }
    if (depth < this.duckDepth) {
      this.duckDepth = depth;
      glide(this.graph.duck.gain, depth, SOUND.duckIn, now);
    }
    if (until > this.duckUntil) {
      this.duckUntil = until;
      if (this.duckTimer !== null) {
        clearTimeout(this.duckTimer);
        this.duckTimer = null;
      }
      if (Number.isFinite(until)) {
        this.duckTimer = setTimeout(() => this.release(), hold * 1000);
      }
    }
  }

  /** Ends every duck: the music side comes back up. */
  release(): void {
    if (this.duckTimer !== null) {
      clearTimeout(this.duckTimer);
      this.duckTimer = null;
    }
    this.duckDepth = 1;
    this.duckUntil = 0;
    const ctx = this.ctx;
    if (ctx === null || this.graph === null) {
      return;
    }
    glide(this.graph.duck.gain, 1, SOUND.duckOut, ctx.currentTime);
  }

  /** How far the music side is ducked now (1 = not at all). */
  get ducked(): number {
    const ctx = this.ctx;
    return ctx !== null && ctx.currentTime < this.duckUntil ? this.duckDepth : 1;
  }

  /**
   * Asks for a one-shot effect lasting `seconds`. False when the cap is reached (the sound is skipped) or the effects
   * cannot be heard; otherwise the voice counts until it ends.
   */
  voice(seconds: number): boolean {
    const ctx = this.context;
    if (ctx === null || !this.channels.effects.on) {
      return false;
    }
    const now = ctx.currentTime;
    this.voiceEnds = this.voiceEnds.filter(end => end > now);
    if (this.voiceEnds.length >= SOUND.maxVoices) {
      return false;
    }
    this.voiceEnds.push(now + seconds);
    return true;
  }

  /** How many one-shot voices are playing now. */
  get voices(): number {
    const now = this.ctx?.currentTime ?? 0;
    return this.voiceEnds.filter(end => end > now).length;
  }
}
