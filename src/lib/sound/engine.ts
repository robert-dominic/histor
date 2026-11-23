// src/lib/sound/engine.ts
// The sound engine (polish brief, B1): one AudioContext, created lazily on the first user gesture, never before.
// Three buses under a master: ambience, score and effects. The ambience and the score each pass through a duck, so
// they dip under hooks, stamps and the voice. A cap on the one-shot voices playing at once. The choice to have sound
// on or off is kept in localStorage (`histor:sound`); everything fades out when the tab is hidden.
// Every sound is generated in code (voices.ts, ambience.ts, score.ts): no audio files.

import { SOUND, SOUND_STORAGE_KEY } from '@/lib/sound/levels';

export type BusName = 'ambience' | 'score' | 'effects';
export type DuckName = keyof typeof SOUND.duck;

interface Graph {
  master: GainNode;
  bus: Record<BusName, GainNode>;
  /** Between the ambience and score buses and the master: where they dip. */
  duck: Record<'ambience' | 'score', GainNode>;
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

function readEnabled(): boolean {
  try {
    return localStorage.getItem(SOUND_STORAGE_KEY) !== '0';
  } catch {
    return true;
  }
}

function writeEnabled(on: boolean): void {
  try {
    localStorage.setItem(SOUND_STORAGE_KEY, on ? '1' : '0');
  } catch {
    // Storage unavailable: the choice lasts until the page is left.
  }
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
  private on: boolean;
  private hidden = false;
  /** When each one-shot voice playing now ends, in the context's time. */
  private voiceEnds: number[] = [];
  /** The deepest duck in force, and until when. */
  private duckDepth = 1;
  private duckUntil = 0;
  private duckTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly changeListeners = new Set<() => void>();
  private readonly startListeners = new Set<(ctx: AudioContext) => void>();

  constructor(options: SoundEngineOptions = {}) {
    this.createContext = options.createContext ?? browserContext;
    this.on = readEnabled();
  }

  /** The player's choice: sound on or off. */
  get enabled(): boolean {
    return this.on;
  }

  /** True once a gesture has started the sound, while it is on: sounds can play. */
  get running(): boolean {
    return this.ctx !== null && this.on;
  }

  get context(): AudioContext | null {
    return this.running ? this.ctx : null;
  }

  /** A bus to connect a sound to, or null while nothing can play. */
  bus(name: BusName): AudioNode | null {
    return this.running ? (this.graph?.bus[name] ?? null) : null;
  }

  /** For React: called whenever `enabled` or `running` changes. */
  subscribe(listener: () => void): () => void {
    this.changeListeners.add(listener);
    return () => this.changeListeners.delete(listener);
  }

  /** Called with the context each time the sound starts (or comes back on): the ambience starts then. */
  onStart(listener: (ctx: AudioContext) => void): () => void {
    this.startListeners.add(listener);
    return () => this.startListeners.delete(listener);
  }

  private changed(): void {
    this.changeListeners.forEach(listener => listener());
  }

  /**
   * Called from a user gesture (a click, a key): the only place the context is created or resumed, so nothing ever
   * sounds before one. Does nothing while the sound is off.
   */
  unlock(): boolean {
    if (!this.on) {
      return false;
    }
    if (this.ctx === null) {
      const ctx = this.createContext();
      if (ctx === null) {
        return false;
      }
      this.ctx = ctx;
      this.graph = this.build(ctx);
      this.startListeners.forEach(listener => listener(ctx));
      this.changed();
    }
    if (this.ctx.state === 'suspended' && !this.hidden) {
      void this.ctx.resume().catch(() => undefined);
    }
    return true;
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
    const duck = { ambience: gain(1), score: gain(1) };
    duck.ambience.connect(master);
    duck.score.connect(master);
    const bus = { ambience: gain(SOUND.bus.ambience), score: gain(SOUND.bus.score), effects: gain(SOUND.bus.effects) };
    bus.ambience.connect(duck.ambience);
    bus.score.connect(duck.score);
    bus.effects.connect(master);
    return { master, bus, duck };
  }

  /** Sound on or off, remembered. Turning it on from a gesture starts it at once. */
  setEnabled(on: boolean): void {
    if (on === this.on) {
      return;
    }
    this.on = on;
    writeEnabled(on);
    const ctx = this.ctx;
    if (ctx !== null && this.graph !== null) {
      glide(this.graph.master.gain, on && !this.hidden ? SOUND.master : 0, SOUND.toggleFade, ctx.currentTime);
      if (on) {
        void ctx.resume().catch(() => undefined);
        this.startListeners.forEach(listener => listener(ctx));
      }
    } else if (on) {
      this.unlock();
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
    glide(this.graph.master.gain, hidden || !this.on ? 0 : SOUND.master, SOUND.hiddenFade, ctx.currentTime);
    if (!hidden && this.on) {
      void ctx.resume().catch(() => undefined);
    }
  }

  /**
   * The ambience and the score dip under a moment (a hook, a stamp, the voice), and come back after its hold.
   * Overlapping ducks keep the deepest dip and the latest end. `hold` of 0 holds until `release()`.
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
      for (const node of Object.values(this.graph.duck)) {
        glide(node.gain, depth, SOUND.duckIn, now);
      }
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

  /** Ends every duck: the ambience and the score come back up. */
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
    for (const node of Object.values(this.graph.duck)) {
      glide(node.gain, 1, SOUND.duckOut, ctx.currentTime);
    }
  }

  /** How far the ambience and the score are ducked now (1 = not at all). */
  get ducked(): number {
    const ctx = this.ctx;
    return ctx !== null && ctx.currentTime < this.duckUntil ? this.duckDepth : 1;
  }

  /**
   * Asks for a one-shot voice lasting `seconds`. False when the cap is reached (the sound is skipped) or nothing can
   * play; otherwise the voice counts until it ends.
   */
  voice(seconds: number): boolean {
    const ctx = this.context;
    if (ctx === null) {
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
