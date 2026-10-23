import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DomainError } from '../../packages/contracts/src/index.ts';
import { accountId, parsePrivateAccount, type PrivateAccount, type AccountRuntime, type AccountRepository } from '../../packages/contracts/src/private-account.ts';
import { ProtectedAccountStore } from '../../apps/tv/src/platform/private-account-store.ts';
import type { KeyManagerDataApi } from '../../apps/tv/src/platform/keymanager-data-api.ts';
import { AccountCoordinator } from '../../packages/bili-client/src/accounts.ts';
import { SessionManager } from '../../packages/bili-client/src/session.ts';
const time = 100000;
function account(uid = '101'): PrivateAccount { return { schema: 1, id: accountId(uid), uid, name: '合成账号 ' + uid, expiresAt: time + 50000, cookieLines: `.bilibili.com\tTRUE\t/\tTRUE\t999999\tSESSDATA\tsynthetic-only-${uid}\n.bilibili.com\tTRUE\t/\tTRUE\t999999\tbili_jct\tsynthetic-csrf-${uid}\n` }; }
function deferred<T>() { let resolve!: (v: T) => void, reject!: (e: unknown) => void; const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; }
function fakeStore(auto = true) {
  const values = new Map<string, string>(), calls: string[] = [];
  let saved: (() => void) | undefined, failed: (() => void) | undefined;
  const api: KeyManagerDataApi = {
    getData({ name }) { calls.push('get:' + name); if (!values.has(name)) throw { name: 'NotFoundError' }; return values.get(name); },
    removeData({ name }) { calls.push('remove:' + name); values.delete(name); },
    saveData(name, raw, password, success, error) { assert.equal(password, null); calls.push('save:' + name); saved = () => { values.set(name, raw); success(); }; failed = error; if (auto) saved(); },
  };
  return { api, values, calls, save: () => saved?.(), fail: () => failed?.(), store: new ProtectedAccountStore(api, 20) };
}
function coordinator(options: { verify?: (value: PrivateAccount, signal: AbortSignal) => Promise<{ uid: string; name: string }>; close?: () => Promise<{ closed: boolean }>; invalidate?: () => Promise<{ closed: boolean }>; clock?: () => number } = {}) {
  const values = new Map([['bili_101', account()], ['bili_202', account('202')]]), events: string[] = [];
  const repository: AccountRepository = { list: async () => [...values.values()], read: async id => values.get(id), add: async value => { values.set(value.id, value); }, remove: async id => { events.push('remove:' + id); values.delete(id); } };
  const runtimes: AccountRuntime[] = [];
  const accounts = new AccountCoordinator(repository, value => {
    events.push('create:' + value.id);
    const runtime = { verify: async (signal: AbortSignal) => options.verify ? options.verify(value, signal) : { uid: value.uid, name: '已核对' }, close: async () => { events.push('close:' + value.id); return options.close ? options.close() : { closed: true }; } };
    runtimes.push(runtime); return runtime;
  }, { invalidate: () => { events.push('invalidate'); return options.invalidate ? options.invalidate() : Promise.resolve({ closed: true }); } }, options.clock ?? (() => time), 30);
  return { accounts, values, events, runtimes, repository };
}
test('W02 private session DTO binds identity, secure cookies and bounded fields without arbitrary destinations', () => {
  assert.equal(parsePrivateAccount(account()).id, 'bili_101');
  for (const bad of [{ ...account(), id: 'bili_202' }, { ...account(), token: 'not-allowed' }, { ...account(), name: '\u0000' }, { ...account(), cookieLines: account().cookieLines.replace(/\tTRUE\t999999/g, '\tFALSE\t999999') }, { ...account(), cookieLines: account().cookieLines.replace(/\.bilibili.com/g, 'attacker.invalid') }, { ...account(), cookieLines: account().cookieLines + '.bilibili.com\tTRUE\t/\tTRUE\t999999\tDedeUserID\t202\n' }]) assert.throws(() => parsePrivateAccount(bad), { code: 'invalid' });
});
test('W02 protected slots isolate account bytes and list only summaries without touching W01', async () => {
  const f = fakeStore(); await f.store.add(account(), new AbortController().signal); await f.store.add(account('202'), new AbortController().signal);
  const list = await f.store.list(); assert.equal(list.length, 2); assert.equal('cookieLines' in list[0]!, false);
  assert.equal((await f.store.read('bili_202'))?.cookieLines, account('202').cookieLines);
  list[0]!.name = 'mutated'; assert.notEqual((await f.store.list())[0]?.name, 'mutated');
  await f.store.remove('bili_101'); assert.equal(await f.store.read('bili_101'), undefined); assert.equal((await f.store.list()).length, 1);
  assert.equal(f.calls.some(x => !/^\w+:bilisofa\.session\.(?:v1\.slot[0-7]|v2\.slot[0-7]\.bank[01])$/.test(x)), false);
});
test('W02 duplicate import and ninth account cannot overwrite protected data', async () => {
  const f = fakeStore(); for (let i = 101; i <= 108; i++) await f.store.add(account(String(i)), new AbortController().signal);
  const before = [...f.values]; await assert.rejects(f.store.add(account(), new AbortController().signal), { code: 'permission' }); await assert.rejects(f.store.add(account('109'), new AbortController().signal), { code: 'permission' }); assert.deepEqual([...f.values], before);
});
test('W02 absent or corrupt protected store never falls back to browser storage or partial account lists', async () => {
  await assert.rejects(new ProtectedAccountStore(undefined).list(), { code: 'unsupported' });
  const f = fakeStore(); f.values.set('bilisofa.session.v1.slot0', '{broken'); await assert.rejects(f.store.list(), { code: 'invalid' });
});
test('W02 cancelled save blocks other store instances until late owned cleanup is confirmed', async () => {
  const f = fakeStore(false), abort = new AbortController(), pending = f.store.add(account(), abort.signal);
  abort.abort(); await assert.rejects(pending, { code: 'cancelled' });
  const second = new ProtectedAccountStore(f.api); await assert.rejects(second.add(account('202'), new AbortController().signal), { code: 'unknown' });
  f.save(); assert.equal(f.values.size, 0); assert.deepEqual(await second.list(), []);
});
test('W02 save deadline keeps shared ownership unknown; callback absence never unlocks a slot', async () => {
  const f = fakeStore(false); await assert.rejects(f.store.add(account(), new AbortController().signal), { code: 'unknown' });
  await assert.rejects(f.store.list(), { code: 'unknown' }); f.save(); assert.deepEqual(await f.store.list(), []);
});
test('W02 failed save checks absence and verified delete failure remains blocked', async () => {
  const f = fakeStore(false), pending = f.store.add(account(), new AbortController().signal); f.fail(); await assert.rejects(pending, { code: 'unknown' }); assert.deepEqual(await f.store.list(), []);
  f.values.set('bilisofa.session.v1.slot0', JSON.stringify(account())); f.api.removeData = () => {};
  await assert.rejects(f.store.remove('bili_101'), { code: 'unknown' }); await assert.rejects(new ProtectedAccountStore(f.api).list(), { code: 'unknown' });
});
test('W02 foreign bytes appearing during a pending save are not removed or accepted', async () => {
  const f = fakeStore(false), pending = f.store.add(account(), new AbortController().signal);
  f.values.set('bilisofa.session.v1.slot0', 'unowned-by-invocation'); f.fail(); await assert.rejects(pending, { code: 'unknown' });
  assert.equal(f.values.get('bilisofa.session.v1.slot0'), 'unowned-by-invocation'); await assert.rejects(f.store.list(), { code: 'unknown' });
});
test('W02 pre-aborted import writes nothing and malformed account ID cannot remove a slot', async () => {
  const f = fakeStore(), abort = new AbortController(); abort.abort(); await assert.rejects(f.store.add(account(), abort.signal), { code: 'cancelled' }); await assert.rejects(f.store.remove('bilisofa.w01.account.v1'), { code: 'invalid' }); assert.equal(f.calls.length, 0);
});
test('W02 account is inactive until true identity is verified; snapshots contain no credentials', async () => {
  const verify = deferred<{ uid: string; name: string }>(), f = coordinator({ verify: () => verify.promise });
  const pending = f.accounts.select('bili_101'); await new Promise(resolve => setTimeout(resolve, 0)); assert.deepEqual(f.accounts.state, { kind: 'switching' });
  await assert.rejects(f.accounts.read(async () => 'private', String), { code: 'login' }); verify.resolve({ uid: '101', name: '核对身份' }); await pending;
  const snapshot = f.accounts.state; assert.equal(snapshot.kind, 'active'); assert.equal(JSON.stringify(snapshot).includes('cookie'), false);
  if (snapshot.kind === 'active') snapshot.account.name = 'mutated'; assert.notDeepEqual(snapshot, f.accounts.state);
});
test('W02 wrong or expired restored identity cannot activate or leak account data', async () => {
  const f = coordinator({ verify: async () => ({ uid: '202', name: 'different' }) }); await assert.rejects(f.accounts.select('bili_101'), { code: 'login' }); assert.deepEqual(f.accounts.state, { kind: 'error', code: 'login' }); assert.ok(f.events.includes('close:bili_101'));
  const expired = coordinator({ clock: () => time + 999999 }); await assert.rejects(expired.accounts.select('bili_101'), { code: 'login' }); assert.equal(expired.runtimes.length, 0);
});
test('W02 A-to-B switch immediately cancels A requests; late A data cannot be parsed into B', async () => {
  const f = coordinator(); await f.accounts.select('bili_101'); const old = deferred<unknown>(); let signal!: AbortSignal, parses = 0;
  const read = f.accounts.read((_runtime, _scope, s) => { signal = s; return old.promise; }, v => { parses++; return String(v); });
  const switchB = f.accounts.select('bili_202'); assert.equal(signal.aborted, true); old.resolve('private-A'); await assert.rejects(read, { code: 'cancelled' }); await switchB; assert.equal(parses, 0);
  assert.equal(await f.accounts.read(async (_r, scope) => scope.accountId, String), 'bili_202');
});
test('W02 rapid switching waits for previous native close and only latest selection activates', async () => {
  const close = deferred<{ closed: boolean }>(), f = coordinator({ close: () => close.promise }); await f.accounts.select('bili_101');
  const b = f.accounts.select('bili_202'); const a = f.accounts.select('bili_101'); const cancelled = assert.rejects(b, { code: 'cancelled' });
  assert.equal(f.runtimes.length, 1); close.resolve({ closed: true }); await cancelled; await a; assert.equal(f.runtimes.length, 2); assert.equal(f.accounts.state.kind, 'active');
});
test('W02 unconfirmed native or view close blocks creation of another account runtime', async () => {
  const f = coordinator({ close: async () => ({ closed: false }) }); await f.accounts.select('bili_101'); await assert.rejects(f.accounts.select('bili_202'), { code: 'unknown' }); assert.equal(f.runtimes.length, 1); assert.equal(f.accounts.state.kind, 'blocked');
  const view = coordinator({ invalidate: async () => ({ closed: false }) }); await assert.rejects(view.accounts.select('bili_101'), { code: 'unknown' }); assert.equal(view.runtimes.length, 0);
});
test('W02 hide invalidates identity verification; foreground creates one fresh runtime', async () => {
  let checks = 0, signal!: AbortSignal; const verify = deferred<{ uid: string; name: string }>();
  const f = coordinator({ verify: async (a, s) => { signal = s; return checks++ === 0 ? verify.promise : { uid: a.uid, name: 'foreground' }; } });
  const selection = f.accounts.select('bili_101'); const cancelled = assert.rejects(selection, { code: 'cancelled' }); await new Promise(resolve => setTimeout(resolve, 0)); await f.accounts.suspend(); assert.equal(signal.aborted, true);
  verify.resolve({ uid: '101', name: 'late' }); await cancelled; assert.equal(f.accounts.state.kind, 'suspended'); await f.accounts.resume(); assert.equal(f.accounts.state.kind, 'active'); assert.equal(f.runtimes.length, 2);
});
test('W02 identity timeout aborts verification and releases native owner instead of hanging selection', async () => {
  let signal!: AbortSignal; const f = coordinator({ verify: (_a, s) => { signal = s; return new Promise(() => {}); } }); await assert.rejects(f.accounts.select('bili_101'), { code: 'timeout' }); assert.equal(signal.aborted, true); assert.ok(f.events.includes('close:bili_101')); assert.deepEqual(f.accounts.state, { kind: 'error', code: 'timeout' });
});
test('W02 deletion follows account closure and returns to guest, never to private history', async () => {
  const f = coordinator(); await f.accounts.select('bili_101'); await f.accounts.remove('bili_101'); assert.equal(f.accounts.state.kind, 'guest'); assert.equal(f.values.has('bili_101'), false); assert.ok(f.events.indexOf('close:bili_101') < f.events.indexOf('remove:bili_101'));
});
test('W02 dispose prevents future requests and cannot be reopened by late identity completion', async () => {
  const f = coordinator(); await f.accounts.select('bili_101'); assert.equal(await f.accounts.dispose(), true); assert.equal(await f.accounts.dispose(), true); await assert.rejects(f.accounts.select('bili_101'), { code: 'cancelled' });
});
test('W02 request scope binds media ownership; synchronous abort cannot spawn a fresh account request', async () => {
  const sessions = new SessionManager(), first = sessions.begin('media-one');
  assert.equal(sessions.accepts({ ...first.scope, mediaSessionId: 'media-two' }), false);
  first.signal.addEventListener('abort', () => { assert.throws(() => sessions.begin(), { code: 'cancelled' }); assert.equal(sessions.accepts(first.scope), false); });
  sessions.switchAccount('B'); const task = sessions.begin(); assert.equal(task.scope.accountId, 'B'); sessions.dispose(); assert.throws(() => sessions.begin(), { code: 'cancelled' });
  const active = new SessionManager(); await assert.rejects(active.read(async () => 'value', value => { active.switchAccount('changed'); return value; }), { code: 'cancelled' });
});
test('W02 arbitrary verification errors expose a fixed code, not credential-bearing exception text', async () => {
  const f = coordinator({ verify: async () => { throw Error('synthetic-private-bytes'); } }); await assert.rejects(f.accounts.select('bili_101'), e => e instanceof DomainError && e.message === 'unknown'); assert.deepEqual(f.accounts.state, { kind: 'error', code: 'unknown' });
});
test('W02 identity that expires during verification stays inactive; nonfinite read clocks are rejected', async () => {
  let now = time;
  const f = coordinator({ clock: () => now, verify: async value => { now += 100000; return { uid: value.uid, name: 'expired' }; } });
  await assert.rejects(f.accounts.select('bili_101'), { code: 'login' }); assert.equal(f.accounts.state.kind, 'error');
  let current = time; const active = coordinator({ clock: () => current }); await active.accounts.select('bili_101'); current = NaN;
  await assert.rejects(active.accounts.read(async () => 'private', String), { code: 'invalid' });
});
test('W02 missing close acknowledgements have a deadline and never allow credential runtime reuse', async () => {
  const f = coordinator({ close: () => new Promise(() => {}) }); await f.accounts.select('bili_101');
  await assert.rejects(f.accounts.select('bili_202'), { code: 'unknown' }); assert.equal(f.accounts.state.kind, 'blocked'); assert.equal(f.runtimes.length, 1);
});
test('W02 old login failure after switch cannot invalidate the new identity', async () => {
  const f = coordinator(); await f.accounts.select('bili_101'); const old = deferred<unknown>();
  const pending = f.accounts.read(() => old.promise, String), cancelled = assert.rejects(pending, { code: 'cancelled' });
  await f.accounts.select('bili_202'); old.reject(new DomainError('login')); await cancelled;
  assert.equal(await f.accounts.read(async (_runtime, scope) => scope.accountId, String), 'bili_202');
});
test('W02 current login failure revokes account authority; raw read errors expose no private text', async () => {
  const f = coordinator(); await f.accounts.select('bili_101');
  await assert.rejects(f.accounts.read(async () => { throw Error('synthetic-private-response'); }, String), e => e instanceof DomainError && e.message === 'unknown');
  await assert.rejects(f.accounts.read(async () => { throw new DomainError('login'); }, String), { code: 'login' });
  assert.deepEqual(f.accounts.state, { kind: 'error', code: 'login' }); await assert.rejects(f.accounts.read(async () => 'private', String), { code: 'login' });
});
