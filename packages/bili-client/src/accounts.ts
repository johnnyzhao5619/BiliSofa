import type {AccountProfile} from '../../contracts/src/account-profile.ts';
import { DomainError, type ErrorCode, type Scope } from '../../contracts/src/index.ts';
import { parseAccountId, parseAccountIdentity, parsePrivateAccount, summarizeAccount, type AccountRepository, type AccountRuntime, type AccountSummary, type PrivateAccount } from '../../contracts/src/private-account.ts';
import { SessionManager } from './session.ts';
import {RecommendationReadError} from '../../contracts/src/recommendations.ts';
import {LiveReadFailure} from '../../contracts/src/live-product.ts';
export type AccountState = { kind: 'guest' | 'switching' | 'suspended' | 'blocked' } | { kind: 'active'; account: AccountSummary;profile?:AccountProfile } | { kind: 'error'; code: ErrorCode };
export interface AccountResources {
  /** Must synchronously hide private views/cancel media, then confirm closure. */
  invalidate(reason: 'account' | 'background' | 'error' | 'dispose', code?:ErrorCode): Promise<{ closed: boolean }>;
}
/** Credentials never enter public state; native authority is replaced only after closure. */
export class AccountCoordinator {
  private readonly sessions = new SessionManager();
  private value: AccountState = { kind: 'guest' };
  private epoch = 0;
  private runtime: AccountRuntime | undefined;
  private controller: AbortController | undefined;
  private barrier: Promise<boolean> = Promise.resolve(true);
  private desired: string | undefined;
  private hidden = false;
  private disposed = false;
  private mutating = false;
  private entering = false;
  constructor(private readonly repository: AccountRepository, private readonly createRuntime: (account: PrivateAccount) => AccountRuntime,
    private readonly resources: AccountResources, private readonly clock = () => Date.now(), private readonly timeoutMs = 15000) {
    if (!Number.isInteger(timeoutMs) || timeoutMs < 10 || timeoutMs > 60000) throw new DomainError('invalid');
  }
  get state(): AccountState { return this.value.kind === 'active' ? { kind: 'active', account: { ...this.value.account },...(this.value.profile?{profile:{...this.value.profile}}:{}) } : { ...this.value }; }
  private usable(): void { if (this.disposed || this.hidden || this.mutating || this.entering) throw new DomainError('cancelled'); }
  private async bounded<T>(work: Promise<T>, signal?: AbortSignal): Promise<T> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let abort: (() => void) | undefined;
    try {
      return await Promise.race([work, new Promise<never>((_yes, no) => {
        timer = setTimeout(() => no(new DomainError('timeout')), this.timeoutMs);
        if (signal) { abort = () => no(new DomainError('cancelled')); signal.addEventListener('abort', abort, { once: true }); if (signal.aborted) abort(); }
      })]);
    } finally { clearTimeout(timer); if (signal && abort) signal.removeEventListener('abort', abort); }
  }
  private transition(kind: 'guest' | 'switching' | 'suspended', reason: 'account' | 'background' | 'error' | 'dispose' = 'account', code?:ErrorCode): { epoch: number; controller: AbortController; barrier: Promise<boolean> } {
    if (this.entering) throw new DomainError('cancelled');
    this.entering = true;
    try {
      const epoch = ++this.epoch, oldController = this.controller, runtime = this.runtime;
      this.controller = undefined; this.runtime = undefined; this.value = { kind };
      // Invalidate request ownership before abort listeners can observe state.
      this.sessions.switchAccount('guest'); oldController?.abort();
      let view: Promise<{ closed: boolean }>;
      try { view = this.resources.invalidate(reason,code); } catch { view = Promise.resolve({ closed: false }); }
      let native: Promise<{ closed: boolean }>;
      try { native = runtime?.close() ?? Promise.resolve({ closed: true }); } catch { native = Promise.resolve({ closed: false }); }
      const safe = (work: Promise<{ closed: boolean }>) => this.bounded(work).then(r => r?.closed === true).catch(() => false);
      this.barrier = Promise.all([this.barrier, safe(view), safe(native)]).then(results => results.every(Boolean));
      const controller = new AbortController(); this.controller = controller;
      return { epoch, controller, barrier: this.barrier };
    } finally { this.entering = false; }
  }
  async select(id?: string): Promise<void> {
    this.usable(); if (id !== undefined) parseAccountId(id); this.desired = id;
    await this.activate(id);
  }
  private async activate(id?: string, reason: 'account' | 'background' = 'account'): Promise<void> {
    const task = this.transition(id ? 'switching' : 'guest', reason);
    const current = () => task.epoch === this.epoch && !this.disposed && !this.hidden && !task.controller.signal.aborted;
    try {
      if (!(await task.barrier)) { if (current()) this.value = { kind: 'blocked' }; throw new DomainError('unknown'); }
      if (!current()) throw new DomainError('cancelled');
      if (!id) return;
      const raw = await this.bounded(this.repository.read(id), task.controller.signal);
      if (!current()) throw new DomainError('cancelled');
      if (!raw) throw new DomainError('login');
      const account = parsePrivateAccount(raw), now = this.clock();
      if (account.id !== id || !Number.isFinite(now)) throw new DomainError('invalid');
      if (account.expiresAt <= now) throw new DomainError('login');
      const runtime = this.createRuntime(account); this.runtime = runtime;
      const identity = parseAccountIdentity(await this.bounded(runtime.verify(task.controller.signal), task.controller.signal));
      if (!current()) throw new DomainError('cancelled');
      const verifiedAt = this.clock();
      if (!Number.isFinite(verifiedAt)) throw new DomainError('invalid');
      if (identity.uid !== account.uid || account.expiresAt <= verifiedAt) throw new DomainError('login');
      this.sessions.switchAccount(id); this.value = { kind: 'active', account: { ...summarizeAccount(account), name: identity.name },...(identity.profile?{profile:{...identity.profile}}:{}) };
    } catch (e) {
      if (!current()) throw new DomainError('cancelled');
      const code = e instanceof DomainError ? e.code : 'unknown';
      const closing = this.transition('guest', 'error',code);
      const okay = await closing.barrier;
      if (closing.epoch === this.epoch && !this.hidden && !this.disposed) this.value = okay ? { kind: 'error', code } : { kind: 'blocked' };
      throw new DomainError(code);
    }
  }
  async read<T>(load: (runtime: AccountRuntime, scope: Scope, signal: AbortSignal) => Promise<unknown>, parse: (raw: unknown) => T): Promise<T> {
    this.usable(); const runtime = this.runtime;
    if (this.value.kind !== 'active' || !runtime) throw new DomainError('login');
    const now = this.clock();
    if (!Number.isFinite(now)) throw new DomainError('invalid');
    if (this.value.account.expiresAt <= now) { await this.expire(); throw new DomainError('login'); }
    const epoch = this.epoch;
    try { return await this.sessions.read((scope, signal) => load(runtime, scope, signal), parse); }
    catch (e) {
      const code = e instanceof DomainError ? e.code : 'unknown';
      if (code === 'login' && epoch === this.epoch) {
        await this.expire();
      }
      if(e instanceof RecommendationReadError)throw new RecommendationReadError(e.detail,code);
      if(e instanceof LiveReadFailure)throw new LiveReadFailure(code,e.apiCode);
      throw new DomainError(code);
    }
  }
  /** External account-bound capabilities may discover expiry after openVod
   * returned. Invalidate synchronously; callers must not await this from close. */
  async expire():Promise<void>{
    if(this.disposed||this.hidden||this.value.kind!=='active')return;
    const closing=this.transition('guest','error','login'),okay=await closing.barrier;
    if(closing.epoch===this.epoch&&!this.hidden&&!this.disposed)this.value=okay?{kind:'error',code:'login'}:{kind:'blocked'};
  }
  async remove(id: string): Promise<void> {
    this.usable(); parseAccountId(id); this.mutating = true; this.desired = undefined;
    try { await this.activate(); await this.repository.remove(id); }
    catch (e) { if (!this.disposed && !this.hidden) this.value = { kind: 'blocked' }; throw new DomainError(e instanceof DomainError ? e.code : 'unknown'); }
    finally { this.mutating = false; }
  }
  suspend(): Promise<void> {
    if (this.disposed) return Promise.resolve();
    this.hidden = true; const task = this.transition('suspended', 'background');
    return task.barrier.then(okay => { if (!okay && task.epoch === this.epoch) this.value = { kind: 'blocked' }; });
  }
  async resume(): Promise<void> {
    if (this.disposed || !this.hidden || this.mutating) return;
    this.hidden = false; await this.activate(this.desired, 'background');
  }
  dispose(): Promise<boolean> {
    if (!this.disposed) { this.disposed = true; this.hidden = true; this.desired = undefined; this.transition('suspended', 'dispose'); this.sessions.dispose(); }
    return this.barrier;
  }
}
