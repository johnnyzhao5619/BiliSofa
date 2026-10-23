import { DomainError } from '../../../../packages/contracts/src/index.ts';
import { parseAccountSession, type AccountSession } from '../../../../packages/contracts/src/account-probe.ts';
import { probeKeyManagerApi } from './samsung.ts';
import type { ProbeKeyManagerApi } from './keymanager-probe.ts';
const owners = new WeakMap<ProbeKeyManagerApi, { busy: boolean }>();
const alias = { name: 'bilisofa.w01.account.v1' };
const missing = (e: unknown) => !!e && typeof e === 'object' && 'name' in e && e.name === 'NotFoundError';
export class AccountVault {
  private readonly owner: { busy: boolean };
  constructor(private readonly api: ProbeKeyManagerApi | undefined) {
    this.owner = api ? owners.get(api) ?? { busy: false } : { busy: false };
    if (api) owners.set(api, this.owner);
  }
  load(): AccountSession | undefined {
    if (!this.api || this.owner.busy) throw new DomainError('unknown');
    let raw: unknown; try { raw = this.api.getData(alias); } catch (error) { if (missing(error)) return; throw new DomainError('unknown'); }
    if (typeof raw !== 'string' || raw.length > 4000) throw new DomainError('invalid');
    let session: AccountSession; try { session = parseAccountSession(JSON.parse(raw)); } catch { throw new DomainError('invalid'); }
    if (session.expiresAt <= Date.now() || session.expiresAt > Date.now() + 1800000) throw new DomainError('login');
    return session;
  }
  clear(): void {
    if (!this.api || this.owner.busy) throw new DomainError('unknown');
    try { this.api.removeData(alias); } catch (error) { if (!missing(error)) throw new DomainError('unknown'); }
    try { this.api.getData(alias); } catch (error) { if (missing(error)) return; }
    throw new DomainError('unknown');
  }
  async save(value: AccountSession, signal: AbortSignal): Promise<void> {
    const session = parseAccountSession(value), api = this.api;
    if (!api || this.owner.busy || session.expiresAt <= Date.now() || session.expiresAt > Date.now() + 1800000) throw new DomainError('unknown');
    if (signal.aborted) throw new DomainError('cancelled');
    if (this.load()) throw new DomainError('permission');
    const serialized = JSON.stringify(session); this.owner.busy = true;
    const cleanup = () => {
      try { const actual = api.getData(alias); if (actual !== serialized) return false; } catch (error) { return missing(error); }
      try { api.removeData(alias); } catch (error) { if (!missing(error)) return false; }
      try { api.getData(alias); return false; } catch (error) { return missing(error); }
    };
    return new Promise((resolve, reject) => {
      let settled = false, completed = false;
      const finish = (ok: boolean, code: 'cancelled' | 'unknown' = 'unknown') => { if (settled) return; settled = true; clearTimeout(timer); signal.removeEventListener('abort', cancel); if (ok) resolve(); else reject(new DomainError(code)); };
      const cancel = () => finish(false, 'cancelled');
      const timer = setTimeout(() => finish(false), 5000); signal.addEventListener('abort', cancel, { once: true });
      const saved = () => {
        if (completed) return; completed = true;
        if (settled) { if (cleanup()) this.owner.busy = false; return; }
        let matches = false; try { matches = api.getData(alias) === serialized; } catch { /* Confirm cleanup below. */ }
        if (!matches) { if (cleanup()) this.owner.busy = false; finish(false); return; }
        this.owner.busy = false; finish(true);
      };
      const failed = () => { if (completed) return; completed = true; if (cleanup()) this.owner.busy = false; finish(false); };
      try { api.saveData(alias.name, serialized, null, saved, failed); } catch { failed(); }
    });
  }
}
export function accountVault(): AccountVault {
  const g = globalThis as unknown as { tizen?: { application?: { getCurrentApplication(): { appInfo?: { id?: string } } } } };
  try { if (g.tizen?.application?.getCurrentApplication().appInfo?.id === 'BiliNet001.Probe') return new AccountVault(probeKeyManagerApi()); } catch { /* No fallback ordinary storage. */ }
  return new AccountVault(undefined);
}
