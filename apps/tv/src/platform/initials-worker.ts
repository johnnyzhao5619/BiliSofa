import { SessionManager } from '../../../../packages/bili-client/src/session.ts';
import { DomainError, parseInitialQuery, parseInitialResult, type InitialQuery } from '../../../../packages/contracts/src/index.ts';
// One in-flight query and one replacement slot keep rapid navigation bounded.
export class InitialsWorker {
  private worker: Worker | undefined;
  private readonly owner = new SessionManager();
  private pending: { query: InitialQuery; resolve: (words: string[]) => void; reject: (error: DomainError) => void; finish: () => void } | undefined;
  private flight: InitialQuery | undefined;
  private timer: ReturnType<typeof setTimeout> | undefined;
  query(initials: string): Promise<string[]> {
    this.pending?.reject(new DomainError('cancelled')); this.pending?.finish(); this.pending = undefined;
    this.owner.invalidate(); const task = this.owner.begin('search-initials');
    let query: InitialQuery;
    try { query = parseInitialQuery({ version: 1, scope: task.scope, initials }); }
    catch { task.finish(); return Promise.reject(new DomainError('invalid')); }
    return new Promise((resolve, reject) => {
      this.pending = { query, resolve, reject, finish: task.finish };
      if (!this.worker) {
        try {
          const worker = new Worker('initials-worker.js'); this.worker = worker;
          worker.onerror = () => { if (worker === this.worker) this.fail(); };
          worker.onmessage = event => {
            if (worker !== this.worker) return;
            let result;
            try { result = parseInitialResult(event.data); } catch { this.fail(); return; }
            if (!this.flight || JSON.stringify(result.scope) !== JSON.stringify(this.flight.scope)) { this.fail(); return; }
            if (result.error) { this.fail(); return; }
            clearTimeout(this.timer); this.flight = undefined;
            const pending = this.pending;
            if (pending && this.owner.accepts(result.scope)) {
              this.pending = undefined; pending.finish(); pending.resolve(result.words);
            }
            this.send();
          };
        } catch { this.fail(); return; }
      }
      this.send();
    });
  }
  private send(): void {
    if (this.flight || !this.pending || !this.worker) return;
    this.flight = this.pending.query;
    this.timer = setTimeout(() => this.fail(), 5000);
    try { this.worker.postMessage(this.flight); } catch { this.fail(); }
  }
  private fail(): void { this.pending?.reject(new DomainError('unsupported')); this.dispose(); }
  dispose(): void {
    this.pending?.reject(new DomainError('cancelled')); this.pending?.finish(); this.pending = undefined;
    this.owner.invalidate(); clearTimeout(this.timer); this.flight = undefined;
    this.worker?.terminate(); this.worker = undefined;
  }
}
