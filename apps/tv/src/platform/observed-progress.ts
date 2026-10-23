import { DomainError, type Scope } from '../../../../packages/contracts/src/index.ts';
import { ACCOUNT_TEST_VIDEO as video, type AccountView } from '../../../../packages/contracts/src/account-probe.ts';
import { parseObservedProgressRequest, parseObservedProgressResult, type ObservedReceipt, type ObservedProgressRequest, type ObservedProgressResult } from '../../../../packages/contracts/src/observed-progress.ts';
import { AccountProbeWorker } from './account-probe-worker.ts';
import { accountVault, type AccountVault } from './account-vault.ts';
import { ScopedGuestWorker } from './scoped-guest-worker.ts';
const priorKey = 'bilisofa.w01.progress-once.v1', intentKey = 'bilisofa.w01.progress-observation-intent.v1';
type Journal = Pick<Storage, 'getItem' | 'setItem'>;
export interface ObservedProgressOutcome { code: string; positionMs?: number; postCode?: string; readbackCode?: string; }
export class ObservedProgress {
  private readonly reader: AccountProbeWorker;
  private readonly poster = new ScopedGuestWorker<ObservedProgressRequest, ObservedProgressResult>('observed-progress-worker.js', 'observed-progress-post', parseObservedProgressRequest, parseObservedProgressResult, 90000, 5000);
  private busy = false;
  private poisoned = false;
  constructor(private readonly vault: AccountVault = accountVault(), private readonly journal: Journal = localStorage) { this.reader = new AccountProbeWorker(vault, true); }
  attempted(): boolean { try {
    return this.journal.getItem(intentKey) !== null;
  }
  catch {
    return true;
  } }
  private prior(): string {
    const raw = this.journal.getItem(priorKey);
    if (!raw || raw.length > 256)
      throw new DomainError('unknown');
    let v;
    try {
      v = JSON.parse(raw);
    }
    catch {
      throw new DomainError('invalid');
    }
    if (Object.keys(v).length !== 4 || v.schema !== 1 || v.bvid !== video.bvid || v.targetSec !== 15 || !['unknown', 'pending'].includes(v.state))
      throw new DomainError('unknown');
    return raw;
  }
  private persist(state: string, receipt: ObservedReceipt): void {
    const value = JSON.stringify({ schema: 1, bvid: video.bvid, positionSec: receipt.positionSec, priorUnknownAcknowledged: true, state });
    this.journal.setItem(intentKey, value);
    if (this.journal.getItem(intentKey) !== value)
      throw new DomainError('unknown');
  }
  private async read(scope: Scope, signal: AbortSignal, onClosed: (code: string) => void = () => {}): Promise<AccountView> {
    let view: AccountView | undefined;
    const code = await this.reader.run('restore', scope, signal, event => { if (event.kind === 'summary')
      view = event.view; });
    onClosed(code);
    if (!view || signal.aborted || !/^account\.readback_(both_target|modern_target|legacy_target|neither_target)_closed$/.test(code))
      throw new DomainError('unknown');
    return view;
  }
  async submit(scope: Scope, signal: AbortSignal, receipt: ObservedReceipt, approved: boolean, acknowledgePriorUnknown: boolean): Promise<ObservedProgressOutcome> {
    if (!approved || !acknowledgePriorUnknown)
      throw new DomainError('permission');
    if (this.busy || this.poisoned || this.attempted() || signal.aborted)
      throw new DomainError('unknown');
    this.busy = true;
    let reserved = false, postCode: string | undefined, positionMs: number | undefined, readbackCode: string | undefined;
    try {
      const before = this.prior(), session = this.vault.load();
      if (!session)
        throw new DomainError('login');
      const request = parseObservedProgressRequest({ version: 1, operation: 'observed-progress-post', scope, session, receipt, approved: true, acknowledgePriorUnknown: true });
      if (session.expiresAt <= Date.now() || Date.now() / 1000 - receipt.startedAtSec > 120 || receipt.startedAtSec > Date.now() / 1000 || signal.aborted)
        throw new DomainError('invalid');
      this.persist('pending', receipt);
      reserved = true;
      if (this.journal.getItem(priorKey) !== before)
        throw new DomainError('unknown');
      const result = await this.poster.run(request, signal);
      postCode = result.code;
      if (!result.attempted) {
        this.persist('not_sent', receipt);
        return { code: 'observed.precondition_failed_no_retry', postCode };
      }
      for (let i = 0; i < 3 && !signal.aborted; i++) {
        const view = await this.read(scope, signal, code => { readbackCode = code; });
        positionMs = view.lastPlayTime;
        if (view.progressCid === video.cid && positionMs >= receipt.positionSec * 1000 && positionMs <= (receipt.positionSec + 1) * 1000) {
          this.persist('confirmed', receipt);
          return { code: 'observed.write_readback_confirmed', postCode, positionMs, ...(readbackCode ? { readbackCode } : {}) };
        }
        if (i < 2)
          await new Promise<void>((resolve, reject) => { const abort = () => { clearTimeout(timer); signal.removeEventListener('abort', abort); reject(new DomainError('cancelled')); }; const timer = setTimeout(() => { signal.removeEventListener('abort', abort); resolve(); }, 1000); signal.addEventListener('abort', abort, { once: true }); if (signal.aborted)
            abort(); });
      }
      this.persist('unknown', receipt);
      return { code: 'observed.write_unknown_no_retry', postCode, ...(readbackCode ? { readbackCode } : {}), ...(positionMs === undefined ? {} : { positionMs }) };
    }
    catch {
      if (reserved) {
        try {
          this.persist('unknown', receipt);
        }
        catch { /* Reservation remains present; no retry. */ }
      }
      return { code: reserved ? 'observed.write_unknown_no_retry' : 'observed.precondition_failed_no_write', ...(postCode ? { postCode } : {}), ...(readbackCode ? { readbackCode } : {}), ...(positionMs === undefined ? {} : { positionMs }) };
    }
    finally {
      this.busy = false;
    }
  }
  // Recovery is GET-only and never reserves, rewrites or unlocks either intent.
  async query(scope: Scope, signal: AbortSignal): Promise<ObservedProgressOutcome> {
    if (this.busy || this.poisoned || signal.aborted) throw new DomainError('unknown');
    this.busy = true;
    let readbackCode: string | undefined;
    try {
      const raw = this.journal.getItem(intentKey);
      if (!raw || raw.length > 256) throw new DomainError('invalid');
      const value: unknown = JSON.parse(raw);
      if (!value || typeof value !== 'object' || Array.isArray(value)) throw new DomainError('invalid');
      const intent = value as Record<string, unknown>;
      if (Object.keys(intent).length !== 5 || intent.schema !== 1 || intent.bvid !== video.bvid || intent.priorUnknownAcknowledged !== true || !Number.isInteger(intent.positionSec) || (intent.positionSec as number) < 20 || (intent.positionSec as number) > 25 || !['unknown', 'pending', 'confirmed'].includes(String(intent.state))) throw new DomainError('invalid');
      const view = await this.read(scope, signal, code => { readbackCode = code; });
      if (signal.aborted || this.journal.getItem(intentKey) !== raw) throw new DomainError('cancelled');
      const hit = view.progressCid === video.cid && view.lastPlayTime >= (intent.positionSec as number) * 1000 && view.lastPlayTime <= ((intent.positionSec as number) + 1) * 1000;
      return { code: hit ? 'observed.readonly_target_observed' : 'observed.readonly_other_observed', positionMs: view.lastPlayTime, ...(readbackCode ? { readbackCode } : {}) };
    } catch {
      return { code: 'observed.readonly_unconfirmed_no_post', ...(readbackCode ? { readbackCode } : {}) };
    } finally { this.busy = false; }
  }
  async dispose(): Promise<void> { const result = await Promise.allSettled([this.poster.dispose(), this.reader.dispose()]); if (result.some(v => v.status === 'rejected')) {
    this.poisoned = true;
    throw new DomainError('unknown');
  } }
}
