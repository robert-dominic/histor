// src/lib/sound/loops.ts
// The held sounds (sound-files brief, 4), each a loop fading in and out, never two of one at once:
// - room-tone: the desk's atmosphere, very low, while the player is at the desk; under the murmur it drops further,
//   so only one of them is in focus;
// - question: held under the central question, from its first line; it fades out as the fork opens (and back if the
//   fork closes on the question), and when the reader goes back into the story;
// - heartbeat: while a final choice is hovered at the verdict, in and out over about half a second;
// - murmur: while ghost text is on the desk, a little louder with each line, gone with the last.
import type { SoundEngine } from '@/lib/sound/engine';
import { MIX } from '@/lib/sound/levels';
import { LoopPlayer } from '@/lib/sound/samples';
import type { StoryEvent } from '@/lib/story-events';

export class Loops {
  readonly roomTone = new LoopPlayer('room-tone');
  readonly question = new LoopPlayer('question');
  readonly heartbeat = new LoopPlayer('heartbeat');
  readonly murmur = new LoopPlayer('murmur');
  private place: 'story' | 'desk' | 'away' = 'away';
  private onQuestion = false;
  private ghosts = 0;
  private readonly engine: SoundEngine;

  constructor(engine: SoundEngine) {
    this.engine = engine;
  }

  /** Brings every loop to what the moment asks (also once the sound starts, for where the player already is). */
  sync(): void {
    const { engine } = this;
    if (this.place === 'desk') {
      this.roomTone.start(engine, this.ghosts > 0 ? MIX.roomTone.underMurmur : MIX.roomTone.level, MIX.roomTone.fade);
    } else {
      this.roomTone.stop(engine, MIX.roomTone.fade);
    }
    if (this.place === 'desk' && this.ghosts > 0) {
      this.murmur.start(engine, Math.min(MIX.murmur.max, MIX.murmur.perLine * this.ghosts), MIX.murmur.rise);
    } else {
      this.murmur.stop(engine, MIX.murmur.fall);
    }
    if (this.place === 'story' && this.onQuestion) {
      this.question.start(engine, 1, MIX.question.fadeIn);
    } else {
      this.question.stop(engine, MIX.question.fadeOut);
    }
  }

  /** Follows a moment. */
  hear(event: StoryEvent): void {
    switch (event.type) {
      case 'place':
        this.place = event.place;
        this.onQuestion = false;
        this.ghosts = 0;
        if (event.place !== 'desk') {
          this.heartbeat.stop(this.engine, MIX.heartbeat.fade);
        }
        break;
      case 'question-line':
        this.onQuestion = true;
        break;
      case 'modal':
        if (event.name === 'fork') {
          this.onQuestion = !event.open;
        }
        break;
      case 'chapter-enter':
      case 'hook':
        this.onQuestion = false;
        break;
      case 'ghosts':
        this.ghosts = Math.max(0, event.count);
        break;
      case 'heartbeat':
        if (event.on) {
          this.heartbeat.start(this.engine, 1, MIX.heartbeat.fade);
        } else {
          this.heartbeat.stop(this.engine, MIX.heartbeat.fade);
        }
        return;
      default:
        return;
    }
    this.sync();
  }

  /** Everything off at once (the page is left). */
  kill(): void {
    [this.roomTone, this.question, this.heartbeat, this.murmur].forEach(loop => loop.kill());
  }
}
