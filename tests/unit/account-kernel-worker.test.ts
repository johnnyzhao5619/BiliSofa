import { test } from 'node:test';
import assert from 'node:assert/strict';
/** ADR-108 P0b: the account kernel Worker's session rules, run against a fake of the native exports. */
const hex = (c: string) => c.repeat(32);
const accountA = { schema: 1 as const, id: 'bili_123', uid: '123', name: '甲', expiresAt: Date.now() + 86400000, cookieLines: '.bilibili.com\tTRUE\t/\tTRUE\t0\tSESSDATA\tsynthetic-a\n.bilibili.com\tTRUE\t/\tTRUE\t0\tbili_jct\tsynthetic-a\n' };
const accountB = { ...accountA, id: 'bili_456', uid: '456', name: '乙', cookieLines: accountA.cookieLines.replaceAll('synthetic-a', 'synthetic-b') };
const scope = (a: typeof accountA) => ({ accountId: a.id, generation: 1, mediaSessionId: 'kernel', requestId: 'r1' });
const watch = (a: typeof accountA, page = 1) => ({ version: 1, operation: 'watch-later-read', scope: scope(a), query: { page }, account: a });
const history = (a: typeof accountA) => ({ version: 1, operation: 'history-read', scope: scope(a), account: a, cursor: { max: '0', viewAtSec: 0, business: '' } });
const nav = (mid: string) => JSON.stringify({ code: 0, data: { isLogin: true, mid: Number(mid), wbi_img: { img_url: `https://i0.hdslb.com/bfs/wbi/${hex('a')}.png`, sub_url: `https://i0.hdslb.com/bfs/wbi/${hex('b')}.png` } } });
const list = JSON.stringify({ code: 0, data: { has_more: false, count: 1, list: [{ bvid: 'BV0000000001', is_pgc: false, arc_info: { title: '合成', state: 0, pages: [{}] } }] } });
const empty = JSON.stringify({ code: 0, data: { list: [], cursor: { max: 0, view_at: 0, business: '' } } });

test('ADR-108 account kernel Worker: nav once per session, again after ten minutes or a login refusal; another account closes the jar first', async () => {
  const g = globalThis as unknown as Record<string, unknown>, saved = { postMessage: g.postMessage, importScripts: g.importScripts, fetch: g.fetch, Module: g.Module, onmessage: g.onmessage };
  const events: Record<string, unknown>[] = [], log: string[] = []; let live = false, uid = '123', reply: ((op: number) => string | undefined) = op => op === 0 ? nav(uid) : op === 7 ? list : empty, pending: ReturnType<typeof setTimeout> | undefined;
  const heap = new Uint8Array(1 << 20); let bodyLength = 0;
  const text = (at: number) => new TextDecoder().decode(heap.subarray(at, heap.indexOf(0, at)));
  const realNow = Date.now; let offset = 0; Date.now = () => realNow() + offset;
  g.postMessage = (value: Record<string, unknown>) => { events.push(value); };
  g.fetch = async () => ({ ok: true, body: { cancel: async () => {} } });
  g.importScripts = () => {
    const m = g.Module as Record<string, (...args: unknown[]) => unknown>;
    const print = (line: string) => (m.print as (l: string) => void)(line);
    Object.assign(m, {
      HEAPU8: heap,
      callMain() { if (!live) { live = true; log.push('open'); print('AUTH:ready'); } },
      _auth_input_ptr: () => 0, _auth_input_capacity: () => 4096, _auth_body_ptr: () => 8192, _auth_body_length: () => bodyLength,
      _auth_http_status: () => 200, _auth_curl_status: () => 0, _auth_response_clear() { bodyLength = 0; },
      _auth_import_cookies() { log.push('jar:' + (text(0).includes('synthetic-b') ? 'b' : 'a')); return 1; },
      _kernel_begin(op: number) {
        log.push('op' + op);
        pending = setTimeout(() => { const body = reply(op); if (body === undefined) return; const bytes = new TextEncoder().encode(body); heap.set(bytes, 8192); bodyLength = bytes.length; print('AUTH:response:' + op); }, 0);
        return 1;
      },
      _kernel_stop() { clearTimeout(pending); log.push('stop'); return 1; },
      _auth_stop() { live = false; log.push('close'); print('AUTH:closed'); },
    });
    (m.onRuntimeInitialized as () => void)();
  };
  let id = 0;
  const send = (data: unknown) => (g.onmessage as (e: { data: unknown }) => void)({ data });
  const next = async (type: string) => { for (let i = 0; i < 200; i++) { const at = events.findIndex(e => e.type === type); if (at >= 0) return events.splice(at, 1)[0]!; await new Promise(r => setTimeout(r, 1)); } throw new Error('no ' + type); };
  const ask = async (request: unknown) => { send({ version: 1, type: 'request', requestId: 'k' + (++id), request }); return (await next('result')).result as Record<string, unknown>; };
  try {
    await import('../../platform/wasm-network/src/account-read-kernel-worker.ts');
    send({ version: 1, type: 'boot' }); await next('ready');
    const first = await ask(watch(accountA)); assert.equal(first.kind, 'ok'); assert.equal((first.page as { items: unknown[] }).items.length, 1);
    assert.deepEqual(log.splice(0), ['open', 'jar:a', 'op0', 'op7'], 'the first read opens the session and verifies nav');
    assert.equal((await ask(history(accountA))).kind, 'ok'); assert.deepEqual(log.splice(0), ['op2'], 'later reads skip nav');
    offset = 11 * 60000; assert.equal((await ask(watch(accountA))).kind, 'ok'); assert.deepEqual(log.splice(0), ['op0', 'op7'], 'ten minutes later nav runs again');
    reply = op => op === 0 ? nav(uid) : JSON.stringify({ code: -101 });
    const refused = await ask(watch(accountA)); assert.equal(refused.kind, 'error'); assert.equal(refused.code, 'login'); assert.doesNotMatch(JSON.stringify(refused), /synthetic|SESSDATA/);
    log.splice(0); reply = op => op === 0 ? nav(uid) : op === 7 ? list : empty;
    await ask(watch(accountA)); assert.deepEqual(log.splice(0), ['op0', 'op7'], 'a login refusal makes the session verify again');
    uid = '456'; assert.equal((await ask(watch(accountB))).kind, 'ok');
    assert.deepEqual(log.splice(0), ['close', 'open', 'jar:b', 'op0', 'op7'], 'another account closes the old jar before its own session');
    uid = '999'; offset += 11 * 60000; assert.deepEqual(((await ask(watch(accountB))) as { code?: string }).code, 'login', 'nav naming another person refuses the read');
    uid = '456'; reply = () => undefined; send({ version: 1, type: 'request', requestId: 'k' + (++id), request: watch(accountB) }); await new Promise(r => setTimeout(r, 5));
    send({ version: 1, type: 'stop', requestId: 'k' + id }); assert.equal((await next('stopped')).requestId, 'k' + id);
    send({ version: 1, type: 'close' }); assert.deepEqual(await next('closed'), { version: 1, type: 'closed', confirmed: true }); assert.equal(live, false);
  } finally { Date.now = realNow; Object.assign(g, saved); }
});
