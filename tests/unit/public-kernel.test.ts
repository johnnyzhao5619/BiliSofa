import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BATCH_ROWS, parsePopularResult } from '../../packages/contracts/src/index.ts';
import { parseKernelCommand, parseKernelEvent, type KernelRequest } from '../../packages/contracts/src/public-kernel.ts';
import { parseSearchResult } from '../../packages/contracts/src/search.ts';
import { parsePopularBody } from '../../packages/bili-client/src/popular.ts';
import { parseSearchBody } from '../../packages/bili-client/src/search.ts';
import { BatchedPages, type BatchRead } from '../../apps/tv/src/platform/batched-pages.ts';
import { WbiKeyStore } from '../../apps/tv/src/platform/wbi-keys.ts';
import { ResidentKernel } from '../../apps/tv/src/platform/public-kernel.ts';
import { FakeKernelWorker, flush } from './fake-public-kernel.ts';
const scope = { accountId: 'guest', generation: 1, mediaSessionId: 'kernel', requestId: 'r1' };
const card = (i: number) => ({ bvid: 'BV' + String(i).padStart(10, '0'), title: '合成', owner: 'UP', durationSec: 60, views: 1 });
const popular = (page = 1): KernelRequest => ({ version: 1, scope, operation: 'guest-popular', page });
const search = (keyword = '你好'): KernelRequest => ({ version: 1, scope, operation: 'public-video-search', keyword, page: 1 });
const batch = (q: KernelRequest, items = [card(0)], extra: Record<string, unknown> = {}) => ({ version: 1, scope: q.scope, operation: q.operation, closed: true, kind: 'ok', status: 200, apiCode: 0, code: q.operation === 'guest-popular' ? 'guest.popular_ok' : 'search.ok', items, noMore: false, ...extra });
const keys = { img: '7cd084941338484aae1ad9425b84077c', sub: '4932caff0ff746eab6f01bf08b70ac45' };
function memoryStorage() { const map = new Map<string, string>(); return { getItem: (k: string) => map.get(k) ?? null, setItem: (k: string, v: string) => { map.set(k, v); }, removeItem: (k: string) => { map.delete(k); } }; }
function kernel(responder: (q: KernelRequest, keys: boolean) => Record<string, unknown> | undefined, options: ConstructorParameters<typeof ResidentKernel>[0] = {}) {
  const workers: FakeKernelWorker[] = []; FakeKernelWorker.responder = responder;
  const store = options?.keys ?? new WbiKeyStore(undefined);
  return { workers, store, kernel: new ResidentKernel<KernelRequest>({ create: () => { const w = new FakeKernelWorker('public-kernel-worker.js'); workers.push(w); return w; }, keys: store, ...options }) };
}

test('ADR-108 batches: four-card pages from 20-row batches, de-duplicated across batches, one fetch per batch', async () => {
  const pages = new BatchedPages<ReturnType<typeof card>>(c => c.bvid, 1000), asked: number[] = [];
  // Each batch repeats the last two cards of the one before (a live list shifting): they are dropped, not shown twice.
  const read = async (b: number): Promise<BatchRead<ReturnType<typeof card>>> => { asked.push(b); return { ok: true, items: Array.from({ length: 20 }, (_, i) => card((b - 1) * 18 + i)), noMore: b === 3 }; };
  const [one, two] = await Promise.all([pages.page('k', 1, read), pages.page('k', 2, read)]);
  assert.deepEqual(asked, [1]);
  assert.deepEqual(one.ok && one.items.map(c => c.bvid), [0, 1, 2, 3].map(i => card(i).bvid)); assert.equal(two.ok && two.items[0]!.bvid, card(4).bvid);
  const six = await pages.page('k', 6, read);
  assert.deepEqual(asked, [1, 2]); assert.deepEqual(six.ok && six.items.map(c => c.bvid), [20, 21, 22, 23].map(i => card(i).bvid));
  const all = new Set<string>(); for (let p = 1; p <= 15; p++) { const r = await pages.page('k', p, read); if (r.ok) for (const c of r.items) { assert.ok(!all.has(c.bvid), 'no card repeats'); all.add(c.bvid); } }
  assert.deepEqual(asked, [1, 2, 3]); assert.equal(all.size, 56);
  const tail = await pages.page('k', 14, read); assert.equal(tail.ok && tail.noMore, true); assert.equal(tail.ok && tail.items.length, 4);
  const past = await pages.page('k', 15, read); assert.deepEqual(past, { ok: true, items: [], noMore: true });
  await assert.rejects(pages.page('k', 26, read));
});
test('ADR-108 batches: the snapshot stays frozen while scrolling and is renewed on page 1 after its TTL or by refresh; failures are not stored', async () => {
  let now = 0, round = 0, fail = false; const pages = new BatchedPages<ReturnType<typeof card>>(c => c.bvid, 1000, 4, 5, 12, () => now);
  const read = async (): Promise<BatchRead<ReturnType<typeof card>>> => fail ? { ok: false, result: { kind: 'api_error' } } : { ok: true, items: Array.from({ length: 20 }, (_, i) => card(round * 100 + i)), noMore: false };
  const first = await pages.page('k', 1, read); now = 5000; round = 1;
  const later = await pages.page('k', 2, read); assert.equal(later.ok && later.items[0]!.bvid, card(4).bvid, 'scrolling keeps the old snapshot');
  const renewed = await pages.page('k', 1, read); assert.notDeepEqual(renewed, first, 'page 1 after the TTL renews it');
  round = 2; pages.invalidate('k'); assert.equal((await pages.page('k', 1, read)).ok && (await pages.page('k', 1, read) as { items: { bvid: string }[] }).items[0]!.bvid, card(200).bvid);
  fail = true; pages.invalidate('k'); assert.equal((await pages.page('k', 1, read)).ok, false);
  fail = false; assert.equal((await pages.page('k', 1, read)).ok, true, 'a failed batch leaves nothing behind');
});
test('ADR-108 WBI salts: kept six hours within one local day, dropped on refusal, corrupted or future entries ignored', () => {
  const storage = memoryStorage(); let now = new Date(2026, 9, 25, 8, 0).getTime();
  const store = new WbiKeyStore(storage, () => now);
  assert.equal(store.get(), undefined); store.store(keys); assert.deepEqual(store.get(), keys);
  assert.deepEqual(new WbiKeyStore(storage, () => now).get(), keys, 'another run reads the stored salts');
  now += 5 * 3600000; assert.deepEqual(store.get(), keys); now += 3600000; assert.equal(store.get(), undefined);
  now = new Date(2026, 9, 25, 23, 50).getTime(); store.store(keys); now = new Date(2026, 9, 26, 0, 10).getTime(); assert.equal(store.get(), undefined, 'a new day fetches new salts');
  store.store(keys); store.invalidate(); assert.equal(store.get(), undefined);
  storage.setItem('bilisofa.wbi-keys.v1', '{"version":1,"img":"x","sub":"y","at":1}'); assert.equal(new WbiKeyStore(storage, () => now).get(), undefined);
  storage.setItem('bilisofa.wbi-keys.v1', JSON.stringify({ version: 1, ...keys, at: now + 60000 })); assert.equal(new WbiKeyStore(storage, () => now).get(), undefined);
  assert.throws(() => store.store({ img: 'https://outside.invalid/', sub: keys.sub }));
});
test('ADR-108 kernel client: identical reads share one transfer, page reads go before prefetches, cancelling a queued read sends nothing', async () => {
  const { kernel: k, workers } = kernel(() => undefined);
  const a = k.run(popular(1), new AbortController().signal), b = k.run(popular(1), new AbortController().signal);
  await flush(); assert.equal(workers.length, 1); assert.equal(workers[0]!.requests.length, 1);
  const prefetch = k.run(popular(3), new AbortController().signal, true), page = k.run(popular(2), new AbortController().signal);
  const dropped = new AbortController(), gone = k.run(popular(4), dropped.signal); dropped.abort(); await assert.rejects(gone, { code: 'cancelled' });
  workers[0]!.reply(batch(popular(1))); assert.deepEqual(await a, await b);
  await flush(); assert.equal((workers[0]!.held!.request as { page: number }).page, 2, 'the page read runs before the prefetch');
  workers[0]!.reply(batch(popular(2))); await page; await flush(); workers[0]!.reply(batch(popular(3))); await prefetch;
  assert.deepEqual(workers[0]!.requests.map(r => (r.request as { page: number }).page), [1, 2, 3]);
  assert.equal(await k.close(), true); assert.equal(workers[0]!.closes, 1);
});
test('ADR-108 kernel client: cancelling the active read stops only that transfer; a late answer is ignored', async () => {
  const { kernel: k, workers } = kernel(() => undefined);
  const abort = new AbortController(), first = k.run(popular(1), abort.signal); await flush();
  abort.abort(); await assert.rejects(first, { code: 'cancelled' }); await flush();
  assert.equal(workers[0]!.stops, 1); assert.equal(workers[0]!.terminated, false);
  const next = k.run(popular(2), new AbortController().signal); await flush();
  workers[0]!.emit({ version: 1, type: 'result', requestId: workers[0]!.requests[0]!.requestId, result: batch(popular(1)) });
  workers[0]!.reply(batch(popular(2), [card(9)])); assert.equal(((await next).items as unknown[]).length, 1);
  assert.equal(workers.length, 1); await k.close();
});
test('ADR-108 kernel client: a timeout replaces the Worker; three failures in two minutes pause the lane for 60 s', async () => {
  let now = 0; const { kernel: k, workers } = kernel(() => undefined, { requestMs: 5, now: () => now });
  await assert.rejects(k.run(popular(1), new AbortController().signal), { code: 'timeout' }); assert.equal(workers[0]!.terminated, true);
  FakeKernelWorker.responder = q => batch(q); assert.equal(((await k.run(popular(1), new AbortController().signal)).items as unknown[]).length, 1); assert.equal(workers.length, 2, 'the next read starts a fresh kernel');
  FakeKernelWorker.responder = () => undefined;
  for (let i = 0; i < 3; i++) await assert.rejects(k.run(popular(2), new AbortController().signal), { code: 'timeout' });
  assert.equal(k.paused, true); await assert.rejects(k.run(popular(3), new AbortController().signal), { code: 'network' });
  now += 60000; FakeKernelWorker.responder = q => batch(q); await k.run(popular(3), new AbortController().signal); await k.close();
});
test('ADR-108 kernel client: searches carry cached salts, keep salts the kernel fetched, and retry once after a refused signature', async () => {
  let refuse = 0; const { kernel: k, workers, store } = kernel(() => undefined);
  const first = k.run(search(), new AbortController().signal); await flush();
  assert.equal(workers[0]!.requests[0]!.keys, false); workers[0]!.reply(batch(search()), keys); await first; assert.deepEqual(store.get(), keys);
  FakeKernelWorker.responder = (q, sent) => refuse-- > 0 ? batch(q, [], { kind: 'api_error', apiCode: -352, code: 'search.api_error', noMore: true }) : batch(q, [card(sent ? 1 : 2)]);
  refuse = 1; const retried = await k.run(search('世界'), new AbortController().signal);
  assert.deepEqual(workers[0]!.requests.slice(1).map(r => r.keys), [true, false], 'the retry fetches new salts'); assert.equal((retried.items as { bvid: string }[])[0]!.bvid, card(2).bvid);
  refuse = 2; const refused = await k.run(search('再次'), new AbortController().signal); assert.equal(refused.kind, 'api_error', 'only one retry');
  await k.close();
});
test('ADR-108 kernel client: idle close, and close cancels every pending read', async () => {
  const { kernel: k, workers } = kernel(q => batch(q), { idleMs: 5 });
  await k.run(popular(1), new AbortController().signal); await new Promise(yes => setTimeout(yes, 20)); assert.equal(workers[0]!.closes, 1, 'five idle minutes (here 5 ms) close the kernel');
  FakeKernelWorker.responder = () => undefined;
  const pending = [k.run(popular(2), new AbortController().signal), k.run(popular(3), new AbortController().signal)]; await flush();
  const closing = k.close(); for (const p of pending) await assert.rejects(p, { code: 'cancelled' }); assert.equal(await closing, true);
  await assert.rejects(k.run(popular(1), AbortSignal.abort()), { code: 'cancelled' });
});
test('ADR-108 contracts: 20-row batches cross the kernel boundary, screen pages stay four; kernel commands are typed and bounded', () => {
  const twenty = batch(popular(1), Array.from({ length: 20 }, (_, i) => card(i)));
  assert.equal(parsePopularResult(twenty, BATCH_ROWS).items.length, 20);
  assert.throws(() => parsePopularResult(twenty)); assert.throws(() => parsePopularResult({ ...twenty, items: Array.from({ length: 21 }, (_, i) => card(i)) }, BATCH_ROWS));
  assert.equal(parseSearchResult(batch(search(), Array.from({ length: 20 }, (_, i) => card(i))), BATCH_ROWS).items.length, 20);
  assert.deepEqual(parseKernelCommand({ version: 1, type: 'request', requestId: 'k1', request: popular(5) }).type, 'request');
  for (const bad of [{ version: 1, type: 'request', requestId: 'k1', request: popular(6) }, { version: 1, type: 'request', requestId: 'k1', request: popular(1), keys },
    { version: 1, type: 'request', requestId: 'x1', request: popular(1) }, { version: 1, type: 'request', requestId: 'k1', request: { ...popular(1), url: 'https://outside.invalid/' } },
    { version: 1, type: 'request', requestId: 'k1', request: search(), keys: { img: 'x', sub: keys.sub } }, { version: 1, type: 'stop' }, { version: 2, type: 'close' }]) assert.throws(() => parseKernelCommand(bad));
  assert.deepEqual(parseKernelEvent({ version: 1, type: 'closed', confirmed: true }), { version: 1, type: 'closed', confirmed: true });
  for (const bad of [{ version: 1, type: 'result', requestId: 'k1', result: [] }, { version: 1, type: 'ready', extra: 1 }, { version: 1, type: 'result', requestId: 'k1', result: { x: 'y'.repeat(140000) } }]) assert.throws(() => parseKernelEvent(bad));
});
test('ADR-108 body parsers: ps=20 pages carry up to 20 rows and five pages; ps=4 keeps its original bounds', () => {
  const list = (n: number) => Array.from({ length: n }, (_, i) => ({ bvid: card(i).bvid, title: 't', owner: { name: 'u' }, duration: 60, stat: { view: 1 }, pic: 'https://i0.hdslb.com/bfs/archive/x.jpg' }));
  const raw = (n: number) => JSON.stringify({ code: 0, data: { list: list(n), no_more: false } });
  assert.equal(parsePopularBody(raw(20), 20).items.length, 20); assert.throws(() => parsePopularBody(raw(21), 20)); assert.throws(() => parsePopularBody(raw(5)));
  const row = (i: number) => ({ type: 'video', bvid: card(i).bvid, title: 't', author: 'u', duration: '1:00', play: 1 });
  const body = (page: number, size: number, n: number) => JSON.stringify({ code: 0, data: { page, pagesize: size, numPages: 50, numResults: 1000, result: Array.from({ length: n }, (_, i) => row(i)) } });
  assert.equal(parseSearchBody(body(5, 20, 20), 5, 20).noMore, true); assert.equal(parseSearchBody(body(4, 20, 20), 4, 20).noMore, false);
  assert.throws(() => parseSearchBody(body(6, 20, 20), 6, 20)); assert.throws(() => parseSearchBody(body(1, 4, 4), 1, 20)); assert.throws(() => parseSearchBody(body(1, 20, 20), 1));
});
