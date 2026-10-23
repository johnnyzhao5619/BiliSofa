import { finite } from '../../contracts/src/index.ts';

export interface OverlayClockSample { source: string; timeMs: number; durationMs: number; playing: boolean; seeking: boolean; buffering: boolean; rate: 1 | 2; }
/** Visual motion only. Decoder ticks remain authoritative for subtitles,
 * persisted progress and commands. Never extrapolate through an unbounded stall. */
export class OverlayMotionClock {
  private previous: OverlayClockSample | undefined;
  private anchor = 0;
  private wall = 0;
  private presented = 0;
  constructor(private readonly horizonMs = 1000) { finite(horizonMs, 0, 1500); }
  frame(sample: OverlayClockSample, now: number): number {
    finite(sample.timeMs, 0, 86400000); finite(sample.durationMs, 0, 86400000); finite(now, 0, Number.MAX_SAFE_INTEGER);
    const old = this.previous;
    const reset = !old || old.source !== sample.source || old.playing !== sample.playing || old.seeking !== sample.seeking || old.buffering !== sample.buffering || old.rate !== sample.rate || sample.timeMs < old.timeMs || sample.timeMs - old.timeMs > 2000 || now < this.wall;
    if (reset || sample.timeMs !== old!.timeMs) { this.anchor = sample.timeMs; this.wall = now; }
    const moving = sample.playing && !sample.seeking && !sample.buffering;
    let value = this.anchor + (moving ? Math.min(this.horizonMs, Math.max(0, now - this.wall)) * sample.rate : 0);
    if (!reset && moving) value = Math.max(this.presented, value);
    value = Math.min(value, sample.timeMs + this.horizonMs * sample.rate, sample.durationMs || 86400000);
    this.previous = { ...sample }; this.presented = value; return value;
  }
}
