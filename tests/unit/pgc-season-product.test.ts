import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parsePgcRankingBody } from '../../packages/bili-client/src/ranking.ts';
import { parseRankingResult } from '../../packages/contracts/src/ranking.ts';
import { parsePgcSeason } from '../../packages/contracts/src/pgc-season.ts';
import { followIssueText } from '../../apps/tv/src/app/product-season.ts';
// ADR-096: public 番剧 ranking, season artwork and visible follow reasons.
const scope = { accountId: 'guest' as const, generation: 1, mediaSessionId: 'pgc-hot', requestId: 'r1' };
test('ADR-096 the 番剧 ranking keeps order, skips unusable rows and bounds every field', () => {
  const raw = JSON.stringify({ code: 0, result: { list: [{ title: '无编号' }, { season_id: 2, title: '乙\u0007', cover: 'http://i0.hdslb.com/bfs/bangumi/image/b.png', rating: '9.1分', new_ep: { index_show: '更新至第3话' }, badge: '独家' }, { season_id: 1, title: '甲', cover: 'https://outside.invalid/a.png' }, { season_id: 2, title: '重复' }, { season_id: '3', title: '字符串编号' }] } });
  assert.deepEqual(parsePgcRankingBody(raw).seasons, [
    { seasonId: '2', title: '乙', subtitle: '更新至第3话', rating: '9.1分', badge: '独家', cover: { host: 'i0.hdslb.com', path: '/bfs/bangumi/image/b.png' } },
    { seasonId: '1', title: '甲', subtitle: '', rating: '', badge: '' },
  ]);
  assert.deepEqual(parsePgcRankingBody(JSON.stringify({ code: -352 })), { apiCode: -352, seasons: [] });
  assert.throws(() => parsePgcRankingBody(JSON.stringify({ code: 0, result: { list: Array.from({ length: 101 }, (_, i) => ({ season_id: i + 1, title: 'x' })) } })));
});
test('ADR-096 the catalog worker boundary keeps seasons only on the 番剧 operation', () => {
  const base = { version: 1, scope, closed: true, kind: 'ok', status: 200, apiCode: 0, code: 'ranking.ok', items: [] };
  const card = { seasonId: '9', title: '合成', subtitle: '', rating: '', badge: '' };
  assert.deepEqual(parseRankingResult({ ...base, operation: 'public-pgc-ranking', seasons: [card] }).seasons, [card]);
  for (const bad of [{ ...base, operation: 'public-ranking', seasons: [card] }, { ...base, operation: 'public-pgc-ranking' }, { ...base, operation: 'public-pgc-ranking', seasons: [card, card] }, { ...base, operation: 'public-pgc-ranking', seasons: [{ ...card, extra: 1 }] }, { ...base, operation: 'public-pgc-ranking', seasons: [{ ...card, cover: { host: 'outside.invalid', path: '/bfs/a.png' } }] }])
    assert.throws(() => parseRankingResult(bad));
});
test('ADR-096 a season may carry artwork; anything else at the boundary still fails', () => {
  const season = { seasonId: '1', title: '合成', description: '', status: '', followed: 'no', episodes: [], groups: [{ title: '正片', episodes: [] }] };
  assert.deepEqual(parsePgcSeason({ ...season, cover: { host: 'i0.hdslb.com', path: '/bfs/bangumi/a.png' } }).cover, { host: 'i0.hdslb.com', path: '/bfs/bangumi/a.png' });
  assert.equal(parsePgcSeason(season).cover, undefined);
  assert.throws(() => parsePgcSeason({ ...season, cover: { host: 'outside.invalid', path: '/bfs/a.png' } }));
  assert.throws(() => parsePgcSeason({ ...season, poster: 'x' }));
});
test('ADR-096 every follow issue has viewer wording; none echoes a raw code', () => {
  for (const issue of ['login', 'network', 'journal', 'unauthenticated', 'rejected', 'unresolved', 'failed'] as const) { const text = followIssueText(issue); assert.ok(text.length > 4); assert.doesNotMatch(text, /pgc\.|vault\.|unknown/); }
  assert.equal(followIssueText('cancelled'), '');
});
