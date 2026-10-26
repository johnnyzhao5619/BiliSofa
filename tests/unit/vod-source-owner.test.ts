import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DomainError } from '../../packages/contracts/src/index.ts';
import type { VodCapabilities } from '../../packages/contracts/src/vod-catalog.ts';
import type { PrivateVodCatalog, PrivateVodDetail } from '../../packages/bili-client/src/vod-catalog.ts';
import { VodSourceOwner, type VodReadApi } from '../../platform/wasm-network/src/vod-source-owner.ts';
const bvid = 'BV0000000001', id = 'a'.repeat(32), lease = 'b'.repeat(32), time = 1800000000000;
const caps: VodCapabilities = { video: ['avc'], audio: ['aac'], qualities: [16, 32], maxWidth: 1920, maxHeight: 1080, maxFps: 30, rates: [1, 2] };
const choice = { catalogId: id, videoKey: 'v0', audioKey: 'a0' };
function catalog(expiresAt: number, catalogId = id): { detail: PrivateVodDetail; catalog: PrivateVodCatalog } {
  const item = { bvid, part: 2, title: '合成第二P', durationMs: 95000 };
  const track = { url: `https://synthetic.bilivideo.com/v.m4s?deadline=${Math.floor(expiresAt / 1000)}`, expiresAt, codec: 'avc1.64001e', bandwidth: 500000, initialization: '0-31', indexRange: '32-900', width: 640, height: 360 };
  return { detail: { guestAllowed: true, parts: [{ cid: '111', item: { ...item, part: 1 } }, { cid: '222', item }], summary: { title: '合成视频', owner: '合成作者', parts: [{ ...item, part: 1 }, item] } },
    catalog: { cid: '222', durationMs: 95000, video: [track], audio: [{ ...track, codec: 'mp4a.40.2', bandwidth: 64000 }],
      summary: { id: catalogId, item, videos: [{ key: 'v0', quality: 16, label: '360P', codec: 'avc', width: 640, height: 360, fps: 30, bandwidth: 500000 }], audios: [{ key: 'a0', label: 'AAC', codec: 'aac', bandwidth: 64000 }] } } };
}
function fixture(values = [catalog(time + 3600000), catalog(time + 7200000)]) {
  let calls = 0, closes = 0;
  const api: VodReadApi = { async catalog(_bv, _p, nonce) { const v = structuredClone(values[Math.min(calls++, values.length - 1)]!); v.catalog.summary.id = nonce; return v; },
    async inspect() { return { video: 160000, audio: 32000 }; }, async close() { closes++; } };
  const owner = new VodSourceOwner(api, caps, undefined, () => id, () => time);
  return { api, owner, calls: () => calls, closes: () => closes };
}
test('W04 source owner exposes only public catalog; private lease drains before explicit next track/part read', async () => {
  const f = fixture(), result = await f.owner.read({ bvid, part: 2 });
  assert.equal(result.catalog.item.part, 2); assert.ok(!JSON.stringify(result).includes('deadline='));
  const offer = await f.owner.attach(lease, choice); assert.match(offer.video, /^https:/); assert.ok(!JSON.stringify(offer).includes('222'));
  await assert.rejects(f.owner.read({ bvid, part: 1 }), { code: 'invalid' });
  await assert.rejects(f.owner.close(), { code: 'invalid' });
  await f.owner.release(lease); assert.equal(f.closes(), 1);
  await f.owner.read({ bvid, part: 2 }); await f.owner.close(); assert.equal(f.closes(), 2);
});
test('W04 renewal preserves media metadata and total bytes, and never silently changes representation', async () => {
  const f = fixture(); await f.owner.read({ bvid, part: 2 }); const first = await f.owner.attach(lease, choice), next = await f.owner.renew(lease);
  assert.equal(next.metadata, first.metadata); assert.ok(next.expiresAt > first.expiresAt); assert.notEqual(next.video, first.video);
  await f.owner.release(lease); await f.owner.close();
  for (const mutate of [(c: PrivateVodCatalog) => { c.cid = '333'; }, (c: PrivateVodCatalog) => { c.video[0]!.bandwidth++; }, (c: PrivateVodCatalog) => { c.durationMs++; }]) {
    const changed = catalog(time + 7200000); mutate(changed.catalog);
    const g = fixture([catalog(time + 3600000), changed]); await g.owner.read({ bvid, part: 2 }); await g.owner.attach(lease, choice);
    await assert.rejects(g.owner.renew(lease)); await g.owner.release(lease); await g.owner.close();
  }
  const h = fixture(); await h.owner.read({ bvid, part: 2 }); await h.owner.attach(lease, choice);
  h.api.inspect = async () => ({ video: 160001, audio: 32000 });
  await assert.rejects(h.owner.renew(lease), { code: 'invalid' }); await h.owner.release(lease); await h.owner.close();
});
test('W04 preflight refreshes near expiry before any range, rejects stale/nonowned selection and unsupported hardware', async () => {
  const f = fixture([catalog(time + 80000), catalog(time + 3600000)]); await f.owner.read({ bvid, part: 2 });
  await assert.rejects(f.owner.attach(lease, { ...choice, catalogId: 'c'.repeat(32) }), { code: 'invalid' });
  const offer = await f.owner.attach(lease, choice); assert.equal(f.calls(), 2); assert.ok(offer.expiresAt >= time + 90000);
  await f.owner.release(lease); await f.owner.close();
  const g = fixture(), limited = new VodSourceOwner(g.api, { ...caps, qualities: [32] }, undefined, () => id, () => time);
  await limited.read({ bvid, part: 2 }); await assert.rejects(async () => limited.attach(lease, choice)); await limited.close();
});
test('W04 same representation can move source-list position during renewal without changing public choice keys', async () => {
  const changed = catalog(time + 7200000), c = changed.catalog;
  c.video.unshift({ ...c.video[0]!, codec: 'avc1.640028', bandwidth: 2000000, width: 1280, height: 720 });
  c.summary.videos.unshift({ ...c.summary.videos[0]!, key: 'v0', quality: 32, bandwidth: 2000000, width: 1280, height: 720 }); c.summary.videos[1]!.key = 'v1';
  const f = fixture([catalog(time + 3600000), changed]); await f.owner.read({ bvid, part: 2 }); const first = await f.owner.attach(lease, choice), renewed = await f.owner.renew(lease);
  assert.equal(first.metadata, renewed.metadata); await f.owner.release(lease); await f.owner.close();
});
test('W04 release cancels an in-flight refresh and waits native cleanup; unknown closure remains sticky', async () => {
  const f = fixture(); await f.owner.read({ bvid, part: 2 }); await f.owner.attach(lease, choice);
  let drained = false;
  f.api.catalog = async (_b, _p, _id, signal) => new Promise((_yes, no) => signal.addEventListener('abort', () => { setTimeout(() => { drained = true; no(new DomainError('cancelled')); }, 10); }));
  const renew = f.owner.renew(lease); await new Promise(resolve => setImmediate(resolve));
  await f.owner.release(lease); await assert.rejects(renew, { code: 'cancelled' }); assert.ok(drained); await f.owner.close();
  const g = fixture(); await g.owner.read({ bvid, part: 2 }); await g.owner.attach(lease, choice); g.api.close = async () => { throw new Error('synthetic unclosed'); };
  await assert.rejects(g.owner.release(lease), { code: 'unknown' }); await assert.rejects(g.owner.read({ bvid, part: 2 }));
});
test('W04 failed next read invalidates former catalog, and future cancellation cannot install a late catalog', async () => {
  const f = fixture(); await f.owner.read({ bvid, part: 2 });
  f.api.catalog = async () => { throw new DomainError('network'); };
  await assert.rejects(f.owner.read({ bvid, part: 2 }), { code: 'network' }); await assert.rejects(f.owner.attach(lease, choice), { code: 'invalid' }); await f.owner.close();
  const g = fixture(); let complete!: (value: ReturnType<typeof catalog>) => void;
  g.api.catalog = async () => new Promise(resolve => { complete = resolve; });
  const read = g.owner.read({ bvid, part: 2 }); await new Promise(resolve => setImmediate(resolve)); const close = g.owner.close(); complete(catalog(time + 3600000));
  await assert.rejects(read, { code: 'cancelled' }); await close;
});
test('ADR-112 the private binding carries the read\'s AID and salts only when both are known', async () => {
  const salts = { img: 'c'.repeat(32), sub: 'd'.repeat(32) }, full = catalog(time + 3600000);
  const withAid = fixture([{ ...full, detail: { ...full.detail, aid: '987654321' }, keys: salts } as ReturnType<typeof catalog>]);
  const read = await withAid.owner.read({ bvid, part: 2 });
  assert.deepEqual(withAid.owner.overlayBinding(read.catalog.id), { version: 1, kind: 'overlay-binding', bvid, part: 2, cid: '222', aid: '987654321', ...salts });
  assert.ok(!JSON.stringify(read).includes('987654321') && !JSON.stringify(read).includes(salts.img), 'the public result never carries them');
  for (const partial of [{ ...full, keys: salts }, { ...full, detail: { ...full.detail, aid: '987654321' } }]) {
    const f = fixture([partial as ReturnType<typeof catalog>]), r = await f.owner.read({ bvid, part: 2 });
    assert.deepEqual(f.owner.overlayBinding(r.catalog.id), { version: 1, kind: 'overlay-binding', bvid, part: 2, cid: '222' });
  }
});
