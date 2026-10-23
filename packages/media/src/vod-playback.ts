import { DomainError } from '../../contracts/src/index.ts';
import { parseVodChoice, parseVodItem, type RepeatMode, type VodChoice, type VodItem } from '../../contracts/src/vod-catalog.ts';
import type { MediaFailure } from '../../contracts/src/media-failure.ts';
import type { MediaClosure, MediaOutcome, MediaSnapshot } from './session.ts';
import { VodSequence } from './vod-sequence.ts';

export interface VodMedia {
  start(initialMs?: number, paused?: boolean): void;
  snapshot(): MediaSnapshot;
  toggle(): void;
  seek(timeMs: number): Promise<void>;
  setRate(rate: 1 | 2): 'accepted' | 'unsupported' | 'busy' | 'failed';
  close(): Promise<MediaClosure>;
}
export interface VodPlaybackSnapshot {
  item: VodItem;
  index: number;
  length: number;
  moving: boolean;
  stopped: boolean;
  restartRequired: boolean;
  continuous: boolean;
  repeat: RepeatMode;
  media?: MediaSnapshot;
}
const empty = (): MediaClosure => ({ closed: true, decoderClosed: true, transportClosed: true });
const unknown = (): MediaClosure => ({ closed: false, decoderClosed: false, transportClosed: false });
function confirmed(value: MediaClosure): boolean { return value.closed && value.decoderClosed && value.transportClosed; }
function combined(a: MediaClosure, b: MediaClosure): MediaClosure {
  return { closed: confirmed(a) && confirmed(b), decoderClosed: a.decoderClosed && b.decoderClosed, transportClosed: a.transportClosed && b.transportClosed };
}
/** One decoder owner for parts, collections, track switches and explicit repeat.
 * The factory must retain upstream addresses in its Worker and enforce catalog
 * authority. This class coordinates real observations/closure, never media time. */
export class VodPlayback {
  private readonly items: VodItem[];
  private readonly sequence: VodSequence;
  private current: VodMedia | undefined;
  private epoch = 0;
  private started = false;
  private moving = false;
  private stopped = false;
  private unsafe = false;
  private continuous = false;
  private repeat: RepeatMode = 'off';
  private choice: VodChoice | undefined;
  private closing: Promise<MediaClosure> | undefined;

  constructor(items: readonly VodItem[], index: number,
    private readonly create: (item: VodItem, choice: VodChoice | undefined, finished: (outcome: MediaOutcome, closure: MediaClosure, failure?: MediaFailure) => void) => VodMedia,
    private readonly finished: (outcome: MediaOutcome, closure: MediaClosure, failure?: MediaFailure) => void) {
    this.items = items.map(parseVodItem);
    this.sequence = new VodSequence(this.items, index);
  }
  snapshot(): VodPlaybackSnapshot {
    const media = this.current?.snapshot();
    return { item: this.sequence.current(), index: this.sequence.position(), length: this.items.length,
      moving: this.moving, stopped: this.stopped, restartRequired: this.unsafe, continuous: this.continuous, repeat: this.repeat,
      ...(media ? { media } : {}) };
  }
  mode(continuous: boolean, repeat: RepeatMode): void {
    if (this.closing) throw new DomainError('cancelled');
    this.sequence.mode(continuous, repeat);
    this.continuous = continuous; this.repeat = repeat;
  }
  start(initialMs = 0): void {
    if (this.started || this.closing || !Number.isSafeInteger(initialMs) || initialMs < 0 || initialMs >= this.sequence.current().durationMs) throw new DomainError('invalid');
    this.started = true;
    this.open(initialMs, false);
  }
  private open(at: number, paused: boolean): void {
    if (this.closing || this.unsafe) return;
    const epoch = ++this.epoch;
    this.stopped = false;
    let media: VodMedia;
    try {
      media = this.create(this.sequence.current(), this.choice ? { ...this.choice } : undefined, (outcome, closure, failure) => {
        // A synchronous factory/start error must drain the returned new owner,
        // never the previous owner still assigned during construction.
        void Promise.resolve().then(() => {
          if (epoch === this.epoch && !this.closing && !this.moving && !this.stopped) return this.complete(outcome, closure, failure);
        });
      });
    } catch {
      // A throwing constructor cannot certify resources it did not return.
      this.unsafe = this.stopped = true;
      this.finished('failed', unknown(), { phase: 'prepare', reason: 'unknown' });
      return;
    }
    this.current = media;
    try { media.start(at, paused); }
    catch { void this.complete('failed', empty(), { phase: 'prepare', reason: 'unknown' }); }
  }
  private async drain(): Promise<MediaClosure> {
    let closure: MediaClosure;
    try { closure = await (this.current?.close() ?? Promise.resolve(empty())); }
    catch { closure = unknown(); }
    if (!confirmed(closure)) this.unsafe = true;
    return { ...closure, closed: confirmed(closure) && !this.unsafe };
  }
  private async complete(outcome: MediaOutcome, reported: MediaClosure, failure?: MediaFailure): Promise<void> {
    if (this.closing || this.moving || this.stopped) return;
    this.moving = true;
    const epoch = ++this.epoch;
    if (!confirmed(reported)) this.unsafe = true;
    const closure = combined(reported, await this.drain());
    if (epoch !== this.epoch || this.closing) return;
    this.moving = false;
    if (outcome === 'ended' && confirmed(closure) && this.sequence.next('ended')) {
      this.current = undefined; this.choice = undefined;
      this.open(0, false);
      return;
    }
    this.stopped = true;
    this.finished(outcome, closure, failure);
  }
  private assertChangeable(): void {
    if (!this.started || this.closing || this.moving || this.unsafe || !this.current) throw new DomainError('invalid');
  }
  async select(index: number, initialMs = 0): Promise<void> {
    this.assertChangeable();
    if (!Number.isSafeInteger(index) || index < 0 || index >= this.items.length || !Number.isSafeInteger(initialMs) || initialMs < 0 || initialMs >= this.items[index]!.durationMs) throw new DomainError('invalid');
    await this.replace(index, initialMs, false, undefined);
  }
  async selectTracks(value: unknown): Promise<void> {
    this.assertChangeable();
    const choice = parseVodChoice(value), snapshot = this.current!.snapshot();
    if (snapshot.seeking || !['playing', 'paused'].includes(snapshot.state) || !Number.isSafeInteger(snapshot.timeMs) || snapshot.timeMs < 0 || snapshot.timeMs >= snapshot.durationMs) throw new DomainError('invalid');
    await this.replace(this.sequence.position(), snapshot.timeMs, snapshot.state === 'paused', choice);
  }
  private async replace(index: number, at: number, paused: boolean, choice: VodChoice | undefined): Promise<void> {
    this.moving = true;
    const epoch = ++this.epoch, closure = await this.drain();
    if (epoch !== this.epoch || this.closing) return;
    this.moving = false;
    if (!confirmed(closure)) {
      this.stopped = true; this.finished('failed', closure); return;
    }
    this.sequence.select(index); this.choice = choice; this.current = undefined;
    // A new source resets speed to its default; no stale accepted-rate label.
    this.open(at, paused);
  }
  toggle(): void { if (this.started && !this.moving && !this.closing && !this.stopped) this.current?.toggle(); }
  async seek(timeMs: number): Promise<void> {
    this.assertChangeable();
    if (this.stopped) throw new DomainError('invalid');
    await this.current!.seek(timeMs);
  }
  setRate(rate: 1 | 2): 'accepted' | 'unsupported' | 'busy' | 'failed' {
    if (this.moving || this.closing || this.stopped || !this.current) return 'busy';
    return this.current.setRate(rate);
  }
  close(): Promise<MediaClosure> {
    if (!this.closing) {
      ++this.epoch; this.stopped = true;
      this.closing = Promise.resolve().then(() => this.drain());
    }
    return this.closing;
  }
}
