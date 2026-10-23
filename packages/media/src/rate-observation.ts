import { PLAYBACK_RATES, type PlaybackRate } from '../../contracts/src/playback-rate.ts';
/** Bounded clock comparison, independent of whether a backend accepted setSpeed. */
export class RateObservation {
  private first: { wall: number; media: number } | undefined;
  private last: { wall: number; media: number } | undefined;
  private samples = 0;
  private invalid = false;
  constructor(readonly expected: PlaybackRate, private readonly started: number) {}
  add(wall: number, media: number): void {
    if (![wall, media, this.started].every(Number.isFinite) || media < 0 || wall < this.started) { this.invalid = true; return; }
    if (wall - this.started < 1200) return;
    if (this.last && (wall <= this.last.wall || media < this.last.media || media - this.last.media > (wall - this.last.wall) * 3 + 1000)) { this.invalid = true; return; }
    this.first ??= { wall, media }; this.last = { wall, media }; this.samples++;
  }
  result(): { ready: boolean; matched: boolean; ratio100: number; code: string } {
    const wall = this.first && this.last ? this.last.wall - this.first.wall : 0;
    const ratio = wall > 0 && this.first && this.last ? (this.last.media - this.first.media) / wall : 0;
    const ready = this.invalid || this.samples >= 4 && wall >= 4000;
    // The slope must be strictly nearer the requested rate than to a stall or any
    // other product rate (and within 20%): a setter left at 1x can never pass 1.25x.
    const distance = Math.abs(ratio - this.expected);
    const separated = [0, ...PLAYBACK_RATES].every(rate => rate === this.expected || Math.abs(ratio - rate) > distance);
    const matched = ready && !this.invalid && distance <= this.expected * .2 && separated;
    const ratio100 = Math.min(999, Math.max(0, Math.round(ratio * 100)));
    return { ready, matched, ratio100, code: `rate.x${String(this.expected).replace('.', '_')}_${this.invalid ? 'discontinuous' : ready ? matched ? 'matched' : 'mismatch' : 'insufficient'}_r${ratio100}` };
  }
}
