// src/test/fake-audio.ts
// A fake Web Audio context for the sound tests: it records every node made, every connection, every scheduled value
// and every start, and its clock moves only when a test says so (`advance`). No sound is made.

export class FakeParam {
  value: number;
  readonly events: { kind: string; value: number; time: number }[] = [];
  constructor(value = 0) {
    this.value = value;
  }
  private log(kind: string, value: number, time: number) {
    this.events.push({ kind, value, time });
    return this as unknown as AudioParam;
  }
  setValueAtTime(value: number, time: number) {
    return this.log('set', value, time);
  }
  linearRampToValueAtTime(value: number, time: number) {
    return this.log('linear', value, time);
  }
  exponentialRampToValueAtTime(value: number, time: number) {
    return this.log('exponential', value, time);
  }
  setTargetAtTime(value: number, time: number, constant: number) {
    void constant;
    return this.log('target', value, time);
  }
  cancelScheduledValues(time: number) {
    return this.log('cancel', 0, time);
  }
  /** The last value scheduled: where the param is heading. */
  get target(): number {
    const last = [...this.events].reverse().find(event => event.kind !== 'cancel');
    return last?.value ?? this.value;
  }
}

export class FakeNode {
  readonly connections: unknown[] = [];
  readonly kind: string;
  readonly ctx: FakeAudioContext;
  constructor(kind: string, ctx: FakeAudioContext) {
    this.kind = kind;
    this.ctx = ctx;
    ctx.nodes.push(this);
  }
  connect<T>(destination: T): T {
    this.connections.push(destination);
    return destination;
  }
  disconnect() {
    this.connections.length = 0;
  }
}

export class FakeGain extends FakeNode {
  readonly gain = new FakeParam(1);
  constructor(ctx: FakeAudioContext) {
    super('gain', ctx);
  }
}

export class FakeSource extends FakeNode {
  readonly playbackRate = new FakeParam(1);
  readonly frequency = new FakeParam(440);
  readonly detune = new FakeParam(0);
  buffer: unknown = null;
  loop = false;
  type = 'sine';
  startedAt: number | null = null;
  stoppedAt: number | null = null;
  onended: (() => void) | null = null;
  start(time = 0) {
    this.startedAt = time;
    this.ctx.started.push(this);
  }
  stop(time = 0) {
    this.stoppedAt = time;
  }
}

export class FakeFilter extends FakeNode {
  type = 'lowpass';
  readonly frequency = new FakeParam(350);
  readonly Q = new FakeParam(1);
  readonly gain = new FakeParam(0);
  constructor(ctx: FakeAudioContext) {
    super('filter', ctx);
  }
}

export class FakeAudioContext {
  readonly nodes: FakeNode[] = [];
  readonly started: FakeSource[] = [];
  readonly destination = { kind: 'destination' };
  readonly sampleRate = 8000;
  currentTime = 0;
  state: 'running' | 'suspended' | 'closed' = 'suspended';
  resumes = 0;
  /** Every context made, newest last. */
  static made: FakeAudioContext[] = [];
  constructor() {
    FakeAudioContext.made.push(this);
  }
  advance(seconds: number) {
    this.currentTime += seconds;
  }
  resume() {
    this.resumes += 1;
    this.state = 'running';
    return Promise.resolve();
  }
  suspend() {
    this.state = 'suspended';
    return Promise.resolve();
  }
  createGain() {
    return new FakeGain(this);
  }
  createOscillator() {
    return new FakeSource('oscillator', this);
  }
  createBufferSource() {
    return new FakeSource('buffer', this);
  }
  createBiquadFilter() {
    return new FakeFilter(this);
  }
  createStereoPanner() {
    const node = new FakeNode('panner', this) as FakeNode & { pan: FakeParam };
    node.pan = new FakeParam(0);
    return node;
  }
  createBuffer(channels: number, length: number) {
    const data = Array.from({ length: channels }, () => new Float32Array(length));
    return { length, getChannelData: (channel: number) => data[channel] };
  }
  /** A file "decoded": a stand-in buffer half a second long. */
  decodeAudioData() {
    return Promise.resolve({ duration: 0.5, length: 4000, numberOfChannels: 1, sampleRate: this.sampleRate });
  }
  createMediaElementSource() {
    return new FakeNode('media', this);
  }
}

/** A fresh fake context maker, for `new SoundEngine({ createContext })`. */
export function fakeContextMaker() {
  const made: FakeAudioContext[] = [];
  const create = () => {
    const ctx = new FakeAudioContext();
    made.push(ctx);
    return ctx as unknown as AudioContext;
  };
  return { create, made };
}

/** Fills a sample bank with stand-in buffers (half a second each), as if every sound file had loaded. */
export function loadFakeSamples(bank: { set: (name: never, buffer: AudioBuffer) => void }, names: readonly string[]): void {
  for (const name of names) {
    bank.set(name as never, { duration: 0.5, length: 4000, numberOfChannels: 1, sampleRate: 8000 } as AudioBuffer);
  }
}
