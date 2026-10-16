import { test } from 'node:test';
import assert from 'node:assert/strict';
import { guestCdnUrl, parseGuestVideoDetail, parseGuestVideoPlan } from '../../packages/bili-client/src/guest-video.ts';
import { parseGuestVideoRequest, parseGuestVideoResult } from '../../packages/contracts/src/guest-video.ts';
import { GuestVideoWorker } from '../../apps/tv/src/platform/guest-video-worker.ts';
const now = 1700000000000, bvid = 'BV0000000001';
const url = `https://test.bilivideo.com/synthetic.m4s?deadline=${now / 1000 + 3600}&sign=synthetic`;
const view = () => ({ code: 0, data: { bvid, cid: 123, title: '<b>合成标题</b>', owner: { name: '合成UP' }, state: 0, rights: { pay: 0, ugc_pay: 0, is_stein_gate: 0 }, pages: [{ cid: 123, page: 1, from: 'vupload', duration: 12 }] } });
const track = (video: boolean) => ({ id: video ? 16 : 30216, baseUrl: url, mimeType: video ? 'video/mp4' : 'audio/mp4', codecs: video ? 'avc1.64001E' : 'mp4a.40.2', bandwidth: video ? 500000 : 66000, width: 640, height: 360, SegmentBase: { Initialization: '0-914', indexRange: '915-6546' } });
const play = () => ({ code: 0, data: { quality: 16, timelength: 12000, dash: { duration: 12, video: [track(true)], audio: [track(false)] } } });
test('F04/F06 guest video binds public first-P detail and minimum AVC/AAC plan without interpreting display text', () => {
  const detail = parseGuestVideoDetail(JSON.stringify(view()), bvid), plan = parseGuestVideoPlan(JSON.stringify(play()), detail, now);
  assert.equal(detail.cid, '123'); assert.equal(detail.title, '<b>合成标题</b>'); assert.equal(plan.video.width, 640); assert.equal(plan.audio.codec, 'mp4a.40.2'); assert.equal(plan.expiresAt, now + 3600000);
  assert.throws(() => parseGuestVideoDetail(JSON.stringify(view()), 'BV0000000002'));
  assert.throws(() => parseGuestVideoDetail('x'.repeat(131073), bvid));
});
test('W01 guest source refuses paid, interactive, preview, unknown page and unsafe integer identities', () => {
  for (const mutate of [(v: ReturnType<typeof view>) => { v.data.rights.pay = 1; }, (v: ReturnType<typeof view>) => { v.data.rights.is_stein_gate = 1; }, (v: ReturnType<typeof view>) => { v.data.cid = v.data.pages[0]!.cid = Number.MAX_SAFE_INTEGER + 1; }, (v: ReturnType<typeof view>) => { v.data.pages[0]!.from = 'unknown'; }]) { const v = view(); mutate(v); assert.throws(() => parseGuestVideoDetail(JSON.stringify(v), bvid)); }
  const detail = parseGuestVideoDetail(JSON.stringify(view()), bvid);
  for (const patch of [{ quality: 80 }, { is_preview: 1 }, { drm_tech_type: 1 }, { durl: [] }, { timelength: 100000 }]) { const p = play(); assert.throws(() => parseGuestVideoPlan(JSON.stringify({ ...p, data: { ...p.data, ...patch } }), detail, now)); }
});
test('W01 detail permits bounded large ancillary metadata while the play plan keeps its smaller body budget', () => {
  const raw = JSON.stringify(view()), detail = parseGuestVideoDetail(raw, bvid);
  assert.deepEqual(parseGuestVideoDetail(JSON.stringify({ ...view(), ancillary: 'x'.repeat(170000) }), bvid), detail);
  const bytes = new TextEncoder().encode(raw).length;
  assert.deepEqual(parseGuestVideoDetail(raw + ' '.repeat(524288 - bytes), bvid), detail);
  assert.throws(() => parseGuestVideoDetail(raw + ' '.repeat(524289 - bytes), bvid));
  assert.throws(() => parseGuestVideoPlan(JSON.stringify(play()).padEnd(131073, ' '), detail, now));
});
test('W01 transient CDN destination rejects alternate protocols, identity, host confusion, expiry and signed URL duplicates', () => {
  assert.equal(guestCdnUrl(url, now).url, url);
  for (const u of [url.replace('https:', 'http:'), url.replace('test.', 'user@pi.'), url.replace('.bilivideo.com', '.bilivideo.com.evil.invalid'), url.replace('test.bilivideo.com', '127.0.0.1'), url.replace('test.bilivideo.com', 'test.bilivideo.com:444'), url + '&deadline=1700003600', url + '#fragment', url.replace('deadline=1700003600', 'deadline=1700000000'), url.replace('.m4s', '.html'), url + '\r\nHeader: bad']) assert.throws(() => guestCdnUrl(u, now));
});
test('W04 selects a validated same-track backup without widening destinations or changing signed bytes', () => {
  const detail = parseGuestVideoDetail(JSON.stringify(view()), bvid);
  for (const kind of ['video', 'audio'] as const) {
    const p = play(), selected = p.data.dash[kind][0]!;
    Object.assign(selected, { baseUrl: url.replace('test.bilivideo.com', 'unrecognized.invalid'), backupUrl: [url.replace('https:', 'http:'), url] });
    const plan = parseGuestVideoPlan(JSON.stringify(p), detail, now);
    assert.equal(plan[kind].url, url); assert.equal(plan.usedBackup, true);
    assert.equal(plan[kind].initialization, selected.SegmentBase.Initialization);
  }
  const p = play(); Object.assign(p.data.dash.video[0]!, { backup_url: [url.replace('test.', 'backup.')] });
  assert.equal(parseGuestVideoPlan(JSON.stringify(p), detail, now).video.url, url);
  assert.equal(parseGuestVideoPlan(JSON.stringify(p), detail, now).usedBackup, false);
});
test('W04 backup selection stays bounded, fails closed without a valid destination, and preserves rights and metadata checks', () => {
  const detail = parseGuestVideoDetail(JSON.stringify(view()), bvid);
  for (const backup of [[url.replace('test.bilivideo.com', '127.0.0.1')], [url + '&deadline=1700003600'], [url.replace('.m4s', '.html')], [url.replace('https:', 'http:')]]) {
    const p = play(); Object.assign(p.data.dash.video[0]!, { baseUrl: 'https://unknown.invalid/file.m4s', backupUrl: backup });
    assert.throws(() => parseGuestVideoPlan(JSON.stringify(p), detail, now), { reason: 'cdn_unavailable' });
  }
  for (const backup of [url, Array(5).fill(url)]) {
    const p = play(); Object.assign(p.data.dash.video[0]!, { backupUrl: backup });
    assert.throws(() => parseGuestVideoPlan(JSON.stringify(p), detail, now));
  }
  const expired = play(); Object.assign(expired.data.dash.audio[0]!, { baseUrl: url.replace('1700003600', '1700000000'), backup_url: [url] });
  assert.equal(parseGuestVideoPlan(JSON.stringify(expired), detail, now).audio.url, url);
  for (const patch of [{ drm_tech_type: 1 }, { codecs: 'hev1.1.6.L120' }, { SegmentBase: { Initialization: '0-914', indexRange: '915-9999999' } }]) {
    const p = play(); Object.assign(p.data.dash.video[0]!, { baseUrl: 'https://unknown.invalid/file.m4s', backupUrl: [url] }, patch);
    assert.throws(() => parseGuestVideoPlan(JSON.stringify(p), detail, now));
  }
});
test('F06 source refuses ambiguous codec selection, oversized segment ranges and mismatched duration', () => {
  const detail = parseGuestVideoDetail(JSON.stringify(view()), bvid);
  for (const mutate of [(p: ReturnType<typeof play>) => { p.data.dash.video.push(track(true)); }, (p: ReturnType<typeof play>) => { p.data.dash.video[0]!.codecs = 'hev1.1.6.L120'; }, (p: ReturnType<typeof play>) => { p.data.dash.audio[0]!.SegmentBase.indexRange = '915-9999999'; }, (p: ReturnType<typeof play>) => { p.data.dash.video[0]!.SegmentBase.Initialization = '1-914'; }]) { const p = play(); mutate(p); assert.throws(() => parseGuestVideoPlan(JSON.stringify(p), detail, now)); }
});
const scope = { accountId: 'guest', generation: 1, mediaSessionId: 'guest-video-source', requestId: 'r1' };
const request = { version: 1 as const, scope, operation: 'guest-video-source' as const, bvid };
const ok = { version: 1, scope, operation: 'guest-video-source', closed: true, code: 'ugc.source_ranges_ok', summary: { bvid, title: '合成', owner: '合成UP', durationSec: 12, pages: 1, width: 640, height: 360, videoCodec: 'avc1.64001E', audioCodec: 'mp4a.40.2' } };
test('W01 source IPC never accepts arbitrary URL/credentials/raw captures or success without bounded summary', () => {
  assert.deepEqual(parseGuestVideoRequest(request), request); assert.deepEqual(parseGuestVideoResult(ok), ok);
  for (const patch of [{ url }, { headers: {} }, { cookie: 'synthetic' }, { bvid: '../bad' }, { scope: { ...scope, accountId: 'other' } }]) assert.throws(() => parseGuestVideoRequest({ ...request, ...patch }));
  for (const patch of [{ closed: false }, { rawBody: '{}' }, { url }, { summary: undefined }, { summary: { ...ok.summary, url } }, { code: 'ugc.http_403' }]) assert.throws(() => parseGuestVideoResult({ ...ok, ...patch }));
});
test('W01 source cancellation invalidates late success, waits for closure, and rejects wrong-owner results', async () => {
  const prior = globalThis.Worker, instances: FakeWorker[] = [];
  class FakeWorker {
    onmessage?: (event: { data: unknown }) => void; onerror?: () => void; stopped = false;
    constructor(file: string) { assert.equal(file, 'guest-video-worker.js'); instances.push(this); }
    postMessage() {} terminate() { this.stopped = true; }
    reply(value: unknown) { this.onmessage?.({ data: value }); }
  }
  globalThis.Worker = FakeWorker as unknown as typeof Worker;
  const tick = () => new Promise<void>(resolve => setImmediate(resolve));
  try {
    const client = new GuestVideoWorker(), controller = new AbortController(), first = client.run(request, controller.signal); await tick();
    const rejected = assert.rejects(first, /cancelled/); controller.abort(); await rejected;
    const next = client.run({ ...request, scope: { ...scope, requestId: 'r2' } }, new AbortController().signal); await tick(); assert.equal(instances.length, 1);
    instances[0]!.reply(ok); await tick(); assert.equal(instances.length, 2); assert.equal(instances[0]!.stopped, true);
    instances[1]!.reply(ok); await assert.rejects(next, /invalid/); await assert.rejects(client.dispose(), /unknown/);
  } finally { globalThis.Worker = prior; }
});

test('W04 generated MPD exposes only the owned tokenized loopback assets and rejects XML/range/codec injection', async () => {
  const { createGuestMpd, guestBridgeManifestUrl, isGuestBridgeManifestUrl, guestBridgeMetadata } = await import('../../packages/media/src/guest-mpd.ts');
  const token = '0123456789abcdef0123456789abcdef', plan = parseGuestVideoPlan(JSON.stringify(play()), parseGuestVideoDetail(JSON.stringify(view()), bvid), now), mpd = createGuestMpd(plan, token);
  assert.equal(guestBridgeMetadata(plan), '12000,640,360,500000,66000,914,6546,914,6546,avc1.64001E');
  assert.equal(mpd.includes('bilivideo.com'), false); assert.equal(mpd.includes('sign='), false);
  assert.equal((mpd.match(/<BaseURL>/g) ?? []).length, 2); assert.match(mpd, /PT12\.000S/);
  assert.equal(isGuestBridgeManifestUrl(guestBridgeManifestUrl(token), token), true);
  assert.equal(isGuestBridgeManifestUrl(guestBridgeManifestUrl(token) + '?target=outside', token), false);
  for (const bad of ['a'.repeat(31), '../outside', token.toUpperCase(), token + '/']) assert.throws(() => createGuestMpd(plan, bad));
  assert.throws(() => createGuestMpd({ ...plan, video: { ...plan.video, codec: 'avc1.64001E"/>' } }, token));
  assert.throws(() => createGuestMpd({ ...plan, audio: { ...plan.audio, indexRange: '915-9999999' } }, token));
});

test('W04 bridge IPC restricts the lease URL and cannot claim cleanup on an unknown native close', async () => {
  const { parseGuestBridgeEvent } = await import('../../packages/contracts/src/guest-video.ts');
  const event = { version: 1, scope, operation: 'guest-video-play', closed: false, code: 'ugc.bridge_ready', url: 'http://127.0.0.1:40324/0123456789abcdef0123456789abcdef/manifest.mpd', summary: ok.summary };
  assert.deepEqual(parseGuestBridgeEvent(event), event);
  assert.equal(parseGuestBridgeEvent({ version: 1, scope, operation: 'guest-video-play', closed: false, code: 'ugc.bridge_video_served' }).code, 'ugc.bridge_video_served');
  assert.throws(() => parseGuestBridgeEvent({ ...event, code: 'ugc.bridge_video_served' }));
  for (const patch of [{ url }, { url: event.url + '?target=outside' }, { url: event.url.replace('127.0.0.1', 'localhost') }, { raw: 'outside' }, { closed: true }, { summary: { ...ok.summary, token: 'outside' } }]) assert.throws(() => parseGuestBridgeEvent({ ...event, ...patch }));
  assert.throws(() => parseGuestBridgeEvent({ version: 1, scope, operation: 'guest-video-play', closed: true, code: 'ugc.bridge_failed_17' }));
  assert.equal(parseGuestBridgeEvent({ version: 1, scope, operation: 'guest-video-play', closed: true, code: 'ugc.bridge_stopped' }).closed, true);
});
test('W04 bridge readiness keeps its Worker alive until native closure; cancellation rejects late media and serializes another lease', async () => {
  const { GuestBridgeWorker } = await import('../../apps/tv/src/platform/guest-video-worker.ts');
  const prior = globalThis.Worker, instances: FakeWorker[] = [];
  class FakeWorker {
    onmessage?: (event: { data: unknown }) => void; stopped = false;
    constructor() { instances.push(this); } postMessage() {} terminate() { this.stopped = true; }
    reply(data: unknown) { this.onmessage?.({ data }); }
  }
  globalThis.Worker = FakeWorker as unknown as typeof Worker;
  const tick = () => new Promise<void>(resolve => setImmediate(resolve));
  const ready = { version: 1, scope, operation: 'guest-video-play', closed: false, code: 'ugc.bridge_ready', url: 'http://127.0.0.1:40324/0123456789abcdef0123456789abcdef/manifest.mpd', summary: ok.summary };
  try {
    const client = new GuestBridgeWorker(), controller = new AbortController(); let progress = 0;
    const pending = client.run({ ...request, operation: 'guest-video-play' }, controller.signal, () => { progress++; }); await tick(); instances[0]!.reply(ready);
    assert.equal(progress, 1); assert.equal(instances[0]!.stopped, false);
    instances[0]!.reply({ version: 1, scope, operation: 'guest-video-play', closed: false, code: 'ugc.bridge_video_served' }); assert.equal(progress, 2);
    const rejected = assert.rejects(pending, /cancelled/); controller.abort(); await rejected;
    const nextScope = { ...scope, requestId: 'r2' }, next = client.run({ ...request, operation: 'guest-video-play', scope: nextScope }, new AbortController().signal); await tick(); assert.equal(instances.length, 1);
    instances[0]!.reply({ version: 1, scope, operation: 'guest-video-play', closed: true, code: 'ugc.bridge_stopped' }); await tick(); assert.equal(instances.length, 2); assert.equal(instances[0]!.stopped, true);
    instances[1]!.reply({ version: 1, scope: nextScope, operation: 'guest-video-play', closed: true, code: 'ugc.view_http_403' }); assert.equal((await next).code, 'ugc.view_http_403'); await client.dispose();
  } finally { globalThis.Worker = prior; }
});


test('W01 bounded diagnostic report retains the latest failure or one-time refresh alongside recent cleanup facts', async () => {
  const { diagnosticEntries } = await import('../../apps/tv/src/app/diagnostics.ts');
  const failure = { verdict: 'FAIL', code: 'ugc.playurl_invalid_response' }, refresh = { verdict: 'UNVERIFIED', code: 'ugc.source_refresh_once' };
  const progress = Array.from({ length: 12 }, (_, i) => ({ verdict: 'UNVERIFIED', code: `ugc.progress_${i}` }));
  assert.deepEqual(diagnosticEntries([failure, ...progress]), [failure, ...progress.slice(-7)]);
  assert.equal(diagnosticEntries([refresh, ...progress])[0], refresh);
  assert.deepEqual(diagnosticEntries(progress), progress.slice(-8));
  assert.equal(diagnosticEntries([{ verdict: 'FAIL', code: 'https://outside.invalid/?signature=synthetic' }, ...progress]).length, 8);
});
