import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseAccountRequest, parseAccountResult, parseAccountSession, parseQr } from '../../packages/contracts/src/account-probe.ts';
import { AccountVault } from '../../apps/tv/src/platform/account-vault.ts';
import { AccountProbeWorker } from '../../apps/tv/src/platform/account-probe-worker.ts';
import type { ProbeKeyManagerApi } from '../../apps/tv/src/platform/keymanager-probe.ts';
const scope = { accountId: 'w01-authorized-account', generation: 1, mediaSessionId: 'account-readonly', requestId: 'r1' };
const q = { version: 1 as const, operation: 'account-probe' as const, scope };
const key = 'a'.repeat(32), url = 'https://account.bilibili.com/h5/account-h5/auth/scan-web?navhide=1&qrcode_key=' + key + '&callback=https%3A%2F%2Fwww.bilibili.com%2F';
const cookie = '.bilibili.com\tTRUE\t/\tTRUE\t0\tSESSDATA\tsynthetic-session\n.bilibili.com\tTRUE\t/\tTRUE\t0\tbili_jct\t' + '0'.repeat(32) + '\n';
const session = () => ({ schema: 1 as const, uid: '123456', expiresAt: Date.now() + 300000, cookieLines: cookie });
const view = { name: 'fixture-account', uidSuffix: '3456', lastPlayTime: 0, progressCid: '0', restored: false };
function fixture() {
  const values = new Map<string, string>(); let saved!: () => void, writes = 0;
  const api: ProbeKeyManagerApi = { saveData(name, raw, password, success) { assert.equal(name, 'bilisofa.w01.account.v1'); assert.equal(password, null); values.set(name, raw); saved = success; writes++; }, getData({ name }) { if (!values.has(name)) throw { name: 'NotFoundError' }; return values.get(name); }, removeData({ name }) { values.delete(name); } };
  return { api, values, saved: () => saved(), writes: () => writes };
}
test('G3 official QR origin, route, generated key and callback are validated without HTML execution', () => {
  assert.equal(parseQr(url, key), url);
  const current = url.replace('https%3A%2F%2Fwww.bilibili.com%2F', 'close'); assert.equal(parseQr(current, key), current); assert.equal(parseQr(current + '&from=', key), current + '&from=');
  assert.throws(() => parseQr(current + '&from=outside', key));
  assert.throws(() => parseQr(current.replace('callback=close', 'callback=arbitrary'), key));
  for (const bad of [url.replace('https:', 'http:'), url.replace('account.bilibili.com', 'account.bilibili.com.attacker.invalid'), url + '&qrcode_key=' + key, url.replace('scan-web', 'other'), url.replace('www.bilibili.com', 'outside.invalid'), url.replace('qrcode_key=' + key, 'qrcode_key=' + 'b'.repeat(32)), url + '#fragment']) assert.throws(() => parseQr(bad, key));
});
test('G3 private session rejects destination broadening, duplicate credentials, arbitrary fields and secret-bearing diagnostic frames', () => {
  const value = session(); assert.deepEqual(parseAccountSession(value), value);
  for (const patch of [{ cookieLines: cookie.replace('.bilibili.com', '.com') }, { cookieLines: cookie + cookie }, { cookieLines: cookie.replace('\t/\t', '\t/outside\t') }, { cookieLines: cookie.replace('SESSDATA', 'OTHER') }, { rawUrl: url }]) assert.throws(() => parseAccountSession({ ...session(), ...patch }));
  assert.deepEqual(parseAccountRequest(q), q);
  assert.throws(() => parseAccountRequest({ ...q, scope: { ...scope, accountId: 'guest' } }));
  assert.throws(() => parseAccountRequest({ ...q, url }));
  assert.throws(() => parseAccountResult({ ...q, kind: 'closed', code: 'account.readonly_saved_closed', session: session() }));
  for (const code of ['account.http_412_op0_closed','account.http_412_op5_closed','account.transport_c60_op1_closed','account.invalid_op4_closed']) assert.equal(parseAccountResult({ ...q, kind: 'closed', code }).kind, 'closed');
  for (const code of ['account.transport_c128_op1_closed','account.http_200_op6_closed']) assert.throws(() => parseAccountResult({ ...q, kind: 'closed', code }));
});
test('G3 only the fixed KeyManager slot receives private state; readback, restart and explicit delete use no ordinary storage', async () => {
  const f = fixture(), vault = new AccountVault(f.api), value = session(), pending = vault.save(value, new AbortController().signal); f.saved(); await pending;
  assert.deepEqual(new AccountVault(f.api).load(), value);
  await assert.rejects(vault.save(value, new AbortController().signal), { code: 'permission' }); assert.equal(f.writes(), 1);
  vault.clear(); assert.equal(vault.load(), undefined); assert.equal(f.values.size, 0);
});
test('G3 save cancellation blocks all owners until late own cleanup; unknown is never overwritten', async () => {
  const f = fixture(), vault = new AccountVault(f.api), c = new AbortController();
  const pending = vault.save(session(), c.signal), rejected = assert.rejects(pending, { code: 'cancelled' }); c.abort(); await rejected;
  assert.throws(() => new AccountVault(f.api).load(), { code: 'unknown' }); assert.throws(() => vault.clear(), { code: 'unknown' });
  f.saved(); assert.equal(vault.load(), undefined); assert.equal(f.values.size, 0);
});
test('G3 expired/corrupt vault fails closed and can be explicitly removed without enumerating other aliases', async () => {
  const f = fixture(), vault = new AccountVault(f.api); f.values.set('bilisofa.w01.account.v1', '{"raw":"invalid"}'); f.values.set('unrelated', 'retain');
  assert.throws(() => vault.load(), { code: 'invalid' }); vault.clear(); assert.equal(f.values.get('unrelated'), 'retain');
  f.values.set('bilisofa.w01.account.v1', JSON.stringify({ ...session(), expiresAt: Date.now() - 1 })); assert.throws(() => vault.load(), { code: 'login' });
});
test('G3 private worker save ACK follows KeyManager readback; UI sees only sanitized display and cleanup result', async () => {
  const previous = globalThis.Worker, f = fixture(), displays: unknown[] = [], sent: unknown[] = []; let instance!: Mock;
  class Mock { onmessage?: (e: { data: unknown }) => void; onerror?: () => void; constructor() { instance = this; } postMessage(v: unknown) { sent.push(v); } terminate() {} emit(v: Record<string, unknown>) { this.onmessage?.({ data: { ...q, ...v } }); } }
  globalThis.Worker = Mock as unknown as typeof Worker;
  const worker = new AccountProbeWorker(new AccountVault(f.api));
  try {
    const pending = worker.run('login', scope, new AbortController().signal, v => displays.push(v)); await new Promise<void>(r => setImmediate(r));
    instance.emit({ kind: 'qr', url }); instance.emit({ kind: 'private-session', session: session(), view });
    assert.equal(f.writes(), 1); assert.equal(sent.length, 1); assert.equal(displays.length, 1);
    f.saved(); await new Promise<void>(r => setImmediate(r)); assert.equal(sent.length, 2); assert.equal((sent[1] as { control: string }).control, 'saved');
    instance.emit({ kind: 'closed', code: 'account.readonly_saved_closed' }); assert.equal(await pending, 'account.readonly_saved_closed');
    assert.ok(!JSON.stringify(displays).includes('synthetic-session')); assert.ok(!JSON.stringify(displays).includes('cookieLines'));
  } finally { await worker.dispose().catch(() => {}); globalThis.Worker = previous; }
});
test('G3 forged terminal, stale owner and repeated QR fail without private persistence', async () => {
  const previous = globalThis.Worker;
  try {
    for (const mode of ['terminal', 'scope', 'qr']) {
      let instance!: { onmessage?: (e: { data: unknown }) => void };
      class Mock { onmessage?: (e: { data: unknown }) => void; constructor() { instance = this; } postMessage() {} terminate() {} }
      globalThis.Worker = Mock as unknown as typeof Worker; const f = fixture(), worker = new AccountProbeWorker(new AccountVault(f.api));
      const pending = worker.run('login', scope, new AbortController().signal, () => {}), rejected = assert.rejects(pending, { code: 'unknown' }); await new Promise<void>(r => setImmediate(r));
      if (mode === 'terminal') instance.onmessage?.({ data: { ...q, kind: 'closed', code: 'account.readonly_saved_closed' } });
      if (mode === 'scope') instance.onmessage?.({ data: { ...q, scope: { ...scope, generation: 0 }, kind: 'qr', url } });
      if (mode === 'qr') { instance.onmessage?.({ data: { ...q, kind: 'qr', url } }); instance.onmessage?.({ data: { ...q, kind: 'qr', url } }); }
      await rejected; assert.equal(f.writes(), 0); await worker.dispose().catch(() => {});
    }
  } finally { globalThis.Worker = previous; }
});
