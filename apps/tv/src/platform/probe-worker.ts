import { DomainError, parseProbeResult, type ProbeRequest, type ProbeResult } from '../../../../packages/contracts/src/index.ts';
export class ProbeWorker {
  private worker: Worker | undefined;
  private request: ProbeRequest | undefined;
  private pending: { resolve: (result: ProbeResult) => void; reject: (error: unknown) => void; timer: ReturnType<typeof setTimeout> } | undefined;
  private closing: { promise: Promise<void>; resolve: () => void; reject: (error: unknown) => void; timer: ReturnType<typeof setTimeout> } | undefined;
  private poisoned = false;
  private generation = 0;
  async run(request: ProbeRequest, progress?: (result: ProbeResult) => void): Promise<ProbeResult> {
    const generation = ++this.generation;
    await this.closeCurrent();
    if (generation !== this.generation) throw new DomainError('cancelled');
    if (this.poisoned) throw new DomainError('unknown');
    return new Promise((resolve, reject) => {
      const worker = new Worker('probe-worker.js'); this.worker = worker; this.request = request;
      const timer = setTimeout(() => { if (worker === this.worker) this.cancel('timeout'); }, request.operation === 'http' ? 125000 : request.operation === 'mpd' ? 65000 : 20000);
      this.pending = { resolve, reject, timer };
      worker.onerror = () => { if (worker === this.worker) this.cancel('unsupported'); };
      worker.onmessage = event => {
        if (worker !== this.worker) return;
        try {
          const result = parseProbeResult(event.data);
          if (JSON.stringify(result.scope) !== JSON.stringify(request.scope) || result.operation !== request.operation) throw new DomainError('invalid');
          if (this.closing) {
            const safe = result.code === request.operation + '.stopped' || result.code === 'http.report_served_client_identity_unverified' || result.code === 'http.no_client_before_deadline' || result.code === 'mpd.listener_deadline_closed';
            if (result.phase !== 'progress' && safe) this.finishClose(true);
            return;
          }
          if (result.phase === 'progress') { progress?.(result); return; }
          if (result.code === 'http.socket_close_unconfirmed' || result.code === 'mpd.listener_failed_stage_17') this.poisoned = true;
          clearTimeout(timer); this.pending = undefined; worker.terminate(); this.worker = undefined; this.request = undefined; resolve(result);
        } catch { this.cancel('invalid'); }
      };
      worker.postMessage(request);
    });
  }
  private cancel(code: 'timeout' | 'cancelled' | 'unsupported' | 'invalid'): void {
    if (this.pending) { clearTimeout(this.pending.timer); this.pending.reject(new DomainError(code)); this.pending = undefined; }
    void this.dispose().catch(() => {}); // Reuse is blocked if native fd closure is unconfirmed.
  }
  private finishClose(confirmed: boolean): void {
    const closing = this.closing; if (!closing) return;
    clearTimeout(closing.timer); this.closing = undefined;
    this.worker?.terminate(); this.worker = undefined; this.request = undefined;
    if (confirmed) closing.resolve(); else { this.poisoned = true; closing.reject(new DomainError('unknown')); }
  }
  dispose(): Promise<void> { this.generation++; return this.closeCurrent(); }
  private closeCurrent(): Promise<void> {
    if (this.closing) return this.closing.promise;
    if (this.pending) { clearTimeout(this.pending.timer); this.pending.reject(new DomainError('cancelled')); this.pending = undefined; }
    if (!this.worker) return this.poisoned ? Promise.reject(new DomainError('unknown')) : Promise.resolve();
    if (!this.request || !['http', 'mpd'].includes(this.request.operation)) {
      this.worker.terminate(); this.worker = undefined; this.request = undefined; return Promise.resolve();
    }
    let resolve!: () => void, reject!: (error: unknown) => void;
    const promise = new Promise<void>((yes, no) => { resolve = yes; reject = no; });
    const timer = setTimeout(() => this.finishClose(false), 3500);
    this.closing = { promise, resolve, reject, timer };
    this.worker.postMessage({ version: 1, scope: this.request.scope, operation: this.request.operation, control: 'stop' });
    return promise;
  }
}
