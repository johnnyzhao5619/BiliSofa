/** Step for the n-th press (1-based) of one seek gesture: base for the first three,
 * then at least 30 s, then at least 60 s. A slower user setting is never shortened. */
export function acceleratedStepMs(baseMs: number, press: number): number {
  return press <= 3 ? baseMs : press <= 6 ? Math.max(baseMs, 30000) : Math.max(baseMs, 60000);
}
/** Presses closer together than idleMs belong to one gesture; reset() ends it on commit/cancel. */
export class SeekGesture {
  private presses = 0;
  private last = Number.NEGATIVE_INFINITY;
  constructor(private readonly idleMs = 1200, private readonly clock: () => number = () => performance.now()) {}
  next(baseMs: number): number {
    const now = this.clock();
    if (now - this.last > this.idleMs) this.presses = 0;
    this.presses++; this.last = now;
    return acceleratedStepMs(baseMs, this.presses);
  }
  reset(): void { this.presses = 0; this.last = Number.NEGATIVE_INFINITY; }
}
