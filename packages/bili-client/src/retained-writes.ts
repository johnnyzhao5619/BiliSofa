import { DomainError } from '../../contracts/src/index.ts';
import { parseAccountId } from '../../contracts/src/private-account.ts';
import { WRITE_LIMIT, parseRetainedIntent, validateAuthority, type JournalStore, type RetainedIntent, type RetainedEntry, type RetainedOutcome, type RetainedState, type WriteAuthority } from '../../contracts/src/retained-write.ts';
const unresolved = (s: RetainedState) => ['pending','checking','unknown'].includes(s);
const same = (a: RetainedIntent,b: RetainedIntent) => a.accountId === b.accountId && a.action === b.action && a.targetId === b.targetId;
/** Every dispatch has a durable marker. Never retries, resets or releases unknowns. */
export class RetainedWrites {
  private locked = false;
  private busy = new Set<string>();
  constructor(private readonly store: JournalStore, private readonly timeoutMs = 15000) {
    if (!Number.isInteger(timeoutMs) || timeoutMs < 10 || timeoutMs > 60000) throw new DomainError('invalid');
  }
  private async observe<T>(work: () => Promise<T>, signal: AbortSignal): Promise<T> {
    let timer: ReturnType<typeof setTimeout> | undefined, abort: (()=>void) | undefined;
    try {
      const cancelled = new Promise<never>((_yes,no) => {
        abort=()=>no(new DomainError('cancelled')); signal.addEventListener('abort',abort,{once:true});
        timer=setTimeout(()=>no(new DomainError('timeout')),this.timeoutMs);
      });
      if (signal.aborted) throw new DomainError('cancelled');
      // Attach race handlers even if dispatch synchronously aborts and throws.
      const started=new Promise<T>((yes,no)=>{try{yes(work());}catch(error){no(error);}});
      return await Promise.race([started,cancelled]);
    } finally { clearTimeout(timer); if(abort)signal.removeEventListener('abort',abort); }
  }
  private read() {
    if (this.locked) throw new DomainError('unknown');
    try { return this.store.read(); } catch { this.locked = true; throw new DomainError('unknown'); }
  }
  private change(edit: (entries: RetainedEntry[]) => void): void {
    const current = this.read();
    if (current.value.revision >= Number.MAX_SAFE_INTEGER) { this.locked = true; throw new DomainError('unknown'); }
    // In-flight rows from an earlier process are uncertain, never retryable.
    const entries = current.value.entries.map(e => ({...e,state: unresolved(e.state) ? 'unknown' as const : e.state}));
    edit(entries);
    try { this.store.replace(current.raw,{schema:1,revision:current.value.revision+1,entries}); }
    catch { this.locked = true; throw new DomainError('unknown'); }
  }
  summary(accountId: string): { total: number; unknown: number } | undefined {
    // Validate without accepting guest or arbitrary keys. No target/UID in diagnostics.
    parseAccountId(accountId);
    try { const entries = this.read().value.entries.filter(e => e.accountId === accountId); return {total:entries.length,unknown:entries.filter(e => unresolved(e.state)).length}; }
    catch { return undefined; }
  }
  private enter(intent: RetainedIntent): () => void {
    const key = JSON.stringify([intent.accountId,intent.targetId]);
    if (this.busy.has(key)) throw new DomainError('unknown');
    this.busy.add(key); return () => { this.busy.delete(key); };
  }
  async submit(value: RetainedIntent, authority: WriteAuthority, send: () => Promise<RetainedOutcome>, userConfirmed: boolean): Promise<RetainedState> {
    const intent = parseRetainedIntent(value); validateAuthority(intent,authority);
    if (userConfirmed !== true) throw new DomainError('permission');
    const leave = this.enter(intent);
    try {
      this.change(entries => {
        if (entries.some(e => e.accountId === intent.accountId && e.targetId === intent.targetId && unresolved(e.state))) throw new DomainError('unknown');
        const previous = entries.find(e => same(e,intent));
        if (previous?.state === 'confirmed') throw new DomainError('unknown');
        if (!previous && entries.length >= WRITE_LIMIT) throw new DomainError('invalid');
        if (previous) previous.state = 'pending'; else entries.push({...intent,state:'pending'});
      });
      let state: RetainedOutcome = 'unknown';
      try {
        // Storage callbacks can synchronously invalidate the account lease.
        validateAuthority(intent,authority);
        const outcome = await this.observe(send,authority.signal);
        validateAuthority(intent,authority);
        if (outcome === 'confirmed' || outcome === 'rejected') state = outcome;
      } catch { /* Dispatch/cancel/error is never evidence of absence. */ }
      try { this.finish(intent,state); } catch { return 'unknown'; }
      return state;
    } finally { leave(); }
  }
  async reconcile(value: RetainedIntent, authority: WriteAuthority, query: () => Promise<'applied'|'not-applied'|'unknown'>): Promise<RetainedState> {
    const intent = parseRetainedIntent(value); validateAuthority(intent,authority); const leave = this.enter(intent);
    try {
      this.change(entries => { const row = entries.find(e => same(e,intent)); if (!row || !unresolved(row.state)) throw new DomainError('invalid'); row.state='checking'; });
      let state: RetainedState = 'unknown';
      try { validateAuthority(intent,authority); const result=await this.observe(query,authority.signal); validateAuthority(intent,authority); state=result==='applied'?'confirmed':result==='not-applied'?'not-applied':'unknown'; } catch { /* Failed reads cannot unlock a write. */ }
      try { this.finish(intent,state); } catch { return 'unknown'; } return state;
    } finally { leave(); }
  }
  /** An exact-identity season read reconciles BOTH directions atomically. Only
   * this reversible state family may invalidate a prior confirmed action;
   * coin/triple/progress rows and their consumed grants remain untouched. */
  async reconcileBangumi(value: RetainedIntent, authority: WriteAuthority, query: () => Promise<'yes'|'no'|'unknown'>): Promise<'yes'|'no'|'unknown'> {
    const intent = parseRetainedIntent(value); validateAuthority(intent, authority);
    if (intent.action !== 'bangumi-follow') throw new DomainError('invalid');
    const leave = this.enter(intent);
    const belongs = (e: RetainedEntry) => e.accountId === intent.accountId && e.targetId === intent.targetId && (e.action === 'bangumi-follow' || e.action === 'bangumi-unfollow');
    try {
      this.change(entries => { for (const e of entries.filter(belongs)) e.state = 'checking'; });
      let result: 'yes'|'no'|'unknown' = 'unknown';
      try { validateAuthority(intent, authority); const read = await this.observe(query, authority.signal); validateAuthority(intent, authority); if (read === 'yes' || read === 'no') result = read; } catch { /* A failed read cannot prove absence. */ }
      try { this.change(entries => { for (const e of entries.filter(belongs)) e.state = result === 'unknown' ? 'unknown' : (e.action === 'bangumi-follow') === (result === 'yes') ? 'confirmed' : 'not-applied'; }); }
      catch { return 'unknown'; }
      return result;
    } finally { leave(); }
  }
  private finish(intent: RetainedIntent,state: RetainedState): void {
    this.change(entries => { const row=entries.find(e=>same(e,intent)); if(!row) throw new DomainError('unknown'); row.state=state; });
  }
}
