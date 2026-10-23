import { DomainError } from '../../../../packages/contracts/src/index.ts';
export interface CloseSummary { closed: boolean; failed: readonly string[]; }
/** Register before awaiting external work; close aborts synchronously, then drains LIFO. */
export class ResourceOwner {
  private readonly controller = new AbortController();
  private resources: { id: string; close: () => void | Promise<void> }[] = [];
  private closing: Promise<CloseSummary> | undefined;
  constructor(private readonly budgetMs = 6000, private readonly clock: () => number = () => performance.now()) {
    if (!Number.isInteger(budgetMs) || budgetMs < 10 || budgetMs > 60000) throw new DomainError('invalid');
  }
  get signal(): AbortSignal { return this.controller.signal; }
  assertOpen(): void { if (this.signal.aborted) throw new DomainError('cancelled'); }
  add(id: string, close: () => void | Promise<void>): void {
    this.assertOpen();
    if (!/^[a-z][a-z0-9_-]{0,63}$/.test(id) || this.resources.length >= 32 || this.resources.some(r => r.id === id)) throw new DomainError('invalid');
    this.resources.push({ id, close });
  }
  close(): Promise<CloseSummary> {
    if (this.closing) return this.closing;
    // Publish before abort: abort listeners run synchronously and may reenter
    // close, just like a disposer. Both must receive the same acknowledgement.
    this.closing = Promise.resolve().then(() => this.drain());
    this.controller.abort(); return this.closing;
  }
  private async drain(): Promise<CloseSummary> {
    const failed: string[] = [];
    const readClock = () => { try { return this.clock(); } catch { return Number.NaN; } };
    const started = readClock(), deadline = started + this.budgetMs;
    let last = started;
    for (const resource of this.resources.splice(0).reverse()) {
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        const result = resource.close(), now = readClock();
        const remaining = now >= last ? Math.min(this.budgetMs, deadline - now) : 0; last = now;
        if (!Number.isFinite(remaining) || remaining <= 0) { void Promise.resolve(result).catch(() => {}); failed.push(resource.id); continue; }
        await Promise.race([Promise.resolve(result), new Promise<never>((_yes, no) => { timer = setTimeout(() => no(new DomainError('timeout')), Math.ceil(remaining)); })]);
      } catch { failed.push(resource.id); }
      finally { clearTimeout(timer); }
    }
    return Object.freeze({ closed: failed.length === 0, failed: Object.freeze(failed) });
  }
}
