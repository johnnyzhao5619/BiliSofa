import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseVodDetail } from '../../packages/bili-client/src/vod-catalog.ts';
import { parseVodDetailSummary } from '../../packages/contracts/src/vod-catalog.ts';
import { judgeRate } from '../../apps/tv/src/app/rate-probe.ts';
// ADR-095: detail facts come from the same view response; missing or malformed facts are dropped.
const bvid = 'BV0000000001';
const view = (extra: Record<string, unknown> = {}, owner: Record<string, unknown> = {}) => JSON.stringify({ code: 0, data: { bvid, cid: 101, state: 0, title: '合成标题', owner: { name: '合成UP', ...owner }, rights: { pay: 0, ugc_pay: 0, is_stein_gate: 0 }, pages: [{ cid: 101, page: 1, from: 'vupload', part: '合成P1', duration: 80 }], ...extra } });
test('ADR-095 description, publish time, counts and UP avatar are read from the view response', () => {
  const about = parseVodDetail(view({ desc: '第一行\r\n第二行\n\n\n\n第三行\u0007', pubdate: 1761177600, stat: { view: 123456, like: 789, danmaku: 12 } }, { face: 'https://i1.hdslb.com/bfs/face/synthetic.jpg' }), bvid).summary.about;
  assert.deepEqual(about, { description: '第一行\n第二行\n\n第三行', publishedAt: 1761177600, views: 123456, likes: 789, danmaku: 12, face: { host: 'i1.hdslb.com', path: '/bfs/face/synthetic.jpg' } });
  assert.deepEqual(parseVodDetailSummary(parseVodDetail(view({ desc: 'x', pubdate: 1 }), bvid).summary).about, { description: 'x', publishedAt: 1 });
});
test('ADR-095 malformed or absent facts are omitted and never block playback', () => {
  const detail = parseVodDetail(view({ desc: '-', pubdate: -5, stat: { view: '1万', like: 1.5, danmaku: -1 } }, { face: 'https://outside.invalid/face.jpg' }), bvid).summary;
  assert.equal(detail.about, undefined); assert.equal(detail.parts.length, 1);
  assert.equal(parseVodDetail(view({ desc: 'a'.repeat(5000) }), bvid).summary.about?.description?.length, 2000);
});
test('ADR-095 the worker boundary keeps detail facts strict', () => {
  const base = parseVodDetail(view(), bvid).summary;
  for (const about of [{}, { other: 1 }, { description: 'a\u0000b' }, { description: '' }, { publishedAt: 4102444800 }, { likes: -1 }, { views: 1.5 }, { face: { host: 'outside.invalid', path: '/bfs/a.jpg' } }])
    assert.throws(() => parseVodDetailSummary({ ...base, about }));
  assert.deepEqual(parseVodDetailSummary({ ...base, about: { description: '两行\n文本', likes: 0 } }).about, { description: '两行\n文本', likes: 0 });
});
test('ADR-095 rate probe judges by media-time slope within less than half the 0.25 step', () => {
  assert.deepEqual(judgeRate(1.5, 6, 4, false), { rate: 1.5, outcome: 'pass', slope: 1.5 });
  assert.equal(judgeRate(1.25, 4 * 1.36, 4, false).outcome, 'off');
  assert.equal(judgeRate(0.75, 4 * 0.66, 4, false).outcome, 'pass');
  assert.deepEqual(judgeRate(0.5, 2, 4, true), { rate: 0.5, outcome: 'stalled', slope: 0.5 });
  assert.equal(judgeRate(1, 4, 0, false).outcome, 'stalled');
});
