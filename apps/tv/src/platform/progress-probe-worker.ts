import { DomainError, type Scope } from '../../../../packages/contracts/src/index.ts';
import { ACCOUNT_TEST_VIDEO, type AccountView } from '../../../../packages/contracts/src/account-probe.ts';
import { parseProgressRequest, parseProgressResult, type ProgressResult } from '../../../../packages/contracts/src/progress-probe.ts';
import { WriteCoordinator } from '../../../../packages/bili-client/src/write.ts';
import { AccountProbeWorker } from './account-probe-worker.ts';
import { accountVault, type AccountVault } from './account-vault.ts';
type Journal = Pick<Storage, 'getItem' | 'setItem'>;
const key = 'bilisofa.w01.progress-once.v1';
export type ProgressReadbackCode = 'progress.readback_target_closed' | 'progress.readback_other_closed' | 'progress.readback_session_expired' | 'progress.readback_unavailable';
export function progressTargetMatches(view: AccountView): boolean {
  return view.progressCid === ACCOUNT_TEST_VIDEO.cid && view.lastPlayTime >= 15000 && view.lastPlayTime <= 16000;
}
export class ProgressProbeWorker {
  private readonly reader: AccountProbeWorker;
  private worker: Worker | undefined;
  private poisoned = false;
  private busy = false;
  private pending: { reject(e: unknown): void; timer: ReturnType<typeof setTimeout>; abort(): void; signal: AbortSignal } | undefined;
  private closing: { promise: Promise<void>; resolve(): void; reject(e: unknown): void; timer: ReturnType<typeof setTimeout> } | undefined;
  private scope: Scope | undefined;
  constructor(private readonly vault: AccountVault = accountVault(), private readonly journal: Journal = localStorage) { this.reader = new AccountProbeWorker(vault); }
  get cleanupUnconfirmed(): boolean { return this.poisoned || this.reader.cleanupUnconfirmed; }
  attempted(): boolean { try { return this.journal.getItem(key) !== null; } catch { return true; } }
  async preview(scope: Scope, signal: AbortSignal): Promise<AccountView> {
    if (this.busy || this.cleanupUnconfirmed) throw new DomainError('unknown'); this.busy = true;
    try { return await this.read(scope, signal); } finally { this.busy = false; }
  }
  private async read(scope: Scope, signal: AbortSignal): Promise<AccountView> {
    let view: AccountView | undefined;
    const code = await this.reader.run('restore', scope, signal, event => { if (event.kind === 'summary') view = event.view; });
    if (code === 'account.expired_closed') throw new DomainError('login');
    if (code !== 'account.restore_readonly_closed' || !view || !view.restored || signal.aborted) throw new DomainError('unknown');
    return view;
  }
  private persist(state: string): void {
    const value = JSON.stringify({ schema: 1, bvid: ACCOUNT_TEST_VIDEO.bvid, targetSec: 15, state });
    this.journal.setItem(key, value); if (this.journal.getItem(key) !== value) throw new DomainError('unknown');
  }
  async submit(scope: Scope, externalSignal: AbortSignal, approved: boolean): Promise<{ state: string; positionMs?: number; postCode?: ProgressResult['code']; readbackCode?: ProgressReadbackCode }> {
    if (!approved) throw new DomainError('permission');
    if (this.busy || this.cleanupUnconfirmed || this.attempted() || externalSignal.aborted) throw new DomainError('unknown');
    this.busy = true;
    const controller = new AbortController(), abort = () => controller.abort();
    externalSignal.addEventListener('abort', abort, { once: true }); const timer = setTimeout(abort, 120000), signal = controller.signal;
    const coordinator = new WriteCoordinator(), intent = { accountId: 'w01-authorized-account', generation: scope.generation, action: 'w01-progress-once', targetId: ACCOUNT_TEST_VIDEO.bvid };
    let positionMs: number | undefined;
    let postCode: ProgressResult['code'] | undefined;
    let readbackCode: ProgressReadbackCode | undefined;
    const outcome = (state: string) => ({ state, ...(positionMs === undefined ? {} : { positionMs }), ...(postCode === undefined ? {} : { postCode }), ...(readbackCode === undefined ? {} : { readbackCode }) });
    try {
      const state = await coordinator.submit(intent, async () => {
        const before = await this.read(scope, signal);
        if (before.lastPlayTime !== 0 || signal.aborted) return 'rejected';
        // Nonsecret durable reservation precedes any POST. Every existing state
        // blocks another attempt, including after process restart.
        this.persist('pending');
        const session = this.vault.load(); if (!session || signal.aborted) throw new DomainError('cancelled');
        const result = await this.post(parseProgressRequest({ version: 1, operation: 'progress-post', scope, session, approved: true }), signal);
        postCode = result.code;
        if (!result.attempted) return 'rejected';
        for (let attempt = 0; attempt < 3 && !signal.aborted; attempt++) {
          try {
            const after = await this.read(scope, signal); positionMs = after.lastPlayTime;
            readbackCode = progressTargetMatches(after) ? 'progress.readback_target_closed' : 'progress.readback_other_closed';
            if (progressTargetMatches(after)) return 'confirmed';
          } catch (error) {
            if (this.cleanupUnconfirmed) throw new DomainError('unknown');
            readbackCode = error instanceof DomainError && error.code === 'login' ? 'progress.readback_session_expired' : 'progress.readback_unavailable';
            // The local session window cannot recover through repeated GETs.
            if (readbackCode === 'progress.readback_session_expired') break;
          }
          if (attempt < 2 && !signal.aborted) await new Promise<void>((resolve, reject) => {
            const abort = () => { clearTimeout(timer); signal.removeEventListener('abort', abort); reject(new DomainError('cancelled')); };
            const timer = setTimeout(() => { signal.removeEventListener('abort', abort); resolve(); }, 1000); signal.addEventListener('abort', abort, { once: true });
            if (signal.aborted) abort();
          });
        }
        return 'unknown';
      }, true);
      if (this.attempted()) { try { this.persist(state); } catch { return outcome('unknown'); } }
      return outcome(state);
    } finally { clearTimeout(timer); externalSignal.removeEventListener('abort', abort); this.busy = false; }
  }
  private post(request: ReturnType<typeof parseProgressRequest>, signal: AbortSignal): Promise<ProgressResult> {
    if (this.worker || this.closing || this.cleanupUnconfirmed || signal.aborted) return Promise.reject(new DomainError('unknown'));
    return new Promise((resolve, reject) => {
      const worker = new Worker('progress-worker.js'); this.worker = worker; this.scope = request.scope;
      const abort = () => { void this.dispose().catch(() => {}); };
      this.pending = { reject, timer: setTimeout(() => this.fail(), 90000), abort, signal }; signal.addEventListener('abort', abort, { once: true });
      worker.onerror = () => { if (worker === this.worker) this.fail(); };
      worker.onmessage = event => {
        if (worker !== this.worker) return;
        try {
          const result = parseProgressResult(event.data); if (JSON.stringify(result.scope) !== JSON.stringify(request.scope)) throw new Error();
          if (this.closing) { this.finishClose(true); return; }
          this.clearPending(); worker.terminate(); this.worker = undefined; this.scope = undefined; resolve(result);
        } catch { this.fail(); }
      };
      worker.postMessage(request);
    });
  }
  private clearPending(): void { const p = this.pending; this.pending = undefined; if (p) { clearTimeout(p.timer); p.signal.removeEventListener('abort', p.abort); } }
  private fail(): void { const p = this.pending; this.poisoned = true; this.clearPending(); p?.reject(new DomainError('unknown')); if (this.closing) this.finishClose(false); this.worker?.terminate(); this.worker = undefined; this.scope = undefined; }
  private finishClose(ok: boolean): void { const close = this.closing; if (!close) return; clearTimeout(close.timer); this.closing = undefined; this.worker?.terminate(); this.worker = undefined; this.scope = undefined; if (ok) close.resolve(); else { this.poisoned = true; close.reject(new DomainError('unknown')); } }
  async dispose(): Promise<void> {
    const read = this.reader.dispose();
    if (!this.closing && this.worker) {
      const p = this.pending; this.clearPending(); p?.reject(new DomainError('cancelled'));
      let resolve!: () => void, reject!: (e: unknown) => void; const promise = new Promise<void>((yes, no) => { resolve = yes; reject = no; });
      this.closing = { promise, resolve, reject, timer: setTimeout(() => this.finishClose(false), 5000) };
      this.worker.postMessage({ version: 1, operation: 'progress-post', scope: this.scope, control: 'stop' });
    }
    await Promise.all([read, this.closing?.promise]); if (this.cleanupUnconfirmed) throw new DomainError('unknown');
  }
}
