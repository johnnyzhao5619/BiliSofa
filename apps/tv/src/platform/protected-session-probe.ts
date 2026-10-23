import type { ProbeKeyManagerApi, KeyManagerProbeResult } from './keymanager-probe.ts';
import { probeKeyManagerApi } from './samsung.ts';
type JournalStore = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
const journalKey = 'bilisofa.probe.https-vault.v1';
const alias = { name: 'bilisofa.w01.https-vault.v1' };
const owners = new WeakMap<ProbeKeyManagerApi, { busy: boolean }>();
const notFound = (error: unknown) => !!error && typeof error === 'object' && 'name' in error && error.name === 'NotFoundError';
const random = (size: number) => [...crypto.getRandomValues(new Uint8Array(size))].map(v => v.toString(16).padStart(2, '0')).join('');
async function digest(value: string): Promise<string> {
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)))].map(v => v.toString(16).padStart(2, '0')).join('');
}
interface Journal { schema: 1; boot: string; digest: string; }
function parse(raw: string): Journal | undefined {
  if (raw.length > 200) return;
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== 'object') return;
    const v = value as Record<string, unknown>;
    if (Object.keys(v).length !== 3 || v.schema !== 1 || typeof v.boot !== 'string' || !/^[0-9a-f]{32}$/.test(v.boot) || typeof v.digest !== 'string' || !/^[0-9a-f]{64}$/.test(v.digest)) return;
    return { schema: 1, boot: v.boot, digest: v.digest };
  } catch { return; }
}
// Fixed synthetic alias only. The random value is never reconstructible from the
// ordinary journal (only a boot identifier and digest); no arbitrary credentials enter this probe.
export class ProtectedSessionProbe {
  private readonly boot = random(16);
  constructor(private readonly api: ProbeKeyManagerApi | undefined, private readonly storage: JournalStore | undefined) {}
  pending(): boolean { try { return this.storage?.getItem(journalKey) !== null; } catch { return true; } }
  async run(signal: AbortSignal): Promise<KeyManagerProbeResult> {
    const api = this.api, storage = this.storage;
    if (!api || !storage || !crypto.subtle) return { verdict: 'BLOCKED', code: 'vault.dependencies_unavailable' };
    const owner = owners.get(api) ?? { busy: false }; owners.set(api, owner);
    if (owner.busy) return { verdict: 'BLOCKED', code: 'vault.write_unresolved' };
    if (signal.aborted) return { verdict: 'UNVERIFIED', code: 'vault.cancelled_before_write' };
    owner.busy = true;
    let raw: string | null;
    try { raw = storage.getItem(journalKey); } catch { owner.busy = false; return { verdict: 'BLOCKED', code: 'vault.journal_unavailable' }; }
    if (raw !== null) {
      const journal = parse(raw);
      if (!journal) { owner.busy = false; return { verdict: 'BLOCKED', code: 'vault.journal_invalid' }; }
      if (journal.boot === this.boot) { owner.busy = false; return { verdict: 'UNVERIFIED', code: 'vault.restart_required' }; }
      let value: unknown, actual = '';
      try { value = api.getData(alias); if (typeof value === 'string' && /^synthetic-secret-[0-9a-f]{64}$/.test(value)) actual = await digest(value); }
      catch { owner.busy = false; return { verdict: 'FAIL', code: 'vault.restore_unconfirmed' }; }
      if (signal.aborted) { owner.busy = false; return { verdict: 'UNVERIFIED', code: 'vault.restore_cancelled' }; }
      if (actual !== journal.digest) { owner.busy = false; return { verdict: 'FAIL', code: 'vault.restore_digest_mismatch' }; }
      const clean = this.cleanup(raw); owner.busy = !clean;
      return { verdict: clean ? 'PASS' : 'FAIL', code: clean ? 'vault.restart_digest_read_deleted' : 'vault.cleanup_unconfirmed' };
    }
    try { api.getData(alias); owner.busy = false; return { verdict: 'BLOCKED', code: 'vault.alias_already_present' }; }
    catch (error) { if (!notFound(error)) { owner.busy = false; return { verdict: 'BLOCKED', code: 'vault.alias_unconfirmed' }; } }
    let value: string, journal: string;
    try {
      value = 'synthetic-secret-' + random(32);
      journal = JSON.stringify({ schema: 1, boot: this.boot, digest: await digest(value) });
      if (signal.aborted) { owner.busy = false; return { verdict: 'UNVERIFIED', code: 'vault.cancelled_before_write' }; }
      if (storage.getItem(journalKey) !== null) { owner.busy = false; return { verdict: 'BLOCKED', code: 'vault.journal_owner_changed' }; }
      storage.setItem(journalKey, journal);
      if (storage.getItem(journalKey) !== journal) throw new Error();
    } catch { owner.busy = false; return { verdict: 'BLOCKED', code: 'vault.journal_write_failed' }; }
    return new Promise(resolve => {
      let settled = false, completed = false;
      const finish = (verdict: KeyManagerProbeResult['verdict'], code: string) => { if (settled) return; settled = true; clearTimeout(timer); signal.removeEventListener('abort', cancel); resolve({ verdict, code }); };
      const cancel = () => finish('UNVERIFIED', 'vault.save_outcome_unknown');
      const timer = setTimeout(() => finish('FAIL', 'vault.save_outcome_unknown'), 5000);
      signal.addEventListener('abort', cancel, { once: true });
      const saved = () => {
        if (completed) return; completed = true;
        if (settled) { if (this.cleanup(journal)) owner.busy = false; return; }
        let matches = false;
        try { matches = storage.getItem(journalKey) === journal && api.getData(alias) === value; } catch { /* Owned cleanup below. */ }
        if (!matches) { if (this.cleanup(journal)) owner.busy = false; finish('FAIL', 'vault.initial_read_mismatch'); return; }
        owner.busy = false; finish('UNVERIFIED', 'vault.prepared_restart_required');
      };
      const failed = () => { if (completed) return; completed = true; if (this.cleanup(journal)) owner.busy = false; finish('FAIL', 'vault.save_failed'); };
      try { api.saveData(alias.name, value, null, saved, failed); } catch { failed(); }
    });
  }
  private cleanup(expected: string): boolean {
    try {
      if (this.storage!.getItem(journalKey) !== expected) return false;
      try { this.api!.removeData(alias); } catch (error) { if (!notFound(error)) return false; }
      try { this.api!.getData(alias); return false; } catch (error) { if (!notFound(error)) return false; }
      this.storage!.removeItem(journalKey); return this.storage!.getItem(journalKey) === null;
    } catch { return false; }
  }
}
export function networkProtectedSessionProbe(): ProtectedSessionProbe | undefined {
  // Fixed package identity; no foreign aliases or account values are accepted.
  const platform = globalThis as unknown as { tizen?: { application?: { getCurrentApplication(): { appInfo?: { id?: string } } } } };
  try {
    if (platform.tizen?.application?.getCurrentApplication().appInfo?.id !== 'BiliNet001.Probe') return;
    return new ProtectedSessionProbe(probeKeyManagerApi(), globalThis.localStorage);
  } catch { return; }
}
