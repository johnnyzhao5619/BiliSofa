import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parsePgcSeasonBody, parsePgcPlaybackBody, pgcVodDetail, resolvePgcEpisode } from '../../packages/bili-client/src/pgc-season.ts';
import { parsePgcSeason, pgcId } from '../../packages/contracts/src/pgc-season.ts';
import { parseVodReadResult } from '../../packages/contracts/src/vod-runtime.ts';
const now = 1800000000000;
function season(authenticated = false) {
  const episode = (id: number, status = 2) => ({ id, ep_id: id, cid: id + 100, bvid: id === 1 ? 'BV0000000001' : 'BV0000000002', title: String(id), long_title: `合成第${id}集`, badge: status === 13 ? '会员' : '', status, duration: 95000, rights: { area_limit: 0 }, showDrmLoginDialog: false, is_view_hide: false });
  return { code: 0, result: { season_id: 123, title: '合成番剧', evaluate: '合成简介\n第二行', user_status: { login: authenticated ? 1 : 0, area_limit: 0, follow: authenticated ? 1 : 0 }, new_ep: { desc: '更新到第2集' },
    episodes: [episode(1), episode(2, 13)], section: [{ title: '其他内容', episodes: [{ id: 999, ep_id: 0, title: '非剧集UP条目', status: 0, badge: '' }] }] } };
}
function playback() {
  const video = { id: 16, codecs: 'avc1.64001e', mimeType: 'video/mp4', width: 640, height: 360, frameRate: '25.000', bandwidth: 500000,
    baseUrl: `https://synthetic.bilivideo.com/v.m4s?deadline=${now / 1000 + 7200}`, SegmentBase: { Initialization: '0-31', indexRange: '32-900' } };
  return { code: 0, result: { code: 0, error_code: 0, type: 'DASH', is_preview: 0, is_drm: false, timelength: 95038,
    dash: { duration: 95, video: [video], audio: [{ ...video, codecs: 'mp4a.40.2', mimeType: 'audio/mp4', bandwidth: 64000 }] } } };
}
test('F17 public season retains groups and unavailable non-EP entries while keeping CID/rights payload private', () => {
  const result = parsePgcSeasonBody(JSON.stringify(season()), '123', false);
  assert.equal(result.summary.episodes.length, 3); assert.equal(result.summary.groups.length, 2); assert.equal(result.summary.followed, 'unknown');
  assert.ok(result.summary.episodes[0]!.item); assert.equal(result.summary.episodes[1]!.item, undefined); assert.equal(result.summary.episodes[1]!.restriction, 'member');
  assert.equal(result.summary.episodes[2]!.restriction, 'unavailable'); assert.match(result.summary.episodes[2]!.key, /^u1_/);
  assert.throws(() => resolvePgcEpisode(result, result.summary.episodes[2]!.key));
  for (const forbidden of ['"cid"', '"user_status"', 'cookie', 'https://']) assert.ok(!JSON.stringify(result.summary).includes(forbidden));
  assert.deepEqual(parsePgcSeason(result.summary), result.summary);
});
test('F17 identity mode/season mismatch fail closed; exact authenticated detail can attempt member playback without claiming entitlement', () => {
  assert.throws(() => parsePgcSeasonBody(JSON.stringify(season()), '124', false));
  assert.throws(() => parsePgcSeasonBody(JSON.stringify(season()), '123', true), { code: 'login' });
  const result = parsePgcSeasonBody(JSON.stringify(season(true)), '123', true); assert.equal(result.summary.followed, 'yes'); assert.ok(resolvePgcEpisode(result, 'e2').allowed);
  assert.throws(() => parsePgcSeasonBody(JSON.stringify({ code: -10403 }), '123', false), { code: 'permission' });
});
test('F17 region/hidden/DRM and ambiguous BV identities never produce actionable episode bindings', () => {
  for (const variant of ['region', 'hidden', 'drm', 'collision'] as const) {
    const raw = season(true), e = raw.result.episodes[0]!;
    if (variant === 'region') raw.result.user_status.area_limit = 1;
    if (variant === 'hidden') e.is_view_hide = true;
    if (variant === 'drm') e.showDrmLoginDialog = true;
    if (variant === 'collision') raw.result.episodes[1]!.bvid = e.bvid;
    const result = parsePgcSeasonBody(JSON.stringify(raw), '123', true);
    assert.equal(result.summary.episodes[0]!.item, undefined); assert.throws(() => resolvePgcEpisode(result, 'e1'));
  }
});
test('F17 genuine EP bindings feed the shared catalog and a labeled episode collection without aid/BV conversion', () => {
  const source = parsePgcSeasonBody(JSON.stringify(season()), '123', false), episode = resolvePgcEpisode(source, 'e1');
  const catalog = parsePgcPlaybackBody(JSON.stringify(playback()), episode, 'a'.repeat(32), now), detail = pgcVodDetail(source, episode);
  assert.equal(catalog.cid, '101'); assert.equal(catalog.durationMs, 95038);
  const result = parseVodReadResult({ detail: detail.summary, catalog: catalog.summary }); assert.equal(result.catalog.item.bvid, 'BV0000000001'); assert.equal(result.catalog.item.part, 1);
  assert.equal(result.detail.collection!.entries[1]!.item, undefined);
  assert.ok(!JSON.stringify(result).includes('deadline='));
});
test('F17 preview, DRM, non-DASH, denied result and disallowed episode never become playable catalogs', () => {
  const source = parsePgcSeasonBody(JSON.stringify(season()), '123', false), episode = resolvePgcEpisode(source, 'e1');
  for (const patch of [{ is_preview: 1 }, { is_drm: true }, { type: 'MP4' }, { error_code: -10403 }]) {
    const raw = playback(); Object.assign(raw.result, patch); assert.throws(() => parsePgcPlaybackBody(JSON.stringify(raw), episode, 'a'.repeat(32), now));
  }
  assert.throws(() => parsePgcPlaybackBody(JSON.stringify(playback()), { ...episode, allowed: false }, 'a'.repeat(32), now), { code: 'permission' });
});
test('F17 bounds and conflicting episode IDs refuse malformed bodies and do not turn display keys into API identities', () => {
  for (const id of ['0', '01', '../1', '9007199254740992', 'https://outside.invalid']) assert.throws(() => pgcId(id));
  const wrong = season(); wrong.result.episodes[0]!.ep_id = 99; assert.throws(() => parsePgcSeasonBody(JSON.stringify(wrong), '123', false));
  assert.throws(() => parsePgcSeasonBody('x'.repeat(4194305), '123', false));
  const summary = parsePgcSeasonBody(JSON.stringify(season()), '123', false).summary;
  const bad = structuredClone(summary); bad.episodes[2]!.item = { ...bad.episodes[0]!.item! }; assert.throws(() => parsePgcSeason(bad));
});
