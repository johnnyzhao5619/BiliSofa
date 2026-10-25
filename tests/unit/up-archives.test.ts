import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseUpArchivesBody } from '../../packages/bili-client/src/ranking.ts';
import { parseRankingRequest, parseRankingResult } from '../../packages/contracts/src/ranking.ts';
import { parseVodAbout } from '../../packages/contracts/src/vod-catalog.ts';
import { parseVodDetail } from '../../packages/bili-client/src/vod-catalog.ts';
const scope = { accountId: 'guest', generation: 1, mediaSessionId: 'up', requestId: 'r1' };
const row = (i: number) => ({ bvid: 'BV1UP' + String(i).padStart(7, '0'), title: '合成投稿 ' + i, duration: 60, pic: 'http://i0.hdslb.com/bfs/archive/a.jpg', pubdate: 1790000000 - i, stat: { view: 10 + i } });
const body = (rows: unknown[], total = 45) => JSON.stringify({ code: 0, data: { archives: rows, page: { num: 1, size: 30, total } } });

test('ADR-103 UP uploads keep service order, skip rows without a usable BV, title or duplicate, and report the total', () => {
  const parsed = parseUpArchivesBody(body([row(1), { title: '无编号' }, { bvid: 'BV1UP0000002' }, row(3), row(1), 'x', { ...row(4), stat: null, duration: 'x', pubdate: -1 }]));
  assert.deepEqual(parsed.archives.map(a => a.bvid), ['BV1UP0000001', 'BV1UP0000003', 'BV1UP0000004']);
  assert.equal(parsed.total, 45); assert.equal(parsed.apiCode, 0);
  assert.deepEqual(parsed.archives[2], { bvid: 'BV1UP0000004', title: '合成投稿 4', durationSec: 0, views: 0, cover: parsed.archives[0]!.cover });
  assert.deepEqual(parseUpArchivesBody(JSON.stringify({ code: -352, message: 'risk' })), { apiCode: -352, archives: [], total: 0 });
  assert.throws(() => parseUpArchivesBody(body(Array.from({ length: 51 }, (_, i) => row(i)))));
  assert.throws(() => parseUpArchivesBody(body([row(1)], -1)));
});

test('ADR-103 the request names only an integer UP id and a page 1–50; results carry archives only on this operation', () => {
  const q = { version: 1, scope, operation: 'public-up-archives', mid: '12345', page: 2 };
  assert.deepEqual(parseRankingRequest(q), q);
  for (const bad of [{ ...q, mid: '012' }, { ...q, mid: '12&x=1' }, { ...q, mid: 12345 }, { ...q, mid: '9007199254740992' }, { ...q, page: 0 }, { ...q, page: 51 }, { ...q, extra: 1 }])
    assert.throws(() => parseRankingRequest(bad), JSON.stringify(bad));
  const archives = parseUpArchivesBody(body([row(1), row(2)])).archives;
  const ok = { ...q, closed: true, kind: 'ok', status: 200, apiCode: 0, code: 'ranking.ok', items: [], archives, archivesTotal: 45 };
  assert.deepEqual(parseRankingResult(ok).archives, archives);
  assert.throws(() => parseRankingResult({ ...ok, archives: [archives[0], archives[0]] }), 'duplicate BV');
  assert.throws(() => parseRankingResult({ ...ok, kind: 'http_error', status: 412, apiCode: undefined, code: 'ranking.http_412' }), 'an error carries no rows');
  assert.equal(parseRankingResult({ ...ok, kind: 'http_error', status: 412, code: 'ranking.http_412', apiCode: undefined, archives: [], archivesTotal: undefined }).kind, 'http_error');
  assert.throws(() => parseRankingResult({ version: 1, scope, operation: 'public-ranking', closed: true, kind: 'ok', status: 200, apiCode: 0, code: 'ranking.ok', items: [], archives }), 'other lanes cannot carry archives');
});

test('ADR-103 the detail keeps the UP id, and only as a safe integer string', () => {
  assert.deepEqual(parseVodAbout({ ownerMid: '777' }), { ownerMid: '777' });
  for (const bad of ['0777', '7a', 777, '9007199254740992']) assert.throws(() => parseVodAbout({ ownerMid: bad }), String(bad));
  const raw = JSON.stringify({ code: 0, data: { bvid: 'BV0000000001', cid: 101, state: 0, title: '合成', owner: { name: '合成UP', mid: 777 }, desc: '简介', rights: { pay: 0, ugc_pay: 0, is_stein_gate: 0 }, pages: [{ cid: 101, page: 1, from: 'vupload', part: 'P1', duration: 80 }] } });
  assert.equal(parseVodDetail(raw, 'BV0000000001').summary.about?.ownerMid, '777');
});

test('ADR-104 only a bounded printable runtime User-Agent may reach native; anything else keeps the probe identifier', async () => {
  const { runtimeUserAgent } = await import('../../packages/contracts/src/up-archives.ts');
  const tizen = 'Mozilla/5.0 (SMART-TV; LINUX; Tizen 8.0) AppleWebKit/537.36 (KHTML, like Gecko) Version/8.0 TV Safari/537.36';
  assert.equal(runtimeUserAgent(tizen), tizen);
  for (const bad of [undefined, 7, '', 'short', 'Mozilla/5.0\r\nCookie: x=1', 'Mozilla/5.0 \u0001', 'Mozilla/5.0 中文', 'M'.repeat(401)]) assert.equal(runtimeUserAgent(bad), undefined, String(bad));
});
