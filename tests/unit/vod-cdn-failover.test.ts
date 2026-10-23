import { test } from 'node:test';
import assert from 'node:assert/strict';
import { vodCdnUrl, vodCdnPair } from '../../packages/bili-client/src/vod-cdn.ts';
import { parseVodPlayback, type PrivateVodCatalog, type PrivateVodDetail } from '../../packages/bili-client/src/vod-catalog.ts';
import type { VodCapabilities } from '../../packages/contracts/src/vod-catalog.ts';
import { VodSourceOwner, type VodReadApi } from '../../platform/wasm-network/src/vod-source-owner.ts';
import { bridgeEvidence, noteBridgeEvidence } from '../../apps/tv/src/platform/bridge-evidence.ts';

const now = 1800000000000, deadline = Math.floor(now / 1000) + 7200;
const at = (host: string, name = 'v', d = deadline) => `https://${host}/upgcxcode/${name}.m4s?e=x&deadline=${d}&os=akam`;
const akam = 'upos-hz-mirrorakam.akamaized.net', cosov = 'upos-sz-mirrorcosov.bilivideo.com';

test('ADR-101 destination policy adds only the Bilibili Akamai backup family, under the same path and deadline rules', () => {
  assert.equal(vodCdnUrl(at(akam), now).url, at(akam));
  assert.equal(vodCdnUrl(at(cosov), now).expiresAt, deadline * 1000);
  for (const bad of [at('mirrorakam.akamaized.net'), at('evil-mirrorakam.akamaized.net'), at('upos-hz-mirrorakam.akamaized.net.example.com'),
    at('upos-HZ-mirrorakam.akamaized.net'), at('upos-hz.akamaized.net'), at('a248.e.akamai.net'), `https://${akam}:8443/v.m4s?deadline=${deadline}`,
    `http://${akam}/v.m4s?deadline=${deadline}`, `https://${akam}/v.mp4?deadline=${deadline}`, `https://${akam}/v.m4s?os=akam`]) assert.throws(() => vodCdnUrl(bad, now), bad);
  assert.throws(() => vodCdnUrl(at(akam, 'v', Math.floor(now / 1000) + 10), now), { reason: 'expired_source' });
});

test('ADR-101 the primary stays the first bilivideo address; the backup is the first validated one on another host', () => {
  assert.deepEqual(vodCdnPair([at(akam), at(cosov)], now), { url: at(cosov), expiresAt: deadline * 1000, alternate: at(akam) });
  assert.deepEqual(vodCdnPair([at(cosov), at(akam, 'v', deadline - 60)], now), { url: at(cosov), expiresAt: (deadline - 60) * 1000, alternate: at(akam, 'v', deadline - 60) });
  assert.deepEqual(vodCdnPair([at(cosov), at(cosov, 'w'), 'http://127.0.0.1/private'], now), { url: at(cosov), expiresAt: deadline * 1000 });
  assert.throws(() => vodCdnPair([at(akam)], now), { reason: 'cdn_unavailable' });
});

const caps: VodCapabilities = { video: ['avc'], audio: ['aac'], qualities: [16, 32, 64, 80], maxWidth: 1920, maxHeight: 1080, maxFps: 30, rates: [1, 2] };
const track = (kind: 'video' | 'audio') => ({ id: kind === 'video' ? 80 : 30280, mimeType: `${kind}/mp4`, codecs: kind === 'video' ? 'avc1.640028' : 'mp4a.40.2',
  bandwidth: kind === 'video' ? 3000000 : 192000, baseUrl: at(cosov, kind), backupUrl: [at(akam, kind)],
  ...(kind === 'video' ? { width: 1920, height: 1080, frameRate: '30000/1001' } : {}), SegmentBase: { Initialization: '0-999', indexRange: '1000-20000' } });
const raw = JSON.stringify({ code: 0, data: { quality: 80, timelength: 3600000, support_formats: [{ quality: 80, new_description: '1080P' }], dash: { duration: 3600, video: [track('video')], audio: [track('audio')] } } });
const part = { cid: '202', item: { bvid: 'BV0000000001', part: 1, title: '合成', durationMs: 3600000 } };

test('ADR-101 the parser keeps the backup only in the failover build; older builds parse exactly as before', () => {
  const on = parseVodPlayback(raw, part, 'a'.repeat(32), now, true), off = parseVodPlayback(raw, part, 'a'.repeat(32), now, false);
  assert.equal(on.video[0]!.url, at(cosov, 'video')); assert.equal(on.video[0]!.alternate, at(akam, 'video')); assert.equal(on.audio[0]!.alternate, at(akam, 'audio'));
  assert.equal(off.video[0]!.url, at(cosov, 'video')); assert.ok(!('alternate' in off.video[0]!)); assert.ok(!JSON.stringify(off).includes('akamaized'));
  assert.ok(!JSON.stringify(on.summary).includes('akamaized'), 'backups never reach the public catalog');
});

function owner(failover: boolean) {
  const catalog = parseVodPlayback(raw, part, 'a'.repeat(32), now, true);
  const detail: PrivateVodDetail = { guestAllowed: true, parts: [part], summary: { title: '合成', owner: '合成', parts: [part.item] } } as PrivateVodDetail;
  const api: VodReadApi = { async catalog(_b, _p, nonce) { const c = structuredClone(catalog) as PrivateVodCatalog; c.summary.id = nonce; return { detail, catalog: c }; },
    async inspect() { return { video: 160000, audio: 32000 }; }, async close() {} };
  let n = 0; const ids = ['c'.repeat(32), 'd'.repeat(32), 'e'.repeat(32)];
  return new VodSourceOwner(api, caps, undefined, () => ids[n++ % 3]!, () => now, failover);
}

test('ADR-101 the offer names each backup; a host the bridge left starts later leases on that track’s backup', async () => {
  const o = owner(true);
  let result = await o.read({ bvid: 'BV0000000001', part: 1 });
  const choice = { catalogId: result.catalog.id, videoKey: 'v0', audioKey: 'a0' }, lease = 'b'.repeat(32);
  let offer = await o.attach(lease, choice);
  assert.equal(offer.video, at(cosov, 'video')); assert.equal(offer.videoAlternate, at(akam, 'video')); assert.equal(offer.start, 0);
  assert.throws(() => o.exclude('f'.repeat(32), 1), { code: 'invalid' }); assert.throws(() => o.exclude(lease, 3), { code: 'invalid' });
  o.exclude(lease, 1); await o.release(lease);
  result = await o.read({ bvid: 'BV0000000001', part: 1 });
  offer = await o.attach(lease, { ...choice, catalogId: result.catalog.id });
  // Exclusion is per host (like a DASH BaseURL exclusion list): both tracks shared the failing host.
  assert.equal(offer.start, 3); assert.equal(offer.video, at(cosov, 'video'), 'the source check still reads the primary');
  await o.release(lease);
  const old = owner(false); result = await old.read({ bvid: 'BV0000000001', part: 1 });
  offer = await old.attach(lease, { ...choice, catalogId: result.catalog.id });
  assert.deepEqual(Object.keys(offer).sort(), ['audio', 'bvid', 'expiresAt', 'metadata', 'video']);
  assert.throws(() => old.exclude(lease, 1), { code: 'invalid' });
});

test('ADR-101 the diagnostics line keeps only fixed integers from bridge evidence', () => {
  noteBridgeEvidence('bridge_failover_1'); noteBridgeEvidence('bridge_issue_504_22'); noteBridgeEvidence('bridge_failover_2'); noteBridgeEvidence('bridge_served_1');
  noteBridgeEvidence('bridge_issue_https://x'); noteBridgeEvidence('bridge_failover_3');
  assert.deepEqual(bridgeEvidence(), { issue: { status: 504, curl: 22 }, failovers: 2, step: { kind: 'bridge', http: 504, curl: 22, timeout: false } });
});
