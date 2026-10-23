import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DomainError } from '../../packages/contracts/src/index.ts';
import { loginQr, parseIdentityEvent, parseIdentityRequest, type LoginDisplay } from '../../packages/contracts/src/identity.ts';
import { LoginCoordinator } from '../../packages/bili-client/src/login.ts';
import { IdentityWorkerClient, type IdentityPort } from '../../apps/tv/src/platform/identity-worker.ts';
import type { AccountRepository, PrivateAccount } from '../../packages/contracts/src/private-account.ts';
const value: PrivateAccount = { schema: 1, id: 'bili_101', uid: '101', name: '合成账号', expiresAt: Date.now() + 300000, cookieLines: '.bilibili.com\tTRUE\t/\tTRUE\t0\tSESSDATA\tsynthetic\n.bilibili.com\tTRUE\t/\tTRUE\t0\tbili_jct\tsynthetic-csrf\n' };
const scope = { accountId: 'guest', generation: 1, mediaSessionId: 'identity', requestId: 'login-1' };
const qr = 'https://account.bilibili.com/h5/account-h5/auth/scan-web?navhide=1&qrcode_key=' + 'a'.repeat(32);
function deferred<T>() { let resolve!: (v: T) => void; const promise = new Promise<T>(yes => { resolve = yes; }); return { promise, resolve }; }
function client() {
  const sent: Record<string, unknown>[] = []; let terminations = 0;
  const port: IdentityPort = { onmessage: null, onerror: null, postMessage(v) { sent.push(v as Record<string, unknown>); }, terminate() { terminations++; } };
  return { client: new IdentityWorkerClient(() => port, 20), port, sent, terminations: () => terminations, emit(data: Record<string, unknown>) { port.onmessage?.({ data: { version: 1, operation: 'identity', scope: sent[0]!.scope, ...data } } as MessageEvent); } };
}
function repository(): AccountRepository & { values: Map<string, PrivateAccount> } {
  const values = new Map<string, PrivateAccount>();
  return { values, list: async () => [...values.values()].map(({ cookieLines: _cookie, schema: _schema, ...summary }) => summary), read: async id => values.get(id), add: async v => { if (values.has(v.id)) throw new DomainError('permission'); values.set(v.id, v); }, remove: async id => { values.delete(id); } };
}
test('W02 identity IPC rejects URL/native-operation/account injection and nonmatching restored account', () => {
  assert.equal(parseIdentityRequest({ version: 1, operation: 'identity', scope, mode: 'login' }).mode, 'login');
  for (const extra of [{ url: 'https://outside.invalid' }, { nativeOperation: 4 }, { account: value }]) assert.throws(() => parseIdentityRequest({ version: 1, operation: 'identity', scope, mode: 'login', ...extra }), { code: 'invalid' });
  assert.throws(() => parseIdentityRequest({ version: 1, operation: 'identity', scope: { ...scope, accountId: 'bili_202' }, mode: 'verify', account: value }), { code: 'invalid' });
  assert.throws(() => parseIdentityEvent({ version: 1, operation: 'identity', scope, kind: 'authenticated', account: value, closed: false }), { code: 'invalid' });
});
test('W02 QR binds key and approved callback, not arbitrary outside content', () => {
  assert.equal(loginQr(qr, 'a'.repeat(32)), qr); for (const bad of [qr.replace('account.bilibili.com', 'outside.invalid'), qr + '&callback=https://outside.invalid', qr + '&qrcode_key=' + 'b'.repeat(32)]) assert.throws(() => loginQr(bad), { code: 'invalid' }); assert.throws(() => loginQr(qr, 'b'.repeat(32)), { code: 'invalid' });
});
test('W02 login client releases private result only in a validated closed terminal after QR', async () => {
  const f = client(), displays: LoginDisplay[] = [], pending = f.client.login(new AbortController().signal, event => displays.push(event));
  f.emit({ kind: 'qr', url: qr }); f.emit({ kind: 'confirm' }); f.emit({ kind: 'authenticated', closed: true, account: value });
  assert.deepEqual(await pending, value); assert.deepEqual(displays.map(x => x.kind), ['qr', 'confirm']); assert.equal(JSON.stringify(displays).includes('cookieLines'), false); assert.equal(f.terminations(), 1); assert.deepEqual(await f.client.close(), { closed: true });
});
test('W02 client rejects unexpected credentials before QR and refuses successful closure spoofing', async () => {
  const f = client(), pending = f.client.login(new AbortController().signal, () => {}); f.emit({ kind: 'authenticated', closed: true, account: value }); await assert.rejects(pending, { code: 'unknown' }); assert.deepEqual(await f.client.close(), { closed: false });
});
test('W02 verified account must match UID and expected worker scope', async () => {
  const f = client(), pending = f.client.verify(value, new AbortController().signal); f.emit({ kind: 'verified', closed: true, identity: { uid: '202', name: 'wrong' } }); await assert.rejects(pending, { code: 'unknown' });
  const other = client(), read = other.client.verify(value, new AbortController().signal); other.emit({ scope: { ...scope, accountId: value.id, requestId: 'unowned' }, kind: 'verified', closed: true, identity: { uid: '101', name: 'wrong-scope' } }); await assert.rejects(read, { code: 'unknown' });
});
test('W02 stop cancels immediately but close awaits native ACK and is shared', async () => {
  const f = client(), abort = new AbortController(), pending = f.client.login(abort.signal, () => {}); abort.abort(); await assert.rejects(pending, { code: 'cancelled' });
  const close = f.client.close(); assert.equal(close, f.client.close()); assert.equal(f.sent[1]?.control, 'stop'); assert.equal(f.terminations(), 0);
  f.emit({ kind: 'closed', closed: true, code: 'cancelled' }); assert.deepEqual(await close, { closed: true }); assert.equal(f.terminations(), 1);
});
test('W02 missing close ACK stays unconfirmed after late terminal and forbids reuse', async () => {
  const f = client(), pending = f.client.login(new AbortController().signal, () => {}), rejected = assert.rejects(pending, { code: 'cancelled' });
  const close = f.client.close(); await rejected; assert.deepEqual(await close, { closed: false }); f.emit({ kind: 'closed', closed: true, code: 'cancelled' }); assert.deepEqual(await f.client.close(), { closed: false }); await assert.rejects(f.client.login(new AbortController().signal, () => {}), { code: 'unknown' });
});
test('W02 native error is sanitized and a queued old worker error cannot corrupt completed cleanup', async () => {
  const f = client(), pending = f.client.verify(value, new AbortController().signal); const lateError = f.port.onerror; f.emit({ kind: 'verified', closed: true, identity: { uid: '101', name: 'fixture' } }); await pending; lateError?.({} as ErrorEvent); assert.deepEqual(await f.client.close(), { closed: true });
  const bad = client(), read = bad.client.verify(value, new AbortController().signal); bad.port.onerror?.({ message: 'private-raw-error' } as ErrorEvent); await assert.rejects(read, e => e instanceof DomainError && e.message === 'unknown'); assert.deepEqual(await bad.client.close(), { closed: false });
});
test('W02 preclosed client never starts a Worker; duplicate confirmation fails closed', async () => {
  const closed = client(); await closed.client.close(); await assert.rejects(closed.client.login(new AbortController().signal, () => {}), { code: 'unknown' }); assert.equal(closed.sent.length, 0);
  const f = client(), pending = f.client.login(new AbortController().signal, () => {}); f.emit({ kind: 'qr', url: qr }); f.emit({ kind: 'confirm' }); f.emit({ kind: 'confirm' }); await assert.rejects(pending, { code: 'unknown' });
});
test('W02 QR coordinator saves private bytes without exposing them through summary/display', async () => {
  const repo = repository(); let closes = 0;
  const login = new LoginCoordinator(repo, () => ({ login: async () => value, close: async () => { closes++; return { closed: true }; } }));
  const summary = await login.login(new AbortController().signal, () => {}); assert.equal(summary.id, value.id); assert.equal('cookieLines' in summary, false); assert.deepEqual(repo.values.get(value.id), value); assert.equal(closes, 1);
});
test('W02 cancelled QR completion cannot save or become a successful late login', async () => {
  const repo = repository(), result = deferred<PrivateAccount>(), abort = new AbortController();
  const login = new LoginCoordinator(repo, () => ({ login: () => result.promise, close: async () => ({ closed: true }) }));
  const pending = login.login(abort.signal, () => {}); await new Promise(yes => setTimeout(yes, 0)); abort.abort(); result.resolve(value); await assert.rejects(pending, { code: 'cancelled' }); assert.equal(repo.values.size, 0);
});
test('W02 unknown protected save blocks next QR exchange before another request is created', async () => {
  const repo = repository(); let unknown = false, created = 0;
  repo.add = async () => { unknown = true; throw new DomainError('unknown'); }; repo.list = async () => { if (unknown) throw new DomainError('unknown'); return []; };
  const login = new LoginCoordinator(repo, () => { created++; return { login: async () => value, close: async () => ({ closed: true }) }; });
  await assert.rejects(login.login(new AbortController().signal, () => {}), { code: 'unknown' }); await assert.rejects(login.login(new AbortController().signal, () => {}), { code: 'unknown' }); assert.equal(created, 1);
});
test('W02 successful save with an unconfirmed exchange close cannot report a successful login', async () => {
  const repo = repository(), login = new LoginCoordinator(repo, () => ({ login: async () => value, close: async () => ({ closed: false }) }));
  await assert.rejects(login.login(new AbortController().signal, () => {}), { code: 'unknown' }); assert.equal(repo.values.size, 1); await assert.rejects(login.login(new AbortController().signal, () => {}), { code: 'unknown' });
});
test('W02 unknown protected save cannot masquerade as a fully closed login owner', async () => {
  const repo = repository(); repo.add = async () => { throw new DomainError('unknown'); };
  const login = new LoginCoordinator(repo, () => ({ login: async () => value, close: async () => ({ closed: true }) }));
  await assert.rejects(login.login(new AbortController().signal, () => {}), { code: 'unknown' }); assert.deepEqual(await login.close(), { closed: false });
});
test('W02 close during protected-store preflight prevents a late QR Worker from starting', async () => {
  const repo = repository(), listed = deferred<[]>(); let creates = 0; repo.list = () => listed.promise;
  const login = new LoginCoordinator(repo, () => { creates++; return { login: async () => value, close: async () => ({ closed: true }) }; });
  const pending = login.login(new AbortController().signal, () => {}); await Promise.resolve(); await login.close(); listed.resolve([]);
  await assert.rejects(pending, { code: 'cancelled' }); assert.equal(creates, 0);
});
