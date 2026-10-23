import { DomainError } from '../../../../packages/contracts/src/index.ts';
import { parsePrivateAccount, type PrivateAccount } from '../../../../packages/contracts/src/private-account.ts';
import { parseOverlayTarget, parseOverlayCommand, parseOverlayRequest, parseOverlayResult, type OverlayTarget, type OverlayRequest, type OverlayResult, type OverlayAccess } from '../../../../packages/contracts/src/overlay-read.ts';
import { ScopedGuestWorker } from './scoped-guest-worker.ts';
/** Independent, serial read lane. Every request has its own native Worker and
 * real close ACK; no jar/native namespace is shared with the active decoder. */
export class OverlayRuntime {
  private account: PrivateAccount | undefined;
  private current: ScopedGuestWorker<OverlayRequest, OverlayResult> | undefined;
  private tail: Promise<unknown> = Promise.resolve();
  private generation = 0;
  private request = 0;
  private closed = false;
  private poisoned = false;
  private queued = 0;
  constructor(account?: PrivateAccount, private readonly limits = { readMs: 45000, closeMs: 13000 }) {
    this.account = account === undefined ? undefined : parsePrivateAccount(account);
    if (![limits.readMs, limits.closeMs].every(n => Number.isInteger(n) && n >= 10 && n <= 90000)) throw new DomainError('invalid');
  }
  access(value: OverlayTarget, binding?: () => MessagePort): OverlayAccess {
    const target = parseOverlayTarget(value), generation = this.generation;
    return { identity: this.account?.id ?? 'guest', read: (command, signal) => {
      const parsed = parseOverlayCommand(command), requestId = `overlay_${++this.request}`;
      if (this.queued >= 4) return Promise.reject(new DomainError('cancelled')); this.queued++;
      const task = this.tail.catch(() => {}).then(async () => {
        if (this.poisoned || this.closed || generation !== this.generation || signal.aborted) throw new DomainError(this.poisoned ? 'unknown' : 'cancelled');
        const worker = new ScopedGuestWorker<OverlayRequest, OverlayResult>('overlay-worker.js', 'media-overlay-read', parseOverlayRequest, parseOverlayResult, this.limits.readMs, this.limits.closeMs, (q, r) => r.kind !== 'ok' || q.command.kind === r.value.kind, false, 8, false, () => false, binding ? () => [binding()] : undefined);
        this.current = worker;
        try {
          const result = await worker.run({ version: 1, operation: 'media-overlay-read', scope: { accountId: this.account?.id ?? 'guest', generation, mediaSessionId: 'overlay_lane', requestId }, target, command: parsed, ...(this.account ? { account: this.account } : {}) }, signal);
          if (this.closed || generation !== this.generation || signal.aborted) throw new DomainError('cancelled');
          if (result.kind === 'error') throw new DomainError(result.code); return result.value;
        } finally { try { await worker.dispose(); } catch { this.poisoned = true; throw new DomainError('unknown'); } finally { if (this.current === worker) this.current = undefined; } }
      });
      const settled = task.finally(() => { this.queued--; }); this.tail = settled; return settled;
    }, close: () => generation === this.generation ? this.reset() : Promise.resolve() };
  }
  async reset(): Promise<void> {
    this.generation++;
    try { await this.current?.dispose(); } catch { this.poisoned = true; }
    await this.tail.catch(() => {});
    if (this.poisoned) throw new DomainError('unknown');
  }
  async close(): Promise<void> { this.closed = true; this.account = undefined; await this.reset(); }
}
