import {accountCapability} from './account-capability.ts';
import type {PageRoute,ReturnAnchor} from '../../../../packages/contracts/src/navigation.ts';
import { DomainError, type Scope } from '../../../../packages/contracts/src/index.ts';
import { AccountCoordinator, type AccountState } from '../../../../packages/bili-client/src/accounts.ts';
import type { AccountRepository, AccountRuntime, PrivateAccount } from '../../../../packages/contracts/src/private-account.ts';
import type { TvShell } from './tv-shell.ts';
import type { RetainedWrites } from '../../../../packages/bili-client/src/retained-writes.ts';
import { retainedState, type RetainedAction, type RetainedOutcome, type RetainedState } from '../../../../packages/contracts/src/retained-write.ts';
/** Composition adapter: authority loss hides the view synchronously; identity
 * verification and cleanup finish before any private page is rebuilt. */
export class AccountWorkspace {
  private readonly accounts: AccountCoordinator;
  private epoch = 0;
  private hidden = false;
  private disposed = false;
  private desired:string|undefined;
  private destination:{route:PageRoute;anchor:ReturnAnchor}|undefined;
  private recoveryId:string|undefined;
  private authority=0;
  private recovering:Promise<void>|undefined;
  constructor(private readonly shell: TvShell, repository: AccountRepository, createRuntime: (value: PrivateAccount) => AccountRuntime,
    clock?: () => number, timeoutMs?: number, private readonly writes?: RetainedWrites, private readonly recoveryEnabled=false) {
    this.accounts = new AccountCoordinator(repository, value=>{
      const ticket=++this.authority,runtime=createRuntime(value),expiresAt=value.expiresAt;
      if(!this.recoveryEnabled)return runtime;
      const current=()=>ticket===this.authority&&!this.hidden&&!this.disposed&&this.state.kind==='active';
      const expired=()=>{if(current())void this.authenticationLost(ticket).catch(()=>{});};
      return {...runtime,
        ...(runtime.openVod?{openVod:async(...args:Parameters<NonNullable<AccountRuntime['openVod']>>)=>accountCapability(await runtime.openVod!(...args),current,expired,expiresAt,clock)}:{}),
        ...(runtime.openPgc?{openPgc:async(...args:Parameters<NonNullable<AccountRuntime['openPgc']>>)=>accountCapability(await runtime.openPgc!(...args),current,expired,expiresAt,clock)}:{}),
        close:()=>runtime.close()
      };
    }, { invalidate: (reason,code) => {
      this.authority++;
      if(this.recoveryEnabled&&reason==='error'&&code==='login'&&this.desired&&!this.destination){this.destination=shell.recoveryDestination();this.recoveryId=this.desired;}
      const closing = shell.suspendConfirmed();
      return closing.then(result => {
        if (reason !== 'background') shell.navigation.resetForAccountChange();
        return result;
      });
    } }, clock, timeoutMs);
  }
  /** No credentials, old DTOs, modal actions or POST intents enter recovery state. */
  get recovery():{id:string}|undefined{return this.recoveryEnabled&&this.recoveryId?{id:this.recoveryId}:undefined;}
  private async authenticationLost(ticket:number):Promise<void>{
    if(ticket!==this.authority||this.recovering||this.hidden||this.disposed)return;
    const epoch=++this.epoch;
    this.recovering=this.accounts.expire();
    try{await this.recovering;await this.show(epoch);}finally{this.recovering=undefined;}
  }
  /** Explicit refresh closes old authority before a QR exchange is offered. */
  async prepareRenewal():Promise<void>{
    if(!this.recoveryEnabled||this.hidden||this.disposed)throw new DomainError('cancelled');
    const state=this.state;if(state.kind!=='active')throw new DomainError('login');
    await this.authenticationLost(this.authority);
  }
  /** UI cache/cursor lifetime only; network authority still uses account scope. */
  get viewRevision(): number { return this.epoch; }
  get state(): AccountState { return this.accounts.state; }
  private async show(epoch: number): Promise<void> {
    if (this.disposed || this.hidden || epoch !== this.epoch) return;
    if(this.recoveryEnabled&&this.state.kind==='active'&&this.state.account.id===this.recoveryId&&this.destination){this.shell.navigation.restoreDestination(this.destination.route,this.destination.anchor);this.destination=undefined;this.recoveryId=undefined;}
    if(this.recoveryEnabled&&this.state.kind==='error'&&this.state.code==='login'&&this.recoveryId)this.shell.navigation.restoreDestination({page:'account'},{focusId:'add-account',scrollTop:0});
    await this.shell.resume(async () => { if (this.state.kind === 'blocked') throw new DomainError('unknown'); });
  }
  async select(id?: string): Promise<void> {
    if (this.disposed || this.hidden) throw new DomainError('cancelled');
    const epoch = ++this.epoch;
    const returning=this.recoveryEnabled&&id!==undefined&&id===this.recoveryId?this.destination:undefined;
    this.desired=id;
    if(!returning){this.destination=undefined;this.recoveryId=undefined;}
    try {
      await this.accounts.select(id);
      if(returning&&epoch===this.epoch&&!this.hidden&&!this.disposed&&this.state.kind==='active'&&this.state.account.id===id){
        this.shell.navigation.restoreDestination(returning.route,returning.anchor);
        this.destination=undefined;this.recoveryId=undefined;
      }
    } finally { await this.show(epoch); }
  }
  async remove(id: string): Promise<void> {
    if (this.disposed || this.hidden) throw new DomainError('cancelled');
    const epoch = ++this.epoch;
    this.desired=undefined;this.destination=undefined;this.recoveryId=undefined;
    try { await this.accounts.remove(id); } finally { await this.show(epoch); }
  }
  async read<T>(load: (runtime: AccountRuntime, scope: Scope, signal: AbortSignal) => Promise<unknown>, parse: (raw: unknown) => T): Promise<T> {
    const epoch = this.epoch;
    try { return await this.accounts.read(load, parse); }
    finally { if (this.state.kind === 'error' || this.state.kind === 'blocked') await this.show(epoch); }
  }
  /** No UI action or POST backend is enabled by constructing this gateway. */
  submit(action: RetainedAction, targetId: string, send: (runtime: AccountRuntime, scope: Scope, signal: AbortSignal) => Promise<RetainedOutcome>, confirmed: boolean): Promise<RetainedState> {
    if (!this.writes) return Promise.reject(new DomainError('unsupported'));
    return this.read((runtime,scope,signal) => this.writes!.submit({accountId:scope.accountId,action,targetId},{scope,signal},()=>send(runtime,scope,signal),confirmed),retainedState);
  }
  reconcile(action: RetainedAction, targetId: string, query: (runtime: AccountRuntime, scope: Scope, signal: AbortSignal) => Promise<'applied'|'not-applied'|'unknown'>): Promise<RetainedState> {
    if (!this.writes) return Promise.reject(new DomainError('unsupported'));
    return this.read((runtime,scope,signal) => this.writes!.reconcile({accountId:scope.accountId,action,targetId},{scope,signal},()=>query(runtime,scope,signal)),retainedState);
  }
  reconcileBangumi(seasonId: string, query: (runtime: AccountRuntime, scope: Scope, signal: AbortSignal) => Promise<'yes'|'no'|'unknown'>): Promise<'yes'|'no'|'unknown'> {
    if (!this.writes) return Promise.reject(new DomainError('unsupported'));
    return this.read(async(runtime,scope,signal) => {
      let loginLost=false;
      const result=await this.writes!.reconcileBangumi({accountId:scope.accountId,action:'bangumi-follow',targetId:`ss:${seasonId}`},{scope,signal},async()=>{try{return await query(runtime,scope,signal);}catch(error){loginLost=error instanceof DomainError&&error.code==='login';throw error;}});
      // The journal has durably retained uncertainty before the coordinator
      // invalidates/hides private views. Do not suppress authentication loss.
      if(loginLost)throw new DomainError('login');return result;
    }, value => {
      if (value !== 'yes' && value !== 'no' && value !== 'unknown') throw new DomainError('invalid'); return value;
    });
  }
  async setHidden(hidden: boolean): Promise<void> {
    if (this.disposed || hidden === this.hidden) return;
    this.hidden = hidden; const epoch = ++this.epoch;
    if (hidden) await this.accounts.suspend();
    else { try { await this.accounts.resume(); } finally { await this.show(epoch); } }
  }
  async dispose(): Promise<boolean> {
    if (!this.disposed) { this.disposed = true; this.epoch++; }
    const okay = await this.accounts.dispose(), shell = await this.shell.dispose();
    return okay && shell.closed;
  }
}
