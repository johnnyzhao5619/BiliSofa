import type { RepeatMode } from '../../contracts/src/vod-catalog.ts';
/** The following item of the same video/collection, only when continuous play is on and
 * repeat is off (repeat owns its own loop). Unrelated content is never chained. */
export function nextUpIndex(index: number, length: number, continuous: boolean, repeat: RepeatMode): number | undefined {
  if (!continuous || repeat !== 'off' || !Number.isSafeInteger(index) || index < 0 || index + 1 >= length) return undefined;
  return index + 1;
}
/** A cancellable whole-second countdown; fire() runs at most once. */
export class Countdown {
  private remaining: number;
  private timer: ReturnType<typeof setInterval> | undefined;
  private done = false;
  constructor(seconds: number, private readonly tick: (left: number) => void, private readonly fire: () => void,
    private readonly every: (run: () => void) => ReturnType<typeof setInterval> = run => setInterval(run, 1000),
    private readonly stop: (timer: ReturnType<typeof setInterval>) => void = timer => clearInterval(timer)) {
    this.remaining = Math.max(1, Math.floor(seconds));
  }
  get active(): boolean { return this.timer !== undefined; }
  start(): void {
    if (this.done || this.timer) return;
    this.tick(this.remaining);
    this.timer = this.every(() => { this.remaining--; if (this.remaining <= 0) this.now(); else this.tick(this.remaining); });
  }
  now(): void { if (this.done) return; this.cancel(); this.done = true; this.fire(); }
  cancel(): void { if (this.timer) this.stop(this.timer); this.timer = undefined; }
}
