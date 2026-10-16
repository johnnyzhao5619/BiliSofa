import { test } from 'node:test';
import assert from 'node:assert/strict';
import { KeyManagerPersistenceProbe } from '../../apps/tv/src/platform/keymanager-persistence-probe.ts';
import type { ProbeKeyManagerApi } from '../../apps/tv/src/platform/keymanager-probe.ts';
function fixture() {
  const values = new Map<string, string>(), journal = new Map<string, string>();
  let callback: (() => void) | undefined, writes = 0;
  const storage = { getItem: (key: string) => journal.get(key) ?? null, setItem: (key: string, value: string) => { journal.set(key, value); }, removeItem: (key: string) => { journal.delete(key); } };
  const api: ProbeKeyManagerApi = {
    saveData(name, value, password, success) { assert.equal(password, null); assert.equal(name, 'bilisofa.w01.persistence.v1'); assert.match(value, /^synthetic-persistence-nonsecret-[a-f0-9]{32}$/); writes++; values.set(name, value); callback = success; },
    getData({ name }) { if (!values.has(name)) throw Object.assign(new Error(), { name: 'NotFoundError' }); return values.get(name); },
    removeData({ name }) { values.delete(name); },
  };
  return { api, storage, values, journal, saved: () => callback!(), writes: () => writes };
}
const signal = () => new AbortController().signal;
test('W01 synthetic persistence needs a fresh document and confirms both API and journal cleanup', async () => {
  const f = fixture(); f.values.set('unrelated', 'leave untouched');
  const first = new KeyManagerPersistenceProbe(f.api, f.storage), pending = first.run(signal());
  assert.equal(f.journal.size, 1); f.saved();
  assert.equal((await pending).code, 'keymanager.persistence_prepared_exit_reopen_required');
  assert.equal((await first.run(signal())).code, 'keymanager.persistence_restart_required'); assert.equal(f.writes(), 1);
  const second = new KeyManagerPersistenceProbe(f.api, f.storage);
  assert.deepEqual(await second.run(signal()), { verdict: 'PASS', code: 'keymanager.synthetic_document_restart_read_cleanup_only' });
  assert.deepEqual([...f.values], [['unrelated', 'leave untouched']]); assert.equal(f.journal.size, 0);
  f.saved(); assert.equal(f.journal.size, 0); // Duplicate completion must not resurrect/remove another run.
});
test('W01 persistence cancellation blocks another write and late completion cleans its owned bytes', async () => {
  const f = fixture(), controller = new AbortController(), probe = new KeyManagerPersistenceProbe(f.api, f.storage);
  const pending = probe.run(controller.signal); controller.abort();
  assert.equal((await pending).code, 'keymanager.persistence_cancelled_write_unknown');
  assert.equal((await probe.run(signal())).code, 'keymanager.persistence_write_unresolved');
  f.saved(); assert.equal(f.values.size, 0); assert.equal(f.journal.size, 0);
  const again = probe.run(signal()); f.saved(); assert.equal((await again).verdict, 'UNVERIFIED');
});
test('W01 unknown save can be queried after reconstruction; same-document retry remains blocked', async context => {
  context.mock.timers.enable({ apis: ['setTimeout'] });
  const f = fixture(), probe = new KeyManagerPersistenceProbe(f.api, f.storage), pending = probe.run(signal());
  context.mock.timers.tick(5001); assert.equal((await pending).code, 'keymanager.persistence_save_outcome_unknown');
  assert.equal((await probe.run(signal())).verdict, 'BLOCKED');
  const next = new KeyManagerPersistenceProbe(f.api, f.storage);
  assert.equal((await next.run(signal())).verdict, 'PASS'); // Fixture models completed write with lost callback.
  assert.equal(f.writes(), 1); assert.equal(f.values.size, 0);
});
test('W01 persistence refuses alias replacement and corrupt/arbitrary journal input', async () => {
  const f = fixture(); f.values.set('bilisofa.w01.persistence.v1', 'not ours');
  assert.equal((await new KeyManagerPersistenceProbe(f.api, f.storage).run(signal())).code, 'keymanager.persistence_alias_already_present');
  assert.equal(f.writes(), 0); assert.equal(f.values.size, 1);
  for (const raw of ['x'.repeat(257), '{', JSON.stringify({ version: 1, nonce: 'a'.repeat(32), boot: 'b'.repeat(32), alias: 'other-account' })]) {
    f.journal.set('bilisofa.probe.keymanager-persistence.v1', raw);
    assert.equal((await new KeyManagerPersistenceProbe(f.api, f.storage).run(signal())).code, 'keymanager.persistence_journal_invalid');
  }
  assert.equal(f.writes(), 0); assert.equal(f.values.size, 1);
});
test('W01 persistence reports missing/mismatch/cleanup failure without false PASS or deletion of mismatched bytes', async () => {
  for (const mode of ['missing', 'mismatch', 'cleanup'] as const) {
    const f = fixture(), pending = new KeyManagerPersistenceProbe(f.api, f.storage).run(signal()); f.saved(); await pending;
    if (mode === 'missing') f.values.clear();
    if (mode === 'mismatch') f.values.set('bilisofa.w01.persistence.v1', 'different');
    if (mode === 'cleanup') f.api.removeData = () => { throw new Error(); };
    const result = await new KeyManagerPersistenceProbe(f.api, f.storage).run(signal());
    assert.equal(result.verdict, 'FAIL');
    if (mode !== 'missing') { assert.equal(f.values.size, 1); assert.equal(f.journal.size, 1); }
  }
});
test('W01 denied journal stops before KeyManager write; changed journal blocks late cleanup ownership', async () => {
  const f = fixture(); f.storage.setItem = () => { throw new Error(); };
  assert.equal((await new KeyManagerPersistenceProbe(f.api, f.storage).run(signal())).code, 'keymanager.persistence_journal_write_failed'); assert.equal(f.writes(), 0);
  const changed = fixture(), controller = new AbortController(), probe = new KeyManagerPersistenceProbe(changed.api, changed.storage);
  const pending = probe.run(controller.signal); controller.abort(); await pending;
  changed.journal.set('bilisofa.probe.keymanager-persistence.v1', 'changed'); changed.saved();
  assert.equal(changed.values.size, 1); assert.equal((await probe.run(signal())).verdict, 'BLOCKED');
  assert.equal((await new KeyManagerPersistenceProbe(undefined, changed.storage).run(signal())).verdict, 'BLOCKED');
});
