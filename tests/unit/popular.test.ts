import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parsePopularBody } from '../../packages/bili-client/src/popular.ts';
import { parsePopularRequest, parsePopularResult, type PopularResult } from '../../packages/contracts/src/index.ts';
import { PopularWorker } from '../../apps/tv/src/platform/popular-worker.ts';
const scope = { accountId: 'guest', generation: 1, mediaSessionId: 'guest-popular', requestId: 'r1' };
const card = { bvid: 'BV0000000001', title: '<img onerror=bad>仅作为文本', owner: '合成UP主', durationSec: 125, views: 123 };
const body = (items: unknown[] = [{ bvid: card.bvid, title: card.title, owner: { name: card.owner }, duration: 125, stat: { view: 123 } }]) => JSON.stringify({ code: 0, data: { list: items, no_more: false } });
const result = (override: Partial<PopularResult> = {}): PopularResult => ({ version: 1, scope, operation: 'guest-popular', closed: true, kind: 'ok', status: 200, apiCode: 0, code: 'guest.popular_ok', items: [card], noMore: false, ...override });
test('F02 guest popular normalizes bounded public fields and does not interpret title markup', () => {
  assert.deepEqual(parsePopularBody(body()), { apiCode: 0, items: [card], noMore: false });
  assert.deepEqual(parsePopularBody('{"code":-101}'), { apiCode: -101, items: [], noMore: true });
  const long = JSON.parse(body()); long.data.list[0].title = '字'.repeat(512); assert.equal(parsePopularBody(JSON.stringify(long)).items[0]!.title.length, 120);
  for (const raw of ['x'.repeat(131073), 'not json', '{"code":0,"data":{"list":[]}}', body(new Array(5).fill(JSON.parse(body()).data.list[0])), body([{}, {}])]) assert.throws(() => parsePopularBody(raw));
  // ADR-111: one repeated or unreadable row is skipped and counted; durations over seven days read as unknown (0, ADR-115).
  const row = JSON.parse(body()).data.list[0];
  assert.deepEqual(parsePopularBody(body([row, row])), { apiCode: 0, items: [card], noMore: false, skipped: 1 });
  assert.deepEqual(parsePopularBody(body([row, {}, { ...row, bvid: 'BV0000000002', duration: 700000, title: '换\n行' }])).items.map(c => [c.durationSec, c.title]), [[125, card.title], [0, '换 行']]);
  assert.equal(parsePopularBody(body([row, { ...row, bvid: 'BV0000000003', owner: { name: '' } }])).skipped, 1);
  assert.deepEqual(parsePopularResult({ ...result(), skipped: 2 }), { ...result(), skipped: 2 });
  for (const skipped of [0, 4, 1.5, '1']) assert.throws(() => parsePopularResult({ ...result(), skipped }));
  assert.throws(() => parsePopularResult({ version: 1, scope, operation: 'guest-popular', closed: true, kind: 'http_error', status: 412, code: 'guest.http_412', items: [], noMore: true, skipped: 1 }));
});
test('W01/F02 guest protocol rejects arbitrary URLs, credentials, false HTTP success and unbounded display data', () => {
  const request = { version: 1, scope, operation: 'guest-popular', page: 1 };
  assert.deepEqual(parsePopularRequest(request), request); assert.deepEqual(parsePopularResult(result()), result());
  for (const patch of [{ url: 'https://example.invalid' }, { cookie: 'synthetic' }, { page: 26 }, { page: 1.5 }, { scope: { ...scope, accountId: 'account' } }, { scope: { ...scope, token: 'synthetic' } }]) assert.throws(() => parsePopularRequest({ ...request, ...patch }));
  for (const patch of [{ closed: false }, { status: 412 }, { code: 'guest.http_412' }, { items: [card, card] }, { items: [{ ...card, title: 'x'.repeat(121) }] }, { rawBody: 'outside' }, { kind: 'http_error' }]) assert.throws(() => parsePopularResult({ ...result(), ...patch }));
  assert.equal(parsePopularResult({ version: 1, scope, operation: 'guest-popular', closed: true, kind: 'http_error', status: 412, code: 'guest.http_412', items: [], noMore: true }).kind, 'http_error');
});
function fixture() {
  const workers: FakeWorker[] = [];
  class FakeWorker {
    onmessage?: (event: { data: unknown }) => void; onerror?: () => void; sent: unknown[] = []; terminated = false;
    constructor(url: string) { assert.equal(url, 'guest-worker.js'); workers.push(this); }
    postMessage(value: unknown) { this.sent.push(value); }
    terminate() { this.terminated = true; }
    reply(value: unknown) { this.onmessage?.({ data: value }); }
  }
  const prior = globalThis.Worker; globalThis.Worker = FakeWorker as unknown as typeof Worker;
  return { workers, restore: () => { globalThis.Worker = prior; } };
}
const tick = () => new Promise<void>(resolve => setImmediate(resolve));
test('W01/F02 cancelled GET waits for confirmed native closure before replacement and never returns stale data', async () => {
  const f = fixture(); try {
    const runtime = new PopularWorker(), first = new AbortController();
    const old = runtime.run({ version: 1, scope, operation: 'guest-popular', page: 1 }, first.signal); await tick();
    const oldRejected = assert.rejects(old, /cancelled/); first.abort(); await oldRejected;
    const nextScope = { ...scope, requestId: 'r2' }, next = runtime.run({ version: 1, scope: nextScope, operation: 'guest-popular', page: 2 }, new AbortController().signal); await tick();
    assert.equal(f.workers.length, 1); assert.equal(f.workers[0]!.sent.length, 2);
    f.workers[0]!.reply(result()); await tick(); assert.equal(f.workers.length, 2); assert.equal(f.workers[0]!.terminated, true);
    f.workers[1]!.reply(result({ scope: nextScope })); assert.deepEqual((await next).items, [card]); await runtime.dispose();
  } finally { f.restore(); }
});
test('W01/F02 malformed or wrong-owner final frame poisons native reuse rather than claiming cleanup', async () => {
  const f = fixture(); try {
    const runtime = new PopularWorker(), pending = runtime.run({ version: 1, scope, operation: 'guest-popular', page: 1 }, new AbortController().signal); await tick();
    f.workers[0]!.reply(result({ scope: { ...scope, requestId: 'stale' } })); await assert.rejects(pending, /invalid/);
    await assert.rejects(runtime.run({ version: 1, scope, operation: 'guest-popular', page: 1 }, new AbortController().signal), /unknown/); assert.equal(f.workers.length, 1);
  } finally { f.restore(); }
});
test('W01/F02 missing closure ACK expires, blocks another Worker, and never silently overlaps requests', async context => {
  context.mock.timers.enable({ apis: ['setTimeout'] }); const f = fixture(); try {
    const runtime = new PopularWorker(), pending = runtime.run({ version: 1, scope, operation: 'guest-popular', page: 1 }, new AbortController().signal); await tick();
    const rejected = assert.rejects(pending, /cancelled/); const close = runtime.dispose(), failed = assert.rejects(close, /unknown/); await rejected;
    context.mock.timers.tick(12001); await failed;
    await assert.rejects(runtime.run({ version: 1, scope, operation: 'guest-popular', page: 1 }, new AbortController().signal), /unknown/); assert.equal(f.workers.length, 1);
  } finally { f.restore(); }
});
