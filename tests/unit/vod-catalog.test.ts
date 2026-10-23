import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseVodDetail, resolveVodPart, parseVodPlayback, selectVodPlan } from '../../packages/bili-client/src/vod-catalog.ts';
import type { VodCapabilities } from '../../packages/contracts/src/vod-catalog.ts';
import { parseVodDetailSummary, vodChoiceSupported } from '../../packages/contracts/src/vod-catalog.ts';

const bvid = 'BV0000000001', now = 1800000000000, id = 'a'.repeat(32);
const detail = () => ({ code: 0, data: { bvid, cid: 101, state: 0, title: '合成标题', owner: { name: '合成UP' }, rights: { pay: 0, ugc_pay: 0, is_stein_gate: 0 }, pages: [
  { cid: 101, page: 1, from: 'vupload', part: '合成P1', duration: 80 },
  { cid: 202, page: 2, from: 'vupload', part: '合成P2', duration: 3600 },
] } });
const url = (name: string) => `https://synthetic.bilivideo.com/${name}.m4s?deadline=${Math.floor(now / 1000) + 7200}`;
const track = (kind: 'video' | 'audio', extra: Record<string, unknown> = {}) => ({
  id: kind === 'video' ? 80 : 30280, mimeType: `${kind}/mp4`, codecs: kind === 'video' ? 'avc1.640028' : 'mp4a.40.2',
  bandwidth: kind === 'video' ? 3000000 : 192000, baseUrl: url(kind),
  ...(kind === 'video' ? { width: 1920, height: 1080, frameRate: '30000/1001' } : {}),
  SegmentBase: { Initialization: '0-999', indexRange: '1000-20000' }, ...extra,
});
const playback = () => ({ code: 0, data: { quality: 80, timelength: 3600000, support_formats: [{ quality: 80, new_description: '1080P' }, { quality: 120, new_description: '4K' }],
  dash: { duration: 3600, video: [track('video'), track('video', { id: 120, codecs: 'hev1.1.6.L150.90', width: 3840, height: 2160 })], audio: [track('audio'), track('audio', { id: 30216, bandwidth: 64000 })] } } });
const caps: VodCapabilities = { video: ['avc'], audio: ['aac'], qualities: [16, 32, 64, 80], maxWidth: 1920, maxHeight: 1080, maxFps: 30, rates: [1, 2] };
test('F06 selected P resolves its real CID and duration without root/first-P fallback or UI CID leakage', () => {
  const parsed = parseVodDetail(JSON.stringify(detail()), bvid);
  const selected = resolveVodPart(parsed, 2);
  assert.equal(selected.cid, '202'); assert.equal(selected.item.durationMs, 3600000);
  assert.throws(() => resolveVodPart(parsed, 3));
  assert.ok(!JSON.stringify(parsed.summary).includes('"cid"'));
  const changed = detail(); changed.data.pages[1]!.page = 4;
  assert.throws(() => parseVodDetail(JSON.stringify(changed), bvid));
});
test('F06 collection uses genuine BV identities, keeps unavailable items non-actionable and bounds resource size', () => {
  const input = detail();
  const raw = { ...input, data: { ...input.data, ugc_season: { title: '合成合集', sections: [{ episodes: [
    { bvid: 'BV0000000002', title: '合成第二项', arc: { duration: 55 }, cid: 999 },
    { title: '已失效', aid: 123, arc: {} },
  ] }] } } };
  const result = parseVodDetail(JSON.stringify(raw), bvid);
  assert.deepEqual(result.summary.collection?.entries[0]?.item, { bvid: 'BV0000000002', part: 1, title: '合成第二项', durationMs: 55000 });
  assert.equal(result.summary.collection?.entries[1]?.item, undefined);
  assert.ok(!JSON.stringify(result.summary).includes('999'));
  assert.throws(() => parseVodDetail(' '.repeat(4194305), bvid));
});
test('F06 actual DASH entries define options; selected quality, codec and audio retain private URLs only in Worker plan', () => {
  const part = resolveVodPart(parseVodDetail(JSON.stringify(detail()), bvid), 2);
  const parsed = parseVodPlayback(JSON.stringify(playback()), part, id, now);
  assert.equal(parsed.summary.videos.length, 2); assert.equal(parsed.summary.audios.length, 2);
  assert.equal(parsed.summary.videos[0]?.label, '1080P'); assert.equal(parsed.summary.videos[0]?.fps, 30000 / 1001);
  assert.ok(!JSON.stringify(parsed.summary).includes('deadline=')); assert.ok(!JSON.stringify(parsed.summary).includes('"cid"'));
  const plan = selectVodPlan(parsed, { catalogId: id, videoKey: 'v0', audioKey: 'a1' }, caps, now);
  assert.equal(plan.item.part, 2); assert.equal(plan.audio.bandwidth, 64000); assert.equal(plan.video.url, url('video'));
  assert.throws(() => selectVodPlan(parsed, { catalogId: id, videoKey: 'v1', audioKey: 'a0' }, caps, now));
  assert.throws(() => selectVodPlan(parsed, { catalogId: 'b'.repeat(32), videoKey: 'v0', audioKey: 'a0' }, caps, now));
  assert.throws(() => selectVodPlan(parsed, { catalogId: id, videoKey: 'v0', audioKey: 'a0' }, caps, now + 7190000));
});
test('F06 entitlement advertisements are not granted tracks; preview/DRM/mismatched duration and unsafe origins are refused', () => {
  const part = resolveVodPart(parseVodDetail(JSON.stringify(detail()), bvid), 2);
  const input = playback();
  input.data.support_formats.push({ quality: 116, new_description: '仅广告的高画质' });
  const parsed = parseVodPlayback(JSON.stringify(input), part, id, now);
  assert.ok(!parsed.summary.videos.some(v => v.quality === 116));
  const variants = [
    { ...input, data: { ...input.data, is_preview: true } },
    { ...input, data: { ...input.data, timelength: 80000 } },
    { ...input, data: { ...input.data, dash: { ...input.data.dash, video: [track('video', { content_protection: {} })] } } },
    { ...input, data: { ...input.data, dash: { ...input.data.dash, video: [track('video', { baseUrl: 'http://127.0.0.1/private' })] } } },
    { ...input, data: { ...input.data, dash: { ...input.data.dash, video: [track('video', { SegmentBase: { Initialization: '0-999', indexRange: '998-1200' } })] } } },
  ];
  for (const variant of variants) assert.throws(() => parseVodPlayback(JSON.stringify(variant), part, id, now));
});
test('F06 large but bounded SegmentBase and alternate audio codecs remain explicit capability decisions', () => {
  const part = resolveVodPart(parseVodDetail(JSON.stringify(detail()), bvid), 2), input = playback();
  const raw = { ...input, data: { ...input.data, dash: { ...input.data.dash,
    video: [track('video', { SegmentBase: { Initialization: '0-999', indexRange: '1000-12000000' } })],
    dolby: { audio: [track('audio', { codecs: 'ec-3' })] }, flac: { audio: track('audio', { codecs: 'fLaC' }) },
  } } };
  const parsed = parseVodPlayback(JSON.stringify(raw), part, id, now);
  assert.deepEqual(parsed.summary.audios.map(a => a.codec), ['aac', 'aac', 'eac3', 'flac']);
  assert.throws(() => selectVodPlan(parsed, { catalogId: id, videoKey: 'v0', audioKey: 'a2' }, caps, now));
});
test('F06 public detail rejects private/foreign fields and capability filtering checks quality and frame rate independently', () => {
  const parsed = parseVodDetail(JSON.stringify(detail()), bvid);
  assert.deepEqual(parseVodDetailSummary(parsed.summary), parsed.summary);
  assert.throws(() => parseVodDetailSummary({ ...parsed.summary, cid: '101' }));
  assert.throws(() => parseVodDetailSummary({ ...parsed.summary, parts: [parsed.summary.parts[1]] }));
  const catalog = parseVodPlayback(JSON.stringify(playback()), resolveVodPart(parsed, 2), id, now).summary;
  const choice = { catalogId: id, videoKey: 'v0', audioKey: 'a0' };
  assert.equal(vodChoiceSupported(catalog, choice, { ...caps, qualities: [16] }), false);
  assert.equal(vodChoiceSupported(catalog, choice, { ...caps, maxFps: 24 }), false);
});
