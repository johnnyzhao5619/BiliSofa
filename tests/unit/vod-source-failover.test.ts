import { test } from 'node:test';
import assert from 'node:assert/strict';
import { vodCdnClass, vodCdnPair } from '../../packages/bili-client/src/vod-cdn.ts';
import { parseVodPlayback, type PrivateVodCatalog, type PrivateVodDetail } from '../../packages/bili-client/src/vod-catalog.ts';
import type { VodCapabilities } from '../../packages/contracts/src/vod-catalog.ts';
import type { PrivateVodPlan } from '../../packages/contracts/src/vod-private.ts';
import { cdnClassBit } from '../../packages/contracts/src/cdn-failover.ts';
import { DomainError } from '../../packages/contracts/src/index.ts';
import { VodSourceOwner, type VodReadApi } from '../../platform/wasm-network/src/vod-source-owner.ts';
import { VodCheckError } from '../../platform/wasm-network/src/vod-native-api.ts';
import { avoidMask, bridgeEvidence, isSourceEvidence, noteBridgeEvidence, resetSourceStep } from '../../apps/tv/src/platform/bridge-evidence.ts';

const now = 1800000000000, deadline = Math.floor(now / 1000) + 7200;
const at = (host: string, name = 'v', d = deadline) => `https://${host}/upgcxcode/${name}.m4s?e=x&deadline=${d}`;
const akam = 'upos-hz-mirrorakam.akamaized.net', cosov = 'upos-sz-mirrorcosov.bilivideo.com', edge = 'cn-gdfs-ct-01-01.bilivideo.com';

test('ADR-102 candidates keep Bilibili order, with edge nodes after named mirrors and Akamai', () => {
  assert.deepEqual([vodCdnClass(at(akam)), vodCdnClass(at(cosov)), vodCdnClass(at(edge))], ['akamai', 'upos', 'edge']);
  assert.deepEqual(vodCdnPair([at(akam), at(cosov)], now, true), { url: at(akam), expiresAt: deadline * 1000, alternate: at(cosov) });
  assert.deepEqual(vodCdnPair([at(edge), at(cosov), at(akam)], now, true), { url: at(cosov), expiresAt: deadline * 1000, alternate: at(akam) });
  assert.deepEqual(vodCdnPair([at(edge)], now, true), { url: at(edge), expiresAt: deadline * 1000 });
  assert.deepEqual(vodCdnPair([at(akam), at(cosov)], now, false).url, at(cosov), '0.50.3 order is unchanged');
});

const caps: VodCapabilities = { video: ['avc'], audio: ['aac'], qualities: [16, 32, 64, 80], maxWidth: 1920, maxHeight: 1080, maxFps: 30, rates: [1, 2] };
const track = (kind: 'video' | 'audio', d = deadline) => ({ id: kind === 'video' ? 80 : 30280, mimeType: `${kind}/mp4`, codecs: kind === 'video' ? 'avc1.640028' : 'mp4a.40.2',
  bandwidth: kind === 'video' ? 3000000 : 192000, baseUrl: at(cosov, kind, d), backupUrl: [at(akam, kind, d)],
  ...(kind === 'video' ? { width: 1920, height: 1080, frameRate: '30000/1001' } : {}), SegmentBase: { Initialization: '0-999', indexRange: '1000-20000' } });
const raw = (d = deadline) => JSON.stringify({ code: 0, data: { quality: 80, timelength: 3600000, support_formats: [{ quality: 80, new_description: '1080P' }], dash: { duration: 3600, video: [track('video', d)], audio: [track('audio', d)] } } });
const part = { cid: '202', item: { bvid: 'BV0000000001', part: 1, title: '合成', durationMs: 3600000 } };

/** Synthetic native boundary: a check of a URL on a failing host throws the track-attributed error, as the real inspect does. */
function owner(failing: RegExp) {
  const checked: string[] = [], codes: string[] = []; let reads = 0;
  const detail = { guestAllowed: true, parts: [part], summary: { title: '合成', owner: '合成', parts: [part.item] } } as unknown as PrivateVodDetail;
  const api: VodReadApi = { async catalog(_b, _p, nonce) { const c: PrivateVodCatalog = parseVodPlayback(raw(deadline + 600 * reads++), part, nonce, now, true, true); return { detail, catalog: c }; },
    async inspect(plan: PrivateVodPlan) {
      for (const [i, t] of [plan.video, plan.audio].entries()) { checked.push(new URL(t.url).hostname); if (failing.test(t.url)) throw new VodCheckError('network', i ? 1 : 0, 504, 0); }
      return { video: 160000, audio: 32000 };
    }, async close() {} };
  let n = 0;
  const o = new VodSourceOwner(api, caps, undefined, () => String(n++ % 10).repeat(32), () => now, true, true, code => codes.push(code));
  return { o, checked, codes };
}
const lease = 'b'.repeat(32);
async function attach(f: ReturnType<typeof owner>, avoid = 0) {
  const result = await f.o.read({ bvid: 'BV0000000001', part: 1 });
  return f.o.attach(lease, { catalogId: result.catalog.id, videoKey: 'v0', audioKey: 'a0' }, avoid);
}

test('ADR-102 a failed source check moves that track to its backup; the offer starts there with no start bits', async () => {
  const f = owner(/mirrorcosov/), offer = await attach(f);
  assert.equal(offer.video, at(akam, 'video')); assert.equal(offer.videoAlternate, at(cosov, 'video'));
  assert.equal(offer.audio, at(akam, 'audio')); assert.equal(offer.audioAlternate, at(cosov, 'audio')); assert.equal(offer.start, 0);
  assert.deepEqual(f.codes, ['check_video_primary_upos_504_0', 'check_video_moved_upos', 'check_audio_primary_upos_504_0', 'check_audio_moved_upos']);
  assert.ok(f.codes.every(isSourceEvidence)); assert.ok(!f.codes.join().includes('mirrorcosov'), 'codes carry a class, never a host');
});

test('ADR-102 both lines failing keeps the original error and names the backup that failed', async () => {
  const f = owner(/mirror/);
  await assert.rejects(attach(f), (error: unknown) => error instanceof DomainError && error.code === 'network');
  assert.deepEqual(f.codes, ['check_video_primary_upos_504_0', 'check_video_moved_upos', 'check_video_backup_akamai_504_0']);
});

test('ADR-102 an avoided host class starts on the other line without checking the avoided one first', async () => {
  const f = owner(/mirrorcosov/), offer = await attach(f, cdnClassBit('upos'));
  assert.equal(offer.video, at(akam, 'video')); assert.deepEqual(f.checked, [akam, akam]); assert.deepEqual(f.codes, []);
  await f.o.release(lease); const again = await f.o.read({ bvid: 'BV0000000001', part: 1 });
  await assert.rejects(f.o.attach(lease, { catalogId: again.catalog.id, videoKey: 'v0', audioKey: 'a0' }, 8), { code: 'invalid' });
});

test('ADR-102 renewal keeps each track on the host its bridge already uses', async () => {
  const f = owner(/mirrorcosov/); await attach(f);
  const renewed = await f.o.renew(lease);
  assert.match(renewed.video, /^https:\/\/upos-hz-mirrorakam\.akamaized\.net\/upgcxcode\/video\.m4s/); assert.match(renewed.videoAlternate!, /^https:\/\/upos-sz-mirrorcosov/);
  assert.ok(renewed.expiresAt > now + 7200000);
});

test('ADR-102 帮助与诊断 evidence keeps fixed fields, avoids failed classes for the run, and rejects anything else', () => {
  for (const bad of ['read_3_504_0', 'read_2_https://x', 'check_video_primary_cosov_504_0', 'check_video_primary_upos_5040_0', 'check_subtitle_moved_upos', 'bridge_failover_1_upos'])
    assert.equal(isSourceEvidence(bad), false, bad);
  noteBridgeEvidence('read_5_0_7');
  assert.deepEqual(bridgeEvidence().step, { kind: 'read', operation: 5, http: 0, curl: 7, timeout: false });
  noteBridgeEvidence('check_audio_backup_akamai_timeout');
  assert.deepEqual(bridgeEvidence().step, { kind: 'check', track: 'audio', position: 'backup', host: 'akamai', http: 0, curl: 0, timeout: true });
  noteBridgeEvidence('bridge_failover_2_upos'); noteBridgeEvidence('check_video_moved_edge');
  assert.equal(bridgeEvidence().failovers, 2); assert.equal(avoidMask(), cdnClassBit('akamai') | cdnClassBit('upos') | cdnClassBit('edge'));
  resetSourceStep(); assert.equal(bridgeEvidence().step, undefined); assert.equal(bridgeEvidence().failovers, 2, 'counts last the run');
});
