import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createVodMpd, vodBridgeMetadata } from '../../packages/media/src/vod-mpd.ts';
import type { PrivateVodPlan } from '../../packages/contracts/src/vod-private.ts';
const token = 'a'.repeat(32);
const plan: PrivateVodPlan = {
  item: { bvid: 'BV0000000001', part: 2, title: '合成P2', durationMs: 7200000 }, durationMs: 7200000, expiresAt: 1800000000000,
  video: { url: 'https://private.invalid/signed-video', expiresAt: 1800000000000, codec: 'avc1.640028', bandwidth: 5000000, width: 1920, height: 1080, initialization: '0-31', indexRange: '32-9437184' },
  audio: { url: 'https://private.invalid/signed-audio', expiresAt: 1800000000000, codec: 'ec-3', bandwidth: 192000, initialization: '0-31', indexRange: '32-6144' },
};
test('W04 production MPD describes actual codecs, complete large index and duration without leaking upstream identity', () => {
  const totals = { video: 12582920, audio: 12582920 };
  assert.equal(vodBridgeMetadata(plan, totals), '7200000,1920,1080,5000000,192000,31,9437184,31,6144,12582920,12582920,avc1.640028,ec-3');
  const mpd = createVodMpd(plan, totals, token);
  assert.ok(mpd.includes('PT7200.000S')); assert.ok(mpd.includes('codecs="ec-3"')); assert.ok(mpd.includes('indexRange="32-9437184"'));
  assert.ok(mpd.includes(`http://127.0.0.1:40324/${token}/audio.mp4`));
  for (const forbidden of ['private.invalid', 'signed-video', '合成P2', 'BV0000000001']) assert.ok(!mpd.includes(forbidden));
});
test('W04 native metadata refuses unknown codec/XML, noncanonical index, short totals and forged loopback token', () => {
  const totals = { video: 12582920, audio: 12582920 };
  for (const video of [{ ...plan.video, codec: 'avc1.bad' }, { ...plan.video, codec: 'avc1.640028"/>' }, { ...plan.video, indexRange: '032-9437184' }, { ...plan.video, initialization: '0-32' }, { ...plan.video, indexRange: '32-16777217' }]) {
    assert.throws(() => vodBridgeMetadata({ ...plan, video }, totals));
  }
  assert.throws(() => vodBridgeMetadata(plan, { ...totals, video: 1000 }));
  assert.throws(() => createVodMpd(plan, totals, token + '?url=outside'));
});
