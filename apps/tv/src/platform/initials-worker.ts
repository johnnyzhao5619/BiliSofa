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
      if (!this.start()) { this.fail(); return; }
      this.send();
    });
  }
  /** Starts the Worker (which loads and parses the dictionary) without asking anything yet. */
  warm(): void { this.start(); }
  private start(): boolean {
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
        } catch { return false; }
      }
      return true;
  }
  private send(): void {
    if (this.flight || !this.pending || !this.worker) return;
    this.flight = this.pending.query;
    this.timer = setTimeout(() => this.fail(), 5000);
    try { this.worker.postMessage(this.flight); } catch { this.fail(); }
  }
  /** Drops the waiting question but keeps the Worker and its parsed dictionary (ADR-116). */
  cancel(): void { this.pending?.reject(new DomainError('cancelled')); this.pending?.finish(); this.pending = undefined; this.owner.invalidate(); }
  private fail(): void { this.pending?.reject(new DomainError('unsupported')); this.dispose(); }
  dispose(): void {
    this.pending?.reject(new DomainError('cancelled')); this.pending?.finish(); this.pending = undefined;
    this.owner.invalidate(); clearTimeout(this.timer); this.flight = undefined;
    this.worker?.terminate(); this.worker = undefined;
  }
}
let shared: InitialsWorker | undefined;
/** ADR-116: one dictionary Worker for the whole app. Keyword pads cancel their questions instead of disposing it;
 * it is warmed when the home is idle and closed only when the app leaves (pagehide). */
export function sharedInitials(): InitialsWorker { return shared ??= new InitialsWorker(); }
export function releaseInitials(): void { shared?.dispose(); shared = undefined; }
