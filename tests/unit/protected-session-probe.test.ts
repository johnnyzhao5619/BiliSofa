import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ProtectedSessionProbe } from '../../apps/tv/src/platform/protected-session-probe.ts';
import { probeForeignSyntheticRead } from '../../apps/tv/src/platform/keymanager-isolation-probe.ts';
import type { ProbeKeyManagerApi } from '../../apps/tv/src/platform/keymanager-probe.ts';
function fixture() {
  const data = new Map<string, string>(), journal = new Map<string, string>();
  let saved!: () => void, failed!: () => void, writes = 0;
  const api: ProbeKeyManagerApi = {
    saveData(name, value, password, success, error) { assert.equal(password, null); assert.equal(name, 'bilisofa.w01.https-vault.v1'); data.set(name, value); saved = success; failed = error; writes++; },
    getData({ name }) { if (!data.has(name)) throw { name: 'NotFoundError' }; return data.get(name); },
    removeData({ name }) { data.delete(name); },
  };
  const storage = { getItem: (key: string) => journal.get(key) ?? null, setItem: (key: string, v: string) => { journal.set(key, v); }, removeItem: (key: string) => { journal.delete(key); } };
  return { api, storage, data, journal, saved: () => saved(), failed: () => failed(), writes: () => writes };
}
const signal = () => new AbortController().signal;
const next = () => new Promise<void>(resolve => setImmediate(resolve));
async function waitWrite(f: ReturnType<typeof fixture>) { for (let i = 0; i < 50 && !f.writes(); i++) await next(); assert.equal(f.writes(), 1); }
test('G2 private random synthetic value stays out of journal, survives new document, is verified and deleted', async () => {
  const f = fixture(), first = new ProtectedSessionProbe(f.api, f.storage), pending = first.run(signal()); await waitWrite(f);
  const secret = [...f.data.values()][0]!; assert.match(secret, /^synthetic-secret-[0-9a-f]{64}$/);
  assert.ok(!JSON.stringify([...f.journal.values()]).includes(secret)); assert.ok(!JSON.stringify([...f.journal.values()]).includes(secret.slice(17)));
  f.saved(); assert.equal((await pending).code, 'vault.prepared_restart_required');
  assert.equal((await first.run(signal())).code, 'vault.restart_required'); assert.equal(f.writes(), 1);
  assert.deepEqual(await new ProtectedSessionProbe(f.api, f.storage).run(signal()), { verdict: 'PASS', code: 'vault.restart_digest_read_deleted' });
  assert.equal(f.data.size, 0); assert.equal(f.journal.size, 0);
});
test('G2 cancelled unknown save blocks a second writer until late owned cleanup, never leaks value', async () => {
  const f = fixture(), c = new AbortController(), probe = new ProtectedSessionProbe(f.api, f.storage), pending = probe.run(c.signal); await waitWrite(f); c.abort();
  assert.equal((await pending).code, 'vault.save_outcome_unknown');
  assert.equal((await new ProtectedSessionProbe(f.api, f.storage).run(signal())).code, 'vault.write_unresolved');
  f.saved(); assert.equal(f.data.size, 0); assert.equal(f.journal.size, 0);
});
test('G2 unknown save is not overwritten; explicit save error cleans owned data', async context => {
  const f = fixture(); context.mock.timers.enable({ apis: ['setTimeout'] });
  const pending = new ProtectedSessionProbe(f.api, f.storage).run(signal()); await waitWrite(f); context.mock.timers.tick(5001);
  assert.equal((await pending).code, 'vault.save_outcome_unknown');
  assert.equal((await new ProtectedSessionProbe(f.api, f.storage).run(signal())).code, 'vault.write_unresolved'); f.failed(); assert.equal(f.data.size, 0);
});
test('G2 existing alias and damaged journal fail closed without save/delete/enumeration', async () => {
  const f = fixture(); f.data.set('bilisofa.w01.https-vault.v1', 'unrelated-value');
  assert.equal((await new ProtectedSessionProbe(f.api, f.storage).run(signal())).code, 'vault.alias_already_present'); assert.equal(f.writes(), 0);
  f.journal.set('bilisofa.probe.https-vault.v1', '{"schema":1,"raw":"no"}');
  assert.equal((await new ProtectedSessionProbe(f.api, f.storage).run(signal())).code, 'vault.journal_invalid'); assert.equal(f.data.size, 1);
});
test('G2 corrupted secret cannot be restored; changed journal cannot authorize deletion', async () => {
  for (const mode of ['data', 'journal', 'remove']) {
    const f = fixture(), pending = new ProtectedSessionProbe(f.api, f.storage).run(signal()); await waitWrite(f); f.saved(); await pending;
    if (mode === 'data') f.data.set('bilisofa.w01.https-vault.v1', 'synthetic-secret-' + '0'.repeat(64));
    if (mode === 'journal') f.journal.set('bilisofa.probe.https-vault.v1', 'changed');
    if (mode === 'remove') f.api.removeData = () => { throw new Error(); };
    assert.notEqual((await new ProtectedSessionProbe(f.api, f.storage).run(signal())).verdict, 'PASS'); assert.equal(f.data.size, 1);
  }
});
test('G2 failure to persist metadata or cancelled owner never stores a secret', async () => {
  const f = fixture(); f.storage.setItem = () => { throw new Error(); };
  assert.equal((await new ProtectedSessionProbe(f.api, f.storage).run(signal())).code, 'vault.journal_write_failed'); assert.equal(f.writes(), 0);
  const c = new AbortController(); c.abort(); assert.equal((await new ProtectedSessionProbe(f.api, f.storage).run(c.signal)).code, 'vault.cancelled_before_write');
});
test('G2 cross-package observer targets only the new synthetic owner alias and redacts returned data', () => {
  const r = probeForeignSyntheticRead({ getData(alias) { assert.deepEqual(alias, { name: 'bilisofa.w01.https-vault.v1', packageId: 'BiliNet001' }); return 'must-not-export'; } }, 'https-vault');
  assert.equal(r.verdict, 'FAIL'); assert.ok(!JSON.stringify(r).includes('must-not-export'));
});
