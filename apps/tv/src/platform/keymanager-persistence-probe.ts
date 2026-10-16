import type { KeyManagerProbeResult, ProbeKeyManagerApi } from './keymanager-probe.ts';

type JournalStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
const journalKey = 'bilisofa.probe.keymanager-persistence.v1';
const alias = { name: 'bilisofa.w01.persistence.v1' };
const notFound = (error: unknown) => !!error && typeof error === 'object' && 'name' in error && error.name === 'NotFoundError';
const nonce = () => Array.from(crypto.getRandomValues(new Uint8Array(16)), byte => byte.toString(16).padStart(2, '0')).join('');
interface Journal { version: 1; nonce: string; boot: string; }
function parseJournal(raw: string): Journal | undefined {
  if (raw.length > 256) return;
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== 'object') return;
    const v = value as Record<string, unknown>;
    if (Object.keys(v).length !== 3 || v.version !== 1 || typeof v.nonce !== 'string' || !/^[a-f0-9]{32}$/.test(v.nonce) || typeof v.boot !== 'string' || !/^[a-f0-9]{32}$/.test(v.boot)) return;
    return { version: 1, nonce: v.nonce, boot: v.boot };
  } catch { return; }
}
// Only a fixed probe alias and generated NONSECRET bytes. The ordinary storage journal
// intentionally contains the synthetic expectation, never credentials or arbitrary aliases.
// A fresh instance represents a new app document; Home/resume retains the same instance.
export class KeyManagerPersistenceProbe {
  private readonly boot: string;
  private busy = false;
  constructor(private readonly api: ProbeKeyManagerApi | undefined, private readonly storage: JournalStorage | undefined) {
    try { this.boot = nonce(); } catch { this.boot = ''; }
  }
  async run(signal: AbortSignal): Promise<KeyManagerProbeResult> {
    const api = this.api, storage = this.storage;
    if (!api || !storage || !this.boot) return { verdict: 'BLOCKED', code: 'keymanager.persistence_dependencies_unavailable' };
    if (this.busy) return { verdict: 'BLOCKED', code: 'keymanager.persistence_write_unresolved' };
    if (signal.aborted) return { verdict: 'UNVERIFIED', code: 'keymanager.persistence_cancelled_before_write' };
    let raw: string | null;
    try { raw = storage.getItem(journalKey); } catch { return { verdict: 'BLOCKED', code: 'keymanager.persistence_journal_unavailable' }; }
    if (raw !== null) {
      const journal = parseJournal(raw);
      if (!journal) return { verdict: 'BLOCKED', code: 'keymanager.persistence_journal_invalid' };
      if (journal.boot === this.boot) return { verdict: 'UNVERIFIED', code: 'keymanager.persistence_restart_required' };
      let value: unknown;
      try { value = api.getData(alias); }
      catch (error) {
        if (notFound(error)) { this.clearJournal(raw); return { verdict: 'FAIL', code: 'keymanager.persistence_value_missing' }; }
        return { verdict: 'FAIL', code: 'keymanager.persistence_read_failed' };
      }
      if (value !== `synthetic-persistence-nonsecret-${journal.nonce}`) return { verdict: 'FAIL', code: 'keymanager.persistence_value_mismatch' };
      if (!this.cleanup(raw)) return { verdict: 'FAIL', code: 'keymanager.persistence_cleanup_unconfirmed' };
      return { verdict: 'PASS', code: 'keymanager.synthetic_document_restart_read_cleanup_only' };
    }
    // Refuse replacement: saveData's duplicate-name semantics are not assumed.
    try { api.getData(alias); return { verdict: 'BLOCKED', code: 'keymanager.persistence_alias_already_present' }; }
    catch (error) { if (!notFound(error)) return { verdict: 'BLOCKED', code: 'keymanager.persistence_alias_preflight_failed' }; }
    let journal: string, value: string;
    try {
      const id = nonce(); value = `synthetic-persistence-nonsecret-${id}`;
      journal = JSON.stringify({ version: 1, nonce: id, boot: this.boot });
      storage.setItem(journalKey, journal);
      if (storage.getItem(journalKey) !== journal) throw new Error();
    } catch { return { verdict: 'BLOCKED', code: 'keymanager.persistence_journal_write_failed' }; }
    this.busy = true;
    return new Promise(resolve => {
      let settled = false, completed = false;
      const finish = (verdict: KeyManagerProbeResult['verdict'], code: string) => {
        if (settled) return;
        settled = true; clearTimeout(timer); signal.removeEventListener('abort', cancel); resolve({ verdict, code });
      };
      const cancel = () => finish('UNVERIFIED', 'keymanager.persistence_cancelled_write_unknown');
      const timer = setTimeout(() => finish('FAIL', 'keymanager.persistence_save_outcome_unknown'), 5000);
      signal.addEventListener('abort', cancel, { once: true });
      const saved = () => {
        if (completed) return; completed = true;
        if (settled) { if (this.cleanup(journal)) this.busy = false; return; }
        let matches = false;
        try { matches = api.getData(alias) === value; } catch { /* Resolve with cleanup evidence below. */ }
        if (!matches) {
          if (this.cleanup(journal)) this.busy = false;
          finish('FAIL', 'keymanager.persistence_initial_read_mismatch'); return;
        }
        this.busy = false;
        finish('UNVERIFIED', 'keymanager.persistence_prepared_exit_reopen_required');
      };
      const failed = () => {
        if (completed) return; completed = true;
        if (this.cleanup(journal)) this.busy = false;
        finish('FAIL', 'keymanager.persistence_save_failed');
      };
      try { api.saveData(alias.name, value, null, saved, failed); } catch { failed(); }
    });
  }
  private clearJournal(expected: string): boolean {
    try {
      if (this.storage!.getItem(journalKey) !== expected) return false;
      this.storage!.removeItem(journalKey); return this.storage!.getItem(journalKey) === null;
    } catch { return false; }
  }
  private cleanup(journal: string): boolean {
    // A changed journal is an ownership conflict. Never remove its data.
    try { if (this.storage!.getItem(journalKey) !== journal) return false; } catch { return false; }
    try { this.api!.removeData(alias); } catch (error) { if (!notFound(error)) return false; }
    try { this.api!.getData(alias); return false; } catch (error) { if (!notFound(error)) return false; }
    return this.clearJournal(journal);
  }
}
