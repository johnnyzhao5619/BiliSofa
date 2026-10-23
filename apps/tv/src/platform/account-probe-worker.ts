import { DomainError, type Scope } from '../../../../packages/contracts/src/index.ts';
import { parseAccountRequest, parseAccountResult, type AccountView } from '../../../../packages/contracts/src/account-probe.ts';
import { accountVault, type AccountVault } from './account-vault.ts';
export type AccountDisplay = { kind: 'qr'; url: string } | { kind: 'confirm' } | { kind: 'summary'; view: AccountView };
export class AccountProbeWorker {
  private worker: Worker | undefined;
  private scope: Scope | undefined;
  private pending: { reject(e: unknown): void; signal: AbortSignal; abort(): void; timer: ReturnType<typeof setTimeout> } | undefined;
  private closing: { promise: Promise<void>; resolve(): void; reject(e: unknown): void; timer: ReturnType<typeof setTimeout> } | undefined;
  private poisoned = false;
  private generation = 0;
  get cleanupUnconfirmed(): boolean { return this.poisoned; }
  constructor(private readonly vault: AccountVault = accountVault(), private readonly compareReadback = false) {}
  async run(mode: 'login' | 'restore', scope: Scope, signal: AbortSignal, display: (v: AccountDisplay) => void): Promise<string> {
    const generation = ++this.generation; await this.closeCurrent();
    if (this.poisoned) throw new DomainError('unknown');
    if (signal.aborted || generation !== this.generation) throw new DomainError('cancelled');
    const session = this.vault.load();
    if (mode === 'login' && session || mode === 'restore' && !session) throw new DomainError('login');
    const request = parseAccountRequest({ version: 1, operation: 'account-probe', scope, ...(mode === 'restore' ? { session } : {}) });
    return new Promise((resolve, reject) => {
      const worker = new Worker(this.compareReadback && mode === 'restore' ? 'account-readback-worker.js' : 'account-worker.js'); this.worker = worker; this.scope = scope;
      let privateSeen = false, saved = false, viewSeen = false, qrSeen = false, confirmSeen = false, frames = 0;
      const abort = () => { void this.dispose().catch(() => {}); };
      this.pending = { reject, signal, abort, timer: setTimeout(() => this.fail(), 220000) }; signal.addEventListener('abort', abort, { once: true });
      worker.onerror = () => { if (worker === this.worker) this.fail(); };
      worker.onmessage = event => {
        if (worker !== this.worker) return;
        let result; try { result = parseAccountResult(event.data); if (JSON.stringify(result.scope) !== JSON.stringify(scope)) throw new Error(); }
        catch { this.fail(); return; }
        if (++frames > 4) { this.fail(); return; }
        if (result.kind === 'closed') {
          if (this.closing) { this.finishClose(true); return; }
          if (result.code === 'account.readonly_saved_closed' && !saved || result.code === 'account.restore_readonly_closed' && (!viewSeen || mode !== 'restore')) { this.fail(); return; }
          if (/^account\.readback_(both_target|modern_target|legacy_target|neither_target)_closed$/.test(result.code) && (!viewSeen || mode !== 'restore' || !this.compareReadback)) { this.fail(); return; }
          this.clearPending(); this.worker = undefined; this.scope = undefined; worker.terminate(); resolve(result.code); return;
        }
        if (this.closing || signal.aborted) return;
        if (result.kind === 'qr') { if (mode !== 'login' || privateSeen || qrSeen) { this.fail(); return; } qrSeen = true; display(result); }
        else if (result.kind === 'confirm') { if (mode !== 'login' || !qrSeen || confirmSeen || privateSeen) { this.fail(); return; } confirmSeen = true; display(result); }
        else if (result.kind === 'view') { if (mode !== 'restore' || !result.view.restored || viewSeen) { this.fail(); return; } viewSeen = true; display({ kind: 'summary', view: result.view }); }
        else {
          if (mode !== 'login' || !qrSeen || privateSeen || result.view.restored) { this.fail(); return; } privateSeen = true;
          // Deliberately bypasses UI state/logs: this private frame only reaches KeyManager.
          void this.vault.save(result.session, signal).then(() => {
            if (worker !== this.worker || this.closing || signal.aborted) return;
            saved = true; display({ kind: 'summary', view: result.view }); worker.postMessage({ version: 1, operation: 'account-probe', scope, control: 'saved' });
          }).catch(() => { if (worker === this.worker && !this.closing) { void this.dispose().catch(() => {}); } });
        }
      };
      worker.postMessage(request);
    });
  }
  hasSaved(): boolean { return !!this.vault.load(); }
  clearSaved(): void { if (this.worker || this.closing || this.poisoned) throw new DomainError('unknown'); this.vault.clear(); }
  private clearPending(): void { const p = this.pending; if (!p) return; clearTimeout(p.timer); p.signal.removeEventListener('abort', p.abort); this.pending = undefined; }
  private fail(): void {
    this.poisoned = true; const p = this.pending; this.clearPending(); p?.reject(new DomainError('unknown'));
    this.worker?.terminate(); this.worker = undefined; this.scope = undefined;
    if (this.closing) this.finishClose(false);
  }
  private finishClose(ok: boolean): void {
    const close = this.closing; if (!close) return; clearTimeout(close.timer); this.closing = undefined;
    this.worker?.terminate(); this.worker = undefined; this.scope = undefined;
    if (ok) close.resolve(); else { this.poisoned = true; close.reject(new DomainError('unknown')); }
  }
  private closeCurrent(): Promise<void> {
    if (this.closing) return this.closing.promise;
    const p = this.pending; this.clearPending(); p?.reject(new DomainError('cancelled'));
    if (!this.worker) return this.poisoned ? Promise.reject(new DomainError('unknown')) : Promise.resolve();
    let resolve!: () => void, reject!: (e: unknown) => void;
    const promise = new Promise<void>((yes, no) => { resolve = yes; reject = no; });
    this.closing = { promise, resolve, reject, timer: setTimeout(() => this.finishClose(false), 5000) };
    this.worker.postMessage({ version: 1, operation: 'account-probe', scope: this.scope, control: 'stop' }); return promise;
  }
  dispose(): Promise<void> { this.generation++; return this.closeCurrent(); }
}
