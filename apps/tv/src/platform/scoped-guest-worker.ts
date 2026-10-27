import { createServiceWorker } from './service-worker.ts';
import { DomainError, type Scope } from '../../../../packages/contracts/src/index.ts';
export class ScopedGuestWorker<Q extends { scope: Scope; operation: string }, R extends { scope: Scope; closed?: boolean }> {
  constructor(private readonly file: string, private readonly operation: string, private readonly parseRequest: (value: unknown) => Q, private readonly parseResult: (value: unknown) => R, private readonly timeoutMs = 20000, private readonly closeMs = 12000, private readonly matches: (request: Q, result: R) => boolean = () => true, private readonly multipleProgress = false, private readonly progressLimit = 8, private readonly closingProgress = false, private readonly fatalProgress: (result: R) => boolean = () => false, private readonly transfer?: (request: Q) => Transferable[]) {}
  private worker: Worker | undefined;
  private scope: Scope | undefined;
  private pending: { resolve(result: R): void; reject(error: unknown): void; abort(): void; signal: AbortSignal; timer: ReturnType<typeof setTimeout>|undefined } | undefined;
  private closing: { promise: Promise<void>; resolve(): void; reject(error: unknown): void; timer: ReturnType<typeof setTimeout>|undefined } | undefined;
  private poisoned = false;
  private failure: 'timeout' | 'unsupported' | 'invalid' | 'close_timeout' | undefined;
  get cleanupFailure(): typeof this.failure { return this.failure; }
  private generation = 0;
  async run(value: Q, signal: AbortSignal, onProgress?: (result: R) => void): Promise<R> {
    const request = this.parseRequest(value), generation = ++this.generation;
    await this.closeCurrent();
    if (signal.aborted || generation !== this.generation) throw new DomainError('cancelled');
    if (this.poisoned) throw new DomainError('unknown');
    return new Promise((resolve, reject) => {
      const worker = createServiceWorker(this.file); this.worker = worker; this.scope = request.scope;
      const abort = () => { void this.dispose().catch(() => {}); };
      const timer = this.timeoutMs===0?undefined:setTimeout(() => this.failUnknown('timeout'), this.timeoutMs);
      this.pending = { resolve, reject, signal, abort, timer }; signal.addEventListener('abort', abort, { once: true });
      worker.onerror = () => { if (worker === this.worker) this.failUnknown('unsupported'); };
      let progressCount = 0;
      worker.onmessage = event => {
        if (worker !== this.worker) return;
        let result: R;
        try { result = this.parseResult(event.data); if (JSON.stringify(result.scope) !== JSON.stringify(request.scope) || !this.matches(request, result)) throw new Error(); }
        catch { this.failUnknown('invalid'); return; }
        if (result.closed === false) {
          if ((!this.multipleProgress && progressCount > 0) || progressCount >= this.progressLimit || !onProgress) { this.failUnknown('invalid'); return; }
          progressCount++; if (!this.closing || this.closingProgress) onProgress(result);
          if (this.fatalProgress(result)) this.failUnknown('unsupported');
          return;
        }
        // This frame is emitted only after native cURL cleanup or cancellation
        // before entering C. It releases a waiting replacement without overlap.
        if (this.closing) { this.finishClose(true); return; }
        this.clearPending(); this.worker = undefined; this.scope = undefined; worker.terminate(); resolve(result);
      };
      let transfers: Transferable[] = [];
      try { transfers = this.transfer?.(request) ?? []; worker.postMessage(request, transfers); }
      catch {
        for (const value of transfers) if (typeof MessagePort !== 'undefined' && value instanceof MessagePort) value.close();
        this.clearPending(); worker.terminate(); this.worker = undefined; this.scope = undefined; reject(new DomainError('cancelled'));
      }
    });
  }
  private clearPending(): void {
    const p = this.pending; if (!p) return;
    clearTimeout(p.timer); p.signal.removeEventListener('abort', p.abort); this.pending = undefined;
  }
  private failUnknown(code: 'timeout' | 'unsupported' | 'invalid'): void {
    this.failure = code;
    const p = this.pending; this.clearPending(); p?.reject(new DomainError(code)); this.poisoned = true;
    this.worker?.terminate(); this.worker = undefined; this.scope = undefined;
    if (this.closing) this.finishClose(false);
  }
  private finishClose(confirmed: boolean): void {
    const closing = this.closing; if (!closing) return;
    clearTimeout(closing.timer); this.closing = undefined;
    this.worker?.terminate(); this.worker = undefined; this.scope = undefined;
    if (confirmed) closing.resolve(); else { this.failure ??= 'close_timeout'; this.poisoned = true; closing.reject(new DomainError('unknown')); }
  }
  protected sendControl(control: string, payload?: unknown): boolean {
    if (!this.worker || !this.scope || !this.pending || this.closing || this.poisoned) return false;
    this.worker.postMessage({ version: 1, operation: this.operation, scope: this.scope, control, ...(payload === undefined ? {} : { payload }) }); return true;
  }
  dispose(): Promise<void> { this.generation++; return this.closeCurrent(); }
  private closeCurrent(): Promise<void> {
    if (this.closing) return this.closing.promise;
    const p = this.pending; this.clearPending(); p?.reject(new DomainError('cancelled'));
    if (!this.worker) return this.poisoned ? Promise.reject(new DomainError('unknown')) : Promise.resolve();
    let resolve!: () => void, reject!: (error: unknown) => void;
    const promise = new Promise<void>((yes, no) => { resolve = yes; reject = no; });
    this.closing = { promise, resolve, reject, timer: setTimeout(() => this.finishClose(false), this.closeMs) };
    this.worker.postMessage({ version: 1, scope: this.scope, operation: this.operation, control: 'stop' });
    return promise;
  }
}
