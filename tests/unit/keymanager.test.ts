import { test } from 'node:test';
import assert from 'node:assert/strict';
import { probeKeyManager, type ProbeKeyManagerApi } from '../../apps/tv/src/platform/keymanager-probe.ts';
function fixture() {
  const values = new Map<string, string>(), removed: string[] = [];
  let saved: (() => void) | undefined;
  const api: ProbeKeyManagerApi = {
    saveData(name, value, password, success) { assert.equal(password, null); assert.match(name, /^bilisofa\.w01\.synthetic\.[a-f0-9]{32}$/); values.set(name, value); saved = success; },
    getData({ name }) { if (!values.has(name)) throw Object.assign(new Error(), { name: 'NotFoundError' }); return values.get(name); },
    removeData({ name }) { removed.push(name); values.delete(name); },
  };
  return { api, values, removed, saved: () => saved!() };
}
test('W01 KeyManager synthetic round trip confirms removal without touching unrelated aliases', async () => {
  const f = fixture(); f.values.set('synthetic-unrelated-account', 'untouched');
  const pending = probeKeyManager(f.api, new AbortController().signal); f.saved();
  assert.deepEqual(await pending, { verdict: 'PASS', code: 'keymanager.synthetic_roundtrip_cleanup_only' });
  assert.deepEqual([...f.values], [['synthetic-unrelated-account', 'untouched']]); assert.equal(f.removed.length, 1);
  f.saved(); assert.equal(f.removed.length, 1); // Duplicate vendor callback cannot delete a new owner.
});
test('W01 KeyManager cancellation rejects stale ownership, blocks reuse, and cleans a late successful write', async () => {
  const f = fixture(), controller = new AbortController();
  const pending = probeKeyManager(f.api, controller.signal); controller.abort();
  assert.equal((await pending).code, 'keymanager.cancelled_write_outcome_unknown');
  assert.equal((await probeKeyManager(f.api, new AbortController().signal)).verdict, 'BLOCKED');
  f.saved(); assert.equal(f.values.size, 0);
  const next = probeKeyManager(f.api, new AbortController().signal); f.saved(); assert.equal((await next).verdict, 'PASS');
});
test('W01 KeyManager missing API, readback mismatch and unknown cleanup never claim protected storage', async () => {
  assert.equal((await probeKeyManager(undefined, new AbortController().signal)).verdict, 'BLOCKED');
  const mismatch = fixture(); mismatch.api.getData = () => 'different-synthetic';
  const pending = probeKeyManager(mismatch.api, new AbortController().signal); mismatch.saved();
  assert.equal((await pending).code, 'keymanager.cleanup_unconfirmed');
  assert.equal((await probeKeyManager(mismatch.api, new AbortController().signal)).verdict, 'BLOCKED');
  const unequal = fixture(), read = unequal.api.getData;
  unequal.api.getData = alias => { const value = read(alias); return value === undefined ? value : 'different-synthetic'; };
  const unequalRead = probeKeyManager(unequal.api, new AbortController().signal); unequal.saved();
  assert.equal((await unequalRead).code, 'keymanager.readback_mismatch');
  const denied = fixture(); denied.api.saveData = (_name, _value, _password, _success, failure) => failure();
  assert.equal((await probeKeyManager(denied.api, new AbortController().signal)).code, 'keymanager.save_failed_outcome_unverified');
  const failed = fixture(); failed.api.removeData = () => { throw new Error('synthetic failure'); };
  const cleanup = probeKeyManager(failed.api, new AbortController().signal); failed.saved(); assert.equal((await cleanup).verdict, 'FAIL');
});
test('W01 KeyManager deadline leaves writes unknown; late completion still cleans only the owned alias', async context => {
  context.mock.timers.enable({ apis: ['setTimeout'] });
  const f = fixture(), pending = probeKeyManager(f.api, new AbortController().signal);
  context.mock.timers.tick(5001); assert.equal((await pending).code, 'keymanager.save_outcome_unknown');
  assert.equal((await probeKeyManager(f.api, new AbortController().signal)).verdict, 'BLOCKED');
  f.saved(); assert.equal(f.values.size, 0);
});
