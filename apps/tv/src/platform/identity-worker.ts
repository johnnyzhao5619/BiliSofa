import { DomainError, type Scope } from '../../../../packages/contracts/src/index.ts';
import { parseIdentityEvent, parseIdentityRequest, type IdentityEvent, type IdentityRequest, type LoginDisplay, type LoginExchange } from '../../../../packages/contracts/src/identity.ts';
import { parsePrivateAccount, type AccountIdentity, type PrivateAccount } from '../../../../packages/contracts/src/private-account.ts';
export interface IdentityPort { onmessage: ((event: MessageEvent) => void) | null; onerror: ((event: ErrorEvent) => void) | null; postMessage(value: unknown): void; terminate(): void; }
let sequence = 0;
/** One Worker/native lifetime per exchange. Errors without closure poison it. */
export class IdentityWorkerClient implements LoginExchange {
  private worker: IdentityPort | undefined;
  private request: IdentityRequest | undefined;
  private reject: ((e: DomainError) => void) | undefined;
  private cleanup: (() => void) | undefined;
  private closure: Promise<{ closed: boolean }> | undefined;
  private endClose: ((value: { closed: boolean }) => void) | undefined;
  private closeTimer: ReturnType<typeof setTimeout> | undefined;
  private poisoned = false;
  private used = false;
  private disposed = false;
  constructor(private readonly create: () => IdentityPort = () => new Worker('identity-worker.js'), private readonly closeMs = 5000) {
    if (!Number.isInteger(closeMs) || closeMs < 10 || closeMs > 15000) throw new DomainError('invalid');
  }
  private scope(id = 'guest'): Scope { return { accountId: id, generation: 0, mediaSessionId: 'identity', requestId: `identity-${++sequence}` }; }
  async login(signal: AbortSignal, display: (event: LoginDisplay) => void): Promise<PrivateAccount> {
    const result = await this.run({ version: 1, operation: 'identity', scope: this.scope(), mode: 'login' }, signal, display);
    if (result.kind !== 'authenticated') throw new DomainError('invalid'); return result.account;
  }
  async verify(account: PrivateAccount, signal: AbortSignal): Promise<AccountIdentity> {
    const value = parsePrivateAccount(account);
    const result = await this.run({ version: 1, operation: 'identity', scope: this.scope(value.id), mode: 'verify', account: value }, signal);
    if (result.kind !== 'verified') throw new DomainError('invalid'); return result.identity;
  }
  private run(value: IdentityRequest, signal: AbortSignal, display?: (event: LoginDisplay) => void): Promise<IdentityEvent> {
    if (this.used || this.poisoned || this.disposed) return Promise.reject(new DomainError('unknown'));
    if (signal.aborted) return Promise.reject(new DomainError('cancelled'));
    this.used = true; this.request = parseIdentityRequest(value);
    return new Promise((resolve, reject) => {
      let worker: IdentityPort; try { worker = this.create(); } catch { this.request = undefined; reject(new DomainError('unsupported')); return; }
      this.worker = worker; this.reject = reject;
      const abort = () => { reject(new DomainError('cancelled')); void this.close(); };
      const timer = setTimeout(() => { reject(new DomainError('timeout')); void this.close(); }, value.mode === 'login' ? 220000 : 15000);
      this.cleanup = () => { clearTimeout(timer); signal.removeEventListener('abort', abort); this.reject = undefined; this.cleanup = undefined; };
      signal.addEventListener('abort', abort, { once: true });
      worker.onerror = () => { if (this.worker === worker) this.fail(); };
      let qr = false, confirm = false, frames = 0;
      worker.onmessage = event => {
        if (this.worker !== worker) return;
        let result: IdentityEvent;
        try { result = parseIdentityEvent(event.data); if (JSON.stringify(result.scope) !== JSON.stringify(value.scope) || ++frames > 4) throw new DomainError('invalid'); } catch { this.fail(); return; }
        if (result.kind === 'qr' || result.kind === 'confirm') {
          if (this.closure || signal.aborted) return;
          if (value.mode !== 'login' || result.kind === 'qr' && qr || result.kind === 'confirm' && (!qr || confirm)) { this.fail(); return; }
          if (result.kind === 'qr') qr = true; else confirm = true;
          try { display?.(result); } catch { reject(new DomainError('invalid')); void this.close(); } return;
        }
        if (result.kind === 'authenticated' && (value.mode !== 'login' || !qr) || result.kind === 'verified' && (value.mode !== 'verify' || result.identity.uid !== value.account.uid)) { this.fail(); return; }
        this.cleanup?.(); this.worker = undefined; this.request = undefined; worker.terminate();
        if (this.closure) { this.finishClose(true); return; }
        if (signal.aborted) reject(new DomainError('cancelled')); else if (result.kind === 'closed') reject(new DomainError(result.code)); else resolve(result);
      };
      try { worker.postMessage(this.request); } catch { this.fail(); }
    });
  }
  private fail(): void { this.poisoned = true; this.reject?.(new DomainError('unknown')); this.cleanup?.(); this.worker?.terminate(); this.worker = undefined; this.request = undefined; this.finishClose(false); }
  private finishClose(closed: boolean): void { clearTimeout(this.closeTimer); this.closeTimer = undefined; this.endClose?.({ closed }); this.endClose = undefined; }
  close(): Promise<{ closed: boolean }> {
    this.disposed = true;
    if (this.closure) return this.closure;
    if (!this.worker) return Promise.resolve({ closed: !this.poisoned });
    this.closure = new Promise(resolve => { this.endClose = resolve; });
    this.reject?.(new DomainError('cancelled')); this.cleanup?.();
    this.closeTimer = setTimeout(() => this.fail(), this.closeMs);
    try { this.worker.postMessage({ version: 1, operation: 'identity', scope: this.request!.scope, control: 'stop' }); } catch { this.fail(); }
    return this.closure;
  }
}
