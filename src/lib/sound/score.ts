// src/lib/sound/score.ts
// The score (polish brief, B2b): background music generated in code, just above silence, like a film's atmosphere.
// A pad of a few soft, detuned oscillators through a low-pass, playing long minor chords that change rarely (every
// 10 to 20 seconds, crossfaded). No melody, no beat.
// - Each chapter shifts the chord a little darker (lower, duller).
// - A hook thins it to the drone: only the roots.
// - The question drops it to almost nothing.
// - At the desk it is thinner still: a single low held tone that moves rarely.
// Two groups of four oscillators, made once and kept running; a chord change crossfades from one group to the other.

import { glide } from '@/lib/sound/engine';
import { SCORE } from '@/lib/sound/levels';

export type ScoreMood = 'story' | 'hook' | 'question' | 'desk' | 'away';

/** Minor chords low in the register, as MIDI notes: root, third, fifth. */
const STORY_CHORDS: readonly (readonly [number, number, number])[] = [
  [45, 48, 52], // A minor
  [41, 44, 48], // F minor
  [43, 46, 50], // G minor
  [38, 41, 45], // D minor
  [40, 43, 47], // E minor
];
/** The desk's single held tones. */
const DESK_TONES = [33, 31, 36, 29];

export const midiToHz = (note: number) => 440 * 2 ** ((note - 69) / 12);

const between = ([low, high]: readonly [number, number]) => low + Math.random() * (high - low);

interface Group {
  gain: GainNode;
  oscs: OscillatorNode[];
  /** Each voice's own level: the upper voices go quiet for a hook and at the desk. */
  levels: GainNode[];
}

export class Score {
  private ctx: AudioContext | null = null;
  private out: GainNode | null = null;
  private filter: BiquadFilterNode | null = null;
  private groups: Group[] = [];
  /** The group sounding now. */
  private front = 0;
  private chord = 0;
  private moodNow: ScoreMood = 'away';
  private depth = 0;
  private timer: ReturnType<typeof setTimeout> | null = null;
  /** True once the oscillators have a chord to play. */
  private tuned = false;

  get mood(): ScoreMood {
    return this.moodNow;
  }

  /** The chord sounding now, as MIDI notes (for tests and tuning). */
  get notes(): number[] {
    if (this.moodNow === 'desk') {
      return [DESK_TONES[this.chord % DESK_TONES.length]];
    }
    const shift = Math.round(this.depth * SCORE.darkSemitones);
    return STORY_CHORDS[this.chord % STORY_CHORDS.length].map(note => note - shift);
  }

  /**
   * Sets the mood (and, in the story, the chapter's depth into the night). With a context and the score bus it
   * plays; without, it only remembers, for when the sound starts.
   */
  set(ctx: AudioContext | null, bus: AudioNode | null, mood: ScoreMood, depth: number = this.depth): void {
    const before = this.moodNow;
    this.moodNow = mood;
    this.depth = Math.min(1, Math.max(0, depth));
    if (ctx === null || bus === null || mood === 'away') {
      this.fadeAway();
      return;
    }
    if (this.ctx !== ctx || this.out === null) {
      this.build(ctx, bus);
    }
    const now = ctx.currentTime;
    glide(this.out!.gain, SCORE.mood[mood], SCORE.moodGlide, now);
    this.filter!.frequency.setTargetAtTime(SCORE.cutoff + (SCORE.darkCutoff - SCORE.cutoff) * this.depth, now, SCORE.moodGlide / 2);
    // A first chord; or between the story's chords and the desk's single tone.
    if (!this.tuned || (before !== mood && (mood === 'desk' || before === 'desk'))) {
      this.next();
    } else {
      this.voice();
    }
  }

  /** Starts again from the remembered mood (the sound has just started, or come back on). */
  restart(ctx: AudioContext | null, bus: AudioNode | null): void {
    this.stop();
    this.set(ctx, bus, this.moodNow);
  }

  private build(ctx: AudioContext, bus: AudioNode): void {
    this.stop();
    this.ctx = ctx;
    const out = ctx.createGain();
    out.gain.value = 0;
    out.connect(bus);
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.Q.value = 0.5;
    filter.frequency.value = SCORE.cutoff;
    filter.connect(out);
    this.out = out;
    this.filter = filter;
    this.groups = [0, 1].map(() => {
      const gain = ctx.createGain();
      gain.gain.value = 0;
      gain.connect(filter);
      const levels: GainNode[] = [];
      const oscs = SCORE.voices.map((level, index) => {
        const osc = ctx.createOscillator();
        osc.type = index < 2 ? 'sawtooth' : 'triangle';
        osc.frequency.value = 0;
        osc.detune.value = index === 0 ? -SCORE.detune : index === 1 ? SCORE.detune : 0;
        const amp = ctx.createGain();
        amp.gain.value = level;
        osc.connect(amp).connect(gain);
        osc.start(ctx.currentTime);
        levels.push(amp);
        return osc;
      });
      return { gain, oscs, levels };
    });
    this.front = 0;
  }

  /** The voices of the sounding group, for the mood: all of them, or the roots alone. */
  private voice(): void {
    const ctx = this.ctx;
    if (ctx === null || this.groups.length === 0) {
      return;
    }
    const rootsOnly = this.moodNow === 'hook' || this.moodNow === 'desk';
    const single = this.moodNow === 'desk';
    this.groups.forEach(group =>
      group.levels.forEach((amp, index) => {
        const on = index === 0 || (index === 1 && !single) || (index > 1 && !rootsOnly);
        glide(amp.gain, on ? SCORE.voices[index] : 0, SCORE.moodGlide, ctx.currentTime);
      })
    );
  }

  /** On to the next chord (or the desk's next tone): tuned on the quiet group, then crossfaded in. */
  private next(): void {
    const ctx = this.ctx;
    if (ctx === null || this.groups.length === 0) {
      return;
    }
    if (this.timer !== null) {
      clearTimeout(this.timer);
    }
    const pool = this.moodNow === 'desk' ? DESK_TONES.length : STORY_CHORDS.length;
    this.chord = (this.chord + 1 + Math.floor(Math.random() * (pool - 1))) % pool;
    const notes = this.notes;
    const back = this.groups[1 - this.front];
    const front = this.groups[this.front];
    const t = ctx.currentTime;
    back.oscs.forEach((osc, index) => {
      const note = this.moodNow === 'desk' ? notes[0] : (notes[index === 0 || index === 1 ? 0 : index - 1] ?? notes[0]);
      osc.frequency.setValueAtTime(midiToHz(note), t);
    });
    const fade = this.tuned ? SCORE.crossfade : SCORE.moodGlide;
    this.tuned = true;
    glide(back.gain.gain, 1, fade, t);
    glide(front.gain.gain, 0, fade, t);
    this.front = 1 - this.front;
    this.voice();
    const wait = between(this.moodNow === 'desk' ? SCORE.deskChange : SCORE.change);
    this.timer = setTimeout(() => this.next(), wait * 1000);
  }

  private fadeAway(): void {
    const ctx = this.ctx;
    const out = this.out;
    if (ctx === null || out === null) {
      return;
    }
    glide(out.gain, 0, SCORE.moodGlide, ctx.currentTime);
    if (this.timer !== null) {
      clearTimeout(this.timer);
    }
    this.timer = setTimeout(() => {
      if (this.moodNow === 'away') {
        this.stop();
      }
    }, (SCORE.moodGlide + 0.3) * 1000);
  }

  /** Stops every oscillator (the sound is off, and the master has faded). */
  stop(): void {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.groups.forEach(group =>
      group.oscs.forEach(osc => {
        try {
          osc.stop();
        } catch {
          // Already stopped.
        }
      })
    );
    this.out?.disconnect();
    this.groups = [];
    this.out = null;
    this.filter = null;
    this.ctx = null;
    this.tuned = false;
  }
}
