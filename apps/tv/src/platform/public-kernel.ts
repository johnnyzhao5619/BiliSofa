import { DomainError } from '../../../../packages/contracts/src/index.ts';
import { isSearchRequest, parseKernelEvent, type KernelEvent, type KernelRequest } from '../../../../packages/contracts/src/public-kernel.ts';
import { wbiKeys, type WbiKeyStore } from './wbi-keys.ts';
export interface KernelWorker { postMessage(value: unknown): void; terminate(): void; onmessage: ((event: { data: unknown }) => void) | null; onerror: ((event: unknown) => void) | null; }
export interface KernelOptions {
  create?(): KernelWorker; keys?: WbiKeyStore; now?(): number;
  bootMs?: number; requestMs?: number; stopMs?: number; closeMs?: number; idleMs?: number;
}
interface Caller { signal: AbortSignal; resolve(result: Record<string, unknown>): void; reject(error: unknown): void; abort(): void; }
interface Job { id: string; key: string; request: KernelRequest; prefetch: boolean; callers: Caller[]; retried: boolean; stopping: boolean; }
type Timer = ReturnType<typeof setTimeout>;
/** A signature refusal (risk control or stale salts) drops the cached WBI keys and retries once. */
const refused = (r: Record<string, unknown>) => (r.kind === 'api_error' && [-352, -403, -412].includes(Number(r.apiCode))) || (r.kind === 'http_error' && r.status === 412);
/** ADR-108: the main-thread owner of the resident public read kernel.
 * - One request in flight; page reads run before prefetches; identical requests share one transfer.
 * - Cancelling stops only that transfer; the WASM instance and its connections stay.
 * - A timeout, an invalid frame or a crash terminates the Worker (read-only lane, no write intent);
 *   the next request starts a fresh kernel. Three failures within two minutes pause the lane for 60 s.
 * - The kernel closes after five idle minutes, when the app is hidden, and on exit. */
export class PublicKernel {
  private worker: KernelWorker | undefined;
  private ready = false;
  private queue: Job[] = [];
  private active: Job | undefined;
  private sequence = 0;
  private failures: number[] = [];
  private pausedUntil = 0;
  private timer: Timer | undefined;
  private idle: Timer | undefined;
  private closing: { promise: Promise<boolean>; done(confirmed: boolean): void } | undefined;
  private readonly create: () => KernelWorker;
  private readonly keys: WbiKeyStore;
  private readonly now: () => number;
  constructor(private readonly options: KernelOptions = {}) {
    this.create = options.create ?? (() => new Worker('public-kernel-worker.js') as unknown as KernelWorker);
    this.keys = options.keys ?? wbiKeys(); this.now = options.now ?? Date.now;
  }
  get paused(): boolean { return this.now() < this.pausedUntil; }
  /** Starts the kernel ahead of the first read (e.g. while the profile chooser is shown). */
  prewarm(): void { if (!this.closing && !this.paused) { this.spawn(); if (!this.active && !this.queue.length) this.armIdle(); } }
  run(request: KernelRequest, signal: AbortSignal, prefetch = false): Promise<Record<string, unknown>> {
    if (signal.aborted) return Promise.reject(new DomainError('cancelled'));
    if (this.closing) return Promise.reject(new DomainError('cancelled'));
    if (this.paused) return Promise.reject(new DomainError('network'));
    const key = JSON.stringify({ ...request, scope: undefined });
    return new Promise((resolve, reject) => {
      const shared = [this.active, ...this.queue].find((j): j is Job => !!j && !j.stopping && j.key === key);
      const job: Job = shared ?? { id: this.nextId(), key, request, prefetch, callers: [], retried: false, stopping: false };
      const caller: Caller = { signal, resolve, reject, abort: () => this.leave(job, caller) };
      job.callers.push(caller);
      if (shared) { if (!prefetch && job.prefetch) { job.prefetch = false; this.promote(job); } }
      else {
        const at = prefetch ? this.queue.length : this.queue.findIndex(j => j.prefetch);
        this.queue.splice(at < 0 ? this.queue.length : at, 0, job);
      }
      signal.addEventListener('abort', caller.abort, { once: true });
      this.pump();
    });
  }
  close(): Promise<boolean> {
    if (this.closing) return this.closing.promise;
    clearTimeout(this.idle); this.idle = undefined;
    const pending = [...(this.active ? [this.active] : []), ...this.queue]; this.queue = []; this.active = undefined;
    for (const job of pending) this.settle(job, undefined, new DomainError('cancelled'));
    clearTimeout(this.timer); this.timer = undefined;
    if (!this.worker) return Promise.resolve(true);
    let done!: (confirmed: boolean) => void;
    const promise = new Promise<boolean>(resolve => { done = resolve; });
    this.closing = { promise, done: confirmed => { clearTimeout(this.timer); this.timer = undefined; this.drop(); this.closing = undefined; done(confirmed); } };
    if (!this.ready) { this.closing.done(true); return promise; }
    this.worker.postMessage({ version: 1, type: 'close' });
    this.timer = setTimeout(() => this.closing?.done(false), this.options.closeMs ?? 3000);
    return promise;
  }
  private nextId(): string { this.sequence = this.sequence >= 999999999 ? 1 : this.sequence + 1; return 'k' + this.sequence; }
  private promote(job: Job): void {
    const at = this.queue.indexOf(job); if (at < 0) return;
    this.queue.splice(at, 1); const first = this.queue.findIndex(j => j.prefetch);
    this.queue.splice(first < 0 ? this.queue.length : first, 0, job);
  }
  private leave(job: Job, caller: Caller): void {
    const at = job.callers.indexOf(caller); if (at < 0) return;
    job.callers.splice(at, 1); caller.reject(new DomainError('cancelled'));
    if (job.callers.length) return;
    const queued = this.queue.indexOf(job);
    if (queued >= 0) { this.queue.splice(queued, 1); return; }
    if (job !== this.active || job.stopping) return;
    job.stopping = true; clearTimeout(this.timer);
    if (!this.ready || !this.worker) { this.active = undefined; this.pump(); return; }
    this.worker.postMessage({ version: 1, type: 'stop', requestId: job.id });
    // An unanswered stop means the instance is not responsive: replace it, without counting a failure.
    this.timer = setTimeout(() => { if (this.active === job) { this.drop(); this.active = undefined; this.pump(); } }, this.options.stopMs ?? 2000);
  }
  private settle(job: Job, result: Record<string, unknown> | undefined, error?: unknown): void {
    for (const caller of job.callers.splice(0)) {
      caller.signal.removeEventListener('abort', caller.abort);
      if (result) caller.resolve(result); else caller.reject(error);
    }
  }
  private spawn(): void {
    if (this.worker) return;
    let worker: KernelWorker;
    try { worker = this.create(); } catch { this.fault('unsupported'); return; }
    this.worker = worker; this.ready = false;
    worker.onmessage = event => { if (worker === this.worker) this.receive(event.data); };
    worker.onerror = () => { if (worker === this.worker) this.fault('unsupported'); };
    // An empty first message boots the instance; the kernel ignores anything it cannot parse.
    worker.postMessage({ version: 1, type: 'boot' });
    clearTimeout(this.timer); this.timer = setTimeout(() => { if (worker === this.worker && !this.ready) this.fault('timeout'); }, this.options.bootMs ?? 10000);
  }
  private drop(): void { this.worker?.terminate(); this.worker = undefined; this.ready = false; }
  private fault(code: 'timeout' | 'unsupported' | 'invalid'): void {
    clearTimeout(this.timer); this.timer = undefined; this.drop();
    const now = this.now(); this.failures = [...this.failures.filter(at => now - at < 120000), now];
    if (this.failures.length >= 3) { this.pausedUntil = now + 60000; this.failures = []; }
    const job = this.active; this.active = undefined;
    if (job) this.settle(job, undefined, new DomainError(code === 'invalid' ? 'invalid' : code === 'timeout' ? 'timeout' : 'network'));
    this.pump();
  }
  private receive(value: unknown): void {
    let event: KernelEvent;
    try { event = parseKernelEvent(value); } catch { this.fault('invalid'); return; }
    if (event.type === 'failed') { this.fault('unsupported'); return; }
    if (event.type === 'closed') { this.closing?.done(event.confirmed); return; }
    if (event.type === 'ready') { this.ready = true; clearTimeout(this.timer); this.timer = undefined; if (this.active) this.send(this.active); return; }
    const job = this.active;
    if (!job || event.requestId !== job.id) return; // a late answer for a transfer already stopped
    clearTimeout(this.timer); this.timer = undefined; this.active = undefined;
    if (event.type === 'stopped') { this.pump(); return; }
    if (job.stopping) { this.pump(); return; }
    if (event.keys) this.keys.store(event.keys);
    if (isSearchRequest(job.request) && refused(event.result) && !job.retried) {
      this.keys.invalidate(); job.retried = true; job.id = this.nextId(); this.queue.unshift(job); this.pump(); return;
    }
    this.failures = [];
    this.settle(job, event.result); this.pump();
  }
  private send(job: Job): void {
    const keys = isSearchRequest(job.request) ? this.keys.get() : undefined;
    this.worker!.postMessage({ version: 1, type: 'request', requestId: job.id, request: job.request, ...(keys ? { keys } : {}) });
    // A search without cached salts makes two transfers (nav, then the signed query).
    const budget = (this.options.requestMs ?? 12000) * (isSearchRequest(job.request) && !keys ? 2 : 1);
    this.timer = setTimeout(() => { if (this.active === job) this.fault('timeout'); }, budget);
  }
  private armIdle(): void {
    clearTimeout(this.idle);
    this.idle = setTimeout(() => { this.idle = undefined; if (!this.active && !this.queue.length) void this.close(); }, this.options.idleMs ?? 300000);
  }
  private pump(): void {
    if (this.active || this.closing) return;
    if (this.paused) { for (const job of this.queue.splice(0)) this.settle(job, undefined, new DomainError('network')); return; }
    const job = this.queue.shift();
    if (!job) { if (this.worker) this.armIdle(); return; }
    clearTimeout(this.idle); this.idle = undefined;
    this.active = job; this.spawn();
    if (this.active === job && this.ready) this.send(job);
  }
}
let shared: PublicKernel | undefined;
export function publicKernel(): PublicKernel { return shared ??= new PublicKernel(); }
